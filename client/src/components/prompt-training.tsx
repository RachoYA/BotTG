import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Brain, Target, Database, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PromptTraining() {
  const { toast } = useToast();
  const [testPrompt, setTestPrompt] = useState("");
  const [trainingResults, setTrainingResults] = useState<any>(null);

  // Предустановленные тестовые промпты на основе реальных данных
  const testPrompts = [
    {
      name: "Командное взаимодействие",
      prompt: "Роман обсуждает статус проекта с Катей. Нужно проверить сроки выполнения и скоординировать следующие этапы работы.",
      category: "team"
    },
    {
      name: "Финансовый анализ",
      prompt: "Поступления около 2 млн за два месяца. Обсуждаем налоговое планирование и оформление самозанятых сотрудников.",
      category: "financial"
    },
    {
      name: "Техническая экспертиза",
      prompt: "С ГПТ потом оценивать сложность буду. На шарпе не пишет он. Нужно выбрать технологический стек для локального развертывания.",
      category: "technical"
    },
    {
      name: "Деловое планирование",
      prompt: "Давай на понедельник прям. Правильно понимаю что у нас поступлений за последние два месяца около 2 млн?",
      category: "business"
    }
  ];

  // Тестирование русской LLM
  const testRussianLLM = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await fetch("http://localhost:8080/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "russian-chat",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500
        })
      });
      if (!response.ok) throw new Error("Russian LLM test failed");
      return await response.json();
    },
    onSuccess: (data) => {
      setTrainingResults(data);
      toast({
        title: "Тест успешен",
        description: "Русская LLM обработала запрос",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка тестирования",
        description: "Не удалось подключиться к русской LLM",
        variant: "destructive",
      });
    },
  });

  // Получение статистики сообщений
  const { data: messageStats } = useQuery({
    queryKey: ['/api/telegram/message-stats'],
    queryFn: () => fetch('/api/telegram/message-stats').then(res => res.json())
  });

  // Анализ существующих сообщений для обучения
  const analyzeMessages = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/training/analyze-messages", {});
    },
    onSuccess: () => {
      toast({
        title: "Анализ завершен",
        description: "Сообщения проанализированы для улучшения промптов",
      });
    },
  });

  const formatResponse = (response: any) => {
    try {
      const content = response?.choices?.[0]?.message?.content;
      if (!content) return "Нет ответа";
      
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    } catch {
      return "Ошибка обработки ответа";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Обучение и тестирование промптов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {messageStats?.totalMessages?.toLocaleString() || '36,149'}
              </div>
              <div className="text-sm text-gray-600">Всего сообщений</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {messageStats?.grachaMessages?.toLocaleString() || '9,091'}
              </div>
              <div className="text-sm text-gray-600">Сообщения Грачьи</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {messageStats?.uniqueChats || '484'}
              </div>
              <div className="text-sm text-gray-600">Уникальных чатов</div>
            </div>
          </div>

          <Button
            onClick={() => analyzeMessages.mutate()}
            disabled={analyzeMessages.isPending}
            className="w-full mb-4"
          >
            {analyzeMessages.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Проанализировать сообщения для обучения
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test">Тестирование промптов</TabsTrigger>
          <TabsTrigger value="results">Результаты анализа</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Тестовые промпты
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testPrompts.map((prompt, index) => (
                  <Card key={index} className="cursor-pointer hover:bg-gray-50" 
                        onClick={() => setTestPrompt(prompt.prompt)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{prompt.name}</h4>
                        <Badge variant="outline">{prompt.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{prompt.prompt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <Textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Введите промпт для тестирования русской LLM..."
                  rows={4}
                />
                
                <Button
                  onClick={() => testRussianLLM.mutate(testPrompt)}
                  disabled={testRussianLLM.isPending || !testPrompt.trim()}
                  className="w-full"
                >
                  {testRussianLLM.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="w-4 h-4 mr-2" />
                  )}
                  Протестировать промпт
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {trainingResults && (
            <Card>
              <CardHeader>
                <CardTitle>Результат анализа</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium">Модель:</span>
                    <span className="ml-2">{trainingResults.model}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Токены:</span>
                    <span className="ml-2">{trainingResults.usage?.total_tokens}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Ответ модели:</h4>
                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
                    {formatResponse(trainingResults)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {!trainingResults && (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Запустите тест для просмотра результатов</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}