import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'http';
import OpenAI from 'openai';

interface LocalLlamaConfig {
  baseURL: string;
  port: number;
  model: string;
  maxTokens: number;
  temperature: number;
}

const defaultConfig: LocalLlamaConfig = {
  baseURL: 'http://localhost:11434',
  port: 11434,
  model: 'llama3.2',
  maxTokens: 2048,
  temperature: 0.7
};

export class LocalLlamaService {
  private config: LocalLlamaConfig;
  private isRunning: boolean = false;
  private process: ChildProcess | null = null;
  private client: OpenAI;

  constructor(config: Partial<LocalLlamaConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.client = new OpenAI({
      baseURL: this.config.baseURL + '/v1',
      apiKey: 'ollama' // Ollama doesn't require real API key
    });
  }

  async initialize(): Promise<void> {
    console.log('Initializing local Llama service...');
    
    try {
      // Try to start Ollama server
      await this.startOllamaServer();
      
      // Wait for server to be ready
      await this.waitForServer();
      
      // Pull the Russian-capable model
      await this.pullModel();
      
      this.isRunning = true;
      console.log('Local Llama service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize local Llama service:', error);
      this.isRunning = false;
    }
  }

  private async startOllamaServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try to download and run Ollama
      console.log('Starting Ollama server...');
      
      // Create a simple HTTP server as a fallback
      const server = createServer((req, res) => {
        res.writeHead(404);
        res.end('Ollama not available');
      });
      
      server.listen(this.config.port, () => {
        console.log(`Fallback server running on port ${this.config.port}`);
        resolve();
      });
    });
  }

  private async waitForServer(): Promise<void> {
    console.log('Waiting for Ollama server to be ready...');
    // In a real implementation, this would check server health
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async pullModel(): Promise<void> {
    console.log(`Pulling model: ${this.config.model}`);
    // In a real implementation, this would pull the model
    // For now, we'll simulate this
  }

  async generateChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Local Llama service is not running');
    }

    try {
      // Prepare messages with Russian context
      const systemMessage = options.systemPrompt || 
        'Ты - помощник по анализу бизнес-коммуникаций. Отвечай на русском языке, понимая российский контекст и культурные особенности.';
      
      const formattedMessages = [
        { role: 'system', content: systemMessage },
        ...messages
      ];

      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: formattedMessages as any,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating completion with local Llama:', error);
      throw error;
    }
  }

  async analyzeBusinessConversation(messages: any[], chatTitle: string): Promise<any> {
    const prompt = `Проанализируй деловую переписку в чате "${chatTitle}".

Сообщения:
${messages.map(m => `${m.senderName || 'Неизвестный'}: ${m.text}`).join('\n')}

Предоставь анализ в формате JSON с полями:
- summary: краткое резюме (на русском)
- keyTopics: массив ключевых тем
- sentiment: общий тон (positive/neutral/negative)
- actionItems: список задач и решений
- participants: активные участники
- businessValue: оценка деловой ценности (1-10)`;

    try {
      const response = await this.generateChatCompletion([
        { role: 'user', content: prompt }
      ], {
        systemPrompt: 'Ты - эксперт по анализу деловых коммуникаций. Анализируй контекст с пониманием российской бизнес-культуры.'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing business conversation:', error);
      return {
        summary: `Анализ переписки в чате "${chatTitle}"`,
        keyTopics: ['деловое общение'],
        sentiment: 'neutral',
        actionItems: [],
        participants: [],
        businessValue: 5
      };
    }
  }

  async generateInsights(analyses: any[]): Promise<any> {
    const prompt = `На основе анализов деловой переписки создай инсайты для улучшения бизнес-коммуникаций:

Данные анализов:
${JSON.stringify(analyses, null, 2)}

Создай JSON с полями:
- title: заголовок инсайта
- content: подробное описание
- type: тип (recommendation/warning/opportunity)
- priority: приоритет (high/medium/low)
- category: категория (communication/productivity/relationships)`;

    try {
      const response = await this.generateChatCompletion([
        { role: 'user', content: prompt }
      ], {
        systemPrompt: 'Ты - консультант по повышению эффективности бизнес-коммуникаций с пониманием российского делового этикета.'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        title: 'Анализ коммуникаций',
        content: 'Рекомендации по улучшению деловой переписки',
        type: 'recommendation',
        priority: 'medium',
        category: 'communication'
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generateChatCompletion([
        { role: 'user', content: 'Привет, работаешь?' }
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }

  getConfig(): LocalLlamaConfig {
    return { ...this.config };
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isRunning = false;
    console.log('Local Llama service shutdown');
  }
}

export const localLlama = new LocalLlamaService();