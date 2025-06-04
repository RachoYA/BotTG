import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChatMonitoring() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: chats, isLoading } = useQuery({
    queryKey: ['/api/chats'],
  });

  const toggleMonitoringMutation = useMutation({
    mutationFn: async ({ chatId, monitored }: { chatId: string; monitored: boolean }) => {
      return await apiRequest('PATCH', `/api/chats/${chatId}/monitoring`, { monitored });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Настройки чата обновлены",
        description: "Мониторинг чата успешно изменен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить настройки мониторинга",
        variant: "destructive",
      });
    },
  });

  const getInitials = (title: string) => {
    return title
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  };

  const getStatusColor = (isMonitored: boolean) => {
    return isMonitored ? 'bg-success' : 'bg-gray-400';
  };

  const getParticipantCount = (chat: any) => {
    if (chat.type === 'private') return '2 участника';
    return `${chat.participantCount || 0} участников`;
  };

  const getUnreadCount = () => {
    // This would normally come from the chat data
    return Math.floor(Math.random() * 5) + 1;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Мониторинг чатов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Мониторинг чатов</CardTitle>
      </CardHeader>
      
      <CardContent>
        {!chats || chats.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Чаты не найдены</p>
            <p className="text-sm text-gray-400 mt-1">
              Подключите Telegram Bot для получения списка чатов
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chats.map((chat: any) => (
              <div
                key={chat.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => toggleMonitoringMutation.mutate({
                  chatId: chat.chatId,
                  monitored: !chat.isMonitored
                })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {getInitials(chat.title)}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-800">{chat.title}</p>
                    <p className="text-xs text-gray-500">{getParticipantCount(chat)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(chat.isMonitored)}`}></span>
                  {chat.isMonitored && (
                    <Badge variant="secondary" className="text-xs">
                      {getUnreadCount()}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Button 
          variant="outline" 
          className="w-full mt-4"
          disabled={true} // Would be enabled when chat discovery is implemented
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить чат
        </Button>
      </CardContent>
    </Card>
  );
}
