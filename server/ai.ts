import OpenAI from "openai";
import { storage } from "./storage";
import { telegramService } from "./telegram";
import { ragService } from "./rag-db";
import {
  type InsertPeriodAnalysis,
  type InsertDailySummary,
  type InsertAiInsight,
} from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to call OpenAI API");
  }
}

async function testOpenAI(prompt: string): Promise<string> {
  return await callOpenAI(prompt, "You are a helpful assistant. Please respond in JSON format with a 'message' field.");
}

export class AIService {
  async testModel(prompt: string): Promise<string> {
    try {
      return await testOpenAI(prompt);
    } catch (error) {
      throw new Error(`AI model test failed: ${error}`);
    }
  }

  async processUnreadMessages(): Promise<void> {
    try {
      const unreadMessages = await storage.getUnprocessedMessages();
      console.log(`Processing ${unreadMessages.length} unread messages...`);

      for (const message of unreadMessages) {
        // Добавляем новое сообщение в RAG систему
        await ragService.addNewMessage(message);
        await storage.markMessageAsProcessed(message.id);
      }
    } catch (error) {
      console.error("Error processing unread messages:", error);
    }
  }

  async analyzeConversationPeriod(chatId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      console.log(`Analyzing conversation period for chat ${chatId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Get messages for the period
      const messages = await this.getMessagesForPeriod(chatId, startDate, endDate);
      
      if (messages.length === 0) {
        return {
          message: "Нет сообщений за указанный период",
          totalMessages: 0
        };
      }

      // Get chat info
      const chat = await storage.getTelegramChatByChatId(chatId);
      const chatTitle = chat?.title || `Chat ${chatId}`;

      // Analyze conversation context with AI
      const analysisResult = await this.performConversationAnalysis(messages, chatTitle);

      // Store analysis result
      const insertAnalysis: InsertPeriodAnalysis = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        chatId: chatId,
        chatTitle: chatTitle,
        totalMessages: messages.length,
        unansweredRequests: analysisResult.unansweredRequests || [],
        identifiedProblems: analysisResult.identifiedProblems || [],
        openQuestions: analysisResult.openQuestions || [],
        myParticipation: analysisResult.myParticipation || "",
        missedResponses: analysisResult.missedResponses || [],
        responseRequired: analysisResult.responseRequired || false,
        summary: analysisResult.summary || "",
        priority: analysisResult.priority || "medium"
      };

      const analysis = await storage.createPeriodAnalysis(insertAnalysis);

      return {
        message: "Контекстный анализ переписки завершен",
        analysis: analysis,
        processedMessages: messages.length
      };

    } catch (error) {
      console.error("Error analyzing conversation period:", error);
      throw error;
    }
  }

  private async performConversationAnalysis(messages: any[], chatTitle: string): Promise<any> {
    try {
      const conversationText = messages.map(msg => 
        `[${msg.timestamp.toISOString()}] ${msg.senderName || msg.sender || 'Unknown'}: ${msg.text || ''}`
      ).join('\n');

      const systemPrompt = `Ты - помощник-аналитик для управления коммуникациями. Проанализируй переписку и выдели ключевые управленческие инсайты.

ВАЖНО: Пользователя в системе зовут "Грачья" (может также встречаться как "Грачья Алексаня" или "Racho"). Анализируй обращения именно к этому человеку.

Сосредоточься на:
1. Необработанные обращения к Грачье (запросы, которые требуют его ответа)
2. Проблемы, выявленные в контексте разговора
3. Открытые вопросы без ответов
4. Участие Грачьи в беседе и пропущенные ответы
5. Приоритет и необходимость реагирования

Ответ должен быть в JSON формате с полями:
- unansweredRequests: массив строк с описанием необработанных обращений к Грачье
- identifiedProblems: массив строк с выявленными проблемами
- openQuestions: массив строк с открытыми вопросами
- myParticipation: строка с анализом участия Грачьи
- missedResponses: массив строк с пропущенными ответами от Грачьи
- responseRequired: boolean - требуется ли ответ от Грачьи
- summary: строка с кратким резюме
- priority: "high", "medium" или "low"`;

      const prompt = `Проанализируй эту переписку из чата "${chatTitle}":

${conversationText}

Выдели ключевые управленческие инсайты и необходимые действия.`;

      const response = await callOpenAI(prompt, systemPrompt);
      return JSON.parse(response);

    } catch (error) {
      console.error("Error in conversation analysis:", error);
      return {
        unansweredRequests: [],
        identifiedProblems: [],
        openQuestions: [],
        myParticipation: "Ошибка анализа",
        missedResponses: [],
        responseRequired: false,
        summary: "Не удалось проанализировать переписку",
        priority: "medium"
      };
    }
  }

  private async getMessagesForPeriod(chatId: string, start: Date, end: Date): Promise<any[]> {
    try {
      const allMessages = await storage.getTelegramMessages(chatId);
      console.log(`Found ${allMessages.length} total messages for chat ${chatId}`);
      
      const filteredMessages = allMessages.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        const inPeriod = msgDate >= start && msgDate <= end;
        if (inPeriod) {
          console.log(`Message in period: ${msgDate.toISOString()} - ${msg.text?.substring(0, 50)}...`);
        }
        return inPeriod;
      });
      
      console.log(`Filtered ${filteredMessages.length} messages for period ${start.toISOString()} to ${end.toISOString()}`);
      return filteredMessages;
    } catch (error) {
      console.error("Error getting messages for period:", error);
      return [];
    }
  }

  async generateDailySummary(date: string): Promise<void> {
    try {
      console.log(`Generating daily summary for ${date}...`);

      // Get messages for the date
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const monitoredChats = await storage.getMonitoredChats();
      let allMessages: any[] = [];

      for (const chat of monitoredChats) {
        const messages = await this.getMessagesForPeriod(chat.chatId, startDate, endDate);
        allMessages = allMessages.concat(messages);
      }

      if (allMessages.length === 0) {
        console.log("No messages found for daily summary");
        // Create empty summary to indicate completion
        const insertSummary: InsertDailySummary = {
          date: date,
          summary: "Сообщений за этот день не найдено",
          requiresResponse: [],
          keyTopics: []
        };
        await storage.createDailySummary(insertSummary);
        return;
      }

      // Generate summary with AI
      const summary = await this.generateDaySummaryText(allMessages, date);

      const insertSummary: InsertDailySummary = {
        date: date,
        summary: summary.summary,
        requiresResponse: summary.requiresResponse || [],
        keyTopics: summary.keyTopics || []
      };

      await storage.createDailySummary(insertSummary);
      console.log(`Daily summary generated for ${date}`);

    } catch (error) {
      console.error("Error generating daily summary:", error);
    }
  }

  private async generateDaySummaryText(messages: any[], date: string): Promise<any> {
    try {
      const conversationText = messages.map(msg => 
        `[${msg.timestamp.toISOString()}] ${msg.senderName || msg.sender || 'Unknown'}: ${msg.text || ''}`
      ).join('\n');

      const systemPrompt = `Создай краткое ежедневное резюме коммуникаций. Сосредоточься на ключевых темах, важных решениях и том, что требует внимания.

Ответ в JSON формате:
- summary: краткое резюме дня
- requiresResponse: массив вопросов/тем, требующих ответа
- keyTopics: массив ключевых тем обсуждения`;

      const prompt = `Создай ежедневное резюме для ${date} на основе этих сообщений:

${conversationText.slice(0, 8000)} // Ограничиваем размер для API`;

      const response = await callOpenAI(prompt, systemPrompt);
      return JSON.parse(response);

    } catch (error) {
      console.error("Error generating day summary:", error);
      return {
        summary: "Ошибка генерации резюме",
        requiresResponse: [],
        keyTopics: []
      };
    }
  }

