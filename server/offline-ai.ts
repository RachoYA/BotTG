import { pipeline, env } from '@xenova/transformers';

// Разрешаем загрузку модели для улучшенного анализа
env.allowRemoteModels = true;
env.allowLocalModels = true;

interface OfflineAnalysisResult {
  unansweredRequests: string[];
  identifiedProblems: string[];
  openQuestions: string[];
  myParticipation: string;
  missedResponses: string[];
  responseRequired: boolean;
  priority: string;
  businessTopics: string[];
  actionItems: string[];
  summary: string;
}

class OfflineAIAnalyzer {
  private classifier: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      console.log('Initializing offline AI model for conversation analysis...');
      
      // Используем легкую модель для классификации текста
      this.classifier = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
      );
      
      this.initialized = true;
      console.log('Offline AI model initialized successfully');
    } catch (error) {
      console.log('Failed to initialize offline AI model:', error);
      this.initialized = false;
    }
  }

  async analyzeConversation(conversationText: string, chatTitle: string): Promise<OfflineAnalysisResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const messageTexts = conversationText.split('\n').filter(line => line.trim());
    
    // Находим все вопросы
    const questionMessages = messageTexts.filter(msg => msg.includes('?'));
    const questionsToGracha = questionMessages.filter(msg => !msg.includes('Грачья:'));
    const questionsFromGracha = questionMessages.filter(msg => msg.includes('Грачья:'));

    // Контекстный анализ неотвеченных вопросов к Грачья
    const unansweredToGracha: string[] = [];
    
    for (const question of questionsToGracha) {
      const questionIndex = messageTexts.indexOf(question);
      const questionText = this.extractQuestionText(question);
      
      if (questionText && questionText.length > 5) {
        // Проверяем содержит ли сам вопрос ответ (риторический вопрос)
        const isRhetoricalQuestion = this.isRhetoricalQuestion(questionText, question);
        
        if (!isRhetoricalQuestion) {
          // Ищем ответ от Грачья в следующих 15 сообщениях
          const subsequentMessages = messageTexts.slice(questionIndex + 1, questionIndex + 16);
          const hasDirectAnswer = subsequentMessages.some(msg => msg.includes('Грачья:'));
          
          // Дополнительная проверка: есть ли тематически связанный ответ
          const hasContextualAnswer = this.hasContextualAnswer(questionText, subsequentMessages);
          
          if (!hasDirectAnswer && !hasContextualAnswer) {
            unansweredToGracha.push(questionText);
          }
        }
      }
    }

    // Находим проблемы
    const problemKeywords = ['устал', 'болит', 'проблем', 'сложно', 'не могу', 'плохо', 'больно', 'тяжело'];
    const problemMessages = messageTexts.filter(msg => 
      problemKeywords.some(keyword => msg.toLowerCase().includes(keyword))
    );

    const identifiedProblems = problemMessages.map(msg => this.extractMessageContent(msg));

    // Извлекаем вопросы от Грачья
    const openQuestions = questionsFromGracha.map(q => this.extractQuestionText(q));

    // Подсчитываем статистику
    const grachyaMessages = messageTexts.filter(msg => msg.includes('Грачья:'));
    const totalMessages = messageTexts.length;
    const participationPercent = totalMessages > 0 ? Math.round((grachyaMessages.length / totalMessages) * 100) : 0;

    // Определяем приоритет
    const priority = unansweredToGracha.length > 0 ? 'high' : 
                    problemMessages.length > 0 ? 'medium' : 'low';

    // Определяем темы
    const businessTopics = this.identifyBusinessTopics(messageTexts);

    return {
      unansweredRequests: unansweredToGracha,
      identifiedProblems: identifiedProblems.filter(p => p.length > 0),
      openQuestions: openQuestions.filter(q => q.length > 0),
      myParticipation: `Активность: ${grachyaMessages.length}/${totalMessages} сообщений (${participationPercent}%). Задано вопросов: ${questionsFromGracha.length}.`,
      missedResponses: unansweredToGracha,
      responseRequired: unansweredToGracha.length > 0,
      priority,
      businessTopics,
      actionItems: unansweredToGracha.length > 0 ? 
        [`Ответить на ${unansweredToGracha.length} неотвеченных вопросов`] : 
        ['Продолжить мониторинг переписки'],
      summary: `Оффлайн анализ переписки "${chatTitle}": ${totalMessages} сообщений, ${unansweredToGracha.length} неотвеченных вопросов к Грачья, ${problemMessages.length} проблем найдено.`
    };
  }

  private extractQuestionText(message: string): string {
    const parts = message.split('] ');
    if (parts.length > 1) {
      const messageContent = parts[1];
      const colonIndex = messageContent.indexOf(':');
      if (colonIndex > -1) {
        return messageContent.substring(colonIndex + 1).trim();
      }
    }
    return message;
  }

  private extractMessageContent(message: string): string {
    const parts = message.split('] ');
    if (parts.length > 1) {
      const messageContent = parts[1];
      const colonIndex = messageContent.indexOf(':');
      if (colonIndex > -1) {
        const speaker = messageContent.substring(0, colonIndex);
        const text = messageContent.substring(colonIndex + 1).trim();
        return `${speaker}: ${text.substring(0, 100)}`;
      }
    }
    return message.substring(0, 100);
  }

  private isRhetoricalQuestion(questionText: string, fullMessage: string): boolean {
    // Проверяем риторические вопросы с ответом в том же сообщении
    const rhetoricalPatterns = [
      /можно.*?\?\s*(нет|да)/i,
      /\?\s*(нет|да)\./i,
      /\?\s*(конечно|очевидно|ясно)/i,
      /\?\s*мне нужно/i,
      /\?\s*я считаю/i,
      /\?\s*думаю/i
    ];
    
    const combinedText = questionText + ' ' + fullMessage;
    return rhetoricalPatterns.some(pattern => pattern.test(combinedText));
  }

  private hasContextualAnswer(questionText: string, subsequentMessages: string[]): boolean {
    // Извлекаем ключевые слова из вопроса
    const questionKeywords = this.extractKeywords(questionText);
    
    // Ищем тематически связанные ответы в последующих сообщениях
    for (const message of subsequentMessages) {
      if (message.includes('Грачья:')) {
        const messageContent = this.extractMessageContent(message);
        const messageKeywords = this.extractKeywords(messageContent);
        
        // Проверяем пересечение ключевых слов
        const commonKeywords = questionKeywords.filter(kw => 
          messageKeywords.some(mk => mk.includes(kw) || kw.includes(mk))
        );
        
        // Если есть совпадение ключевых слов и сообщение достаточно длинное
        if (commonKeywords.length > 0 && messageContent.length > 20) {
          return true;
        }
      }
    }
    
    return false;
  }

  private extractKeywords(text: string): string[] {
    // Удаляем знаки препинания и разбиваем на слова
    const words = text.toLowerCase()
      .replace(/[^\wа-яё\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Убираем служебные слова
    const stopWords = ['что', 'как', 'где', 'когда', 'почему', 'который', 'которая', 'можно', 'нужно', 'есть', 'была', 'будет', 'этот', 'тот'];
    return words.filter(word => !stopWords.includes(word));
  }

  private identifyBusinessTopics(messageTexts: string[]): string[] {
    const topics = [];
    
    if (messageTexts.some(msg => msg.includes('работ') || msg.includes('проект'))) {
      topics.push('рабочие вопросы');
    }
    if (messageTexts.some(msg => msg.includes('встреч') || msg.includes('план'))) {
      topics.push('планирование встреч');
    }
    if (messageTexts.some(msg => msg.includes('самочувств') || msg.includes('здоровь'))) {
      topics.push('вопросы здоровья');
    }
    if (topics.length === 0) {
      topics.push('личное общение');
    }
    
    return topics;
  }
}

export const offlineAI = new OfflineAIAnalyzer();