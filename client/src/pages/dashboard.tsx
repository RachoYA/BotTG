import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import DailySummary from "@/components/daily-summary";
import TasksOverview from "@/components/tasks-overview";
import ChatMonitoring from "@/components/chat-monitoring";
import AIInsights from "@/components/ai-insights";
import QuickActions from "@/components/quick-actions";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const currentDate = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
              <ChatMonitoring />
              <AIInsights />
              <QuickActions />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
