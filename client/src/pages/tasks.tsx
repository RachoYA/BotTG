import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TasksPage() {
  const { toast } = useToast();
  
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['/api/tasks'],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/tasks/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Задача обновлена",
        description: "Статус задачи изменен",
      });
    },
  });

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Не определен';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершено';
      default: return 'Не определен';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Загрузка задач...</div>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks?.filter((t: any) => t.status === 'pending') || [];
  const inProgressTasks = tasks?.filter((t: any) => t.status === 'in_progress') || [];
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed') || [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Управление задачами</h2>
              <p className="text-gray-600">Задачи, извлеченные из Telegram переписки</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex items-center p-6">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ожидают</p>
                    <p className="text-2xl font-bold">{pendingTasks.length}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">В работе</p>
                    <p className="text-2xl font-bold">{inProgressTasks.length}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Завершено</p>
                    <p className="text-2xl font-bold">{completedTasks.length}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <Calendar className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Всего</p>
                    <p className="text-2xl font-bold">{tasks?.length || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks List */}
            <Card>
              <CardHeader>
                <CardTitle>Список задач</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks?.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          {getUrgencyIcon(task.urgency)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center space-x-2 text-sm text-gray-500 mt-2">
                            <span>Приоритет: {getUrgencyLabel(task.urgency)}</span>
                            {task.deadline && (
                              <>
                                <span>•</span>
                                <span>Дедлайн: {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
                              </>
                            )}
                            {task.chatId && (
                              <>
                                <span>•</span>
                                <span>Чат: {task.chatId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={
                            task.status === 'completed' ? 'default' : 
                            task.status === 'in_progress' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {getStatusLabel(task.status)}
                        </Badge>
                        
                        <Select
                          value={task.status}
                          onValueChange={(status) => 
                            updateTaskMutation.mutate({ id: task.id, status })
                          }
                          disabled={updateTaskMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Ожидает</SelectItem>
                            <SelectItem value="in_progress">В работе</SelectItem>
                            <SelectItem value="completed">Завершено</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  
                  {(!tasks || tasks.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Нет задач</p>
                      <p className="text-sm">Задачи будут автоматически извлечены из Telegram сообщений</p>
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