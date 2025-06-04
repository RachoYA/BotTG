import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Send, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AIModelTesting() {
  const { toast } = useToast();
  const [testPrompt, setTestPrompt] = useState("Проанализируй следующий текст и извлеки задачи: 'Нужно подготовить отчет до пятницы и созвониться с клиентом завтра.'");

  const testModelMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest("/api/ai/test", "POST", { prompt });
    },
    onSuccess: (data) => {
      toast({
        title: "Тест успешен",
        description: "AI модель отвечает корректно",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка тестирования",
        description: error.message || "Не удалось подключиться к AI модели",
        variant: "destructive",
      });
    },
  });

  const generateInsightMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/ai/generate-insights", "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Инсайты сгенерированы",
        description: "Новые AI инсайты успешно созданы",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* AI Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Статус AI модели
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Badge variant="default" className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              OpenAI GPT-4o подключен
            </Badge>
            <div className="text-sm text-gray-600">
              Последний запрос: {new Date().toLocaleString('ru-RU')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test AI Model */}
      <Card>
        <CardHeader>
          <CardTitle>Тестирование модели</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тестовый промпт
            </label>
            <Textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Введите текст для тестирования AI модели..."
              rows={4}
            />
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={() => testModelMutation.mutate(testPrompt)}
              disabled={testModelMutation.isPending || !testPrompt.trim()}
            >
              {testModelMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Отправить тест
            </Button>
            
            <Button
              variant="outline"
              onClick={() => generateInsightMutation.mutate()}
              disabled={generateInsightMutation.isPending}
            >
              {generateInsightMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Генерировать инсайты
            </Button>
          </div>

          {testModelMutation.data && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Ответ модели:</h4>
              <p className="text-green-700 whitespace-pre-wrap">
                {JSON.stringify(testModelMutation.data, null, 2)}
              </p>
            </div>
          )}

          {testModelMutation.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800 mb-2">
                <XCircle className="w-4 h-4 mr-2" />
                <h4 className="font-medium">Ошибка тестирования</h4>
              </div>
              <p className="text-red-700">
                {(testModelMutation.error as any)?.message || "Неизвестная ошибка"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Конфигурация AI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Модель
                </label>
                <div className="text-sm text-gray-900">GPT-4o</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Температура
                </label>
                <div className="text-sm text-gray-900">0.7</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Максимум токенов
                </label>
                <div className="text-sm text-gray-900">1000</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Частота обработки
                </label>
                <div className="text-sm text-gray-900">Каждую минуту</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}