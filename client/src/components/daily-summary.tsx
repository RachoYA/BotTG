import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Reply, Users, Handshake } from "lucide-react";

export default function DailySummary() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['/api/summary/latest'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ежедневная сводка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ежедневная сводка</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Сводка за сегодня пока не сформирована.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ежедневная сводка</CardTitle>
          <span className="text-sm text-gray-500">
            Обновлено {new Date(summary.createdAt).toLocaleTimeString('ru-RU')}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Requires Response */}
        {summary.requiresResponse && summary.requiresResponse.length > 0 && (
          <div className="border-l-4 border-accent bg-orange-50 p-4 rounded-r-lg">
            <h4 className="font-semibold text-accent mb-3 flex items-center">
              <Reply className="w-4 h-4 mr-2" />
              Требуют вашего ответа ({summary.requiresResponse.length})
            </h4>
            <div className="space-y-3">
              {summary.requiresResponse.map((item, index) => (
                <div key={index} className="bg-white p-3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.chatTitle}</p>
                      <p className="text-sm text-gray-600 mt-1">"{item.text}"</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-3">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Discussions */}
        {summary.importantDiscussions && summary.importantDiscussions.length > 0 && (
          <div className="border-l-4 border-primary bg-blue-50 p-4 rounded-r-lg">
            <h4 className="font-semibold text-primary mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Важные обсуждения ({summary.importantDiscussions.length})
            </h4>
            <div className="space-y-3">
              {summary.importantDiscussions.map((item, index) => (
                <div key={index} className="bg-white p-3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.chatTitle}</p>
                      <p className="text-sm text-gray-600 mt-1">"{item.text}"</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-3">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Decisions */}
        {summary.keyDecisions && summary.keyDecisions.length > 0 && (
          <div className="border-l-4 border-success bg-green-50 p-4 rounded-r-lg">
            <h4 className="font-semibold text-success mb-3 flex items-center">
              <Handshake className="w-4 h-4 mr-2" />
              Ключевые решения ({summary.keyDecisions.length})
            </h4>
            <div className="space-y-3">
              {summary.keyDecisions.map((item, index) => (
                <div key={index} className="bg-white p-3 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.chatTitle}</p>
                      <p className="text-sm text-gray-600 mt-1">"{item.text}"</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-3">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!summary.requiresResponse || summary.requiresResponse.length === 0) &&
         (!summary.importantDiscussions || summary.importantDiscussions.length === 0) &&
         (!summary.keyDecisions || summary.keyDecisions.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-500">Нет новых сообщений для сводки</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
