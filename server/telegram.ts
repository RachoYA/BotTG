import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { storage } from "./storage";
import { InsertTelegramChat, InsertTelegramMessage } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

export class TelegramService {
  private client: TelegramClient;
  private apiId: number;
  private apiHash: string;
  private session: StringSession;
  private isConnected: boolean = false;
  private phoneNumber: string = "";
  private authFlow: any = null;
  private currentCode: string = "";
  private phoneCodeHash: string = "";
  private authState: 'none' | 'phone_sent' | 'code_needed' | 'connected' = 'none';

  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID || "24788533");
    this.apiHash = process.env.TELEGRAM_API_HASH || "3a5e530327b9e7e8e90b54c6ab0259a1";
    this.phoneNumber = process.env.TELEGRAM_PHONE_NUMBER || "";
    
    // Validate session string format
    const sessionString = process.env.TELEGRAM_SESSION_STRING || "";
    try {
      this.session = new StringSession(sessionString);
      console.log("Loaded session string from environment");
    } catch (e) {
      console.log("Invalid session string, creating empty session");
      this.session = new StringSession("");
    }
    
    this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    // Автоматически подключаемся при запуске если есть валидная сессия
    if (sessionString && sessionString.length > 10) {
      this.autoConnect();
    }
  }

  private async autoConnect(): Promise<void> {
    try {
      console.log("Attempting auto-connect with saved session...");
      await this.client.connect();
      
      if (await this.client.checkAuthorization()) {
        this.isConnected = true;
        this.authState = 'connected';
        console.log("Auto-connected to Telegram successfully");
        await this.loadDialogs();
      } else {
        console.log("Saved session is invalid, manual auth required");
        this.isConnected = false;
        this.authState = 'none';
      }
    } catch (error) {
      console.error("Auto-connect failed:", error);
      this.isConnected = false;
      this.authState = 'none';
    }
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
        console.log("Session invalid, starting auth flow...");
        // Начинаем процесс авторизации
        const result = await this.client.sendCode(
          {
            apiId: this.apiId,
            apiHash: this.apiHash,
          },
          this.phoneNumber
        );
        this.phoneCodeHash = result.phoneCodeHash;
        this.authState = 'code_needed';
        console.log("Code sent to phone number, hash:", this.phoneCodeHash);
        return { needsCode: true };
      }
    } catch (error) {
      console.error("Failed to connect to Telegram:", error);
      this.isConnected = false;
      this.authState = 'none';
      throw error;
    }
  }

  async verifyCode(code: string, password?: string): Promise<void> {
    try {
      console.log("Verifying code:", code, "with hash:", this.phoneCodeHash);
      
      if (!this.client.connected) {
        await this.client.connect();
      }

      try {
        // Сначала пытаемся авторизоваться только с кодом
        const result = await this.client.invoke(
          new Api.auth.SignIn({
            phoneNumber: this.phoneNumber,
            phoneCodeHash: this.phoneCodeHash,
            phoneCode: code,
          })
        );

        console.log("Auth result:", result.className);

        if (result.className === "auth.Authorization") {
          this.isConnected = true;
          this.authState = 'connected';
          console.log("Successfully authenticated with Telegram");
          
          const sessionString = this.client.session.save();
          this.saveSessionString(sessionString);
          console.log("New session string saved to environment");
          
          await this.loadDialogs();
        }
      } catch (error: any) {
        if (error.errorMessage === "SESSION_PASSWORD_NEEDED") {
          console.log("Two-factor authentication required");
          
          if (!password) {
            // Если пароль не предоставлен, бросаем специальную ошибку
            const passwordError = new Error("Two-factor authentication password required");
            (passwordError as any).needsPassword = true;
            throw passwordError;
          }

          // Получаем информацию о пароле
          const passwordInfo = await this.client.invoke(new Api.account.GetPassword());
          
          // Вычисляем хеш пароля
          const { computeCheck } = await import("telegram/Password");
          const passwordHash = await computeCheck(passwordInfo, password);

          // Авторизуемся с паролем
          const passwordResult = await this.client.invoke(
            new Api.auth.CheckPassword({ password: passwordHash })
          );

          if (passwordResult.className === "auth.Authorization") {
            this.isConnected = true;
            this.authState = 'connected';
            console.log("Successfully authenticated with password");
            
            const sessionString = this.client.session.save();
            this.saveSessionString(sessionString);
            console.log("New session string saved to environment");
            
            await this.loadDialogs();
          }
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Failed to verify code:", error);
      this.authState = 'code_needed';
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

        const sender = message.sender as any;
        const senderName = sender?.firstName || sender?.username || "Unknown";
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
    console.log("Phone number set:", phoneNumber);
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

  private saveSessionString(sessionString: string): void {
    try {
      // Сохраняем сессию в файл для постоянного хранения
      const sessionPath = path.join(process.cwd(), '.telegram_session');
      fs.writeFileSync(sessionPath, sessionString, 'utf8');
      
      // Также обновляем переменную окружения для текущей сессии
      process.env.TELEGRAM_SESSION_STRING = sessionString;
      
      console.log("Session saved to file and environment variable");
    } catch (error) {
      console.error("Failed to save session string:", error);
    }
  }

  getSessionString(): string {
    return this.session.save();
  }
}

export const telegramService = new TelegramService();
