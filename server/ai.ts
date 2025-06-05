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

// Функция для тестирования модели через новый responses API
async function testOpenAI(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: prompt
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    // Извлекаем текст из нового формата ответа
    if (data.output && data.output[0] && data.output[0].content && data.output[0].content[0]) {
      return data.output[0].content[0].text || "No text content received";
    }
    
    return "Unexpected response format from OpenAI API";
  } catch (error: any) {
    console.error("OpenAI test error:", error);
    throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
  }
}

export class AIService {
  async testModel(prompt: string): Promise<string> {
    try {
      const response = await testOpenAI(prompt);
      return response;
    } catch (error: any) {
      console.error("AI model test failed:", error);
      throw new Error(`AI model test failed: ${error.message || 'Unknown error'}`);
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

  // Новый метод для анализа с полным контекстом за период
  async analyzeConversationPeriod(chatId: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      console.log(`Анализируем чат ${chatId} за период ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      // Получаем ВСЕ сообщения из чата за период для полного контекста
      const allMessages = await this.getMessagesForPeriod(chatId, startDate, endDate);
      if (allMessages.length === 0) return;

      const chatTitle = await this.getChatTitle(chatId);
      
      // Получаем существующие задачи из этого чата
      const existingTasks = await storage.getExtractedTasks();
      const chatTasks = existingTasks.filter(t => t.chatId === chatId);
      const existingTaskTitles = chatTasks.map(t => t.title.toLowerCase());

      // Формируем полный контекст переписки с временными метками
      const conversationContext = allMessages
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(m => `[${new Date(m.timestamp).toLocaleString('ru-RU')}] ${m.senderName || 'Unknown'}: ${m.text}`)
        .join('\n');

      const systemPrompt = `Ты - AI-ассистент для анализа деловой переписки с ПОЛНЫМ контекстом.
      
ВАЖНЫЕ ПРАВИЛА:
1. Анализируй ВСЮ переписку целиком, учитывай хронологию событий
2. НЕ создавай задачи, если в ЛЮБОЙ части переписки есть упоминания об их выполнении
3. Если задача была поставлена, но позже выполнена - НЕ создавай её
4. Учитывай статусы: "сделано", "готово", "выполнено", "оплачено", "отправлено" и подобные
5. НЕ создавай дубликаты существующих задач
6. Создавай задачи только для АКТУАЛЬНЫХ невыполненных поручений

Верни результат в JSON формате:
{
  "tasks": [
    {
      "title": "краткое название задачи",
      "description": "подробное описание с контекстом и обоснованием",
      "priority": "низкий|средний|высокий|критический", 
      "deadline": "YYYY-MM-DD или null",
      "isCompleted": false,
      "contextEvidence": "цитата из переписки, подтверждающая необходимость задачи"
    }
  ],
  "completedTasks": [
    {
      "title": "название выполненной задачи",
      "completionEvidence": "цитата о выполнении"
    }
  ]
}`;

      const existingContext = existingTaskTitles.length > 0 
        ? `\n\nСуществующие задачи из этого чата (НЕ создавай дубликаты): ${existingTaskTitles.join(', ')}`
        : '';

      const prompt = `Проанализируй ПОЛНУЮ переписку из чата "${chatTitle}" за указанный период.
      Учти весь контекст и хронологию для определения актуальных задач.${existingContext}

ПОЛНАЯ ПЕРЕПИСКА:
${conversationContext}`;
      
      const response = await callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const task of parsed.tasks) {
          // Проверка на дублирование с существующими задачами
          const isDuplicate = existingTaskTitles.some(existing => 
            existing.includes(task.title.toLowerCase()) || 
            task.title.toLowerCase().includes(existing)
          );
          
          if (!isDuplicate && !task.isCompleted) {
            const insertTask: InsertExtractedTask = {
              title: task.title,
              description: `[${chatTitle}] ${task.description}\n\nОбоснование: ${task.contextEvidence}`,
              urgency: this.mapPriorityToUrgency(task.priority),
              deadline: task.deadline || null,
              status: 'pending',
              chatId: chatId
            };
            
            await storage.createExtractedTask(insertTask);
            console.log(`Создана задача с контекстом: ${task.title} из чата ${chatTitle}`);
          }
        }
      }

      // Логируем информацию о выполненных задачах для анализа
      if (parsed.completedTasks && Array.isArray(parsed.completedTasks)) {
        console.log(`Найдено выполненных задач в чате ${chatTitle}:`, parsed.completedTasks.length);
      }
      
    } catch (error) {
      console.error("Ошибка при анализе переписки с контекстом:", error);
    }
  }

  private async extractTasksFromMessages(messages: any[]): Promise<void> {
    // Упрощенный метод для быстрой обработки новых сообщений
    // Основной анализ теперь делается через analyzeConversationPeriod
    try {
      if (messages.length === 0) return;

      const chatTitle = await this.getChatTitle(messages[0]?.chatId);
      const messagesText = messages.map(m => `[${m.timestamp}] ${m.senderName || 'Unknown'}: ${m.text}`).join('\n');
      
      // Простая проверка на явные задачи в новых сообщениях
      const systemPrompt = `Анализируй только НОВЫЕ сообщения на предмет ЯВНЫХ новых задач.
      НЕ анализируй статус старых задач. Создавай задачи только если есть ПРЯМОЕ поручение.
      
Верни JSON: {"tasks": [{"title": "название", "description": "описание", "priority": "средний"}]}`;

      const prompt = `Найди только ЯВНЫЕ новые задачи в сообщениях из чата "${chatTitle}":
${messagesText}`;
      
      const response = await callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const task of parsed.tasks) {
          const insertTask: InsertExtractedTask = {
            title: task.title,
            description: `[${chatTitle}] ${task.description}`,
            urgency: this.mapPriorityToUrgency(task.priority),
            deadline: null,
            status: 'pending',
            chatId: messages[0]?.chatId || ''
          };
          
          await storage.createExtractedTask(insertTask);
          console.log(`Создана задача: ${task.title} из чата ${chatTitle}`);
        }
      }
    } catch (error) {
      console.error("Ошибка при извлечении задач:", error);
    }
  }

  private mapPriorityToUrgency(priority: string): string {
    const priorityMap: Record<string, string> = {
      'низкий': 'low',
      'средний': 'medium', 
      'высокий': 'high',
      'критический': 'high'
    };
    return priorityMap[priority] || 'medium';
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

  // Новый метод для обработки периодов с полным контекстом
  async processPeriodMessages(startDate: string, endDate: string): Promise<{
    processedChats: number;
    createdTasks: number;
    foundCompletedTasks: number;
  }> {
    try {
      console.log(`Начинаем анализ периода ${startDate} - ${endDate} с полным контекстом`);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Включаем весь день
      
      // Получаем все чаты, которые были активны в период
      const allChats = await storage.getMonitoredChats();
      const personalChats = allChats.filter(chat => this.isPersonalChat(chat));
      
      let processedChats = 0;
      let createdTasks = 0;
      let foundCompletedTasks = 0;
      
      for (const chat of personalChats) {
        // Загружаем и сохраняем сообщения для этого чата за период
        await this.loadChatMessagesForPeriod(chat.chatId, start, end);
        
        // Анализируем с полным контекстом
        const tasksCountBefore = (await storage.getExtractedTasks()).length;
        await this.analyzeConversationPeriod(chat.chatId, start, end);
        const tasksCountAfter = (await storage.getExtractedTasks()).length;
        
        const newTasks = tasksCountAfter - tasksCountBefore;
        if (newTasks > 0) {
          createdTasks += newTasks;
          processedChats++;
        }
      }
      
      console.log(`Анализ периода завершен: ${processedChats} чатов, ${createdTasks} задач`);
      
      return {
        processedChats,
        createdTasks,
        foundCompletedTasks
      };
    } catch (error) {
      console.error("Ошибка при анализе периода:", error);
      throw error;
    }
  }

  private isPersonalChat(chat: any): boolean {
    // Личные чаты и небольшие рабочие группы (до 10 участников)
    return !chat.isChannel && !chat.isBroadcast && (!chat.participantCount || chat.participantCount <= 10);
  }

  private async loadChatMessagesForPeriod(chatId: string, start: Date, end: Date): Promise<void> {
    try {
      // Проверяем, есть ли уже сообщения за этот период в базе
      const existingMessages = await this.getMessagesForPeriod(chatId, start, end);
      
      if (existingMessages.length === 0) {
        console.log(`Загружаем сообщения для чата ${chatId} за период ${start.toDateString()} - ${end.toDateString()}`);
        // Здесь можно добавить загрузку через Telegram API при необходимости
      }
    } catch (error) {
      console.error(`Ошибка при загрузке сообщений для чата ${chatId}:`, error);
    }
  }

  private async getMessagesForPeriod(chatId: string, start: Date, end: Date): Promise<any[]> {
    try {
      const allMessages = await storage.getTelegramMessages(chatId);
      return allMessages.filter(message => {
        const messageDate = new Date(message.timestamp);
        return messageDate >= start && messageDate <= end;
      });
    } catch (error) {
      console.error("Ошибка при получении сообщений за период:", error);
      return [];
    }
  }

  private async extractTasksFromChatMessages(messages: any[]): Promise<number> {
    if (messages.length === 0) return 0;
    
    const tasksCountBefore = (await storage.getExtractedTasks()).length;
    await this.extractTasksFromMessages(messages);
    const tasksCountAfter = (await storage.getExtractedTasks()).length;
    
    return tasksCountAfter - tasksCountBefore;
  }

  private async createGroupChatSummary(chat: any, messages: any[], startDate: string, endDate: string): Promise<boolean> {
    try {
      if (messages.length === 0) return false;

      const messagesText = messages
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(m => `[${new Date(m.timestamp).toLocaleString('ru-RU')}] ${m.senderName || 'Unknown'}: ${m.text}`)
        .join('\n');

      const systemPrompt = `Создай краткую сводку по групповому чату за период.
      Выдели ключевые темы, решения и важные обсуждения.
      
Верни JSON: {
  "summary": "краткая сводка",
  "keyTopics": ["тема1", "тема2"],
  "requiresResponse": ["что требует ответа или действий"]
}`;

      const prompt = `Проанализируй переписку в групповом чате "${chat.title}" за ${startDate} - ${endDate}:
${messagesText}`;

      const response = await callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);

      const insertSummary: InsertDailySummary = {
        date: startDate,
        summary: parsed.summary,
        keyTopics: parsed.keyTopics || [],
        requiresResponse: parsed.requiresResponse || []
      };

      await storage.createDailySummary(insertSummary);
      console.log(`Создана сводка для группового чата: ${chat.title}`);
      return true;
    } catch (error) {
      console.error("Ошибка при создании сводки группового чата:", error);
      return false;
    }
  }

  private isPersonalChat(chat: any): boolean {
    // Исключаем сообщества, каналы и группы
    const chatId = chat.chatId.toString();
    const title = chat.title?.toLowerCase() || '';
    
    // Исключаем по ID: отрицательные ID обычно группы/каналы
    if (chatId.startsWith('-')) {
      return false;
    }
    
    // Исключаем по названию: сообщества, группы, каналы
    const excludeKeywords = [
      'группа', 'канал', 'сообщество', 'чат', 'group', 'channel', 'community',
      'команда', 'проект', 'отдел', 'департамент', 'company', 'corp',
      'общий', 'рабочий', 'work', 'team', 'dev', 'разработка'
    ];
    
    for (const keyword of excludeKeywords) {
      if (title.includes(keyword)) {
        return false;
      }
    }
    
    // Дополнительная проверка: если в названии есть несколько слов заглавными буквами
    // это часто указывает на корпоративный/групповой чат
    const uppercaseWords = (chat.title || '').match(/[А-ЯA-Z]{2,}/g);
    if (uppercaseWords && uppercaseWords.length > 1) {
      return false;
    }
    
    return true; // Считаем личным чатом
  }

  private async loadChatMessagesForPeriod(chatId: string, start: Date, end: Date): Promise<void> {
    try {
      // Используем Telegram API для загрузки сообщений за указанный период
      const { telegramService } = await import("./telegram");
      
      // Загружаем больше сообщений для охвата всего периода
      await telegramService.loadMessages(chatId, 200);
      
    } catch (error) {
      console.error(`Ошибка загрузки сообщений для чата ${chatId}:`, error);
    }
  }

  private async getMessagesForPeriod(chatId: string, start: Date, end: Date): Promise<any[]> {
    try {
      const allMessages = await storage.getTelegramMessages(chatId, 1000);
      
      return allMessages.filter(message => {
        const messageDate = new Date(message.timestamp);
        return messageDate >= start && messageDate <= end;
      });
      
    } catch (error) {
      console.error(`Ошибка получения сообщений для чата ${chatId}:`, error);
      return [];
    }
  }

  private async extractTasksFromChatMessages(messages: any[]): Promise<number> {
    try {
      if (messages.length === 0) return 0;

      const messagesText = messages.map(m => 
        `${new Date(m.timestamp).toLocaleString()}: ${m.senderName}: ${m.text}`
      ).join('\n');

      const systemPrompt = `Ты - помощник по извлечению задач из личных сообщений. 
      Анализируй сообщения и извлекай только конкретные задачи, поручения и дедлайны.
      Отвечай на русском языке в формате JSON.`;

      const prompt = `Проанализируй следующие сообщения из личного чата и извлеки все задачи, поручения и дедлайны:

${messagesText}

Верни результат в JSON формате:
{
  "tasks": [
    {
      "title": "краткое название задачи",
      "description": "подробное описание",
      "priority": "high/medium/low",
      "deadline": "дата дедлайна или null"
    }
  ]
}`;

      const response = await callOpenAI(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      
      let createdCount = 0;
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
          createdCount++;
        }
      }
      
      return createdCount;
    } catch (error) {
      console.error("Ошибка при извлечении задач из чата:", error);
      return 0;
    }
  }

  private async createGroupChatSummary(chat: any, messages: any[], startDate: string, endDate: string): Promise<boolean> {
    try {
      const messagesText = messages.map(m => 
        `${new Date(m.timestamp).toLocaleString()}: ${m.senderName}: ${m.text}`
      ).join('\n');
      
      const systemPrompt = `Ты - помощник по анализу групповых чатов. 
      Создай краткий саммари обсуждений в групповом чате за указанный период.
      Выдели ключевые темы, важные решения и моменты, требующие внимания руководства.
      Отвечай на русском языке в формате JSON.`;

      const prompt = `Проанализируй следующие сообщения из группового чата "${chat.title}" за период ${startDate} - ${endDate} и создай саммари:

${messagesText}

Верни результат в JSON формате:
{
  "summary": "краткое описание основных обсуждений",
  "keyTopics": ["тема1", "тема2", "тема3"],
  "requiresResponse": ["что требует внимания руководства"]
}`;

      const response = await callOpenAI(prompt, systemPrompt);
      const result = JSON.parse(response);

      // Создаем специальную запись для группового саммари
      const insertSummary: InsertDailySummary = {
        date: startDate,
        summary: `[${chat.title}] ${result.summary}`,
        keyTopics: result.keyTopics || [],
        requiresResponse: result.requiresResponse || []
      };

      await storage.createDailySummary(insertSummary);
      return true;

    } catch (error) {
      console.error(`Ошибка создания саммари для чата ${chat.title}:`, error);
      return false;
    }
  }
}

export const aiService = new AIService();