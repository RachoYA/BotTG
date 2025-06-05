import { useState } from "react";
import Sidebar from "@/components/sidebar";
import MobileSidebar from "@/components/mobile-sidebar";
import PeriodAnalysis from "@/components/period-analysis";
import AnalysisDetailModal from "@/components/analysis-detail-modal";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function AnalysisPage() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Get recent analyses for display
  const { data: recentAnalyses = [] } = useQuery({
    queryKey: ["/api/period-analysis/recent"],
    queryFn: () => fetch("/api/period-analysis/recent?limit=10").then(res => res.json())
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Не определен';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden">
          <MobileSidebar />
        </div>
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Анализ переписки</h1>
              <p className="text-gray-600">Контекстный анализ переписки за выбранный период</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Period Analysis Component */}
              <div className="xl:col-span-1">
                <PeriodAnalysis />
              </div>

              {/* Recent Analyses */}
              <div className="xl:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Последние анализы
                    </CardTitle>
                    <CardDescription>
                      Результаты недавно проведенных анализов переписки
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentAnalyses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Анализы еще не проводились</p>
                        <p className="text-sm">Создайте первый анализ, используя форму слева</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {recentAnalyses.map((analysis: any) => (
                          <div 
                            key={analysis.id} 
                            className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              setSelectedAnalysis(analysis);
                              setIsAnalysisModalOpen(true);
                            }}
                          >
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
                                    {analysis.unansweredRequests.length} без ответа
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
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Analysis Detail Modal */}
      <AnalysisDetailModal 
        analysis={selectedAnalysis}
        open={isAnalysisModalOpen}
        onOpenChange={setIsAnalysisModalOpen}
      />
    </div>
  );
}