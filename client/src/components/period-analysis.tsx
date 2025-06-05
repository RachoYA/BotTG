import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, MessageSquare, CheckCircle, AlertTriangle, Clock, AlertCircle, Search, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function PeriodAnalysis() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedChatId, setSelectedChatId] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get chats for selection
  const { data: chats = [] } = useQuery({
    queryKey: ["/api/chats"],
    queryFn: () => fetch("/api/chats").then(res => res.json())
  });

  // Filter chats based on search
  const filteredChats = useMemo(() => {
    return chats.filter((chat: any) => 
      chat.title.toLowerCase().includes(chatSearch.toLowerCase())
    );
  }, [chats, chatSearch]);

  const analyzePeriodMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string; chatId?: string }) => {
      const response = await fetch("/api/conversation/analyze-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Ошибка анализа");
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Анализ завершен",
        description: "Контекстный анализ переписки выполнен успешно"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/period-analysis/recent"] });
      
      // Сбрасываем форму
      setStartDate("");
      setEndDate("");
      setSelectedChatId("");
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка анализа",
        description: error.message || "Произошла ошибка при анализе периода",
        variant: "destructive"
      });
    }
  });

  // Daily summary mutation
  const dailySummaryMutation = useMutation({
    mutationFn: async (date: string) => {
      const response = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
      });
      if (!response.ok) throw new Error("Ошибка генерации сводки");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Сводка дня создана",
        description: "Ежедневная сводка всех сообщений успешно сгенерирована"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/summary/latest"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка генерации сводки",
        description: error.message || "Произошла ошибка при генерации сводки дня",
        variant: "destructive"
      });
    }
  });

  const handleGenerateDailySummary = () => {
    const today = new Date().toISOString().split('T')[0];
    dailySummaryMutation.mutate(today);
  };

  const handleStartAnalysis = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Ошибка",
        description: "Укажите даты начала и окончания периода",
        variant: "destructive"
      });
      return;
    }

    if (!selectedChatId) {
      toast({
        title: "Ошибка",
        description: "Выберите чат для анализа",
        variant: "destructive"
      });
      return;
    }

    // Устанавливаем правильные временные диапазоны
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0); // Начало дня
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); // Конец дня

    analyzePeriodMutation.mutate({
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      chatId: selectedChatId
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Контекстный анализ переписки
          </CardTitle>
          <CardDescription>
            Анализ переписки за период с выявлением пропущенных ответов и проблем
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Дата начала</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Дата окончания</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chat-select">Чат для анализа</Label>
            
            <Select value={selectedChatId} onValueChange={setSelectedChatId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите чат для анализа" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Поиск чатов..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="pl-10 h-8"
                    />
                  </div>
                </div>
                <SelectItem value="all">🔄 Все персональные чаты (исключая группы)</SelectItem>
                <div className="border-t my-1"></div>
                {filteredChats.map((chat: any) => (
                  <SelectItem key={chat.id} value={chat.chatId}>
                    {chat.type === 'private' ? '👤' : '👥'} {chat.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={handleStartAnalysis}
              disabled={analyzePeriodMutation.isPending}
              className="w-full"
            >
              {analyzePeriodMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Анализируем контекст переписки...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Начать контекстный анализ
                </>
              )}
            </Button>

            <Button 
              onClick={handleGenerateDailySummary}
              disabled={dailySummaryMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {dailySummaryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создается сводка...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Сводка дня
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Результаты контекстного анализа
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary */}
              {analysisResult.analysis?.summary && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Общее резюме</h4>
                  <p className="text-blue-800">{analysisResult.analysis.summary}</p>
                </div>
              )}

              {/* Unanswered Requests */}
              {analysisResult.analysis?.unansweredRequests?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    Необработанные обращения
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.analysis.unansweredRequests.map((request: string, index: number) => (
                      <div key={index} className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                        <p className="text-red-800">{request}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Identified Problems */}
              {analysisResult.analysis?.identifiedProblems?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Выявленные проблемы
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.analysis.identifiedProblems.map((problem: string, index: number) => (
                      <div key={index} className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                        <p className="text-amber-800">{problem}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Questions */}
              {analysisResult.analysis?.openQuestions?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-700">
                    <Clock className="h-4 w-4" />
                    Открытые вопросы
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.analysis.openQuestions.map((question: string, index: number) => (
                      <div key={index} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-blue-800">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* My Participation */}
              {analysisResult.analysis?.myParticipation && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Анализ моего участия</h4>
                  <p className="text-green-800">{analysisResult.analysis.myParticipation}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {analysisResult.processedMessages || 0}
                  </div>
                  <div className="text-sm text-gray-600">Обработано сообщений</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisResult.analysis?.priority || "medium"}
                  </div>
                  <div className="text-sm text-blue-600">Приоритет</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {analysisResult.analysis?.responseRequired ? "Да" : "Нет"}
                  </div>
                  <div className="text-sm text-red-600">Требуется ответ</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}