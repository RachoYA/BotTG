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
    
    // Загружаем сессию из переменной окружения или файла
    let sessionString = process.env.TELEGRAM_SESSION_STRING || "";
    
    // Если в переменной окружения нет сессии, пытаемся загрузить из файла
    if (!sessionString || sessionString.length < 100) {
      try {
        const sessionPath = path.join(process.cwd(), '.telegram_session');
        if (fs.existsSync(sessionPath)) {
          const fileSession = fs.readFileSync(sessionPath, 'utf8').trim();
          if (fileSession && fileSession.length > 100) {
            sessionString = fileSession;
            console.log("Loaded valid session from file, length:", sessionString.length);
          }
        }
      } catch (e) {
        console.log("Error loading session file:", e.message);
      }
    }
    
    if (sessionString && sessionString.length > 100) {
      console.log("Using valid session string");
    } else {
      console.log("No valid session found, manual authentication required");
    }
    
    try {
      this.session = new StringSession(sessionString);
      if (sessionString && sessionString.length > 100) {
        console.log("Valid session string loaded, length:", sessionString.length);
      } else {
        console.log("Creating empty session - no valid session found");
      }
    } catch (e) {
      console.log("Invalid session string format, creating empty session");
      this.session = new StringSession("");
    }
    
    this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    // Автоматически подключаемся при запуске если есть валидная сессия
    if (sessionString && sessionString.length > 10) {
      console.log("Valid session found, attempting auto-connect...");
      setTimeout(() => {
        this.autoConnect().catch(err => {
          console.log("Auto-connect failed:", err.message);
        });
      }, 1000);
    } else {
      console.log("No valid session, manual authentication required");
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
          
          const sessionString = this.session.save();
          if (sessionString) {
            this.saveSessionString(sessionString);
          }
          
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
            
            try {
              const sessionString = this.session.save() as string;
              this.saveSessionString(sessionString);
            } catch (error) {
              console.error("Failed to save session:", error);
            }
            
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

  async loadMessages(chatId: string, limit: number = 20): Promise<void> {
    if (!this.isConnected) return;

    try {
      // Получаем только последние сообщения из конкретного чата
      const messages = await this.client.getMessages(chatId, {
        limit,
      });

      let newMessagesCount = 0;

      for (const message of messages) {
        if (!message.text) continue;

        // Проверяем, нет ли уже этого сообщения в базе
        const existingMessages = await storage.getTelegramMessages(chatId, 1);
        const lastMessageId = existingMessages[0]?.messageId;
        
        if (lastMessageId && message.id?.toString() === lastMessageId) {
          break; // Прекращаем, если дошли до уже загруженных сообщений
        }

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
        newMessagesCount++;
      }

      if (newMessagesCount > 0) {
        console.log(`Loaded ${newMessagesCount} new messages from chat ${chatId}`);
      }
    } catch (error) {
      console.error(`Failed to load messages from chat ${chatId}:`, error);
    }
  }

  // Новый метод для мониторинга сообщений в реальном времени
  async startRealtimeMonitoring(): Promise<void> {
    if (!this.isConnected) return;

    try {
      // Добавляем обработчик новых сообщений
      this.client.addEventHandler(async (event: any) => {
        if (event.className === 'UpdateNewMessage') {
          const message = event.message;
          if (!message || !message.text) return;

          const chatId = message.chatId?.toString();
          if (!chatId) return;

          // Проверяем, мониторится ли этот чат
          const chat = await storage.getTelegramChatByChatId(chatId);
          if (!chat || !chat.isMonitored) return;

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
          console.log(`New real-time message received in chat ${chatId}: ${message.text.substring(0, 50)}...`);
        }
      });

      console.log("Real-time message monitoring started");
    } catch (error) {
      console.error("Failed to start real-time monitoring:", error);
    }
  }

  // Метод для периодической проверки новых сообщений в мониторимых чатах
  async checkForNewMessages(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const monitoredChats = await storage.getMonitoredChats();
      
      for (const chat of monitoredChats) {
        await this.loadMessages(chat.chatId, 10); // Загружаем только 10 последних сообщений
      }
    } catch (error) {
      console.error("Failed to check for new messages:", error);
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
