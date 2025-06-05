import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { telegramService } from "./telegram.js";
import { aiService } from "./ai.js";
import { localAI } from "./local-ai.js";
import { schedulerService } from "./scheduler.js";
import { russianLLM } from "./russian-llm.js";
import { insertTelegramChatSchema, insertPeriodAnalysisSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {

  // Local AI management routes
  app.get("/api/ai/local/status", async (req, res) => {
    try {
      const connected = await localAI.testConnection();
      const config = localAI.getConfig();
      res.json({
        connected,
        config,
        lastTest: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get local AI status" });
    }
  });

  app.post("/api/ai/local/test", async (req, res) => {
    try {
      const config = req.body;
      const { LocalAIService } = await import("./local-ai");
      const testInstance = new LocalAIService(config);
      const connected = await testInstance.testConnection();
      res.json({ connected, message: connected ? "Connection successful" : "Connection failed" });
    } catch (error) {
      res.status(500).json({ error: "Connection test failed" });
    }
  });

  app.post("/api/ai/local/config", async (req, res) => {
    try {
      const config = req.body;
      localAI.setFallbackMode(config.fallbackEnabled);
      res.json({ success: true, message: "Configuration updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // Russian LLM management routes
  app.get("/api/ai/russian/status", async (req, res) => {
    try {
      const isRunning = russianLLM.isServiceRunning();
      const config = russianLLM.getConfig();
      const testConnection = await russianLLM.testConnection();
      
      res.json({
        running: isRunning,
        connected: testConnection,
        config: config,
        baseURL: russianLLM.getBaseURL(),
        lastTest: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Russian LLM status" });
    }
  });

  app.get("/api/ai/russian/health", async (req, res) => {
    try {
      const isRunning = russianLLM.isServiceRunning();
      const config = russianLLM.getConfig();
      
      res.json({
        status: isRunning ? "healthy" : "error",
        model: config.model,
        port: config.port,
        isRunning
      });
    } catch (error) {
      res.status(500).json({ 
        status: "error",
        model: "russian-chat",
        port: 8080,
        isRunning: false
      });
    }
  });

  app.post("/api/ai/russian/toggle", async (req, res) => {
    try {
      const { enable } = req.body;
      
      if (enable) {
        await russianLLM.initialize();
        // Disable OpenAI fallback when Russian LLM is active
        localAI.setFallbackMode(false);
        res.json({ success: true, message: "Russian LLM service started, external fallback disabled" });
      } else {
        await russianLLM.shutdown();
        // Re-enable OpenAI fallback when Russian LLM is disabled
        localAI.setFallbackMode(true);
        res.json({ success: true, message: "Russian LLM service stopped, external fallback enabled" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle Russian LLM service" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Get daily summary
  app.get("/api/summary", async (req, res) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const summary = await storage.getDailySummary(date);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get daily summary" });
    }
  });

  // Get latest daily summary
  app.get("/api/summary/latest", async (req, res) => {
    try {
      const summary = await storage.getLatestDailySummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get latest summary" });
    }
  });

  // Generate daily summary manually
  app.post("/api/summary/generate", async (req, res) => {
    try {
      const date = req.body.date || new Date().toISOString().split('T')[0];
      await aiService.generateDailySummary(date);
      const summary = await storage.getDailySummary(date);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate daily summary" });
    }
  });

  // Get period analyses
  app.get("/api/period-analysis", async (req, res) => {
    try {
      const analyses = await storage.getPeriodAnalyses();
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Failed to get period analyses" });
    }
  });

  // Analyze conversation period
  app.post("/api/conversation/analyze-period", async (req, res) => {
    try {
      const { startDate, endDate, chatId } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      // Run period analysis with conversation context focus
      const result = await aiService.analyzeConversationPeriod(chatId, new Date(startDate), new Date(endDate));
      
      res.json({
        message: "Контекстный анализ переписки завершен",
        analysis: result
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze conversation period" });
    }
  });

  // Get recent analyses
  app.get("/api/period-analysis/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const analyses = await storage.getRecentAnalyses(limit);
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent analyses" });
    }
  });

  // Get monitored chats
  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getTelegramChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chats" });
    }
  });

  // Get messages from specific chat or all messages
  app.get("/api/messages", async (req, res) => {
    try {
      const { chatId, limit } = req.query;
      const messages = await storage.getTelegramMessages(
        chatId as string, 
        limit ? parseInt(limit as string) : undefined
      );
      res.json(messages);
    } catch (error) {
      console.error("Error getting messages:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Get monitored chats only
  app.get("/api/chats/monitored", async (req, res) => {
    try {
      const chats = await storage.getMonitoredChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get monitored chats" });
    }
  });

  // Get messages for a specific chat
  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const messages = await storage.getTelegramMessages(chatId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Toggle chat monitoring
  app.patch("/api/chats/:chatId/monitoring", async (req, res) => {
    try {
      const { chatId } = req.params;
      const { monitored } = req.body;
      
      const success = await telegramService.toggleChatMonitoring(chatId, monitored);
      if (!success) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const chat = await storage.getTelegramChatByChatId(chatId);
      res.json(chat);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat monitoring" });
    }
  });

  // Add new chat for monitoring
  app.post("/api/chats", async (req, res) => {
    try {
      const validatedData = insertTelegramChatSchema.parse(req.body);
      const chat = await storage.createTelegramChat(validatedData);
      res.json(chat);
    } catch (error) {
      res.status(400).json({ message: "Invalid chat data" });
    }
  });

  // Get AI insights
  app.get("/api/insights", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const insights = await storage.getRecentAiInsights(limit);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to get AI insights" });
    }
  });

  // Force refresh AI insights
  app.post("/api/insights/refresh", async (req, res) => {
    try {
      await aiService.generateAIInsights();
      const insights = await storage.getRecentAiInsights(5);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to refresh AI insights" });
    }
  });

  // Get recent messages
  app.get("/api/messages", async (req, res) => {
    try {
      const chatId = req.query.chatId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getTelegramMessages(chatId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Toggle chat monitoring
  app.post("/api/telegram/toggle-monitoring", async (req, res) => {
    try {
      const { chatId, monitored } = req.body;
      const success = await telegramService.toggleChatMonitoring(chatId, monitored);
      if (success) {
        res.json({ success: true, message: "Мониторинг обновлен" });
      } else {
        res.status(404).json({ message: "Чат не найден" });
      }
    } catch (error) {
      res.status(500).json({ message: "Ошибка обновления мониторинга" });
    }
  });

  // Load messages from specific chat
  app.post("/api/telegram/load-messages", async (req, res) => {
    try {
      const { chatId } = req.body;
      
      if (!chatId) {
        console.log("Invalid chatId:", chatId);
        return res.status(400).json({ message: "chatId is required" });
      }
      
      await telegramService.loadMessages(chatId, 50);
      res.json({ success: true, message: "Сообщения загружены" });
    } catch (error) {
      console.error("Load messages error:", error);
      res.status(500).json({ message: "Ошибка загрузки сообщений" });
    }
  });

  // Reload dialogs
  app.post("/api/telegram/reload-dialogs", async (req, res) => {
    try {
      await telegramService.loadDialogs();
      res.json({ success: true, message: "Диалоги обновлены" });
    } catch (error) {
      res.status(500).json({ message: "Ошибка обновления диалогов" });
    }
  });

  // Load messages from all chats
  app.post("/api/telegram/load-all-messages", async (req, res) => {
    try {
      const chats = await storage.getTelegramChats();
      let totalLoaded = 0;
      
      for (const chat of chats) {
        try {
          await telegramService.loadMessages(chat.chatId, 100);
          totalLoaded++;
          console.log(`Loaded messages from chat: ${chat.title} (${chat.chatId})`);
        } catch (chatError) {
          console.log(`Failed to load messages from chat ${chat.chatId}:`, chatError);
        }
      }
      
      res.json({ 
        success: true, 
        message: `Сообщения загружены из ${totalLoaded} чатов`,
        totalChats: chats.length,
        loadedChats: totalLoaded
      });
    } catch (error) {
      console.error("Load all messages error:", error);
      res.status(500).json({ message: "Ошибка загрузки всех сообщений" });
    }
  });

  // Initialize RAG system
  app.post("/api/rag/initialize", async (req, res) => {
    try {
      const { ragService } = await import("./rag-db");
      await ragService.initialize();
      const stats = await ragService.getStats();
      
      res.json({ 
        success: true, 
        message: "RAG система инициализирована",
        stats
      });
    } catch (error) {
      console.error("RAG initialization error:", error);
      res.status(500).json({ message: "Ошибка инициализации RAG системы" });
    }
  });

  // Get RAG system stats
  app.get("/api/rag/stats", async (req, res) => {
    try {
      const { ragService } = await import("./rag-db");
      const stats = await ragService.getStats();
      res.json(stats);
    } catch (error) {
      console.error("RAG stats error:", error);
      res.status(500).json({ message: "Ошибка получения статистики RAG" });
    }
  });

  // Semantic search endpoint
  app.post("/api/rag/search", async (req, res) => {
    try {
      const { query, chatIds, limit = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const { ragService } = await import("./rag-db");
      const results = await ragService.semanticSearch(query, chatIds, limit);
      
      res.json(results);
    } catch (error) {
      console.error("Semantic search error:", error);
      res.status(500).json({ message: "Ошибка семантического поиска" });
    }
  });

  // Новый API для анализа периода с полным контекстом
  app.post("/api/ai/analyze-period", async (req, res) => {
    try {
      const { startDate, endDate, chatId } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate и endDate обязательны" });
      }

      if (chatId === "all") {
        // Анализ всех персональных чатов за период
        await aiService.analyzeAllPrivateChats(new Date(startDate), new Date(endDate));
        res.json({ 
          success: true, 
          message: "Контекстный анализ всех персональных чатов завершен" 
        });
      } else if (chatId) {
        // Анализ конкретного чата с полным контекстом
        await aiService.analyzeConversationPeriod(chatId, new Date(startDate), new Date(endDate));
        res.json({ 
          success: true, 
          message: `Анализ чата ${chatId} с полным контекстом завершен` 
        });
      } else {
        return res.status(400).json({ error: "Необходимо выбрать чат для анализа" });
      }
    } catch (error) {
      console.error("Ошибка анализа периода:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Ошибка анализа' });
    }
  });

  const httpServer = createServer(app);

  // Telegram connection endpoints
  app.post("/api/telegram/connect", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      telegramService.setPhoneNumber(phoneNumber);
      const result = await telegramService.connect();
      const response = { 
        success: true, 
        connected: telegramService.isClientConnected(),
        needsCode: result?.needsCode || false
      };
      console.log("Connect API response:", response);
      res.json(response);
    } catch (error) {
      console.log("Telegram connect error:", error);
      res.status(500).json({ message: "Failed to connect to Telegram" });
    }
  });

  app.post("/api/telegram/verify", async (req, res) => {
    try {
      const { code, password } = req.body;
      await telegramService.verifyCode(code, password);
      res.json({ success: true, connected: telegramService.isClientConnected() });
    } catch (error: any) {
      console.log("Telegram verify error:", error);
      if (error.needsPassword) {
        res.status(400).json({ 
          message: "Two-factor authentication password required",
          needsPassword: true 
        });
      } else {
        res.status(500).json({ message: error.message || "Failed to verify code" });
      }
    }
  });

  app.get("/api/telegram/status", async (req, res) => {
    try {
      res.json({ 
        connected: telegramService.isClientConnected(),
        sessionString: telegramService.getSessionString(),
        apiId: "24788533",
        apiHash: "3a5e530327b9e7e8e90b54c6ab0259a1"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get Telegram status" });
    }
  });

  app.post("/api/telegram/reset-session", async (req, res) => {
    try {
      await telegramService.disconnect();
      // Clear session file
      const fs = await import('fs');
      const sessionPath = '.telegram_session';
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
      }
      res.json({ success: true, message: "Session cleared successfully" });
    } catch (error) {
      console.error("Reset session error:", error);
      res.status(500).json({ message: "Failed to reset session" });
    }
  });

  app.post("/api/telegram/load-messages", async (req, res) => {
    try {
      if (!telegramService.isClientConnected()) {
        return res.status(400).json({ message: "Telegram not connected" });
      }

      const { chatId, limit, loadAll } = req.body;
      
      if (loadAll) {
        // Загружаем сообщения из всех чатов
        const chats = await storage.getTelegramChats();
        let totalLoaded = 0;
        let messagesCount = 0;

        console.log(`Starting bulk message load from ${chats.length} chats`);

        for (const chat of chats) {
          console.log(`Loading messages from chat: ${chat.title} (${chat.chatId})`);
          try {
            await telegramService.loadMessages(chat.chatId, limit || 100);
            totalLoaded++;
            messagesCount += (limit || 100);
          } catch (error) {
            console.error(`Failed to load messages from chat ${chat.title}:`, error);
          }
        }

        res.json({ 
          success: true, 
          message: `Loaded messages from ${totalLoaded}/${chats.length} chats`,
          chatsProcessed: totalLoaded,
          totalChats: chats.length,
          estimatedMessages: messagesCount
        });
      } else {
        // Загружаем сообщения из конкретного чата
        await telegramService.loadMessages(chatId, limit || 50);
        res.json({ success: true, message: "Messages loaded from single chat" });
      }
    } catch (error) {
      console.log("Load messages error:", error);
      res.status(500).json({ message: "Failed to load messages" });
    }
  });

  // Test AI Model
  app.post("/api/ai/test", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const { aiService } = await import("./ai");
      const response = await aiService.testModel(prompt);
      
      res.json({ 
        success: true, 
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("AI test error:", error);
      res.status(500).json({ 
        error: "AI model test failed", 
        details: error.message || "Unknown error"
      });
    }
  });

  // Generate AI Insights manually
  app.post("/api/ai/generate-insights", async (req, res) => {
    try {
      const { aiService } = await import("./ai");
      await aiService.generateAIInsights();
      
      res.json({ 
        success: true, 
        message: "AI insights generated successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("AI insights generation error:", error);
      res.status(500).json({ 
        error: "Failed to generate AI insights", 
        details: error.message || "Unknown error"
      });
    }
  });

  // Process messages for a specific period
  app.post("/api/ai/process-period", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const { aiService } = await import("./ai");
      const result = await aiService.processUnreadMessages();
      
      res.json({ 
        success: true, 
        message: "Period processed successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Period processing error:", error);
      res.status(500).json({ 
        error: "Failed to process period messages", 
        details: error.message || "Unknown error"
      });
    }
  });

  // Database Statistics
  app.get("/api/database/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const chats = await storage.getTelegramChats();
      const messages = await storage.getTelegramMessages();
      const analyses = await storage.getPeriodAnalyses();
      const insights = await storage.getAiInsights();
      
      res.json({
        users: 1, // Current user count
        chats: chats.length,
        messages: messages.length,
        analyses: analyses.length,
        insights: insights.length,
        ...stats
      });
    } catch (error) {
      console.error("Database stats error:", error);
      res.status(500).json({ error: "Failed to get database statistics" });
    }
  });

  // Cleanup on shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down services...');
    telegramService.disconnect();
    schedulerService.stop();
    process.exit(0);
  });

  // Training and message analysis endpoints
  app.get("/api/telegram/message-stats", async (req, res) => {
    try {
      const messages = await storage.getTelegramMessages();
      const grachaMessages = messages.filter(msg => msg.senderName === 'Грачья');
      const uniqueChats = new Set(messages.map(msg => msg.chatId)).size;
      
      res.json({
        totalMessages: messages.length,
        grachaMessages: grachaMessages.length,
        uniqueChats: uniqueChats,
        dateRange: {
          earliest: messages.length > 0 ? messages[0].timestamp : null,
          latest: messages.length > 0 ? messages[messages.length - 1].timestamp : null
        }
      });
    } catch (error: any) {
      console.error("Message stats error:", error);
      res.status(500).json({ error: "Failed to get message stats" });
    }
  });

  app.post("/api/training/analyze-messages", async (req, res) => {
    try {
      const messages = await storage.getTelegramMessages();
      const grachaMessages = messages.filter(msg => 
        msg.senderName === 'Грачья' && 
        msg.text && 
        msg.text.length > 5
      );

      // Анализ паттернов сообщений
      const patterns = {
        financial: grachaMessages.filter(msg => 
          msg.text?.toLowerCase().includes('млн') ||
          msg.text?.toLowerCase().includes('поступлени') ||
          msg.text?.toLowerCase().includes('налог')
        ).length,
        technical: grachaMessages.filter(msg => 
          msg.text?.toLowerCase().includes('гпт') ||
          msg.text?.toLowerCase().includes('шарпе') ||
          msg.text?.toLowerCase().includes('разработ')
        ).length,
        team: grachaMessages.filter(msg => 
          ['роман', 'катя', 'мария', 'алексей', 'иван'].some(name => 
            msg.text?.toLowerCase().includes(name)
          )
        ).length
      };

      res.json({
        success: true,
        totalAnalyzed: grachaMessages.length,
        patterns: patterns,
        sampleMessages: grachaMessages.slice(0, 10).map(msg => ({
          text: msg.text,
          timestamp: msg.timestamp,
          chatId: msg.chatId
        }))
      });
    } catch (error: any) {
      console.error("Training analysis error:", error);
      res.status(500).json({ error: "Failed to analyze messages for training" });
    }
  });

  return httpServer;
}
