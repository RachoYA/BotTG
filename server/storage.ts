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

export const storage = new MemStorage();