  async analyzeAllPrivateChats(startDate: Date, endDate: Date): Promise<void> {
    try {
      console.log(`Analyzing all private chats for period ${startDate.toISOString()} to ${endDate.toISOString()}...`);

      // Получаем все чаты и фильтруем только персональные
      const allChats = await storage.getTelegramChats();
      const privateChats = allChats.filter(chat => chat.type === 'private');

      for (const chat of privateChats) {
        try {
          await this.analyzeConversationPeriod(chat.chatId, startDate, endDate);
          console.log(`Analyzed private chat: ${chat.title}`);
        } catch (error) {
          console.error(`Error analyzing chat ${chat.title}:`, error);
        }
      }

      console.log(`Completed analysis of ${privateChats.length} private chats`);
    } catch (error) {
      console.error("Error analyzing all private chats:", error);
      throw error;
    }
  }

  async generateAIInsights(): Promise<void> {
    try {
      console.log("Generating AI insights...");

      const recentAnalyses = await storage.getRecentAnalyses(10);
      
      if (recentAnalyses.length === 0) {
        console.log("No recent analyses found for insights");
        return;
      }

      // Generate insights based on recent analyses
      const insight = await this.generateInsightText(recentAnalyses);

      const insertInsight: InsertAiInsight = {
        title: insight.title || "AI Insight",
        description: insight.description || "",
        category: insight.category || "general",
        priority: insight.priority || "medium",
        actionRequired: insight.actionRequired || false
      };

      await storage.createAiInsight(insertInsight);
      console.log("AI insight generated");

    } catch (error) {
      console.error("Error generating AI insights:", error);
    }
  }

  private async generateInsightText(analyses: any[]): Promise<any> {
    try {
      const analysesText = analyses.map(analysis => 
        `Анализ ${analysis.chatTitle} (${analysis.startDate} - ${analysis.endDate}): ${analysis.summary}`
      ).join('\n');

      const systemPrompt = `Проанализируй паттерны и тенденции в коммуникациях. Выдели ключевые инсайты для улучшения управления.

Ответ в JSON формате:
- title: заголовок инсайта
- description: описание
- category: категория (communication, management, productivity)
- priority: приоритет (high, medium, low)
- actionRequired: требуется ли действие (boolean)`;

      const prompt = `Проанализируй эти анализы переписок и выдели ключевые инсайты:

${analysesText}`;

      const response = await callOpenAI(prompt, systemPrompt);
      return JSON.parse(response);

    } catch (error) {
      console.error("Error generating insight text:", error);
      return {
        title: "Ошибка анализа",
        description: "Не удалось сгенерировать инсайт",
        category: "general",
        priority: "medium",
        actionRequired: false
      };
    }
  }
}

export const aiService = new AIService();