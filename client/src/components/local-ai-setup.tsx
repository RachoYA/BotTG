import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Settings, Cpu, Cloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocalAIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  embeddingModel: string;
  fallbackEnabled: boolean;
}

interface LocalAIStatus {
  connected: boolean;
  config: LocalAIConfig;
  lastTest: string;
}

export default function LocalAISetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<LocalAIConfig>({
    baseURL: "http://localhost:1234/v1",
    apiKey: "lm-studio",
    model: "qwen2.5-32b-instruct",
    embeddingModel: "nomic-embed-text",
    fallbackEnabled: true
  });

  const { data: status, isLoading } = useQuery<LocalAIStatus>({
    queryKey: ["/api/ai/local/status"],
    refetchInterval: 30000 // Check every 30 seconds
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/local/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error("Connection test failed");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Соединение успешно",
        description: "Локальная AI модель отвечает корректно"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/local/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка соединения",
        description: error.message || "Не удалось подключиться к локальной AI модели",
        variant: "destructive"
      });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: LocalAIConfig) => {
      const response = await fetch("/api/ai/local/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      if (!response.ok) throw new Error("Failed to update config");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Конфигурация обновлена",
        description: "Настройки локальной AI модели сохранены"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/local/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить конфигурацию",
        variant: "destructive"
      });
    }
  });

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(config);
  };

  const handleConfigChange = (field: keyof LocalAIConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            Статус локальной AI модели
          </CardTitle>
          <CardDescription>
            Текущее состояние подключения к локальной AI модели
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.connected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">Подключено</p>
                    <p className="text-sm text-muted-foreground">
                      Локальная модель работает нормально
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-medium">Отключено</p>
                    <p className="text-sm text-muted-foreground">
                      Используется OpenAI API в качестве fallback
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status?.connected ? "default" : "destructive"}>
                {status?.connected ? "Активно" : "Неактивно"}
              </Badge>
              {status?.config.fallbackEnabled && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  Fallback включен
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Конфигурация
          </CardTitle>
          <CardDescription>
            Настройки подключения к локальной AI модели (LM Studio, Ollama, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="baseURL">Base URL</Label>
              <Input
                id="baseURL"
                value={config.baseURL}
                onChange={(e) => handleConfigChange("baseURL", e.target.value)}
                placeholder="http://localhost:1234/v1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={config.apiKey}
                onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                placeholder="lm-studio"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model">Модель чата</Label>
              <Input
                id="model"
                value={config.model}
                onChange={(e) => handleConfigChange("model", e.target.value)}
                placeholder="qwen2.5-32b-instruct"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embeddingModel">Модель эмбеддингов</Label>
              <Input
                id="embeddingModel"
                value={config.embeddingModel}
                onChange={(e) => handleConfigChange("embeddingModel", e.target.value)}
                placeholder="nomic-embed-text"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Fallback на OpenAI</Label>
              <p className="text-sm text-muted-foreground">
                Использовать OpenAI API если локальная модель недоступна
              </p>
            </div>
            <Switch
              checked={config.fallbackEnabled}
              onCheckedChange={(checked) => handleConfigChange("fallbackEnabled", checked)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              variant="outline"
            >
              {testConnectionMutation.isPending ? "Тестирование..." : "Тест соединения"}
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
            >
              {updateConfigMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Текущее использование</CardTitle>
          <CardDescription>
            Информация о том, какая AI модель используется для разных задач
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Анализ разговоров</span>
              <Badge variant={status?.connected ? "default" : "secondary"}>
                {status?.connected ? "Локальная AI" : "OpenAI"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Генерация эмбеддингов</span>
              <Badge variant={status?.connected ? "default" : "secondary"}>
                {status?.connected ? "Локальная AI" : "OpenAI"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Семантический поиск</span>
              <Badge variant={status?.connected ? "default" : "secondary"}>
                {status?.connected ? "Локальная AI" : "OpenAI"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Инструкции по настройке</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium">LM Studio:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Скачайте и установите LM Studio</li>
              <li>Загрузите модель Qwen2.5-32B-Instruct</li>
              <li>Запустите локальный сервер на порту 1234</li>
              <li>Убедитесь что API доступен по адресу http://localhost:1234/v1</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Ollama:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Установите Ollama</li>
              <li>Запустите: ollama run qwen2.5:32b</li>
              <li>Измените Base URL на http://localhost:11434/v1</li>
              <li>Используйте "ollama" в качестве API key</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}