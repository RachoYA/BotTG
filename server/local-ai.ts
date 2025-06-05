import OpenAI from "openai";
import { russianLLM } from "./russian-llm.js";

// Configuration for local AI models
interface LocalAIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  embeddingModel?: string;
}

// Default configuration for Russian LLM
const defaultConfig: LocalAIConfig = {
  baseURL: "http://localhost:8080/v1",
  apiKey: "russian-llm",
  model: "qwen",
  embeddingModel: "russian-embeddings"
};

class LocalAIService {
  private client: OpenAI;
  private config: LocalAIConfig;
  private fallbackToOpenAI: boolean = false;
  private openaiClient?: OpenAI;

  private cleanJSONResponse(response: string): string {
    let cleanResponse = response.trim();
    
    // Remove common Russian prefixes
    const badPrefixes = ['Готовлю результат', 'Обрабатываю', 'Анализирую', 'Готово', 'Результат', 'Ответ:', 'JSON:'];
    for (const prefix of badPrefixes) {
      if (cleanResponse.startsWith(prefix)) {
        cleanResponse = cleanResponse.substring(prefix.length).trim();
      }
    }
    
    // Find JSON boundaries
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error('No valid JSON found in response: ' + response.substring(0, 100));
    }
    
    return cleanResponse.substring(jsonStart, jsonEnd + 1);
  }

  constructor(config: Partial<LocalAIConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    // Initialize Russian LLM service
    this.initializeRussianLLM();
    
    // Initialize local AI client
    this.client = new OpenAI({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
    });

    // Отключаем OpenAI, используем только оффлайн модели
    this.fallbackToOpenAI = false;
  }

  private async initializeRussianLLM(): Promise<void> {
    try {
      await russianLLM.initialize();
      console.log('Russian LLM service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Russian LLM service:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // First try to check if Russian LLM service is running
      const russianLLMStatus = await russianLLM.testConnection();
      if (russianLLMStatus) {
        console.log("Russian LLM service is running");
        return true;
      }

      // Fallback to original test
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: "user", content: "Тест соединения" }],
        max_tokens: 10
      });
      return response.choices?.[0]?.message?.content !== undefined;
    } catch (error: any) {
      console.log("Local AI connection failed:", error.message);
      return false;
    }
  }

  async generateChatCompletion(
    messages: any[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: { type: "json_object" };
    } = {}
  ): Promise<string> {
    const {
      model = this.config.model,
      temperature = 0.7,
      maxTokens = 4000,
      responseFormat
    } = options;

    try {
      // Try local AI first
      const localAvailable = await this.testConnection();
      
      if (localAvailable) {
        console.log("Using local AI model:", model);
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(responseFormat && { response_format: responseFormat })
        });
        
        return response.choices[0].message.content || "";
      }
    } catch (error) {
      console.error("Local AI error:", error.message);
    }

    // Fallback to OpenAI if local AI fails and fallback is enabled
    if (this.fallbackToOpenAI && this.openaiClient) {
      try {
        console.log("Falling back to OpenAI");
        const response = await this.openaiClient.chat.completions.create({
          model: "gpt-4o-mini", // Use mini model to reduce costs
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(responseFormat && { response_format: responseFormat })
        });
        
        return response.choices[0].message.content || "";
      } catch (openaiError) {
        console.error("OpenAI fallback also failed:", openaiError.message);
        throw new Error("Both local AI and OpenAI failed");
      }
    }

    throw new Error("Local AI unavailable and no fallback configured");
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Try local embedding model first
      const localAvailable = await this.testConnection();
      
      if (localAvailable && this.config.embeddingModel) {
        console.log("Using local embedding model:", this.config.embeddingModel);
        const response = await this.client.embeddings.create({
          model: this.config.embeddingModel,
          input: text,
          encoding_format: "float",
        });
        
        return response.data[0].embedding;
      }
    } catch (error) {
      console.error("Local embedding error:", error.message);
    }

    // Fallback to OpenAI embeddings
    if (this.fallbackToOpenAI && this.openaiClient) {
      try {
        console.log("Using OpenAI embeddings as fallback");
        const response = await this.openaiClient.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
          encoding_format: "float",
        });
        
        return response.data[0].embedding;
      } catch (openaiError) {
        console.error("OpenAI embedding fallback failed:", openaiError.message);
        throw new Error("Both local and OpenAI embeddings failed");
      }
    }

    throw new Error("No embedding service available");
  }

  // Conversation analysis optimized for local models
  async analyzeConversationContext(chat: any, messages: any[]): Promise<any> {
    const recentMessages = messages.slice(0, 30); // Reduce context for local models
    const messageTexts = recentMessages
      .map(m => `${m.senderName || 'Unknown'}: ${m.text}`)
      .join('\n');
    
    const prompt = `Analyze this conversation from chat "${chat.title}" and provide insights in JSON format.

Recent messages:
${messageTexts}

Respond with JSON containing:
{
  "summary": "Brief summary of the conversation",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "relationship": "Type of relationship (personal, business, support, etc.)"
}`;

    try {
      const response = await this.generateChatCompletion([
        {
          role: "system",
          content: "You are a conversation analyst. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ], {
        responseFormat: { type: "json_object" },
        maxTokens: 500
      });

      // Try to parse JSON, if it fails, extract JSON from text
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // If response is plain text, try to extract JSON or create structured response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        // Fallback: create structured response from text
        return {
          summary: response.trim(),
          keyTopics: [],
          relationship: "business"
        };
      }
    } catch (error) {
      console.error('Error analyzing conversation context:', error);
      return {
        summary: `Conversation in ${chat.title}`,
        keyTopics: ['general'],
        relationship: 'unknown'
      };
    }
  }

  // Business conversation analysis for management insights
  async analyzeBusinessConversation(messages: any[], chatTitle: string): Promise<any> {
    // Take more messages for comprehensive analysis, but limit for token constraints
    const messageLimit = Math.min(messages.length, 200);
    const conversationText = messages
      .slice(-messageLimit) // Take up to 200 most recent messages
      .map(msg => `[${msg.timestamp?.toISOString()?.slice(0, 19) || 'Unknown'}] ${msg.senderName || 'Unknown'}: ${msg.text || ''}`)
      .join('\n');

    const systemPrompt = `Ты - эксперт по анализу деловых коммуникаций. Проанализируй ${messageLimit} сообщений переписки для управленческих инсайтов.

ВАЖНО: Пользователь в системе - "Грачья" (может быть "Грачья Алексаня", "Racho", "Racho23"). Сосредоточься на коммуникациях с этим человеком.

Детально проанализируй:
1. Неотвеченные запросы к Грачье - конкретные просьбы и задачи
2. Выявленные проблемы - технические, финансовые, организационные
3. Открытые вопросы - что требует решения или ответа
4. Участие Грачьи - как он взаимодействует в переписке
5. Пропущенные ответы - на что не отвечено
6. Бизнес-контекст - проекты, финансы, команда
7. Технические аспекты - разработка, инструменты, проблемы
8. Приоритеты - что срочно, что может подождать

Отвечай ТОЛЬКО JSON без дополнительного текста:
{
  "unansweredRequests": ["детальное описание запроса с контекстом"],
  "identifiedProblems": ["конкретная проблема с объяснением"],
  "openQuestions": ["открытый вопрос, требующий решения"],
  "myParticipation": "подробное описание роли и участия Грачьи",
  "missedResponses": ["на что конкретно не ответил"],
  "responseRequired": true/false,
  "summary": "детальное резюме ключевых моментов переписки",
  "priority": "high/medium/low",
  "businessTopics": ["конкретные бизнес-темы"],
  "technicalTopics": ["технические вопросы"],
  "financialTopics": ["финансовые аспекты"]
}`;

    console.log(`Analyzing ${messageLimit} messages out of ${messages.length} total for chat: ${chatTitle}`);
    console.log(`Conversation text length: ${conversationText.length} characters`);
    console.log(`First 200 chars of conversation: ${conversationText.substring(0, 200)}...`);

    try {
      // Прямое обращение к qwen без перехвата русской LLM
      const directResponse = await fetch('http://localhost:8080/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-key'
        },
        body: JSON.stringify({
          model: 'qwen',
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user", 
              content: `ДЕТАЛЬНО проанализируй переписку "${chatTitle}" из ${messageLimit} сообщений за выбранный период:\n\n${conversationText}`
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1500,
          temperature: 0.3
        })
      });
      
      const responseData = await directResponse.json();
      const response = responseData.choices[0]?.message?.content || "";

      console.log(`Raw model response: ${response.substring(0, 300)}...`);
      
      const cleanResponse = this.cleanJSONResponse(response);
      console.log(`Cleaned JSON response: ${cleanResponse.substring(0, 300)}...`);
      
      const result = JSON.parse(cleanResponse);
      console.log(`Parsed result summary: ${result.summary}`);
      console.log(`Checking for useFullAnalysis flag: ${result.useFullAnalysis}`);
      console.log(`Full result object:`, JSON.stringify(result, null, 2));
      
      // ВСЕГДА запускаем детальный анализ для анализа периода
      const needsDetailedAnalysis = true;
      
      console.log(`Needs detailed analysis: ${needsDetailedAnalysis}`);
      
      if (needsDetailedAnalysis) {
        console.log("Detected useFullAnalysis flag, running detailed qwen analysis...");
        
        const detailedPrompt = `Проанализируй переписку "${chatTitle}" детально. Найди КОНКРЕТНЫЕ неотвеченные вопросы к пользователю Грачья.

ПЕРЕПИСКА (${messageLimit} сообщений):
${conversationText}

ЗАДАЧА: Найти все вопросы адресованные Грачья, которые остались без ответа.

Вернуть JSON анализ:
{
  "summary": "Детальная статистика сообщений и вопросов",
  "unansweredToGracha": ["точный текст каждого неотвеченного вопроса к Грачья"],
  "identifiedProblems": ["конкретные проблемы с цитатами из сообщений"],
  "questionsFromGracha": ["вопросы которые задавал Грачья"],
  "participationStats": "статистика участия в цифрах",
  "communicationType": "тип общения (деловое/личное)",
  "responseRequired": true/false,
  "priority": "high/medium/low"
}`;

        console.log('Running offline detailed analysis with local model qwen');
        console.log(`Sending prompt to qwen model: ${detailedPrompt.substring(0, 200)}...`);
        
        try {
          // Отправляем промпт к модели qwen для настоящего AI анализа
          const qwenResponse = await this.client.chat.completions.create({
            model: this.config.model,
            messages: [
              {
                role: "system",
                content: "Ты эксперт по анализу переписок. Анализируй точно и детально, находи конкретные неотвеченные вопросы."
              },
              {
                role: "user", 
                content: detailedPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 2000
          });

          const qwenResult = qwenResponse.choices[0]?.message?.content;
          console.log(`Qwen analysis result: ${qwenResult?.substring(0, 300)}...`);
          
          if (qwenResult) {
            const cleanedResult = this.cleanJSONResponse(qwenResult);
            const parsedResult = JSON.parse(cleanedResult);
            
            return {
              unansweredRequests: parsedResult.unansweredToGracha || [],
              identifiedProblems: parsedResult.identifiedProblems || [],
              openQuestions: parsedResult.questionsFromGracha || [],
              myParticipation: parsedResult.participationStats || "",
              missedResponses: parsedResult.unansweredToGracha || [],
              responseRequired: parsedResult.responseRequired || false,
              priority: parsedResult.priority || "medium",
              businessTopics: ["AI анализ"],
              actionItems: parsedResult.unansweredToGracha?.length > 0 ? 
                [`Ответить на ${parsedResult.unansweredToGracha.length} неотвеченных вопросов`] : 
                ["Продолжить мониторинг переписки"],
              summary: parsedResult.summary || `AI анализ переписки "${chatTitle}"`
            };
          }
        } catch (error) {
          console.log('Qwen analysis failed:', error);
          console.log('Error details:', JSON.stringify(error, null, 2));
          console.log('Falling back to JavaScript analysis');
        }
        
        // Fallback JavaScript анализ если qwen недоступен
        const messageTexts = conversationText.split('\n').filter(line => line.trim());
        const participantMessages = messageTexts.filter(msg => msg.includes('Грачья:'));
        const partnerMessages = messageTexts.filter(msg => msg.includes('Сонышко:'));
        
        // Детальный анализ содержания сообщений
        const questionMessages = messageTexts.filter(msg => msg.includes('?'));
        const myQuestions = questionMessages.filter(msg => msg.includes('Грачья:'));
        const partnerQuestions = questionMessages.filter(msg => msg.includes('Сонышко:') || !msg.includes('Грачья:'));
        
        // Поиск неотвеченных вопросов к Грачья
        const unansweredToGracha: string[] = [];
        partnerQuestions.forEach(question => {
          const questionText = question.split(':')[1]?.trim();
          if (questionText) {
            // Проверяем есть ли ответ в последующих сообщениях
            const questionIndex = messageTexts.indexOf(question);
            const subsequentMessages = messageTexts.slice(questionIndex + 1, questionIndex + 5);
            const hasAnswer = subsequentMessages.some(msg => msg.includes('Грачья:'));
            
            if (!hasAnswer) {
              unansweredToGracha.push(questionText);
            }
          }
        });
        
        // Анализ проблем и тем
        const problemIndicators = messageTexts.filter(msg => 
          msg.includes('устал') || msg.includes('болит') || msg.includes('проблем') ||
          msg.includes('сложно') || msg.includes('не могу') || msg.includes('помочь')
        );
        
        const businessTopics = [];
        if (messageTexts.some(msg => msg.includes('работ') || msg.includes('проект'))) {
          businessTopics.push('рабочие вопросы');
        }
        if (messageTexts.some(msg => msg.includes('встреч') || msg.includes('план'))) {
          businessTopics.push('планирование встреч');
        }
        if (messageTexts.some(msg => msg.includes('самочувств') || msg.includes('здоровь'))) {
          businessTopics.push('вопросы здоровья');
        }
        
        const hasEmotions = messageTexts.some(msg => /[😘😂🥰💘🫶😆]/.test(msg));
        const hasConcerns = problemIndicators.length > 0;
        const hasQuestions = questionMessages.length > 0;
        
        const detailedResult = {
          summary: `Детальный анализ переписки "${chatTitle}": обработано ${messageLimit} сообщений (${participantMessages.length} от Грачья, ${partnerMessages.length} от партнера). Найдено ${questionMessages.length} вопросов, из них ${unansweredToGracha.length} неотвеченных к Грачья.`,
          unansweredRequests: unansweredToGracha.length > 0 ? unansweredToGracha : [
            "Прямых неотвеченных вопросов не найдено"
          ],
          identifiedProblems: problemIndicators.map(msg => {
            const parts = msg.split('] ');
            const content = parts.length > 1 ? parts[1] : msg;
            const textPart = content.split(':');
            return textPart.length > 1 ? `${textPart[0]}: ${textPart[1].trim().substring(0, 80)}` : content.substring(0, 80);
          }),
          openQuestions: myQuestions.map(q => {
            const parts = q.split('] ');
            const content = parts.length > 1 ? parts[1] : q;
            const textPart = content.split(':');
            return textPart.length > 1 ? textPart[1].trim().substring(0, 80) : content.substring(0, 80);
          }),
          myParticipation: `Активность: ${participantMessages.length}/${messageTexts.length} сообщений (${Math.round(participantMessages.length/messageTexts.length*100)}%). Задано вопросов: ${myQuestions.length}. ${hasEmotions ? 'Эмоциональное общение.' : 'Деловое общение.'}`,
          missedResponses: unansweredToGracha,
          responseRequired: unansweredToGracha.length > 0,
          priority: unansweredToGracha.length > 0 ? "high" : (hasConcerns ? "medium" : "low"),
          businessTopics: businessTopics.length > 0 ? businessTopics : ["личное общение"],
          actionItems: unansweredToGracha.length > 0 ? [
            `Ответить на ${unansweredToGracha.length} неотвеченных вопросов`,
            "Уточнить важные детали в переписке",
            "Поддержать диалог"
          ] : [
            "Продолжить наблюдение за перепиской",
            "Поддерживать активное общение"
          ]
        };
        console.log(`Detailed analysis summary: ${detailedResult.summary}`);
        
        return {
          unansweredRequests: detailedResult.unansweredRequests || [],
          identifiedProblems: detailedResult.identifiedProblems || [],
          openQuestions: detailedResult.openQuestions || [],
          myParticipation: detailedResult.myParticipation || "",
          missedResponses: detailedResult.missedResponses || [],
          responseRequired: detailedResult.responseRequired || false,
          summary: detailedResult.summary || "Детальный анализ переписки выполнен",
          priority: detailedResult.priority || "medium"
        };
      }
      
      // Ensure all required fields exist
      return {
        unansweredRequests: result.unansweredRequests || [],
        identifiedProblems: result.identifiedProblems || [],
        openQuestions: result.openQuestions || [],
        myParticipation: result.myParticipation || "",
        missedResponses: result.missedResponses || [],
        responseRequired: result.responseRequired || false,
        summary: result.summary || "",
        priority: result.priority || "medium"
      };
    } catch (error) {
      console.error('Error in business conversation analysis:', error);
      return {
        unansweredRequests: [],
        identifiedProblems: [],
        openQuestions: [],
        myParticipation: "",
        missedResponses: [],
        responseRequired: false,
        summary: `Analysis of ${chatTitle}`,
        priority: "medium"
      };
    }
  }

  // Generate AI insights from analysis data
  async generateInsights(analyses: any[]): Promise<any> {
    if (analyses.length === 0) {
      return {
        type: "info",
        title: "Нет данных для анализа",
        content: "Недостаточно данных для генерации инсайтов",
        confidence: 0.5
      };
    }

    const prompt = `Based on these conversation analyses, generate actionable business insights.

Analyses: ${JSON.stringify(analyses.slice(-10))} // Last 10 analyses

Generate insights about:
1. Communication patterns
2. Urgent items requiring attention
3. Trends and recommendations

Respond with JSON:
{
  "type": "recommendation/trend/alert",
  "title": "Brief insight title",
  "content": "Detailed insight description",
  "confidence": 0.8
}`;

    try {
      const response = await this.generateChatCompletion([
        {
          role: "system",
          content: "You are a business intelligence analyst. Generate actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ], {
        responseFormat: { type: "json_object" },
        maxTokens: 500
      });

      const cleanResponse = this.cleanJSONResponse(response);
      const result = JSON.parse(cleanResponse);
      return {
        type: result.type || "recommendation",
        title: result.title || "Новый инсайт",
        content: result.content || "Анализ завершен",
        confidence: result.confidence || 0.7
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        type: "info",
        title: "Системная информация",
        content: "Анализ коммуникаций выполнен",
        confidence: 0.5
      };
    }
  }

  setFallbackMode(enabled: boolean) {
    this.fallbackToOpenAI = enabled;
  }

  getConfig() {
    return { ...this.config };
  }
}

// Global instance
export const localAI = new LocalAIService();
export { LocalAIService };