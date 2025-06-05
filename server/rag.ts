import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MessageEmbedding {
  id: number;
  chatId: string;
  messageId: string;
  text: string;
  senderName: string | null;
  timestamp: Date;
  embedding: number[];
  chatTitle: string;
}

interface ConversationContext {
  chatId: string;
  chatTitle: string;
  messages: Array<{
    text: string;
    senderName: string | null;
    timestamp: Date;
    isMyMessage: boolean;
  }>;
  summary: string;
  keyTopics: string[];
  relationship: string;
}

export class RAGService {
  private embeddings: Map<number, MessageEmbedding> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log("Initializing RAG service...");
    await this.loadAllMessagesAndCreateEmbeddings();
    await this.buildConversationContexts();
    this.isInitialized = true;
    console.log("RAG service initialized with", this.embeddings.size, "message embeddings");
  }

  private async loadAllMessagesAndCreateEmbeddings(): Promise<void> {
    try {
      // Загружаем все сообщения из базы данных
      const messages = await storage.getTelegramMessages(undefined, 10000); // Загружаем много сообщений
      const chats = await storage.getTelegramChats();
      const chatTitles = new Map(chats.map(chat => [chat.chatId, chat.title]));

      console.log(`Processing ${messages.length} messages for embeddings...`);

      // Обрабатываем сообщения пакетами для создания эмбеддингов
      const batchSize = 20;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const textsToEmbed = batch
          .filter(msg => msg.text && msg.text.trim().length > 0)
          .map(msg => this.prepareTextForEmbedding(msg.text!, msg.senderName, chatTitles.get(msg.chatId) || 'Unknown'));

        if (textsToEmbed.length === 0) continue;

        try {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: textsToEmbed,
          });

          // Сохраняем эмбеддинги
          let embeddingIndex = 0;
          for (const msg of batch) {
            if (msg.text && msg.text.trim().length > 0) {
              const embedding: MessageEmbedding = {
                id: msg.id,
                chatId: msg.chatId,
                messageId: msg.messageId,
                text: msg.text,
                senderName: msg.senderName,
                timestamp: msg.timestamp,
                embedding: embeddingResponse.data[embeddingIndex].embedding,
                chatTitle: chatTitles.get(msg.chatId) || 'Unknown'
              };
              this.embeddings.set(msg.id, embedding);
              embeddingIndex++;
            }
          }

          console.log(`Processed batch ${Math.ceil((i + 1) / batchSize)} of ${Math.ceil(messages.length / batchSize)}`);
          
          // Небольшая пауза между запросами к API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error creating embeddings for batch starting at ${i}:`, error);
        }
      }
    } catch (error) {
      console.error("Error loading messages for RAG:", error);
    }
  }

  private prepareTextForEmbedding(text: string, senderName: string | null, chatTitle: string): string {
    // Подготавливаем текст для эмбеддинга с контекстом
    const sender = senderName || 'Unknown';
    const isMyMessage = this.isMyMessage(senderName);
    const role = isMyMessage ? 'Я' : sender;
    
    return `[${chatTitle}] ${role}: ${text}`;
  }

  private isMyMessage(senderName: string | null): boolean {
    if (!senderName) return false;
    const myNames = ['Грачья', 'Грачья Алексаня', 'Racho'];
    return myNames.some(name => senderName.includes(name));
  }

  private async buildConversationContexts(): Promise<void> {
    console.log("Building conversation contexts...");
    
    const chats = await storage.getTelegramChats();
    
    for (const chat of chats) {
      try {
        const chatMessages = Array.from(this.embeddings.values())
          .filter(emb => emb.chatId === chat.chatId)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        if (chatMessages.length === 0) continue;

        // Анализируем контекст беседы
        const context = await this.analyzeConversationContext(chat, chatMessages);
        this.conversationContexts.set(chat.chatId, context);
        
        console.log(`Built context for chat: ${chat.title} (${chatMessages.length} messages)`);
      } catch (error) {
        console.error(`Error building context for chat ${chat.title}:`, error);
      }
    }
  }

  private async analyzeConversationContext(chat: any, messages: MessageEmbedding[]): Promise<ConversationContext> {
    const recentMessages = messages.slice(-50); // Последние 50 сообщений для анализа
    
    const conversationText = recentMessages
      .map(msg => {
        const isMyMessage = this.isMyMessage(msg.senderName);
        const sender = isMyMessage ? 'Грачья' : (msg.senderName || 'Собеседник');
        return `${sender}: ${msg.text}`;
      })
      .join('\n');

    try {
      const analysisPrompt = `
Проанализируй этот диалог и создай краткое резюме контекста общения:

${conversationText}

Ответь в JSON формате:
{
  "summary": "Краткое описание о чем идет речь в переписке",
  "keyTopics": ["тема1", "тема2", "тема3"],
  "relationship": "тип отношений (деловые/личные/семейные/дружеские)"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');

      return {
        chatId: chat.chatId,
        chatTitle: chat.title,
        messages: recentMessages.map(msg => ({
          text: msg.text,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          isMyMessage: this.isMyMessage(msg.senderName)
        })),
        summary: analysis.summary || '',
        keyTopics: analysis.keyTopics || [],
        relationship: analysis.relationship || 'неопределенные'
      };
    } catch (error) {
      console.error("Error analyzing conversation context:", error);
      
      // Fallback: создаем базовый контекст без AI анализа
      return {
        chatId: chat.chatId,
        chatTitle: chat.title,
        messages: recentMessages.map(msg => ({
          text: msg.text,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          isMyMessage: this.isMyMessage(msg.senderName)
        })),
        summary: `Переписка с ${chat.title}`,
        keyTopics: [],
        relationship: 'неопределенные'
      };
    }
  }

  async addNewMessage(message: any): Promise<void> {
    if (!message.text || message.text.trim().length === 0) return;

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
        input: [textForEmbedding],
      });

      const embedding: MessageEmbedding = {
        id: message.id,
        chatId: message.chatId,
        messageId: message.messageId,
        text: message.text,
        senderName: message.senderName,
        timestamp: message.timestamp,
        embedding: embeddingResponse.data[0].embedding,
        chatTitle: chat.title
      };

      this.embeddings.set(message.id, embedding);

      // Обновляем контекст беседы
      await this.updateConversationContext(message.chatId);
      
      console.log(`Added new message to RAG: ${chat.title}`);
    } catch (error) {
      console.error("Error adding new message to RAG:", error);
    }
  }

  private async updateConversationContext(chatId: string): Promise<void> {
    try {
      const chat = await storage.getTelegramChatByChatId(chatId);
      if (!chat) return;

      const chatMessages = Array.from(this.embeddings.values())
        .filter(emb => emb.chatId === chatId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const context = await this.analyzeConversationContext(chat, chatMessages);
      this.conversationContexts.set(chatId, context);
    } catch (error) {
      console.error("Error updating conversation context:", error);
    }
  }

  async semanticSearch(query: string, chatIds?: string[], limit: number = 10): Promise<MessageEmbedding[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Создаем эмбеддинг для запроса
      const queryEmbedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: [query],
      });

      const queryVector = queryEmbedding.data[0].embedding;

      // Фильтруем по chatIds если указаны
      let candidates = Array.from(this.embeddings.values());
      if (chatIds && chatIds.length > 0) {
        candidates = candidates.filter(emb => chatIds.includes(emb.chatId));
      }

      // Вычисляем similarity scores
      const results = candidates.map(embedding => ({
        ...embedding,
        similarity: this.cosineSimilarity(queryVector, embedding.embedding)
      }));

      // Сортируем по similarity и возвращаем top results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error("Error in semantic search:", error);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, a_i, i) => sum + a_i * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, a_i) => sum + a_i * a_i, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, b_i) => sum + b_i * b_i, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async getRelevantContext(query: string, chatIds?: string[], maxTokens: number = 4000): Promise<string> {
    const relevantMessages = await this.semanticSearch(query, chatIds, 20);
    
    let context = "РЕЛЕВАНТНЫЙ КОНТЕКСТ ИЗ ИСТОРИИ ПЕРЕПИСОК:\n\n";
    let tokenCount = 0;
    
    for (const message of relevantMessages) {
      const isMyMessage = this.isMyMessage(message.senderName);
      const sender = isMyMessage ? 'Грачья' : (message.senderName || 'Собеседник');
      const messageText = `[${message.chatTitle}] ${sender}: ${message.text}\n`;
      
      // Примерный подсчет токенов (1 токен ≈ 4 символа)
      const messageTokens = Math.ceil(messageText.length / 4);
      
      if (tokenCount + messageTokens > maxTokens) break;
      
      context += messageText;
      tokenCount += messageTokens;
    }

    // Добавляем информацию о контексте бесед
    if (chatIds && chatIds.length > 0) {
      context += "\nКОНТЕКСТ ТЕКУЩИХ БЕСЕД:\n\n";
      for (const chatId of chatIds) {
        const convContext = this.conversationContexts.get(chatId);
        if (convContext) {
          context += `[${convContext.chatTitle}]\n`;
          context += `Тип отношений: ${convContext.relationship}\n`;
          context += `Основные темы: ${convContext.keyTopics.join(', ')}\n`;
          context += `Контекст: ${convContext.summary}\n\n`;
        }
      }
    }

    return context;
  }

  getStats(): { totalMessages: number; totalChats: number; totalContexts: number } {
    return {
      totalMessages: this.embeddings.size,
      totalChats: new Set(Array.from(this.embeddings.values()).map(e => e.chatId)).size,
      totalContexts: this.conversationContexts.size
    };
  }
}

export const ragService = new RAGService();