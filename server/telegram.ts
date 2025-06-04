import { storage } from "./storage";
import { InsertTelegramChat, InsertTelegramMessage } from "@shared/schema";

interface TelegramUpdate {
  message: {
    message_id: number;
    chat: {
      id: string;
      title?: string;
      type: string;
    };
    from: {
      id: string;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    text?: string;
    date: number;
  };
}

export class TelegramService {
  private botToken: string;
  private isPolling: boolean = false;
  private lastUpdateId: number = 0;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
    if (!this.botToken) {
      console.warn("TELEGRAM_BOT_TOKEN not found in environment variables");
    }
  }

  async startPolling(): Promise<void> {
    if (this.isPolling || !this.botToken) return;
    
    this.isPolling = true;
    console.log("Starting Telegram polling...");
    
    while (this.isPolling) {
      try {
        await this.pollUpdates();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second
      } catch (error) {
        console.error("Telegram polling error:", error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds on error
      }
    }
  }

  stopPolling(): void {
    this.isPolling = false;
    console.log("Stopped Telegram polling");
  }

  private async pollUpdates(): Promise<void> {
    if (!this.botToken) return;

    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
    const params = new URLSearchParams({
      offset: (this.lastUpdateId + 1).toString(),
      limit: "100",
      timeout: "10"
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    for (const update of data.result) {
      await this.processUpdate(update);
      this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
    }
  }

  private async processUpdate(update: any): Promise<void> {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id.toString();

    // Ensure chat exists in our database
    let chat = await storage.getTelegramChatByChatId(chatId);
    if (!chat) {
      const insertChat: InsertTelegramChat = {
        chatId,
        title: message.chat.title || `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
        type: message.chat.type,
        isMonitored: false,
        participantCount: message.chat.type === 'private' ? 2 : 0,
      };
      chat = await storage.createTelegramChat(insertChat);
    }

    // Only process messages from monitored chats
    if (!chat.isMonitored) return;

    // Store the message
    const senderName = `${message.from.first_name} ${message.from.last_name || ''}`.trim();
    const insertMessage: InsertTelegramMessage = {
      messageId: message.message_id.toString(),
      chatId,
      senderId: message.from.id.toString(),
      senderName,
      text: message.text || '',
      timestamp: new Date(message.date * 1000),
      isProcessed: false,
    };

    await storage.createTelegramMessage(insertMessage);
  }

  async getAvailableChats(): Promise<any[]> {
    // In a real implementation, this would use Telegram Client API
    // For now, return the chats we have in storage
    return await storage.getTelegramChats();
  }

  async toggleChatMonitoring(chatId: string, monitored: boolean): Promise<boolean> {
    const chat = await storage.getTelegramChatByChatId(chatId);
    if (!chat) return false;

    await storage.updateTelegramChat(chat.id, { isMonitored: monitored });
    return true;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.botToken) return false;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
      return false;
    }
  }
}

export const telegramService = new TelegramService();
