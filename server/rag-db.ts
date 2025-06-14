import OpenAI from "openai";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { messageEmbeddings, conversationContexts } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { localAI } from "./local-ai.js";

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
            
            const embedding = await localAI.generateEmbedding(textForEmbedding);
            
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
    try {
      return await localAI.analyzeConversationContext(chat, messages);
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

      const embedding = await localAI.generateEmbedding(textForEmbedding);
      
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

      // Manual cosine similarity calculation for basic PostgreSQL
      const allEmbeddings = await db.select()
        .from(messageEmbeddings)
        .where(whereClause);

      // Calculate cosine similarity manually
      const resultsWithSimilarity = allEmbeddings.map(emb => ({
        ...emb,
        similarity: this.cosineSimilarity(queryEmbedding, emb.embedding as number[])
      }));

      // Sort by similarity and take top results
      const results = resultsWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
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
    const [{ messageCount }] = await db.select({ messageCount: sql<number>`count(*)::int` }).from(messageEmbeddings);
    const [{ contextCount }] = await db.select({ contextCount: sql<number>`count(*)::int` }).from(conversationContexts);
    const [{ chatCount }] = await db.select({ chatCount: sql<number>`count(DISTINCT ${messageEmbeddings.chatId})::int` }).from(messageEmbeddings);
    
    return {
      totalMessages: parseInt(messageCount as any) || 0,
      totalChats: parseInt(chatCount as any) || 0,
      totalContexts: parseInt(contextCount as any) || 0
    };
  }
}

export const ragService = new RAGService();