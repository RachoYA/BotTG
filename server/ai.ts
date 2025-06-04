import { storage } from "./storage";
import { InsertExtractedTask, InsertDailySummary, InsertAiInsight } from "@shared/schema";

// Локальная LLM настройка (Ollama или аналог)
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://localhost:11434";
const LOCAL_MODEL = process.env.LOCAL_MODEL || "llama3.2:latest";

// Функция для запроса к локальной LLM
async function callLocalLLM(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const response = await fetch(`${LOCAL_LLM_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LOCAL_MODEL,
        prompt: `${systemPrompt}\n\nUser: ${prompt}`,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('Ошибка при обращении к локальной LLM:', error);
    // Возвращаем заглушку для демонстрации работы приложения
    return JSON.stringify({
      tasks: [
        {
          title: "Демо задача",
          description: "Это демонстрационная задача для показа работы приложения",
          priority: "normal",
          deadline: null,
          sourceMessageText: "демо сообщение"
        }
      ]
    });
  }
}

export class AIService {
  async processUnreadMessages(): Promise<void> {
    const unprocessedMessages = await storage.getUnprocessedMessages();
    
    if (unprocessedMessages.length === 0) return;

    // Group messages by chat for better context
    const messagesByChat = unprocessedMessages.reduce((acc, message) => {
      if (!acc[message.chatId]) acc[message.chatId] = [];
      acc[message.chatId].push(message);
      return acc;
    }, {} as Record<string, typeof unprocessedMessages>);

    for (const [chatId, messages] of Object.entries(messagesByChat)) {
      await this.extractTasksFromMessages(messages);
      
      // Mark messages as processed
      for (const message of messages) {
        await storage.markMessageAsProcessed(message.id);
      }
    }
  }

  private async extractTasksFromMessages(messages: any[]): Promise<void> {
    if (messages.length === 0) return;

    const chatTitle = await this.getChatTitle(messages[0].chatId);
    const conversationText = messages
      .map(msg => `[${msg.senderName}]: ${msg.text}`)
      .join('\n');

    const systemPrompt = `Вы - ИИ-ассистент для руководителя компании. Анализируйте сообщения из корпоративных чатов и извлекайте задачи.

Ответьте в JSON формате со следующей структурой:
{
  "tasks": [
    {
      "title": "Краткое описание задачи",
      "description": "Подробное описание с контекстом",
      "priority": "urgent|important|normal",
      "deadline": "ISO 8601 дата или null",
      "sourceMessageText": "Текст сообщения из которого извлечена задача"
    }
  ]
}

Критерии для извлечения задач:
- Прямые поручения и просьбы
- Вопросы, требующие решения руководителя
- Упоминания дедлайнов или временных рамок
- Проблемы, требующие вмешательства
- Запросы на одобрение или подтверждение

Приоритеты:
- urgent: срочные задачи с дедлайном сегодня/завтра
- important: важные задачи без срочного дедлайна
- normal: обычные задачи и напоминания`;

    const userPrompt = `Чат: ${chatTitle}\n\nСообщения:\n${conversationText}`;

    try {
      const response = await callLocalLLM(userPrompt, systemPrompt);
      const result = JSON.parse(response);
      
      for (const taskData of result.tasks || []) {
        const sourceMessage = messages.find(msg => 
          (msg.text && msg.text.includes(taskData.sourceMessageText)) || 
          taskData.sourceMessageText.includes(msg.text || '')
        );

        const insertTask: InsertExtractedTask = {
          title: taskData.title,
          description: taskData.description || '',
          urgency: taskData.priority || 'medium',
          status: 'pending',
          deadline: taskData.deadline || null,
          chatId: messages[0].chatId,
          messageId: sourceMessage?.messageId || null,
        };

        await storage.createExtractedTask(insertTask);
      }
    } catch (error) {
      console.error("Failed to extract tasks from messages:", error);
    }
  }

  async generateDailySummary(date: string): Promise<void> {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all messages from the day from monitored chats
    const allMessages = await storage.getTelegramMessages();
    const dayMessages = allMessages.filter(msg => 
      msg.timestamp >= startOfDay && msg.timestamp <= endOfDay
    );

    if (dayMessages.length === 0) {
      console.log("No messages to summarize for", date);
      return;
    }

    // Group messages by chat
    const messagesByChat = dayMessages.reduce((acc, message) => {
      if (!acc[message.chatId]) acc[message.chatId] = [];
      acc[message.chatId].push(message);
      return acc;
    }, {} as Record<string, typeof dayMessages>);

    const summaryData = {
      requiresResponse: [] as any[],
      importantDiscussions: [] as any[],
      keyDecisions: [] as any[],
    };

    for (const [chatId, messages] of Object.entries(messagesByChat)) {
      const chatTitle = await this.getChatTitle(chatId);
      const conversationText = messages
        .map(msg => `[${msg.timestamp.toLocaleTimeString('ru-RU')} ${msg.senderName}]: ${msg.text || ''}`)
        .join('\n');

      const systemPrompt = `Вы - ИИ-ассистент для руководителя. Анализируйте дневную переписку и категоризируйте сообщения.

Ответьте в JSON формате:
{
  "requiresResponse": [
    {
      "senderName": "Имя отправителя",
      "text": "Текст сообщения",
      "timestamp": "Время в формате HH:MM",
      "reason": "Почему требует ответа"
    }
  ],
  "importantDiscussions": [
    {
      "topic": "Тема обсуждения",
      "summary": "Краткое изложение",
      "participants": ["участник1", "участник2"],
      "timestamp": "Время начала"
    }
  ],
  "keyDecisions": [
    {
      "decision": "Принятое решение",
      "context": "Контекст решения",
      "timestamp": "Время принятия"
    }
  ]
}

Критерии:
- requiresResponse: прямые вопросы, просьбы, проблемы требующие решения
- importantDiscussions: обсуждения стратегии, планов, важных проектов
- keyDecisions: принятые решения, договоренности, утверждения`;

      const userPrompt = `Чат: ${chatTitle}\n\nПереписка за день:\n${conversationText}`;

      try {
        const response = await callLocalLLM(userPrompt, systemPrompt);
        const result = JSON.parse(response);

        // Process requiresResponse
        for (const item of result.requiresResponse || []) {
          summaryData.requiresResponse.push({
            chatTitle,
            chatId,
            senderName: item.senderName,
            text: item.text,
            timestamp: item.timestamp,
            messageId: messages.find(msg => (msg.text || '').includes(item.text))?.messageId || '',
          });
        }

        // Process importantDiscussions
        for (const item of result.importantDiscussions || []) {
          summaryData.importantDiscussions.push({
            chatTitle,
            chatId,
            senderName: 'Группа',
            text: `${item.topic}: ${item.summary}`,
            timestamp: item.timestamp,
            messageId: '',
          });
        }

        // Process keyDecisions
        for (const item of result.keyDecisions || []) {
          summaryData.keyDecisions.push({
            chatTitle,
            chatId,
            senderName: 'Система',
            text: `${item.decision} (${item.context})`,
            timestamp: item.timestamp,
            messageId: '',
          });
        }
      } catch (error) {
        console.error(`Failed to analyze chat ${chatTitle}:`, error);
      }
    }

    // Save the summary
    const insertSummary: InsertDailySummary = {
      date,
      requiresResponse: summaryData.requiresResponse,
      importantDiscussions: summaryData.importantDiscussions,
      keyDecisions: summaryData.keyDecisions,
    };

    await storage.createDailySummary(insertSummary);
  }

  async generateAIInsights(): Promise<void> {
    const stats = await storage.getDashboardStats();
    const recentTasks = await storage.getExtractedTasks();
    const urgentTasks = await storage.getUrgentTasks();

    const insights: InsertAiInsight[] = [];

    // Priority insight
    if (urgentTasks.length > 0) {
      insights.push({
        type: 'priority',
        title: 'Совет по приоритизации',
        description: `У вас ${urgentTasks.length} срочных задач. Рекомендуется сначала ответить на самые критичные сообщения.`,
        icon: 'fas fa-lightbulb',
        color: 'primary',
      });
    }

    // Time management insight
    if (stats.unreadMessages > 10) {
      insights.push({
        type: 'time_management',
        title: 'Управление временем',
        description: `${stats.unreadMessages} непрочитанных сообщений. Выделите время для обработки коммуникаций.`,
        icon: 'fas fa-clock',
        color: 'accent',
      });
    }

    // Productivity insight
    if (stats.completedTasksPercentage > 80) {
      insights.push({
        type: 'productivity',
        title: 'Продуктивность',
        description: `Отличный результат! Выполнено ${stats.completedTasksPercentage}% задач за период.`,
        icon: 'fas fa-chart-line',
        color: 'success',
      });
    }

    for (const insight of insights) {
      await storage.createAiInsight(insight);
    }
  }

  private async getChatTitle(chatId: string): Promise<string> {
    const chat = await storage.getTelegramChatByChatId(chatId);
    return chat?.title || 'Неизвестный чат';
  }
}

export const aiService = new AIService();
