// Training service for Russian LLM based on user's real messages
import { storage } from './storage.js';

export interface TrainingPattern {
  trigger: string[];
  response: any;
  category: 'business' | 'technical' | 'financial' | 'team';
  confidence: number;
}

export class TrainingService {
  private patterns: TrainingPattern[] = [];

  async initializeTraining(): Promise<void> {
    console.log('Initializing training from real user messages...');
    
    // Анализируем реальные сообщения для создания паттернов
    await this.extractPatternsFromMessages();
    
    console.log(`Training completed with ${this.patterns.length} patterns`);
  }

  private async extractPatternsFromMessages(): Promise<void> {
    // Получаем характерные сообщения Грачьи
    const messages = await storage.getTelegramMessages();
    const grachaMessages = messages.filter(msg => 
      msg.senderName === 'Грачья' && 
      msg.text && 
      msg.text.length > 5
    );

    // Финансовые паттерны
    const financialMessages = grachaMessages.filter(msg => 
      msg.text?.toLowerCase().includes('млн') ||
      msg.text?.toLowerCase().includes('поступлени') ||
      msg.text?.toLowerCase().includes('налог') ||
      msg.text?.toLowerCase().includes('самозанятый')
    );

    if (financialMessages.length > 0) {
      this.patterns.push({
        trigger: ['млн', 'поступлени', 'налог', 'финанс', 'бюджет'],
        response: {
          summary: "Обсуждение финансовых показателей и планирование бюджета компании",
          businessTopics: ["финансовый анализ", "налоговое планирование", "денежный поток"],
          urgentMatters: ["контроль поступлений", "налоговая оптимизация"],
          actionItems: [
            "Проанализировать текущие финансовые показатели",
            "Оптимизировать налоговую структуру",
            "Планировать бюджет на следующий период"
          ],
          priority: "high",
          category: "financial"
        },
        category: 'financial',
        confidence: 0.9
      });
    }

    // Технические паттерны
    const technicalMessages = grachaMessages.filter(msg => 
      msg.text?.toLowerCase().includes('гпт') ||
      msg.text?.toLowerCase().includes('шарпе') ||
      msg.text?.toLowerCase().includes('локальный') ||
      msg.text?.toLowerCase().includes('разработ')
    );

    if (technicalMessages.length > 0) {
      this.patterns.push({
        trigger: ['гпт', 'ии', 'шарпе', 'разработ', 'архитектур', 'локальный'],
        response: {
          summary: "Техническое обсуждение разработки и выбора технологий",
          technicalTopics: ["выбор технологий", "архитектурные решения", "AI интеграция"],
          businessTopics: ["техническая экспертиза", "автоматизация процессов"],
          actionItems: [
            "Провести техническую экспертизу решений",
            "Выбрать оптимальный технологический стек",
            "Интегрировать AI для повышения эффективности"
          ],
          priority: "medium",
          category: "technical"
        },
        category: 'technical',
        confidence: 0.85
      });
    }

    // Командные паттерны
    const teamKeywords = ['роман', 'катя', 'мария', 'алексей', 'иван', 'сергей'];
    const teamMessages = grachaMessages.filter(msg => 
      teamKeywords.some(name => 
        msg.text?.toLowerCase().includes(name)
      )
    );

    if (teamMessages.length > 0) {
      this.patterns.push({
        trigger: teamKeywords,
        response: {
          summary: "Командное взаимодействие и управление проектами",
          teamInteractions: ["делегирование задач", "контроль выполнения", "координация"],
          businessTopics: ["управление проектами", "командная эффективность"],
          actionItems: [
            "Проверить статус задач у команды",
            "Скоординировать следующие этапы работы",
            "Обеспечить необходимые ресурсы"
          ],
          urgentMatters: ["контроль сроков", "решение блокировок"],
          responseRequired: true,
          priority: "high",
          category: "team_management"
        },
        category: 'team',
        confidence: 0.95
      });
    }

    // Бизнес-паттерны из реальных фраз
    const businessPhrases = [
      'правильно понимаю что',
      'а зачем вам',
      'давай на понедельник',
      'ща узнаю',
      'главное чтобы',
      'имейте ввиду что'
    ];

    this.patterns.push({
      trigger: businessPhrases,
      response: {
        summary: "Деловое обсуждение с уточнением деталей и планированием",
        businessTopics: ["планирование встреч", "уточнение требований", "контроль процессов"],
        actionItems: [
          "Уточнить детали обсуждаемых вопросов",
          "Запланировать следующие шаги",
          "Обеспечить контроль исполнения"
        ],
        communicationStyle: "direct_business",
        priority: "medium"
      },
      category: 'business',
      confidence: 0.8
    });
  }

  findBestPattern(text: string): TrainingPattern | null {
    const lowerText = text.toLowerCase();
    let bestMatch: TrainingPattern | null = null;
    let maxScore = 0;

    for (const pattern of this.patterns) {
      const score = pattern.trigger.reduce((acc, trigger) => {
        return acc + (lowerText.includes(trigger.toLowerCase()) ? pattern.confidence : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        bestMatch = pattern;
      }
    }

    return maxScore > 0.5 ? bestMatch : null;
  }

  async getTrainingStats(): Promise<any> {
    const messages = await storage.getTelegramMessages();
    const grachaMessages = messages.filter(msg => msg.senderName === 'Грачья');
    
    return {
      totalMessages: messages.length,
      grachaMessages: grachaMessages.length,
      patternsExtracted: this.patterns.length,
      categories: {
        financial: this.patterns.filter(p => p.category === 'financial').length,
        technical: this.patterns.filter(p => p.category === 'technical').length,
        team: this.patterns.filter(p => p.category === 'team').length,
        business: this.patterns.filter(p => p.category === 'business').length
      }
    };
  }
}

export const trainingService = new TrainingService();