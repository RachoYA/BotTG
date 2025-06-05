import {
  users,
  telegramChats,
  telegramMessages,
  periodAnalysis,
  dailySummaries,
  aiInsights,
  type User,
  type InsertUser,
  type TelegramChat,
  type InsertTelegramChat,
  type TelegramMessage,
  type InsertTelegramMessage,
  type PeriodAnalysis,
  type InsertPeriodAnalysis,
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

  // Period Analysis
  getPeriodAnalyses(): Promise<PeriodAnalysis[]>;
  getPeriodAnalysisByPeriod(startDate: string, endDate: string, chatId?: string): Promise<PeriodAnalysis[]>;
  createPeriodAnalysis(analysis: InsertPeriodAnalysis): Promise<PeriodAnalysis>;
  getRecentAnalyses(limit?: number): Promise<PeriodAnalysis[]>;

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
    pendingAnalyses: number;
    activeChats: number;
    responseRequiredChats: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private telegramChats: Map<number, TelegramChat>;
  private telegramMessages: Map<number, TelegramMessage>;
  private periodAnalyses: Map<number, PeriodAnalysis>;
  private dailySummaries: Map<number, DailySummary>;
  private aiInsights: Map<number, AiInsight>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.telegramChats = new Map();
    this.telegramMessages = new Map();
    this.periodAnalyses = new Map();
    this.dailySummaries = new Map();
    this.aiInsights = new Map();
    this.currentId = 1;
    
    // Initialize demo data
    this.initDemoData();
  }

  private async initDemoData() {
    // Demo user only - no fake chats or messages
    const demoUser: User = {
      id: 1,
      username: "admin",
      password: "password"
    };
    this.users.set(1, demoUser);
    this.currentId = 2;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTelegramChats(): Promise<TelegramChat[]> {
    return Array.from(this.telegramChats.values());
  }

  async getMonitoredChats(): Promise<TelegramChat[]> {
    return Array.from(this.telegramChats.values()).filter(chat => chat.isMonitored);
  }

  async getTelegramChatByChatId(chatId: string): Promise<TelegramChat | undefined> {
    for (const chat of this.telegramChats.values()) {
      if (chat.chatId === chatId) {
        return chat;
      }
    }
    return undefined;
  }

  async createTelegramChat(insertChat: InsertTelegramChat): Promise<TelegramChat> {
    const id = this.currentId++;
    const chat: TelegramChat = {
      ...insertChat,
      id,
      createdAt: new Date()
    };
    this.telegramChats.set(id, chat);
    return chat;
  }

  async updateTelegramChat(id: number, updates: Partial<TelegramChat>): Promise<TelegramChat | undefined> {
    const chat = this.telegramChats.get(id);
    if (chat) {
      const updatedChat = { ...chat, ...updates };
      this.telegramChats.set(id, updatedChat);
      return updatedChat;
    }
    return undefined;
  }

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
      createdAt: new Date()
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

  // Period Analysis methods
  async getPeriodAnalyses(): Promise<PeriodAnalysis[]> {
    return Array.from(this.periodAnalyses.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getPeriodAnalysisByPeriod(startDate: string, endDate: string, chatId?: string): Promise<PeriodAnalysis[]> {
    return Array.from(this.periodAnalyses.values()).filter(analysis => {
      const matchesPeriod = analysis.startDate === startDate && analysis.endDate === endDate;
      const matchesChat = !chatId || analysis.chatId === chatId;
      return matchesPeriod && matchesChat;
    });
  }

  async createPeriodAnalysis(insertAnalysis: InsertPeriodAnalysis): Promise<PeriodAnalysis> {
    const id = this.currentId++;
    const analysis: PeriodAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date()
    };
    this.periodAnalyses.set(id, analysis);
    return analysis;
  }

  async getRecentAnalyses(limit = 5): Promise<PeriodAnalysis[]> {
    return Array.from(this.periodAnalyses.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async getDailySummary(date: string): Promise<DailySummary | undefined> {
    for (const summary of this.dailySummaries.values()) {
      if (summary.date === date) {
        return summary;
      }
    }
    return undefined;
  }

  async getLatestDailySummary(): Promise<DailySummary | undefined> {
    const summaries = Array.from(this.dailySummaries.values());
    if (summaries.length === 0) return undefined;
    
    return summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }

  async createDailySummary(insertSummary: InsertDailySummary): Promise<DailySummary> {
    const id = this.currentId++;
    const summary: DailySummary = {
      ...insertSummary,
      id,
      createdAt: new Date()
    };
    this.dailySummaries.set(id, summary);
    return summary;
  }

  async getAiInsights(): Promise<AiInsight[]> {
    return Array.from(this.aiInsights.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getRecentAiInsights(limit = 5): Promise<AiInsight[]> {
    return Array.from(this.aiInsights.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createAiInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const id = this.currentId++;
    const insight: AiInsight = {
      ...insertInsight,
      id,
      createdAt: new Date()
    };
    this.aiInsights.set(id, insight);
    return insight;
  }

  async getDashboardStats(): Promise<{
    unreadMessages: number;
    pendingAnalyses: number;
    activeChats: number;
    responseRequiredChats: number;
  }> {
    const unreadMessages = Array.from(this.telegramMessages.values()).filter(msg => !msg.isProcessed).length;
    const activeChats = Array.from(this.telegramChats.values()).filter(chat => chat.isMonitored).length;
    const pendingAnalyses = Array.from(this.periodAnalyses.values()).filter(analysis => analysis.responseRequired).length;
    const responseRequiredChats = Array.from(this.periodAnalyses.values()).filter(analysis => analysis.responseRequired).length;

    return {
      unreadMessages,
      pendingAnalyses,
      activeChats,
      responseRequiredChats
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

  async getTelegramChats(): Promise<TelegramChat[]> {
    return await db.select().from(telegramChats).orderBy(desc(telegramChats.createdAt));
  }

  async getMonitoredChats(): Promise<TelegramChat[]> {
    return await db.select().from(telegramChats)
      .where(eq(telegramChats.isMonitored, true))
      .orderBy(desc(telegramChats.createdAt));
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

  async getTelegramMessages(chatId?: string, limit?: number): Promise<TelegramMessage[]> {
    let query = db.select().from(telegramMessages);
    
    if (chatId) {
      query = query.where(eq(telegramMessages.chatId, chatId));
    }
    
    query = query.orderBy(desc(telegramMessages.timestamp));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async getUnprocessedMessages(): Promise<TelegramMessage[]> {
    return await db.select().from(telegramMessages)
      .where(eq(telegramMessages.isProcessed, false))
      .orderBy(desc(telegramMessages.timestamp));
  }

  async createTelegramMessage(insertMessage: InsertTelegramMessage): Promise<TelegramMessage> {
    const [message] = await db
      .insert(telegramMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async markMessageAsProcessed(id: number): Promise<void> {
    await db
      .update(telegramMessages)
      .set({ isProcessed: true })
      .where(eq(telegramMessages.id, id));
  }

  // Period Analysis methods
  async getPeriodAnalyses(): Promise<PeriodAnalysis[]> {
    return await db.select().from(periodAnalysis).orderBy(desc(periodAnalysis.createdAt));
  }

  async getPeriodAnalysisByPeriod(startDate: string, endDate: string, chatId?: string): Promise<PeriodAnalysis[]> {
    let query = db.select().from(periodAnalysis)
      .where(and(
        eq(periodAnalysis.startDate, startDate),
        eq(periodAnalysis.endDate, endDate)
      ));
    
    if (chatId) {
      query = query.where(and(
        eq(periodAnalysis.startDate, startDate),
        eq(periodAnalysis.endDate, endDate),
        eq(periodAnalysis.chatId, chatId)
      ));
    }
    
    return await query;
  }

  async createPeriodAnalysis(insertAnalysis: InsertPeriodAnalysis): Promise<PeriodAnalysis> {
    const [analysis] = await db
      .insert(periodAnalysis)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getRecentAnalyses(limit = 5): Promise<PeriodAnalysis[]> {
    return await db.select().from(periodAnalysis)
      .orderBy(desc(periodAnalysis.createdAt))
      .limit(limit);
  }

  async getDailySummary(date: string): Promise<DailySummary | undefined> {
    const [summary] = await db.select().from(dailySummaries).where(eq(dailySummaries.date, date));
    return summary || undefined;
  }

  async getLatestDailySummary(): Promise<DailySummary | undefined> {
    const [summary] = await db.select().from(dailySummaries).orderBy(desc(dailySummaries.date)).limit(1);
    return summary || undefined;
  }

  async createDailySummary(insertSummary: InsertDailySummary): Promise<DailySummary> {
    const [summary] = await db
      .insert(dailySummaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  async getAiInsights(): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt));
  }

  async getRecentAiInsights(limit = 5): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt)).limit(limit);
  }

  async createAiInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values(insertInsight)
      .returning();
    return insight;
  }

  async getDashboardStats(): Promise<{
    unreadMessages: number;
    pendingAnalyses: number;
    activeChats: number;
    responseRequiredChats: number;
  }> {
    const [unreadCount] = await db.select({ count: count() }).from(telegramMessages)
      .where(eq(telegramMessages.isProcessed, false));
    
    const [activeChatCount] = await db.select({ count: count() }).from(telegramChats)
      .where(eq(telegramChats.isMonitored, true));
    
    const [pendingAnalysesCount] = await db.select({ count: count() }).from(periodAnalysis)
      .where(eq(periodAnalysis.responseRequired, true));

    return {
      unreadMessages: unreadCount.count,
      pendingAnalyses: pendingAnalysesCount.count,
      activeChats: activeChatCount.count,
      responseRequiredChats: pendingAnalysesCount.count
    };
  }
}

export const storage = new DatabaseStorage();