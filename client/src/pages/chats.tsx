import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MobileSidebar from "@/components/mobile-sidebar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Users, ToggleLeft, ToggleRight, Download, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ChatsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  const { data: chats, isLoading } = useQuery({
    queryKey: ['/api/chats'],
  });

  const { data: telegramStatus } = useQuery({
    queryKey: ['/api/telegram/status'],
    refetchInterval: 5000,
  });

  const { data: chatMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/messages', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return [];
      const response = await fetch(`/api/messages?chatId=${selectedChatId}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedChatId,
  });

  const toggleMonitoringMutation = useMutation({
    mutationFn: async ({ chatId, monitored }: { chatId: string; monitored: boolean }) => {
      return await apiRequest("POST", `/api/telegram/toggle-monitoring`, { chatId, monitored });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Настройки обновлены",
        description: "Мониторинг чата изменен",
      });
    },
  });

  const loadMessagesMutation = useMutation({
    mutationFn: async (chatId: string) => {
      return await apiRequest("POST", `/api/telegram/load-messages`, { chatId });
    },
    onSuccess: () => {
      toast({
        title: "Сообщения загружены",
        description: "Последние сообщения из чата загружены в систему",
      });
    },
  });

  const reloadDialogsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/telegram/reload-dialogs`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      toast({
        title: "Диалоги обновлены",
        description: "Список чатов перезагружен с Telegram",
      });
    },
  });

  const loadAllMessagesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/telegram/load-all-messages`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      toast({
        title: "Сообщения загружены",
        description: `${data.message}. Загружено из ${data.loadedChats}/${data.totalChats} чатов`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить сообщения из всех чатов",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <MobileSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Загрузка чатов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <MobileSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b mobile-px mobile-py pt-16 lg:pt-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            <div>
              <h2 className="mobile-text-2xl font-bold text-gray-800">Управление чатами</h2>
              <p className="mobile-text-base text-gray-600">Настройка мониторинга Telegram чатов</p>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
              <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2 w-full lg:w-auto">
                <Button
                  onClick={() => reloadDialogsMutation.mutate()}
                  disabled={reloadDialogsMutation.isPending || !telegramStatus?.connected}
                  variant="outline"
                  className="mobile-btn w-full lg:w-auto"
                >
                  <RefreshCw className={`h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2 ${reloadDialogsMutation.isPending ? 'animate-spin' : ''}`} />
                  <span className="hidden lg:inline">Обновить чаты</span>
                  <span className="lg:hidden">Обновить</span>
                </Button>
                <Button
                  onClick={() => loadAllMessagesMutation.mutate()}
                  disabled={loadAllMessagesMutation.isPending || !telegramStatus?.connected}
                  variant="default"
                  className="mobile-btn w-full lg:w-auto"
                >
                  <Download className={`h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2 ${loadAllMessagesMutation.isPending ? 'animate-spin' : ''}`} />
                  <span className="hidden lg:inline">{loadAllMessagesMutation.isPending ? 'Загружаем...' : 'Загрузить все сообщения'}</span>
                  <span className="lg:hidden">{loadAllMessagesMutation.isPending ? 'Загрузка...' : 'Загрузить'}</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-sm font-medium text-success">
                  {telegramStatus?.connected ? 'Подключено' : 'Отключено'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto mobile-p">
          <div className="grid mobile-gap">
            {/* Stats */}
            <div className="grid mobile-grid-2 mobile-gap">
              <Card>
                <CardContent className="flex items-center mobile-card">
                  <MessageSquare className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
                  <div className="ml-2 lg:ml-4">
                    <p className="mobile-text-sm font-medium text-gray-600">Всего чатов</p>
                    <p className="mobile-text-2xl font-bold">{chats?.length || 0}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center mobile-card">
                  <Users className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                  <div className="ml-2 lg:ml-4">
                    <p className="mobile-text-sm font-medium text-gray-600">Мониторинг</p>
                    <p className="mobile-text-2xl font-bold">
                      {chats?.filter((chat: any) => chat.isMonitored).length || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center mobile-card">
                  <ToggleRight className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
                  <div className="ml-2 lg:ml-4">
                    <p className="mobile-text-sm font-medium text-gray-600">Активных</p>
                    <p className="mobile-text-2xl font-bold">
                      {chats?.filter((chat: any) => chat.isMonitored && chat.messageCount > 0).length || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle>Поиск чатов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск по названию чата..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Chats List */}
            <Card>
              <CardHeader>
                <CardTitle>Список чатов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(chats) && chats
                    .filter((chat: any) => 
                      searchTerm === "" || 
                      chat.title.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((chat: any) => (
                    <div key={chat.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{chat.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>ID: {chat.chatId}</span>
                            <span>•</span>
                            <span>{chat.messageCount || 0} сообщений</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge variant={chat.isMonitored ? "default" : "secondary"}>
                          {chat.isMonitored ? "Мониторинг включен" : "Мониторинг отключен"}
                        </Badge>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedChatId(chat.chatId)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Просмотр
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Сообщения из чата: {chat.title}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              {isLoadingMessages ? (
                                <p className="text-gray-500">Загрузка сообщений...</p>
                              ) : Array.isArray(chatMessages) && chatMessages.length > 0 ? (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                  {chatMessages.map((message: any) => (
                                    <div key={message.id} className="border-l-4 border-blue-200 pl-4 py-2">
                                      <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                                        <span>{message.senderName || 'Неизвестный отправитель'}</span>
                                        <span>{new Date(message.timestamp).toLocaleString('ru-RU')}</span>
                                      </div>
                                      <p className="text-gray-900">{message.text || message.content}</p>
                                      {message.isProcessed && (
                                        <Badge variant="secondary" className="mt-2">
                                          Обработано
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500">Нет сообщений в этом чате</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadMessagesMutation.mutate(chat.chatId)}
                          disabled={loadMessagesMutation.isPending || !telegramStatus?.connected}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Загрузить сообщения
                        </Button>
                        
                        <Switch
                          checked={chat.isMonitored}
                          onCheckedChange={(checked) => 
                            toggleMonitoringMutation.mutate({ 
                              chatId: chat.chatId, 
                              monitored: checked 
                            })
                          }
                          disabled={toggleMonitoringMutation.isPending || !telegramStatus?.connected}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {(!chats || chats.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Нет доступных чатов</p>
                      <p className="text-sm">Подключитесь к Telegram для загрузки чатов</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


          </div>
        </main>
      </div>
    </div>
  );
}