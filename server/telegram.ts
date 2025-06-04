import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { storage } from "./storage";
import { InsertTelegramChat, InsertTelegramMessage } from "@shared/schema";
import { Api } from "telegram";

export class TelegramService {
  private client: TelegramClient;
  private apiId: number;
  private apiHash: string;
  private session: StringSession;
  private isConnected: boolean = false;
  private phoneNumber: string = "";
  private authFlow: any = null;
  private currentCode: string = "";
  private authState: 'none' | 'phone_sent' | 'code_needed' | 'connected' = 'none';

  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID || "24788533");
    this.apiHash = process.env.TELEGRAM_API_HASH || "3a5e530327b9e7e8e90b54c6ab0259a1";
    this.phoneNumber = process.env.TELEGRAM_PHONE_NUMBER || "";
    
    // Validate session string format
    const sessionString = process.env.TELEGRAM_SESSION_STRING || "";
    try {
      this.session = new StringSession(sessionString);
    } catch (e) {
      console.log("Invalid session string, creating empty session");
      this.session = new StringSession("");
    }
    
    this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });
  }

  async connect(): Promise<{ needsCode?: boolean }> {
    try {
      console.log("Connecting to Telegram...");
      
      await this.client.connect();
      
      if (await this.client.checkAuthorization()) {
        this.isConnected = true;
        this.authState = 'connected';
        console.log("Successfully connected to Telegram with session");
        await this.loadDialogs();
        return { needsCode: false };
      } else {
        console.log("Session invalid, authentication needed");
        this.authState = 'code_needed';
        return { needsCode: true };
      }
    } catch (error) {
      console.error("Failed to connect to Telegram:", error);
      this.isConnected = false;
      this.authState = 'none';
      throw error;
    }
  }

  async verifyCode(code: string): Promise<void> {
    try {
      console.log("Starting verification with code:", code);
      
      // Use the high-level start method but now with the code available
      await this.client.start({
        phoneNumber: async () => this.phoneNumber,
        password: async () => process.env.TELEGRAM_PASSWORD || "",
        phoneCode: async () => code,
        onError: (err) => console.log("Auth error:", err),
      });

      this.isConnected = true;
      this.authState = 'connected';
      console.log("Successfully authenticated with Telegram");
      
      // Load dialogs after successful authentication
      await this.loadDialogs();
    } catch (error: any) {
      console.error("Failed to verify code:", error);
      this.authState = 'code_needed'; // Reset to allow retry
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.connected) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log("Disconnected from Telegram");
    }
  }

  async loadDialogs(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const dialogs = await this.client.getDialogs({
        limit: 100,
      });

      for (const dialog of dialogs) {
        if (!dialog.isChannel && !dialog.isGroup && !dialog.isUser) continue;

        const chatId = dialog.id?.toString();
        if (!chatId) continue;

        // Проверяем, есть ли уже этот чат в базе
        let existingChat = await storage.getTelegramChatByChatId(chatId);
        if (existingChat) continue;

        const insertChat: InsertTelegramChat = {
          chatId,
          title: dialog.title || dialog.name || "Без названия",
          type: dialog.isGroup ? "group" : dialog.isChannel ? "channel" : "private",
          isMonitored: false,
          participantCount: 0,
        };

        await storage.createTelegramChat(insertChat);
      }

      console.log(`Loaded ${dialogs.length} dialogs from Telegram`);
    } catch (error) {
      console.error("Failed to load dialogs:", error);
    }
  }

  async loadMessages(chatId: string, limit: number = 50): Promise<void> {
    if (!this.isConnected) return;

    try {
      const messages = await this.client.getMessages(chatId, {
        limit,
      });

      for (const message of messages) {
        if (!message.text) continue;

        const senderName = message.sender?.firstName || message.sender?.username || "Unknown";
        const insertMessage: InsertTelegramMessage = {
          messageId: message.id?.toString() || "",
          chatId,
          senderId: message.senderId?.toString() || null,
          senderName,
          text: message.text,
          timestamp: new Date(message.date * 1000),
          isProcessed: false,
        };

        await storage.createTelegramMessage(insertMessage);
      }

      console.log(`Loaded ${messages.length} messages from chat ${chatId}`);
    } catch (error) {
      console.error(`Failed to load messages from chat ${chatId}:`, error);
    }
  }

  setPhoneNumber(phoneNumber: string): void {
    this.phoneNumber = phoneNumber;
  }

  async getAvailableChats(): Promise<any[]> {
    return await storage.getTelegramChats();
  }

  async toggleChatMonitoring(chatId: string, monitored: boolean): Promise<boolean> {
    const chat = await storage.getTelegramChatByChatId(chatId);
    if (!chat) return false;

    await storage.updateTelegramChat(chat.id, { isMonitored: monitored });
    
    // Если включаем мониторинг, загружаем последние сообщения
    if (monitored && this.isConnected) {
      await this.loadMessages(chatId, 50);
    }
    
    return true;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.client.sendMessage(chatId, { message: text });
      return true;
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
      return false;
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  getSessionString(): string {
    return this.session.save();
  }
}

export const telegramService = new TelegramService();
