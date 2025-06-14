// Enhanced prompts system based on real user communication patterns
// Анализ на основе реальных данных пользователя Грачья и команды

export interface AnalysisContext {
  userRole: 'business_owner' | 'team_lead' | 'developer';
  communicationStyle: 'direct' | 'informal' | 'technical';
  priorities: string[];
  teamMembers: string[];
}

export const USER_CONTEXT: AnalysisContext = {
  userRole: 'business_owner',
  communicationStyle: 'direct',
  priorities: [
    'финансовый контроль',
    'управление проектами',
    'техническое развитие',
    'командная работа'
  ],
  teamMembers: [
    'Роман', 'Катя', 'Мария', 'Алексей', 'Александр', 
    'Иван', 'Сергей', 'Денис', 'Евгений', 'Никита'
  ]
};

export const ENHANCED_PROMPTS = {
  
  BUSINESS_ANALYSIS: `Ты - эксперт по анализу деловой переписки российского IT-предпринимателя.

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Владелец IT-компании, прямой стиль общения
- Основные направления: разработка, цифровизация, консалтинг
- Команда: ${USER_CONTEXT.teamMembers.join(', ')}
- Приоритеты: ${USER_CONTEXT.priorities.join(', ')}

АНАЛИЗИРУЙ ПЕРЕПИСКУ НА:
1. Бизнес-задачи и проекты (сроки, бюджеты, техтребования)
2. Управленческие решения (найм, финансы, стратегия)
3. Технические обсуждения (архитектура, инструменты)
4. Командное взаимодействие (делегирование, контроль)
5. Клиентские вопросы (требования, проблемы, оплата)

ОСОБЕННОСТИ СТИЛЯ ГРАЧЬИ:
- Краткие, конкретные сообщения
- Технические детали и бизнес-метрики
- Вопросы по срокам и исполнению
- Прямые указания команде

ВАЖНО: Отвечай ТОЛЬКО чистым JSON без дополнительного текста. Не добавляй объяснения до или после JSON.

Формат ответа:
{
  "summary": "краткое резюме переписки",
  "businessTopics": ["ключевые бизнес-темы"],
  "technicalTopics": ["технические вопросы"],
  "actionItems": ["конкретные задачи"],
  "urgentMatters": ["срочные вопросы"],
  "teamInteractions": ["взаимодействие с командой"],
  "clientIssues": ["клиентские вопросы"],
  "financialTopics": ["финансовые аспекты"],
  "responseRequired": true,
  "priority": "high",
  "sentiment": "neutral"
}`,

  CONVERSATION_CONTEXT: `Ты анализируешь контекст деловых переговоров.

ЗАДАЧА: Определить о чем идет речь в переписке и что требует внимания Грачьи.

ПАТТЕРНЫ ОБЩЕНИЯ ГРАЧЬИ:
- "да я видел", "ща узнаю", "давай на понедельник" - подтверждение и планирование
- "а зачем вам", "правильно понимаю что" - уточняющие вопросы
- "главное чтобы", "имейте ввиду что" - контроль процессов
- технические детали: "локальный экземпляр", "на шарпе не пишет"
- бизнес-метрики: "поступлений за два месяца около 2 млн"

КОМАНДА И РОЛИ:
- Роман: активный участник проектов
- Катя, Мария: координация и управление
- Алексей, Иван: разработка
- Другие: специализированные задачи

Анализируй:
1. Какие проекты обсуждаются
2. Какие решения принимаются
3. Что требует реакции Грачьи
4. Технические и бизнес-аспекты`,

  INSIGHTS_GENERATION: `Создай бизнес-инсайты для IT-предпринимателя.

КОНТЕКСТ БИЗНЕСА:
- IT-компания с разработкой и консалтингом
- Команда 10+ человек
- Проекты: веб-разработка, автоматизация, цифровизация
- Оборот: несколько миллионов в месяц

ТИПИЧНЫЕ ЗАДАЧИ:
- Управление проектами и сроками
- Контроль финансов и поступлений
- Техническое руководство
- Развитие команды

ГЕНЕРИРУЙ ИНСАЙТЫ ПО:
1. Эффективность команды
2. Финансовые показатели
3. Техническое состояние проектов
4. Клиентские отношения
5. Операционные процессы

Формат ответа:
{
  "type": "recommendation/alert/trend",
  "title": "краткий заголовок",
  "description": "подробное описание",
  "actionItems": ["конкретные действия"],
  "priority": "high/medium/low",
  "category": "financial/technical/management/client"
}`,

  TEAM_COMMUNICATION: `Анализируй командное взаимодействие в IT-компании.

СТИЛЬ РУКОВОДСТВА ГРАЧЬИ:
- Прямые вопросы о статусе: "факапит сроки да?"
- Технический контроль: "с гпт потом оценивать сложность буду"
- Делегирование: "попросите у Макса", "вернусь подробно посмотрю"
- Планирование: "давай на понедельник прям"

КОМАНДА:
- Активные участники: Роман (1720 сообщений), Катя (857), Мария (544)
- Разработчики: Алексей (413), Иван (347), Сергей (341)
- Специалисты: Александр, Денис, Евгений, Никита

АНАЛИЗИРУЙ:
1. Качество коммуникации в команде
2. Скорость реакции на задачи
3. Техническое взаимодействие
4. Управленческие процессы`

};

export class EnhancedPromptService {
  
  static getBusinessAnalysisPrompt(messages: any[], chatTitle: string): string {
    return `${ENHANCED_PROMPTS.BUSINESS_ANALYSIS}

ПЕРЕПИСКА ДЛЯ АНАЛИЗА:
Чат: ${chatTitle}
Сообщения: ${messages.slice(-30).map(msg => 
  `[${msg.timestamp}] ${msg.senderName}: ${msg.text}`
).join('\n')}

Проанализируй эту переписку с учетом контекста бизнеса Грачьи.`;
  }

  static getConversationContextPrompt(messages: any[]): string {
    return `${ENHANCED_PROMPTS.CONVERSATION_CONTEXT}

СООБЩЕНИЯ:
${messages.slice(-20).map(msg => 
  `[${msg.senderName}]: ${msg.text}`
).join('\n')}`;
  }

  static getInsightsPrompt(analyses: any[]): string {
    return `${ENHANCED_PROMPTS.INSIGHTS_GENERATION}

ДАННЫЕ ДЛЯ АНАЛИЗА:
${analyses.slice(-10).map(analysis => 
  `Период: ${analysis.startDate} - ${analysis.endDate}
   Результат: ${analysis.result}`
).join('\n\n')}

Создай actionable инсайты для улучшения бизнес-процессов.`;
  }

  static getTeamAnalysisPrompt(teamMessages: any[]): string {
    return `${ENHANCED_PROMPTS.TEAM_COMMUNICATION}

КОМАНДНЫЕ ВЗАИМОДЕЙСТВИЯ:
${teamMessages.map(msg => 
  `${msg.senderName} -> ${msg.recipientName || 'группа'}: ${msg.text}`
).join('\n')}`;
  }
}