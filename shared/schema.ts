import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
});

export const telegramChats = pgTable("telegram_chats", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'private', 'group', 'supergroup', 'channel'
  isMonitored: boolean("is_monitored").default(false),
  participantCount: integer("participant_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const telegramMessages = pgTable("telegram_messages", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull(),
  chatId: text("chat_id").notNull(),
  senderId: text("sender_id"),
  senderName: text("sender_name"),
  text: text("text"),
  timestamp: timestamp("timestamp").notNull(),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Новая система контекстного анализа переписки
export const periodAnalysis = pgTable("period_analysis", {
  id: serial("id").primaryKey(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  chatId: text("chat_id").notNull(),
  chatTitle: text("chat_title"),
  
  // Ключевые показатели
  totalMessages: integer("total_messages").default(0),
  unansweredRequests: text("unanswered_requests").array(), // JSON массив с деталями
  identifiedProblems: text("identified_problems").array(),
  openQuestions: text("open_questions").array(),
  
  // Анализ участия
  myParticipation: text("my_participation"), // Анализ моего участия
  missedResponses: text("missed_responses").array(),
  responseRequired: boolean("response_required").default(false),
  
  // Общий анализ
  summary: text("summary"),
  priority: text("priority").default("medium"), // high, medium, low
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailySummaries = pgTable("daily_summaries", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  summary: text("summary"),
  requiresResponse: text("requires_response").array(),
  keyTopics: text("key_topics").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'priority', 'trend', 'action'
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertTelegramChatSchema = createInsertSchema(telegramChats).omit({
  id: true,
  createdAt: true,
});

export const insertTelegramMessageSchema = createInsertSchema(telegramMessages).omit({
  id: true,
  createdAt: true,
});

export const insertPeriodAnalysisSchema = createInsertSchema(periodAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertDailySummarySchema = createInsertSchema(dailySummaries).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type TelegramChat = typeof telegramChats.$inferSelect;
export type InsertTelegramChat = z.infer<typeof insertTelegramChatSchema>;

export type TelegramMessage = typeof telegramMessages.$inferSelect;
export type InsertTelegramMessage = z.infer<typeof insertTelegramMessageSchema>;

export type PeriodAnalysis = typeof periodAnalysis.$inferSelect;
export type InsertPeriodAnalysis = z.infer<typeof insertPeriodAnalysisSchema>;

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = z.infer<typeof insertDailySummarySchema>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;

// RAG System Tables
export const messageEmbeddings = pgTable("message_embeddings", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  messageId: text("message_id").notNull(),
  text: text("text").notNull(),
  senderName: text("sender_name"),
  timestamp: timestamp("timestamp").notNull(),
  embedding: doublePrecision("embedding").array().notNull(),
  chatTitle: text("chat_title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationContexts = pgTable("conversation_contexts", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  chatTitle: text("chat_title").notNull(),
  summary: text("summary").notNull(),
  keyTopics: text("key_topics").array().notNull(),
  relationship: text("relationship").notNull(),
  messageCount: integer("message_count").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertMessageEmbeddingSchema = createInsertSchema(messageEmbeddings).omit({
  id: true,
  createdAt: true,
});

export const insertConversationContextSchema = createInsertSchema(conversationContexts);

export type MessageEmbedding = typeof messageEmbeddings.$inferSelect;
export type InsertMessageEmbedding = z.infer<typeof insertMessageEmbeddingSchema>;

export type ConversationContext = typeof conversationContexts.$inferSelect;
export type InsertConversationContext = z.infer<typeof insertConversationContextSchema>;
