import OpenAI from "openai";
import { storage } from "./storage";
import { InsertExtractedTask, InsertDailySummary, InsertAiInsight } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Функция для запроса к OpenAI
async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Ошибка при обращении к OpenAI:", error);
    throw error;
  }
}

export class AIService {
  async testModel(prompt: string): Promise<string> {
    try {
      const response = await callOpenAI(prompt, "You are a helpful AI assistant. Respond clearly and concisely.");
      return response;
    } catch (error) {
      console.error("AI model test failed:", error);
      throw new Error(`AI model test failed: ${error.message}`);
    }
  }

  async processUnreadMessages(): Promise<void> {
    try {
      console.log("Начинаем обработку непрочитанных сообщений...");
      const unprocessedMessages = await storage.getUnprocessedMessages();
      
      if (unprocessedMessages.length === 0) {
        console.log("Нет непрочитанных сообщений для обработки");
        return;
      }

      console.log(`Обрабатываем ${unprocessedMessages.length} сообщений`);
      
      // Группируем сообщения по чатам для более эффективной обработки
      const messagesByChat = unprocessedMessages.reduce((acc, message) => {
        if (!acc[message.chatId]) {
          acc[message.chatId] = [];
        }
        acc[message.chatId].push(message);
        return acc;
      }, {} as Record<string, any[]>);

      // Обрабатываем каждый чат отдельно
      for (const [chatId, messages] of Object.entries(messagesByChat)) {
        await this.extractTasksFromMessages(messages);
        
        // Отмечаем сообщения как обработанные
        for (const message of messages) {
          await storage.markMessageAsProcessed(message.id);
        }
      }

      console.log("Обработка сообщений завершена");
    } catch (error) {
      console.error("Ошибка при обработке непрочитанных сообщений:", error);
    }
  }

  private async extractTasksFromMessages(messages: any[]): Promise<void> {
    try {
      const messagesText = messages.map(m => `[${m.timestamp}] ${m.senderName || 'Unknown'}: ${m.text}`).join('\n');
      
      const systemPrompt = `Ты - AI-ассистент для анализа деловой переписки. Анализируй сообщения и извлекай задачи, поручения, дедлайны и важную информацию.

Верни результат в JSON формате:
{
  "tasks": [
    {
      "title": "краткое название задачи",
      "description": "подробное описание",
      "priority": "низкий|средний|высокий|критический",
      "deadline": "YYYY-MM-DD или null если не указан",
      "status": "новая",
      "assignee": "кому поручена задача или null",
      "source": "краткое описание источника"
    }
  ]
}

Если задач нет, верни {"tasks": []}`;

      const prompt = `Проанализируй следующие сообщения и извлеки все задачи, поручения и дедлайны:\n\n${messagesText}`;
      
      const response = await callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const task of parsed.tasks) {
          const insertTask: InsertExtractedTask = {
            title: task.title,
            description: task.description,
            urgency: task.priority || 'medium',
            deadline: task.deadline || null,
            status: 'pending',
            chatId: messages[0]?.chatId || ''
          };
          
          await storage.createExtractedTask(insertTask);
          console.log(`Создана задача: ${task.title}`);
        }
      }
    } catch (error) {
      console.error("Ошибка при извлечении задач:", error);
    }
  }

  async generateDailySummary(date: string): Promise<void> {
    try {
      console.log(`Генерируем ежедневную сводку за ${date}`);
      
      // Получаем все сообщения за день
      const messages = await storage.getTelegramMessages();
      const dayMessages = messages.filter(m => {
        const messageDate = new Date(m.timestamp).toISOString().split('T')[0];
        return messageDate === date;
      });

      if (dayMessages.length === 0) {
        console.log("Нет сообщений за указанный день");
        return;
      }

      // Получаем задачи за день
      const tasks = await storage.getExtractedTasks();
      const dayTasks = tasks.filter(t => {
        const taskDate = new Date(t.extractedAt || new Date()).toISOString().split('T')[0];
        return taskDate === date;
      });

      const systemPrompt = `Ты - AI-ассистент для создания ежедневных сводок для руководителя. Создай краткую сводку дня, выделив:
1. Ключевые события и обсуждения
2. Новые задачи и поручения
3. Важные решения
4. Вопросы, требующие внимания руководителя
5. Сроки и дедлайны

Верни результат в JSON формате:
{
  "summary": "краткая сводка дня",
  "keyPoints": ["пункт 1", "пункт 2", ...],
  "actionRequired": ["что требует внимания 1", "что требует внимания 2", ...],
  "upcomingDeadlines": ["дедлайн 1", "дедлайн 2", ...]
}`;

      const messagesText = dayMessages.map(m => `[${m.timestamp}] ${m.senderName}: ${m.text}`).join('\n');
      const tasksText = dayTasks.map(t => `Задача: ${t.title} (${t.urgency})`).join('\n');
      
      const prompt = `Создай ежедневную сводку на основе:\n\nСООБЩЕНИЯ:\n${messagesText}\n\nЗАДАЧИ:\n${tasksText}`;
      
      const response = await callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);

      const insertSummary: InsertDailySummary = {
        date: date,
        summary: parsed.summary,
        requiresResponse: parsed.actionRequired || [],
        keyTopics: parsed.keyPoints || []
      };

      await storage.createDailySummary(insertSummary);
      console.log(`Ежедневная сводка за ${date} создана`);
    } catch (error) {
      console.error("Ошибка при генерации ежедневной сводки:", error);
    }
  }

  async generateAIInsights(): Promise<void> {
    try {
      console.log("Генерируем AI-инсайты...");
      
      // Получаем данные для анализа
      const tasks = await storage.getExtractedTasks();
      const recentTasks = tasks.slice(-20); // последние 20 задач
      
      if (recentTasks.length === 0) {
        console.log("Недостаточно данных для генерации инсайтов");
        return;
      }

      const systemPrompt = `Ты - AI-аналитик для руководителя. Проанализируй задачи и создай полезные инсайты и рекомендации.

Верни результат в JSON формате:
{
  "insights": [
    {
      "type": "trend|warning|recommendation|observation",
      "title": "заголовок инсайта",
      "description": "подробное описание",
      "actionItems": ["рекомендуемое действие 1", "рекомендуемое действие 2"]
    }
  ]
}`;

      const tasksText = recentTasks.map(t => 
        `Задача: ${t.title}, Приоритет: ${t.urgency}, Статус: ${t.status}, Создана: ${t.extractedAt}`
      ).join('\n');
      
      const prompt = `Проанализируй следующие задачи и дай инсайты:\n\n${tasksText}`;
      
      const response = await callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      
      if (parsed.insights && Array.isArray(parsed.insights)) {
        for (const insight of parsed.insights) {
          const insertInsight: InsertAiInsight = {
            type: insight.type,
            title: insight.title,
            content: insight.description
          };
          
          await storage.createAiInsight(insertInsight);
          console.log(`Создан инсайт: ${insight.title}`);
        }
      }
    } catch (error) {
      console.error("Ошибка при генерации AI-инсайтов:", error);
    }
  }

  private async getChatTitle(chatId: string): Promise<string> {
    try {
      const chat = await storage.getTelegramChatByChatId(chatId);
      return chat?.title || `Chat ${chatId}`;
    } catch (error) {
      return `Chat ${chatId}`;
    }
  }
}

export const aiService = new AIService();