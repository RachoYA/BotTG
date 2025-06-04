import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 10000,
  });

  const isActive = (path: string) => location === path;

  return (
    <div className="bg-white h-full w-64 border-r border-gray-200 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">
          TG Manager
        </h1>
        <p className="text-sm text-gray-600 mt-1">AI Копилот</p>
      </div>
      
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          <li>
            <Link 
              href="/" 
              className={`flex items-center px-4 py-3 rounded-lg font-medium ${
                isActive('/') ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-tachometer-alt mr-3"></i>
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              href="/chats" 
              className={`flex items-center px-4 py-3 rounded-lg ${
                isActive('/chats') ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-comments mr-3"></i>
              Чаты
              {stats?.activeChats && stats.activeChats > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.activeChats}
                </Badge>
              )}
            </Link>
          </li>
          <li>
            <Link 
              href="/tasks" 
              className={`flex items-center px-4 py-3 rounded-lg ${
                isActive('/tasks') ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-tasks mr-3"></i>
              Задачи
              {stats?.urgentTasks && stats.urgentTasks > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.urgentTasks}
                </Badge>
              )}
            </Link>
          </li>
          <li>
            <Link 
              href="/analytics" 
              className={`flex items-center px-4 py-3 rounded-lg ${
                isActive('/analytics') ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-chart-line mr-3"></i>
              Аналитика
            </Link>
          </li>
          <li>
            <Link 
              href="/settings" 
              className={`flex items-center px-4 py-3 rounded-lg ${
                isActive('/settings') ? 'text-primary bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-cog mr-3"></i>
              Настройки
            </Link>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
            АП
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800">Александр Петров</p>
            <p className="text-xs text-gray-600">Руководитель</p>
          </div>
        </div>
      </div>
    </div>
  );
}