import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MessageSquare, Users, Calendar, BarChart3, PieChart } from "lucide-react";

export default function AnalyticsPage() {
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
  });

  const { data: chats } = useQuery({
    queryKey: ['/api/chats'],
  });

  const { data: insights } = useQuery({
    queryKey: ['/api/insights'],
  });

  const { data: summary } = useQuery({
    queryKey: ['/api/summary/latest'],
  });

  // Аналитика задач
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0;
  const highPriorityTasks = tasks?.filter((t: any) => t.urgency === 'high').length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Аналитика чатов
  const totalChats = chats?.length || 0;
  const monitoredChats = chats?.filter((c: any) => c.isMonitored).length || 0;
  const activeChats = chats?.filter((c: any) => c.isMonitored && c.messageCount > 0).length || 0;

  // Распределение задач по приоритету
  const tasksByPriority = {
    high: tasks?.filter((t: any) => t.urgency === 'high').length || 0,
    medium: tasks?.filter((t: any) => t.urgency === 'medium').length || 0,
    low: tasks?.filter((t: any) => t.urgency === 'low').length || 0,
  };

  // Распределение задач по статусу
  const tasksByStatus = {
    pending: tasks?.filter((t: any) => t.status === 'pending').length || 0,
    in_progress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
    completed: tasks?.filter((t: any) => t.status === 'completed').length || 0,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Аналитика</h2>
              <p className="text-gray-600">Статистика и анализ активности</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex items-center p-6">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Всего задач</p>
                    <p className="text-2xl font-bold">{totalTasks}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Выполнено</p>
                    <p className="text-2xl font-bold">{completionRate}%</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Активных чатов</p>
                    <p className="text-2xl font-bold">{activeChats}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="flex items-center p-6">
                  <Users className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Высокий приоритет</p>
                    <p className="text-2xl font-bold">{highPriorityTasks}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Distribution by Priority */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Распределение по приоритету
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">Высокий</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{tasksByPriority.high}</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-red-500 rounded-full" 
                            style={{ width: `${totalTasks > 0 ? (tasksByPriority.high / totalTasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium">Средний</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{tasksByPriority.medium}</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-yellow-500 rounded-full" 
                            style={{ width: `${totalTasks > 0 ? (tasksByPriority.medium / totalTasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Низкий</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{tasksByPriority.low}</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${totalTasks > 0 ? (tasksByPriority.low / totalTasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Task Distribution by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Распределение по статусу
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">Ожидают</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{tasksByStatus.pending}</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${totalTasks > 0 ? (tasksByStatus.pending / totalTasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium">В работе</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{tasksByStatus.in_progress}</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-yellow-500 rounded-full" 
                            style={{ width: `${totalTasks > 0 ? (tasksByStatus.in_progress / totalTasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Завершены</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{tasksByStatus.completed}</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${totalTasks > 0 ? (tasksByStatus.completed / totalTasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            {insights && insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Инсайты</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.slice(0, 3).map((insight: any) => (
                      <div key={insight.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Badge variant={insight.type === 'warning' ? 'destructive' : 'default'}>
                          {insight.type}
                        </Badge>
                        <div>
                          <h4 className="font-medium text-gray-900">{insight.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{insight.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Активность чатов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{totalChats}</p>
                    <p className="text-sm text-gray-600">Всего чатов</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{monitoredChats}</p>
                    <p className="text-sm text-gray-600">Мониторинг включен</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{activeChats}</p>
                    <p className="text-sm text-gray-600">Активных</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}