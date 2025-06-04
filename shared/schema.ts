import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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

export const extractedTasks = pgTable("extracted_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  urgency: text("urgency").notNull().default('medium'), // 'high', 'medium', 'low'
  status: text("status").notNull().default('pending'), // 'pending', 'in_progress', 'completed'
  deadline: text("deadline"), // Store as string for simplicity
  chatId: text("chat_id"),
  messageId: text("message_id"),
  extractedAt: timestamp("extracted_at").defaultNow(),
  completedAt: timestamp("completed_at"),
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

export const insertExtractedTaskSchema = createInsertSchema(extractedTasks).omit({
  id: true,
  extractedAt: true,
  completedAt: true,
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

export type ExtractedTask = typeof extractedTasks.$inferSelect;
export type InsertExtractedTask = z.infer<typeof insertExtractedTaskSchema>;

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = z.infer<typeof insertDailySummarySchema>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
