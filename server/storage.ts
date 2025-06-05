import {
  users,
  telegramChats,
  telegramMessages,
  extractedTasks,
  dailySummaries,
  aiInsights,
  type User,
  type InsertUser,
  type TelegramChat,
  type InsertTelegramChat,
  type TelegramMessage,
  type InsertTelegramMessage,
  type ExtractedTask,
  type InsertExtractedTask,
  type DailySummary,
  type InsertDailySummary,
  type AiInsight,
  type InsertAiInsight,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Telegram Chats
  getTelegramChats(): Promise<TelegramChat[]>;
  getMonitoredChats(): Promise<TelegramChat[]>;
  getTelegramChatByChatId(chatId: string): Promise<TelegramChat | undefined>;
  createTelegramChat(chat: InsertTelegramChat): Promise<TelegramChat>;
  updateTelegramChat(id: number, updates: Partial<TelegramChat>): Promise<TelegramChat | undefined>;

  // Telegram Messages
  getTelegramMessages(chatId?: string, limit?: number): Promise<TelegramMessage[]>;
  getUnprocessedMessages(): Promise<TelegramMessage[]>;
  createTelegramMessage(message: InsertTelegramMessage): Promise<TelegramMessage>;
  markMessageAsProcessed(id: number): Promise<void>;

  // Extracted Tasks
  getExtractedTasks(): Promise<ExtractedTask[]>;
  getTasksByStatus(status: string): Promise<ExtractedTask[]>;
  getUrgentTasks(): Promise<ExtractedTask[]>;
  createExtractedTask(task: InsertExtractedTask): Promise<ExtractedTask>;
  updateTaskStatus(id: number, status: string): Promise<ExtractedTask | undefined>;
  deleteTask(id: number): Promise<void>;

  // Daily Summaries
  getDailySummary(date: string): Promise<DailySummary | undefined>;
  getLatestDailySummary(): Promise<DailySummary | undefined>;
  createDailySummary(summary: InsertDailySummary): Promise<DailySummary>;

  // AI Insights
  getAiInsights(): Promise<AiInsight[]>;
  getRecentAiInsights(limit?: number): Promise<AiInsight[]>;
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    unreadMessages: number;
    urgentTasks: number;
    activeChats: number;
    completedTasksPercentage: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private telegramChats: Map<number, TelegramChat>;
  private telegramMessages: Map<number, TelegramMessage>;
  private extractedTasks: Map<number, ExtractedTask>;
  private dailySummaries: Map<number, DailySummary>;
  private aiInsights: Map<number, AiInsight>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.telegramChats = new Map();
    this.telegramMessages = new Map();
    this.extractedTasks = new Map();
    this.dailySummaries = new Map();
    this.aiInsights = new Map();
    this.currentId = 1;
    
    // Добавляем демо-данные для демонстрации
    this.initDemoData();
  }

  private async initDemoData() {
    // Создаем демо-чаты
    const demoChats = [
      {
        chatId: "demo_management",
        title: "Руководство компании",
        type: "group",
        isMonitored: true,
        participantCount: 5
      },
      {
        chatId: "demo_sales",
        title: "Отдел продаж",
        type: "group",
        isMonitored: true,
        participantCount: 8
      },
      {
        chatId: "demo_development",
        title: "Команда разработки",
        type: "group",
        isMonitored: false,
        participantCount: 12
      }
    ];

    for (const chat of demoChats) {
      await this.createTelegramChat(chat);
    }

    // Создаем демо-сообщения
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const demoMessages = [
      {
        messageId: "msg_1",
        chatId: "demo_management",
        senderId: "user_1",
        senderName: "Иван Петров",
        text: "Нужно срочно подготовить отчет по продажам к завтрашней встрече с инвесторами",
        timestamp: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00
        isProcessed: false
      },
      {
        messageId: "msg_2",
        chatId: "demo_sales",
        senderId: "user_2",
        senderName: "Мария Сидорова",
        text: "Клиент ABC Corp просит скидку 15%. Можем ли мы согласиться?",
        timestamp: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00
        isProcessed: false
      },
      {
        messageId: "msg_3",
        chatId: "demo_management",
        senderId: "user_3",
        senderName: "Александр Козлов",
        text: "Обсудили с HR новую систему мотивации. Принято решение повысить базовую зарплату на 10%",
        timestamp: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00
        isProcessed: false
      }
    ];

    for (const message of demoMessages) {
      await this.createTelegramMessage(message);
    }

    // Создаем демо-задачи
    const demoTasks = [
      {
        title: "Подготовить отчет по продажам",
        description: "Создать презентацию с результатами квартала для встречи с инвесторами",
        urgency: "high",
        status: "pending",
        deadline: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // завтра
        chatId: "demo_management",
        messageId: "msg_1"
      },
      {
        title: "Принять решение по скидке ABC Corp",
        description: "Рассмотреть запрос на скидку 15% от крупного клиента",
        urgency: "high",
        status: "pending",
        deadline: null,
        chatId: "demo_sales",
        messageId: "msg_2"
      },
      {
        title: "Оформить повышение зарплат",
        description: "Подготовить документы для HR по повышению базовой зарплаты на 10%",
        urgency: "medium",
        status: "completed",
        deadline: null,
        chatId: "demo_management",
        messageId: "msg_3"
      }
    ];

    for (const task of demoTasks) {
      await this.createExtractedTask(task);
    }

    // Создаем ежедневную сводку
    const todayStr = today.toISOString().split('T')[0];
    const summary = {
      date: todayStr,
      summary: "Сегодня обработано 3 важных сообщения из 2 чатов. Требуется ваше решение по скидке для ABC Corp. Подготовлен отчет по продажам для инвесторов.",
      requiresResponse: [
        "Клиент ABC Corp просит скидку 15%. Можем ли мы согласиться? (Отдел продаж, 10:00)"
      ],
      keyTopics: [
        "Подготовка к встрече с инвесторами - презентация отчета по продажам",
        "Повышение базовой зарплаты на 10% - решение принято",
        "Скидка для ABC Corp - требует решения"
      ]
    };

    await this.createDailySummary(summary);

    // Создаем AI инсайты
    const insights = [
      {
        type: 'priority',
        title: 'Совет по приоритизации',
        content: 'У вас 1 срочная задача. Рекомендуется сначала ответить на запрос по отчету.'
      },
      {
        type: 'time_management', 
        title: 'Управление временем',
        content: 'Есть непрочитанные сообщения, требующие вашего внимания.'
      }
    ];

    for (const insight of insights) {
      await this.createAiInsight(insight);
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Telegram Chats
  async getTelegramChats(): Promise<TelegramChat[]> {
    return Array.from(this.telegramChats.values());
  }

  async getMonitoredChats(): Promise<TelegramChat[]> {
    return Array.from(this.telegramChats.values()).filter(chat => chat.isMonitored);
  }

  async getTelegramChatByChatId(chatId: string): Promise<TelegramChat | undefined> {
    return Array.from(this.telegramChats.values()).find(chat => chat.chatId === chatId);
  }

  async createTelegramChat(insertChat: InsertTelegramChat): Promise<TelegramChat> {
    const id = this.currentId++;
    const chat: TelegramChat = {
      ...insertChat,
      id,
      isMonitored: insertChat.isMonitored ?? false,
      participantCount: insertChat.participantCount ?? 0,
      createdAt: new Date(),
    };
    this.telegramChats.set(id, chat);
    return chat;
  }

  async updateTelegramChat(id: number, updates: Partial<TelegramChat>): Promise<TelegramChat | undefined> {
    const chat = this.telegramChats.get(id);
    if (!chat) return undefined;
    
    const updatedChat = { ...chat, ...updates };
    this.telegramChats.set(id, updatedChat);
    return updatedChat;
  }

  // Telegram Messages
  async getTelegramMessages(chatId?: string, limit?: number): Promise<TelegramMessage[]> {
    let messages = Array.from(this.telegramMessages.values());
    
    if (chatId) {
      messages = messages.filter(msg => msg.chatId === chatId);
    }
    
    messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (limit) {
      messages = messages.slice(0, limit);
    }
    
    return messages;
  }

  async getUnprocessedMessages(): Promise<TelegramMessage[]> {
    return Array.from(this.telegramMessages.values()).filter(msg => !msg.isProcessed);
  }

  async createTelegramMessage(insertMessage: InsertTelegramMessage): Promise<TelegramMessage> {
    const id = this.currentId++;
    const message: TelegramMessage = {
      ...insertMessage,
      id,
      senderId: insertMessage.senderId ?? null,
      senderName: insertMessage.senderName ?? null,
      text: insertMessage.text ?? null,
      isProcessed: insertMessage.isProcessed ?? false,
      createdAt: new Date(),
    };
    this.telegramMessages.set(id, message);
    return message;
  }

  async markMessageAsProcessed(id: number): Promise<void> {
    const message = this.telegramMessages.get(id);
    if (message) {
      message.isProcessed = true;
      this.telegramMessages.set(id, message);
    }
  }

  // Extracted Tasks
  async getExtractedTasks(): Promise<ExtractedTask[]> {
    return Array.from(this.extractedTasks.values())
      .sort((a, b) => b.extractedAt!.getTime() - a.extractedAt!.getTime());
  }

  async getTasksByStatus(status: string): Promise<ExtractedTask[]> {
    return Array.from(this.extractedTasks.values()).filter(task => task.status === status);
  }

  async getUrgentTasks(): Promise<ExtractedTask[]> {
    return Array.from(this.extractedTasks.values()).filter(task => 
      task.priority === 'urgent' && task.status !== 'completed'
    );
  }

  async createExtractedTask(insertTask: InsertExtractedTask): Promise<ExtractedTask> {
    const id = this.currentId++;
    const task: ExtractedTask = {
      ...insertTask,
      id,
      status: insertTask.status ?? 'new',
      description: insertTask.description ?? null,
      deadline: insertTask.deadline ?? null,
      sourceMessageId: insertTask.sourceMessageId ?? null,
      sourceChatId: insertTask.sourceChatId ?? null,
      extractedAt: new Date(),
      completedAt: null,
    };
    this.extractedTasks.set(id, task);
    return task;
  }

  async updateTaskStatus(id: number, status: string): Promise<ExtractedTask | undefined> {
    const task = this.extractedTasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = {
      ...task,
      status,
      completedAt: status === 'completed' ? new Date() : null,
    };
    this.extractedTasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    this.extractedTasks.delete(id);
  }

  // Daily Summaries
  async getDailySummary(date: string): Promise<DailySummary | undefined> {
    return Array.from(this.dailySummaries.values()).find(summary => summary.date === date);
  }

  async getLatestDailySummary(): Promise<DailySummary | undefined> {
    const summaries = Array.from(this.dailySummaries.values());
    return summaries.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0];
  }

  async createDailySummary(insertSummary: InsertDailySummary): Promise<DailySummary> {
    const id = this.currentId++;
    const summary: DailySummary = {
      ...insertSummary,
      id,
      requiresResponse: insertSummary.requiresResponse ?? [],
      importantDiscussions: insertSummary.importantDiscussions ?? [],
      keyDecisions: insertSummary.keyDecisions ?? [],
      createdAt: new Date(),
    };
    this.dailySummaries.set(id, summary);
    return summary;
  }

  // AI Insights
  async getAiInsights(): Promise<AiInsight[]> {
    return Array.from(this.aiInsights.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getRecentAiInsights(limit = 5): Promise<AiInsight[]> {
    const insights = await this.getAiInsights();
    return insights.slice(0, limit);
  }

  async createAiInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const id = this.currentId++;
    const insight: AiInsight = {
      ...insertInsight,
      id,
      createdAt: new Date(),
    };
    this.aiInsights.set(id, insight);
    return insight;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
    unreadMessages: number;
    urgentTasks: number;
    activeChats: number;
    completedTasksPercentage: number;
  }> {
    const unprocessedMessages = await this.getUnprocessedMessages();
    const urgentTasks = await this.getUrgentTasks();
    const monitoredChats = await this.getMonitoredChats();
    const allTasks = await this.getExtractedTasks();
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    
    const completedTasksPercentage = allTasks.length > 0 
      ? Math.round((completedTasks.length / allTasks.length) * 100)
      : 0;

    return {
      unreadMessages: unprocessedMessages.length,
      urgentTasks: urgentTasks.length,
      activeChats: monitoredChats.length,
      completedTasksPercentage,
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Telegram Chats
  async getTelegramChats(): Promise<TelegramChat[]> {
    return await db.select().from(telegramChats).orderBy(desc(telegramChats.id));
  }

  async getMonitoredChats(): Promise<TelegramChat[]> {
    return await db.select().from(telegramChats).where(eq(telegramChats.isMonitored, true));
  }

  async getTelegramChatByChatId(chatId: string): Promise<TelegramChat | undefined> {
    const [chat] = await db.select().from(telegramChats).where(eq(telegramChats.chatId, chatId));
    return chat || undefined;
  }

  async createTelegramChat(insertChat: InsertTelegramChat): Promise<TelegramChat> {
    const [chat] = await db
      .insert(telegramChats)
      .values(insertChat)
      .returning();
    return chat;
  }

  async updateTelegramChat(id: number, updates: Partial<TelegramChat>): Promise<TelegramChat | undefined> {
    const [chat] = await db
      .update(telegramChats)
      .set(updates)
      .where(eq(telegramChats.id, id))
      .returning();
    return chat || undefined;
  }

  // Telegram Messages
  async getTelegramMessages(chatId?: string, limit?: number): Promise<TelegramMessage[]> {
    if (chatId && limit) {
      return await db.select().from(telegramMessages)
        .where(eq(telegramMessages.chatId, chatId))
        .orderBy(desc(telegramMessages.timestamp))
        .limit(limit);
    } else if (chatId) {
      return await db.select().from(telegramMessages)
        .where(eq(telegramMessages.chatId, chatId))
        .orderBy(desc(telegramMessages.timestamp));
    } else if (limit) {
      return await db.select().from(telegramMessages)
        .orderBy(desc(telegramMessages.timestamp))
        .limit(limit);
    } else {
      return await db.select().from(telegramMessages)
        .orderBy(desc(telegramMessages.timestamp));
    }
  }

  async getUnprocessedMessages(): Promise<TelegramMessage[]> {
    return await db.select().from(telegramMessages)
      .where(eq(telegramMessages.isProcessed, false))
      .orderBy(desc(telegramMessages.timestamp));
  }

  async createTelegramMessage(insertMessage: InsertTelegramMessage): Promise<TelegramMessage> {
    try {
      const [message] = await db
        .insert(telegramMessages)
        .values(insertMessage)
        .returning();
      return message;
    } catch (error: any) {
      if (error.code === '23505') {
        // Дублирование - получаем существующее сообщение
        const [existing] = await db
          .select()
          .from(telegramMessages)
          .where(and(
            eq(telegramMessages.messageId, insertMessage.messageId),
            eq(telegramMessages.chatId, insertMessage.chatId)
          ));
        return existing;
      }
      throw error;
    }
  }

  async markMessageAsProcessed(id: number): Promise<void> {
    await db
      .update(telegramMessages)
      .set({ isProcessed: true })
      .where(eq(telegramMessages.id, id));
  }

  // Extracted Tasks
  async getExtractedTasks(): Promise<ExtractedTask[]> {
    return await db.select().from(extractedTasks).orderBy(desc(extractedTasks.id));
  }

  async getTasksByStatus(status: string): Promise<ExtractedTask[]> {
    return await db.select().from(extractedTasks)
      .where(eq(extractedTasks.status, status))
      .orderBy(desc(extractedTasks.id));
  }

  async getUrgentTasks(): Promise<ExtractedTask[]> {
    return await db.select().from(extractedTasks)
      .where(eq(extractedTasks.urgency, 'high'))
      .orderBy(desc(extractedTasks.id));
  }

  async createExtractedTask(insertTask: InsertExtractedTask): Promise<ExtractedTask> {
    const [task] = await db
      .insert(extractedTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTaskStatus(id: number, status: string): Promise<ExtractedTask | undefined> {
    const [task] = await db
      .update(extractedTasks)
      .set({ status })
      .where(eq(extractedTasks.id, id))
      .returning();
    return task || undefined;
  }

  // Daily Summaries
  async getDailySummary(date: string): Promise<DailySummary | undefined> {
    const [summary] = await db.select().from(dailySummaries)
      .where(eq(dailySummaries.date, date));
    return summary || undefined;
  }

  async getLatestDailySummary(): Promise<DailySummary | undefined> {
    const [summary] = await db.select().from(dailySummaries)
      .orderBy(desc(dailySummaries.id))
      .limit(1);
    return summary || undefined;
  }

  async createDailySummary(insertSummary: InsertDailySummary): Promise<DailySummary> {
    const [summary] = await db
      .insert(dailySummaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  // AI Insights
  async getAiInsights(): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.id));
  }

  async getRecentAiInsights(limit = 5): Promise<AiInsight[]> {
    return await db.select().from(aiInsights)
      .orderBy(desc(aiInsights.id))
      .limit(limit);
  }

  async createAiInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values(insertInsight)
      .returning();
    return insight;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
    unreadMessages: number;
    urgentTasks: number;
    activeChats: number;
    completedTasksPercentage: number;
  }> {
    const [unreadCount] = await db.select({ count: count() }).from(telegramMessages)
      .where(eq(telegramMessages.isProcessed, false));
    
    const [urgentCount] = await db.select({ count: count() }).from(extractedTasks)
      .where(eq(extractedTasks.urgency, 'high'));
    
    const [activeCount] = await db.select({ count: count() }).from(telegramChats)
      .where(eq(telegramChats.isMonitored, true));
    
    const [totalTasks] = await db.select({ count: count() }).from(extractedTasks);
    const [completedTasks] = await db.select({ count: count() }).from(extractedTasks)
      .where(eq(extractedTasks.status, 'completed'));
    
    const completedTasksPercentage = totalTasks.count > 0 
      ? Math.round((completedTasks.count / totalTasks.count) * 100) 
      : 0;

    return {
      unreadMessages: unreadCount.count,
      urgentTasks: urgentCount.count,
      activeChats: activeCount.count,
      completedTasksPercentage,
    };
  }
}

export const storage = new DatabaseStorage();
