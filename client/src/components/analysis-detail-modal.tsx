import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, MessageSquare, AlertTriangle, Clock, Users } from "lucide-react";
import { format } from "date-fns";

interface AnalysisDetailModalProps {
  analysis: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AnalysisDetailModal({ analysis, open, onOpenChange }: AnalysisDetailModalProps) {
  if (!analysis) return null;

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
      default: return priority;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Детальный анализ переписки
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold">{analysis.chatTitle}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {format(new Date(analysis.startDate), "dd.MM.yyyy")} - {format(new Date(analysis.endDate), "dd.MM.yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-600">Сообщений:</span>
                  <span className="font-medium">{analysis.totalMessages || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-gray-600">Создан:</span>
                  <span className="font-medium">
                    {format(new Date(analysis.createdAt), "dd.MM.yyyy HH:mm")}
                  </span>
                </div>
                {analysis.unansweredRequests?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-gray-600">Не обработано:</span>
                    <span className="font-medium text-red-600">{analysis.unansweredRequests.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {analysis.summary && (
              <div>
                <h4 className="font-medium mb-2">Краткое резюме</h4>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <p className="text-gray-800">{analysis.summary}</p>
                </div>
              </div>
            )}

            {/* Key Topics */}
            {analysis.keyTopics && analysis.keyTopics.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Ключевые темы</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.keyTopics.map((topic: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Unanswered Requests */}
            {analysis.unansweredRequests && analysis.unansweredRequests.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Необработанные запросы
                </h4>
                <div className="space-y-2">
                  {analysis.unansweredRequests.map((request: any, index: number) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800">{request}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Content */}
            {analysis.content && (
              <div>
                <h4 className="font-medium mb-2">Подробный анализ</h4>
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">
                    {analysis.content}
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Рекомендации</h4>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                      <p className="text-sm text-green-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}