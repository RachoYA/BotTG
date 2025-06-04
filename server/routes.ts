import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { telegramService } from "./telegram";
import { aiService } from "./ai";
import { schedulerService } from "./scheduler";
import { insertTelegramChatSchema, insertExtractedTaskSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Start services
  schedulerService.start();

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

  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getExtractedTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  // Update task status
  app.patch("/api/tasks/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['new', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const task = await storage.updateTaskStatus(id, status);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Create task manually
  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertExtractedTaskSchema.parse(req.body);
      const task = await storage.createExtractedTask(validatedData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
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

  // Database Statistics
  app.get("/api/database/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const chats = await storage.getTelegramChats();
      const messages = await storage.getTelegramMessages();
      const tasks = await storage.getExtractedTasks();
      const insights = await storage.getAiInsights();
      
      res.json({
        users: 1, // Current user count
        chats: chats.length,
        messages: messages.length,
        tasks: tasks.length,
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

  return httpServer;
}
