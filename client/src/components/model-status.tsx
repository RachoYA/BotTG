import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Cpu, Activity, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface LocalAIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  embeddingModel: string;
}

interface LocalAIStatus {
  connected: boolean;
  config: LocalAIConfig;
  lastTest: string;
}

interface RussianLLMHealth {
  status: "healthy" | "error";
  model: string;
  port: number;
  isRunning: boolean;
}

export default function ModelStatus() {
  const { data: localAIStatus, isLoading: localAILoading, refetch: refetchLocalAI } = useQuery<LocalAIStatus>({
    queryKey: ["/api/ai/local/status"],
    refetchInterval: 30000
  });

  const { data: russianLLMHealth, isLoading: russianLLMLoading, refetch: refetchRussianLLM } = useQuery<RussianLLMHealth>({
    queryKey: ["/api/ai/russian/health"],
    refetchInterval: 30000
  });

  const getStatusIcon = (connected: boolean) => {
    return connected ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Русская LLM Модель */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Русская LLM
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetchRussianLLM()}
              disabled={russianLLMLoading}
            >
              <RefreshCw className={`w-4 h-4 ${russianLLMLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Статус:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(russianLLMHealth?.status === "healthy")}
              <Badge className={getStatusColor(russianLLMHealth?.status === "healthy")}>
                {russianLLMHealth?.status === "healthy" ? "Активна" : "Отключена"}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Модель:</span>
            <Badge variant="outline" className="font-mono">
              {russianLLMHealth?.model || "russian-chat"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Эндпоинт:</span>
            <span className="text-xs text-gray-600 font-mono">
              localhost:8080
            </span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">
                Обрабатывает русскоязычные запросы локально
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Локальная AI Модель (резервная) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              Локальная AI
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetchLocalAI()}
              disabled={localAILoading}
            >
              <RefreshCw className={`w-4 h-4 ${localAILoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Статус:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(localAIStatus?.connected || false)}
              <Badge className={getStatusColor(localAIStatus?.connected || false)}>
                {localAIStatus?.connected ? "Подключена" : "Недоступна"}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Модель:</span>
            <Badge variant="outline" className="font-mono">
              {localAIStatus?.config?.model || "qwen2.5-32b-instruct"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Эндпоинт:</span>
            <span className="text-xs text-gray-600 font-mono">
              {localAIStatus?.config?.baseURL || "localhost:1234"}
            </span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-amber-500" />
              <span className="text-gray-600">
                Резервная модель для сложных задач
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}