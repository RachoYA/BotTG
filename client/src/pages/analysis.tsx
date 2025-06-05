import { useState } from "react";
import MobileSidebar from "@/components/mobile-sidebar";
import PeriodAnalysis from "@/components/period-analysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Clock, MessageCircle, AlertTriangle, CheckCircle, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

export default function AnalysisPage() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);

  // Get recent analyses
  const { data: analyses = [], refetch } = useQuery({
    queryKey: ["/api/period-analysis/recent"],
    refetchInterval: 5000, // Автообновление каждые 5 секунд
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
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Контекстный анализ переписки</h1>
            <p className="text-gray-600 mt-2">
              Анализируйте переписку за выбранные периоды для выявления пропущенных ответов и важных вопросов
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Period Analysis Form */}
            <div className="space-y-6">
              <PeriodAnalysis />
            </div>

            {/* Recent Analyses */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Последние анализы
                  </CardTitle>
                  <CardDescription>
                    История проведенных анализов переписки
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Анализы еще не проводились</p>
                      <p className="text-sm">Начните анализ переписки, чтобы увидеть результаты здесь</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analyses.slice(0, 10).map((analysis: any) => (
                        <div
                          key={analysis.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedAnalysis(analysis)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{analysis.chatTitle}</h4>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-white ${getPriorityColor(analysis.priority)}`}
                                >
                                  {getPriorityText(analysis.priority)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {format(new Date(analysis.startDate), "dd.MM.yyyy")} - {format(new Date(analysis.endDate), "dd.MM.yyyy")}
                              </p>
                              <p className="text-sm text-gray-800 line-clamp-2">
                                {analysis.summary || "Анализ завершен"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {analysis.totalMessages || 0} сообщений
                              </span>
                              {analysis.responseRequired && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  Требует ответа
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Analysis View */}
          {selectedAnalysis && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Детальный анализ: {selectedAnalysis.chatTitle}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(selectedAnalysis.startDate), "dd.MM.yyyy")} - {format(new Date(selectedAnalysis.endDate), "dd.MM.yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Summary */}
                    {selectedAnalysis.summary && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Общее резюме</h4>
                        <p className="text-blue-800">{selectedAnalysis.summary}</p>
                      </div>
                    )}

                    {/* Unanswered Requests */}
                    {selectedAnalysis.unansweredRequests?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          Необработанные обращения ({selectedAnalysis.unansweredRequests.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedAnalysis.unansweredRequests.map((request: string, index: number) => (
                            <div key={index} className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                              <p className="text-red-800">{request}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Identified Problems */}
                    {selectedAnalysis.identifiedProblems?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          Выявленные проблемы ({selectedAnalysis.identifiedProblems.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedAnalysis.identifiedProblems.map((problem: string, index: number) => (
                            <div key={index} className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                              <p className="text-amber-800">{problem}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Open Questions */}
                    {selectedAnalysis.openQuestions?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-blue-700">
                          <Clock className="h-4 w-4" />
                          Открытые вопросы ({selectedAnalysis.openQuestions.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedAnalysis.openQuestions.map((question: string, index: number) => (
                            <div key={index} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                              <p className="text-blue-800">{question}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* My Participation */}
                    {selectedAnalysis.myParticipation && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">Анализ моего участия</h4>
                        <p className="text-green-800">{selectedAnalysis.myParticipation}</p>
                      </div>
                    )}

                    {/* Close Button */}
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => setSelectedAnalysis(null)}>
                        Закрыть детальный вид
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}