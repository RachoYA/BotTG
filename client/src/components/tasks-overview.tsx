import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreVertical, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TasksOverview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['/api/tasks'],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest('PATCH', `/api/tasks/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Задача обновлена",
        description: "Статус задачи успешно изменен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус задачи",
        variant: "destructive",
      });
    },
  });

  const refreshTasksMutation = useMutation({
    mutationFn: async () => {
      // This would trigger AI processing of unread messages
      return await apiRequest('POST', '/api/insights/refresh');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Задачи обновлены",
        description: "Список задач успешно обновлен",
      });
    },
  });

  const handleTaskStatusChange = (taskId: number, checked: boolean) => {
    const newStatus = checked ? 'completed' : 'new';
    updateTaskMutation.mutate({ id: taskId, status: newStatus });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'important':
        return 'default';
      case 'normal':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Срочно';
      case 'important':
        return 'Важно';
      case 'normal':
        return 'Обычно';
      default:
        return priority;
    }
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    return `Дедлайн: ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Извлеченные задачи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Извлеченные задачи</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshTasksMutation.mutate()}
            disabled={refreshTasksMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshTasksMutation.isPending ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!tasks || tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Задачи не найдены</p>
            <p className="text-sm text-gray-400 mt-1">Задачи будут автоматически извлечены из сообщений</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task: any) => (
              <div
                key={task.id}
                className={`flex items-start p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow ${
                  task.status === 'completed' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center mr-4">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => handleTaskStatusChange(task.id, !!checked)}
                    disabled={updateTaskMutation.isPending}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-medium text-gray-800 ${task.status === 'completed' ? 'line-through' : ''}`}>
                        {task.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.description}
                      </p>
                      {task.sourceChatId && (
                        <p className="text-sm text-gray-500 mt-1">
                          Источник: Чат • {new Date(task.extractedAt).toLocaleTimeString('ru-RU')}
                        </p>
                      )}
                      <div className="flex items-center mt-2 space-x-2">
                        <Badge variant={getPriorityColor(task.priority)}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        {task.status === 'completed' && task.completedAt && (
                          <Badge variant="outline" className="text-success border-success">
                            Выполнено: {new Date(task.completedAt).toLocaleTimeString('ru-RU')}
                          </Badge>
                        )}
                        {task.deadline && task.status !== 'completed' && (
                          <span className="text-xs text-gray-500">
                            {formatDeadline(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
