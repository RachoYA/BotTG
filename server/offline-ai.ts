import { pipeline, env } from '@xenova/transformers';

// Отключаем удаленные модели, используем только локальные
env.allowRemoteModels = false;
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

    // Анализируем неотвеченные вопросы к Грачья
    const unansweredToGracha: string[] = [];
    
    for (const question of questionsToGracha) {
      const questionIndex = messageTexts.indexOf(question);
      const subsequentMessages = messageTexts.slice(questionIndex + 1, questionIndex + 10);
      const hasAnswer = subsequentMessages.some(msg => msg.includes('Грачья:'));
      
      if (!hasAnswer) {
        const questionText = this.extractQuestionText(question);
        if (questionText && questionText.length > 5) {
          unansweredToGracha.push(questionText);
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