import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Settings, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import TelegramSetup from "./telegram-setup";
import LocalAISetup from "./local-ai-setup";

export default function QuickActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return await apiRequest('POST', '/api/summary/generate', { date: today });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/summary/latest'] });
      toast({
        title: "Сводка создана",
        description: "Ежедневная сводка успешно сформирована",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать сводку",
        variant: "destructive",
      });
    },
  });

  const exportTasks = () => {
    toast({
      title: "Экспорт задач",
      description: "Функция экспорта будет доступна в следующей версии",
    });
  };

  if (showSettings) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowSettings(false)}
          className="w-full"
        >
          ← Назад к действиям
        </Button>
        <TelegramSetup />
        <LocalAISetup />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Быстрые действия</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Button
          className="w-full"
          onClick={() => generateSummaryMutation.mutate()}
          disabled={generateSummaryMutation.isPending}
        >
          <FileText className="w-4 h-4 mr-2" />
          {generateSummaryMutation.isPending ? 'Создание...' : 'Создать сводку'}
        </Button>
        
        <Button variant="outline" className="w-full" onClick={exportTasks}>
          <Download className="w-4 h-4 mr-2" />
          Экспорт задач
        </Button>
        
        <Button variant="outline" className="w-full" onClick={() => setShowSettings(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Настройки подключений
        </Button>
      </CardContent>
    </Card>
  );
}
