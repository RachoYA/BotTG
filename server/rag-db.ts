import OpenAI from "openai";
import { storage } from "./storage";
import { db } from "./db";
import { messageEmbeddings, conversationContexts } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class RAGService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    console.log("Initializing RAG service with PostgreSQL...");
    
    // Clear existing data and rebuild from scratch
    await db.delete(messageEmbeddings);
    await db.delete(conversationContexts);
    
    await this.loadAllMessagesAndCreateEmbeddings();
    await this.buildConversationContexts();
    
    this.isInitialized = true;
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(messageEmbeddings);
    console.log(`RAG service initialized with ${count} message embeddings`);
  }

  private async loadAllMessagesAndCreateEmbeddings(): Promise<void> {
    const chats = await storage.getTelegramChats();
    
    for (const chat of chats) {
      console.log(`Processing chat: ${chat.title} (${chat.chatId})`);
      const messages = await storage.getTelegramMessages(chat.chatId);
      
      for (const message of messages) {
        if (message.text && message.text.trim().length > 10) {
          try {
            const textForEmbedding = this.prepareTextForEmbedding(
              message.text, 
              message.senderName, 
              chat.title
            );
            
            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: textForEmbedding,
              encoding_format: "float",
            });

            const embedding = embeddingResponse.data[0].embedding;
            
            await db.insert(messageEmbeddings).values({
              chatId: message.chatId,
              messageId: message.messageId.toString(),
              text: message.text,
              senderName: message.senderName,
              timestamp: message.timestamp,
              embedding: embedding,
              chatTitle: chat.title,
            });
            
            console.log(`Added message embedding for chat ${chat.title}`);
          } catch (error) {
            console.error(`Error creating embedding for message ${message.id}:`, error);
          }
        }
      }
    }
  }

  private prepareTextForEmbedding(text: string, senderName: string | null, chatTitle: string): string {
    const context = `Chat: ${chatTitle}\nSender: ${senderName || 'Unknown'}\nMessage: ${text}`;
    return context;
  }

  private isMyMessage(senderName: string | null): boolean {
    if (!senderName) return false;
    const myNames = ['Грачья', 'Грачья Алексаня', 'Racho'];
    return myNames.some(name => senderName.includes(name));
  }

  private async buildConversationContexts(): Promise<void> {
    const chats = await storage.getTelegramChats();
    
    for (const chat of chats) {
      const chatEmbeddings = await db.select()
        .from(messageEmbeddings)
        .where(eq(messageEmbeddings.chatId, chat.chatId))
        .orderBy(desc(messageEmbeddings.timestamp));

      if (chatEmbeddings.length > 0) {
        const context = await this.analyzeConversationContext(chat, chatEmbeddings);
        
        await db.insert(conversationContexts).values({
          chatId: chat.chatId,
          chatTitle: chat.title,
          summary: context.summary,
          keyTopics: context.keyTopics,
          relationship: context.relationship,
          messageCount: chatEmbeddings.length,
        }).onConflictDoUpdate({
          target: conversationContexts.chatId,
          set: {
            summary: context.summary,
            keyTopics: context.keyTopics,
            relationship: context.relationship,
            messageCount: chatEmbeddings.length,
            lastUpdated: sql`NOW()`,
          }
        });
        
        console.log(`Built context for chat: ${chat.title} (${chatEmbeddings.length} messages)`);
      }
    }
  }

  private async analyzeConversationContext(chat: any, messages: any[]): Promise<any> {
    const recentMessages = messages.slice(0, 50);
    const messageTexts = recentMessages.map(m => `${m.senderName || 'Unknown'}: ${m.text}`).join('\n');
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze this conversation and provide insights in JSON format:
            {
              "summary": "Brief summary of the conversation",
              "keyTopics": ["topic1", "topic2", "topic3"],
              "relationship": "Type of relationship (personal, business, support, etc.)"
            }`
          },
          {
            role: "user",
            content: `Chat: ${chat.title}\n\nRecent messages:\n${messageTexts}`
          }
        ],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error analyzing conversation context:', error);
      return {
        summary: `Conversation in ${chat.title}`,
        keyTopics: ['general'],
        relationship: 'unknown'
      };
    }
  }

  async addNewMessage(message: any): Promise<void> {
    if (!message.text || message.text.trim().length <= 10) return;
    
    try {
      const chat = await storage.getTelegramChatByChatId(message.chatId);
      if (!chat) return;

      const textForEmbedding = this.prepareTextForEmbedding(
        message.text,
        message.senderName,
        chat.title
      );

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: textForEmbedding,
        encoding_format: "float",
      });

      const embedding = embeddingResponse.data[0].embedding;
      
      await db.insert(messageEmbeddings).values({
        chatId: message.chatId,
        messageId: message.messageId.toString(),
        text: message.text,
        senderName: message.senderName,
        timestamp: message.timestamp,
        embedding: embedding,
        chatTitle: chat.title,
      });

      await this.updateConversationContext(message.chatId);
      console.log(`Added new message to RAG: ${message.senderName || 'Unknown'}`);
    } catch (error) {
      console.error('Error adding new message to RAG:', error);
    }
  }

  private async updateConversationContext(chatId: string): Promise<void> {
    const chat = await storage.getTelegramChatByChatId(chatId);
    if (!chat) return;

    const chatEmbeddings = await db.select()
      .from(messageEmbeddings)
      .where(eq(messageEmbeddings.chatId, chatId))
      .orderBy(desc(messageEmbeddings.timestamp));

    if (chatEmbeddings.length > 0) {
      const context = await this.analyzeConversationContext(chat, chatEmbeddings);
      
      await db.insert(conversationContexts).values({
        chatId: chat.chatId,
        chatTitle: chat.title,
        summary: context.summary,
        keyTopics: context.keyTopics,
        relationship: context.relationship,
        messageCount: chatEmbeddings.length,
      }).onConflictDoUpdate({
        target: conversationContexts.chatId,
        set: {
          summary: context.summary,
          keyTopics: context.keyTopics,
          relationship: context.relationship,
          messageCount: chatEmbeddings.length,
          lastUpdated: sql`NOW()`,
        }
      });
    }
  }

  async semanticSearch(query: string, chatIds?: string[], limit: number = 10): Promise<any[]> {
    try {
      const queryEmbeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
        encoding_format: "float",
      });

      const queryEmbedding = queryEmbeddingResponse.data[0].embedding;
      
      let whereClause = sql`1=1`;
      if (chatIds && chatIds.length > 0) {
        whereClause = sql`${messageEmbeddings.chatId} = ANY(${chatIds})`;
      }

      // PostgreSQL cosine similarity search
      const results = await db.select({
        id: messageEmbeddings.id,
        chatId: messageEmbeddings.chatId,
        messageId: messageEmbeddings.messageId,
        text: messageEmbeddings.text,
        senderName: messageEmbeddings.senderName,
        timestamp: messageEmbeddings.timestamp,
        chatTitle: messageEmbeddings.chatTitle,
        similarity: sql<number>`1 - (${messageEmbeddings.embedding} <=> ${queryEmbedding}::vector)`
      })
      .from(messageEmbeddings)
      .where(whereClause)
      .orderBy(sql`1 - (${messageEmbeddings.embedding} <=> ${queryEmbedding}::vector) DESC`)
      .limit(limit);

      return results;
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  async getRelevantContext(query: string, chatIds?: string[], maxTokens: number = 4000): Promise<string> {
    const results = await this.semanticSearch(query, chatIds, 20);
    
    let context = `Relevant conversation context for: "${query}"\n\n`;
    let tokenCount = 0;
    
    for (const result of results) {
      const entry = `[${result.chatTitle}] ${result.senderName}: ${result.text}\n`;
      const entryTokens = entry.length / 4; // Rough estimate
      
      if (tokenCount + entryTokens > maxTokens) break;
      
      context += entry;
      tokenCount += entryTokens;
    }
    
    return context;
  }

  async getStats(): Promise<{ totalMessages: number; totalChats: number; totalContexts: number }> {
    const [{ messageCount }] = await db.select({ messageCount: sql<number>`count(*)` }).from(messageEmbeddings);
    const [{ contextCount }] = await db.select({ contextCount: sql<number>`count(*)` }).from(conversationContexts);
    const [{ chatCount }] = await db.select({ chatCount: sql<number>`count(DISTINCT ${messageEmbeddings.chatId})` }).from(messageEmbeddings);
    
    return {
      totalMessages: messageCount || 0,
      totalChats: chatCount || 0,
      totalContexts: contextCount || 0
    };
  }
}

export const ragService = new RAGService();