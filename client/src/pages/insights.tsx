import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function InsightsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get AI insights
  const { data: insights = [] } = useQuery({
    queryKey: ["/api/insights"],
    queryFn: () => fetch("/api/insights").then(res => res.json())
  });

  // Get daily summaries
  const { data: summaries = [] } = useQuery({
    queryKey: ["/api/summary"],
    queryFn: () => fetch("/api/summary").then(res => res.json())
  });

  // Generate daily summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async (date: string) => {
      const response = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
      });
      if (!response.ok) throw new Error("Ошибка генерации резюме");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Резюме сгенерировано",
        description: "Ежедневное резюме успешно создано"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка генерации",
        description: error.message || "Произошла ошибка при генерации резюме",
        variant: "destructive"
      });
    }
  });

  // Generate AI insights mutation
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Ошибка генерации инсайтов");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Инсайты сгенерированы",
        description: "AI инсайты успешно созданы"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка генерации",
        description: error.message || "Произошла ошибка при генерации инсайтов",
        variant: "destructive"
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high": return "Высокий";
      case "medium": return "Средний";
      case "low": return "Низкий";
      default: return "Неизвестно";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "communication": return <AlertCircle className="h-4 w-4" />;
      case "management": return <TrendingUp className="h-4 w-4" />;
      case "productivity": return <CheckCircle className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Аналитические инсайты</h1>
            <p className="text-gray-600 mt-2">
              AI-анализ паттернов коммуникации и рекомендации по улучшению
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={() => generateSummaryMutation.mutate(today)}
              disabled={generateSummaryMutation.isPending}
              className="flex items-center gap-2"
            >
              {generateSummaryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Сгенерировать резюме дня
            </Button>
            <Button 
              onClick={() => generateInsightsMutation.mutate()}
              disabled={generateInsightsMutation.isPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              {generateInsightsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Сгенерировать AI инсайты
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Insights */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Инсайты
                  </CardTitle>
                  <CardDescription>
                    Автоматически выявленные паттерны и рекомендации
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Инсайты еще не сгенерированы</p>
                      <p className="text-sm">Нажмите кнопку выше для генерации AI инсайтов</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {insights.map((insight: any) => (
                        <div key={insight.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(insight.category)}
                              <h4 className="font-medium">{insight.title}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-white ${getPriorityColor(insight.priority)}`}
                              >
                                {getPriorityText(insight.priority)}
                              </Badge>
                              {insight.actionRequired && (
                                <Badge variant="destructive">
                                  Действие требуется
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-700 mb-2">{insight.description}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(insight.createdAt), "dd.MM.yyyy HH:mm")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Summaries */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Ежедневные резюме
                  </CardTitle>
                  <CardDescription>
                    Краткие сводки активности по дням
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {summaries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Резюме еще не созданы</p>
                      <p className="text-sm">Нажмите кнопку выше для генерации резюме дня</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {summaries.slice(0, 10).map((summary: any) => (
                        <div key={summary.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">
                              {format(new Date(summary.date), "dd.MM.yyyy")}
                            </h4>
                            {summary.requiresResponse?.length > 0 && (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                Требует ответа ({summary.requiresResponse.length})
                              </Badge>
                            )}
                          </div>
                          
                          {summary.summary && (
                            <p className="text-gray-700 mb-3">{summary.summary}</p>
                          )}

                          {/* Key Topics */}
                          {summary.keyTopics?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-600 mb-1">Ключевые темы:</p>
                              <div className="flex flex-wrap gap-1">
                                {summary.keyTopics.map((topic: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Requires Response */}
                          {summary.requiresResponse?.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-1">Требует ответа:</p>
                              <ul className="text-sm text-red-700 space-y-1">
                                {summary.requiresResponse.map((item: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Analytics Overview */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Обзор аналитики
                </CardTitle>
                <CardDescription>
                  Общая статистика по анализу переписки
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{insights.length}</div>
                    <div className="text-sm text-blue-600">AI Инсайтов</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{summaries.length}</div>
                    <div className="text-sm text-green-600">Ежедневных резюме</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {insights.filter((i: any) => i.actionRequired).length}
                    </div>
                    <div className="text-sm text-amber-600">Требуют действий</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {insights.filter((i: any) => i.priority === 'high').length}
                    </div>
                    <div className="text-sm text-red-600">Высокий приоритет</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}