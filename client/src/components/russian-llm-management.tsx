import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Globe,
  Zap,
  Shield,
  MessageSquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function RussianLLMManagement() {
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get Russian LLM status
  const { data: russianStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/ai/russian/status"],
    refetchInterval: 5000
  });

  // Get local AI status for comparison
  const { data: localStatus } = useQuery({
    queryKey: ["/api/ai/local/status"],
    refetchInterval: 10000
  });

  // Toggle Russian LLM service
  const toggleMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const response = await fetch("/api/ai/russian/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable })
      });
      if (!response.ok) throw new Error("Failed to toggle Russian LLM");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/russian/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/local/status"] });
      toast({
        title: "Успешно",
        description: data.message
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось переключить состояние Russian LLM",
        variant: "destructive"
      });
    }
  });

  const handleToggle = async (enable: boolean) => {
    setIsToggling(true);
    try {
      await toggleMutation.mutateAsync(enable);
    } finally {
      setIsToggling(false);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <CardTitle>Загрузка статуса Russian LLM...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const isRunning = russianStatus?.running;
  const isConnected = russianStatus?.connected;
  const config = russianStatus?.config;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <CardTitle>Российский LLM сервис</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {isRunning && isConnected ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Активен
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Неактивен
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Локальный LLM с глубоким пониманием русского языка и российского бизнес-контекста
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="russian-llm-toggle">
                Использовать локальный Russian LLM
              </Label>
            </div>
            <Switch
              id="russian-llm-toggle"
              checked={isRunning}
              onCheckedChange={handleToggle}
              disabled={isToggling || toggleMutation.isPending}
            />
          </div>

          {isRunning && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Russian LLM активен. Все анализы выполняются локально без передачи данных внешним сервисам.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Статус сервиса</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Сервер:</span>
                  <span className={isRunning ? "text-green-600" : "text-red-600"}>
                    {isRunning ? "Запущен" : "Остановлен"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Соединение:</span>
                  <span className={isConnected ? "text-green-600" : "text-red-600"}>
                    {isConnected ? "Активно" : "Отсутствует"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Порт:</span>
                  <span>{config?.port || 8080}</span>
                </div>
                <div className="flex justify-between">
                  <span>Модель:</span>
                  <span>{config?.model || "russian-chat"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Преимущества</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-3 w-3" />
                  <span>Понимание русского контекста</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-3 w-3" />
                  <span>Полная конфиденциальность</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-3 w-3" />
                  <span>Быстрая обработка</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-3 w-3" />
                  <span>Работа без интернета</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {localStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Сравнение с внешними сервисами</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Russian LLM (локальный):</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Активен" : "Неактивен"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>OpenAI (внешний):</span>
                <Badge variant={localStatus.connected ? "outline" : "secondary"}>
                  {isRunning ? "Отключен" : (localStatus.connected ? "Резерв" : "Недоступен")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}