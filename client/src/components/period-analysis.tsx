import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, MessageSquare, CheckCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PeriodAnalysis() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedChatId, setSelectedChatId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получаем список чатов для выбора
  const { data: chats = [] } = useQuery({
    queryKey: ["/api/chats"],
    queryFn: () => fetch("/api/chats").then(res => res.json())
  });

  const analyzePeriodMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string; chatId?: string }) => {
      return apiRequest("/api/ai/analyze-period", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Анализ завершен",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка анализа",
        description: error.message || "Произошла ошибка при анализе периода",
        variant: "destructive"
      });
    }
  });

  const handleAnalyzePeriod = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Ошибка",
        description: "Выберите период для анализа",
        variant: "destructive"
      });
      return;
    }

    analyzePeriodMutation.mutate({
      startDate,
      endDate,
      chatId: selectedChatId || undefined
    });
  };

  const getPresetDates = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Анализ периода с полным контекстом
        </CardTitle>
        <CardDescription>
          Новая система анализа переписки с учетом полного контекста для более точного извлечения задач
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Описание улучшений */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ключевые улучшения:</strong>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>Анализ ВСЕЙ переписки за период, а не только новых сообщений</li>
              <li>Учет хронологии событий и статусов выполнения</li>
              <li>Проверка упоминаний о выполнении задач в любой части переписки</li>
              <li>Предотвращение создания задач для уже выполненных поручений</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Быстрые пресеты */}
        <div>
          <Label className="text-sm font-medium">Быстрый выбор периода</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => getPresetDates(1)}>
              Вчера
            </Button>
            <Button variant="outline" size="sm" onClick={() => getPresetDates(3)}>
              3 дня
            </Button>
            <Button variant="outline" size="sm" onClick={() => getPresetDates(7)}>
              Неделя
            </Button>
            <Button variant="outline" size="sm" onClick={() => getPresetDates(14)}>
              2 недели
            </Button>
          </div>
        </div>

        {/* Выбор периода */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Начальная дата</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Конечная дата</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Выбор чата */}
        <div>
          <Label htmlFor="chatSelect">Чат (опционально)</Label>
          <Select value={selectedChatId} onValueChange={setSelectedChatId}>
            <SelectTrigger>
              <SelectValue placeholder="Все чаты или выберите конкретный" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все чаты</SelectItem>
              {chats.map((chat: any) => (
                <SelectItem key={chat.id} value={chat.chatId}>
                  {chat.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Кнопка запуска */}
        <Button 
          onClick={handleAnalyzePeriod}
          disabled={analyzePeriodMutation.isPending || !startDate || !endDate}
          className="w-full"
        >
          {analyzePeriodMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Анализирую переписку...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              Запустить анализ с полным контекстом
            </>
          )}
        </Button>

        {/* Информация о процессе */}
        {analyzePeriodMutation.isPending && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Выполняется глубокий анализ переписки. Система анализирует всю историю сообщений 
              за выбранный период для максимально точного извлечения задач.
            </AlertDescription>
          </Alert>
        )}

        {/* Результаты */}
        {analyzePeriodMutation.data && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Результаты анализа:</strong>
              <div className="mt-2 text-sm">
                {analyzePeriodMutation.data.processedChats && (
                  <div>Обработано чатов: {analyzePeriodMutation.data.processedChats}</div>
                )}
                {analyzePeriodMutation.data.createdTasks && (
                  <div>Создано задач: {analyzePeriodMutation.data.createdTasks}</div>
                )}
                {analyzePeriodMutation.data.foundCompletedTasks && (
                  <div>Найдено выполненных задач: {analyzePeriodMutation.data.foundCompletedTasks}</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}