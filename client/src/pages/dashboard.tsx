import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import DailySummary from "@/components/daily-summary";
import TasksOverview from "@/components/tasks-overview";
import ChatMonitoring from "@/components/chat-monitoring";
import AIInsights from "@/components/ai-insights";
import QuickActions from "@/components/quick-actions";
import { Bell, Calendar, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // По умолчанию неделя назад
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const processPeriodMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const response = await fetch('/api/ai/process-period', {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to process period messages');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Обработка завершена",
        description: `Обработано сообщений: ${data.processedMessages}, создано задач: ${data.createdTasks}, создано саммари: ${data.createdSummaries}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка обработки",
        description: "Не удалось обработать сообщения за указанный период",
        variant: "destructive",
      });
    },
  });

  const currentDate = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleProcessPeriod = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Ошибка",
        description: "Выберите начальную и конечную дату",
        variant: "destructive",
      });
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Ошибка",
        description: "Начальная дата должна быть раньше конечной",
        variant: "destructive",
      });
      return;
    }

    processPeriodMutation.mutate({ startDate, endDate });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
              <p className="text-gray-600">Сегодня, {currentDate}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-sm font-medium text-success">Подключено к Telegram</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Period Processing Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Обработка сообщений за период
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-date">Начальная дата</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">Конечная дата</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleProcessPeriod}
                    disabled={processPeriodMutation.isPending}
                    className="w-full"
                  >
                    {processPeriodMutation.isPending ? (
                      <>
                        <Download className="mr-2 h-4 w-4 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Обработать период
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Загружает все сообщения за выбранный период и создает задачи для личных чатов, 
                общие AI-саммари для групповых чатов.
              </p>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Непрочитанные</p>
                  <p className="text-3xl font-bold text-accent">
                    {statsLoading ? '...' : stats?.unreadMessages || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent bg-opacity-10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-envelope text-accent text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Требуют внимания</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Срочные задачи</p>
                  <p className="text-3xl font-bold text-destructive">
                    {statsLoading ? '...' : stats?.urgentTasks || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-destructive bg-opacity-10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-destructive text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Требуют внимания</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Активные чаты</p>
                  <p className="text-3xl font-bold text-primary">
                    {statsLoading ? '...' : stats?.activeChats || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-comments text-primary text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Подключено из Telegram</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Завершено</p>
                  <p className="text-3xl font-bold text-success">
                    {statsLoading ? '...' : `${stats?.completedTasksPercentage || 0}%`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success bg-opacity-10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-circle text-success text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">За текущую неделю</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              <DailySummary />
              <TasksOverview />
            </div>

            {/* Right Sidebar */}
            <div className="space-y-8">
              <AIInsights />
              <QuickActions />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
