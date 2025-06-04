import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LocalAISetup() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    url: "http://localhost:11434",
    model: "llama3.2:latest"
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${config.url}/api/tags`);
      if (response.ok) {
        setIsConnected(true);
        toast({
          title: "Подключение успешно",
          description: "Локальная AI модель доступна",
        });
      } else {
        throw new Error("Не удалось подключиться");
      }
    } catch (error) {
      setIsConnected(false);
      toast({
        title: "Ошибка подключения",
        description: "Убедитесь, что Ollama запущен и доступен",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Настройка локальной AI модели
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div>
            <p className="font-medium text-blue-800">Статус подключения</p>
            <p className="text-sm text-blue-600">
              {isConnected ? "Подключено к локальной модели" : "Не подключено"}
            </p>
          </div>
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center">
            {isConnected ? (
              <CheckCircle className="w-4 h-4 mr-1" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-1" />
            )}
            {isConnected ? "Активно" : "Неактивно"}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="ai-url">URL сервера Ollama</Label>
            <Input
              id="ai-url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="http://localhost:11434"
            />
          </div>

          <div>
            <Label htmlFor="ai-model">Модель</Label>
            <Input
              id="ai-model"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="llama3.2:latest"
            />
          </div>

          <Button 
            onClick={checkConnection}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? "Проверка..." : "Проверить подключение"}
          </Button>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Инструкция по установке Ollama:</h4>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Скачайте Ollama с официального сайта</li>
            <li>2. Установите и запустите программу</li>
            <li>3. Выполните: <code className="bg-gray-200 px-1 rounded">ollama pull llama3.2</code></li>
            <li>4. Убедитесь, что сервер запущен на порту 11434</li>
          </ol>
          <div className="mt-3">
            <a 
              href="https://ollama.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Перейти на сайт Ollama
            </a>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Локальная AI модель обеспечивает конфиденциальность данных и работает без подключения к интернету.
        </div>
      </CardContent>
    </Card>
  );
}