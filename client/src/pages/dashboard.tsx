import MobileSidebar from "@/components/mobile-sidebar";
import PeriodAnalysis from "@/components/period-analysis";
import DailySummary from "@/components/daily-summary";
import AIInsights from "@/components/ai-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Calendar, Users, Brain, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  // Get dashboard stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => fetch("/api/dashboard/stats").then(res => res.json()),
    refetchInterval: 30000
  });

  // Get recent analyses
  const { data: recentAnalyses = [] } = useQuery({
    queryKey: ["/api/period-analysis/recent"],
    queryFn: () => fetch("/api/period-analysis/recent?limit=3").then(res => res.json())
  });

  // Get latest daily summary
  const { data: latestSummary } = useQuery({
    queryKey: ["/api/summary/latest"],
    queryFn: () => fetch("/api/summary/latest").then(res => res.json())
  });

  // Get recent insights
  const { data: insights = [] } = useQuery({
    queryKey: ["/api/insights"],
    queryFn: () => fetch("/api/insights").then(res => res.json())
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

  return (
    <div className="flex h-screen bg-gray-50">
      <MobileSidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6">
          {/* Header */}
          <div className="mb-4 lg:mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Главная панель</h1>
            <p className="text-sm lg:text-base text-gray-600 mt-2">
              Обзор активности и результаты контекстного анализа переписки
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Новые сообщения</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.unreadMessages || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Активные чаты</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeChats || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Требует ответа</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.responseRequiredChats || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Анализов проведено</p>
                    <p className="text-2xl font-bold text-gray-900">{recentAnalyses.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent Analysis Results */}
            <div className="xl:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Последние анализы переписки
                  </CardTitle>
                  <CardDescription>
                    Результаты недавно проведенных контекстных анализов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentAnalyses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Анализы еще не проводились</p>
                      <p className="text-sm">Перейдите в раздел "Анализ переписки" для начала работы</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentAnalyses.map((analysis: any) => (
                        <div key={analysis.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{analysis.chatTitle}</h4>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-white ${getPriorityColor(analysis.priority)}`}
                                >
                                  {getPriorityText(analysis.priority)}
                                </Badge>
                                {analysis.responseRequired && (
                                  <Badge variant="destructive">
                                    Требует ответа
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {format(new Date(analysis.startDate), "dd.MM.yyyy")} - {format(new Date(analysis.endDate), "dd.MM.yyyy")}
                              </p>
                              <p className="text-sm text-gray-800 line-clamp-2">
                                {analysis.summary || "Анализ завершен"}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                              <div>{analysis.totalMessages || 0} сообщений</div>
                              {analysis.unansweredRequests?.length > 0 && (
                                <div className="text-red-600 mt-1">
                                  {analysis.unansweredRequests.length} необработанных
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Daily Summary */}
              <DailySummary />
            </div>

            {/* Right Sidebar - Quick Actions and Insights */}
            <div className="space-y-6">
              {/* Quick Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Быстрый анализ
                  </CardTitle>
                  <CardDescription>
                    Запустите анализ за последние дни
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PeriodAnalysis />
                </CardContent>
              </Card>

              {/* AI Insights Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Инсайты
                  </CardTitle>
                  <CardDescription>
                    Последние автоматические рекомендации
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Инсайты еще не сгенерированы</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {insights.slice(0, 3).map((insight: any) => (
                        <div key={insight.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <h5 className="font-medium text-sm">{insight.title}</h5>
                            {insight.actionRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Действие
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {insight.description}
                          </p>
                        </div>
                      ))}
                      {insights.length > 3 && (
                        <Button variant="outline" size="sm" className="w-full">
                          Показать все инсайты
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}