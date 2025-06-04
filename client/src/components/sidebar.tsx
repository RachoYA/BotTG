import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Sidebar() {
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-800">
          <i className="fab fa-telegram-plane text-primary mr-2"></i>
          TG Manager
        </h1>
        <p className="text-sm text-gray-600 mt-1">AI Копилот</p>
      </div>
      
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          <li>
            <a href="#" className="flex items-center px-4 py-3 text-primary bg-blue-50 rounded-lg font-medium">
              <i className="fas fa-tachometer-alt mr-3"></i>
              Dashboard
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
              <i className="fas fa-comments mr-3"></i>
              Чаты
              {stats?.activeChats && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.activeChats}
                </Badge>
              )}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
              <i className="fas fa-tasks mr-3"></i>
              Задачи
              {stats?.urgentTasks && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.urgentTasks}
                </Badge>
              )}
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
              <i className="fas fa-chart-line mr-3"></i>
              Аналитика
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
              <i className="fas fa-cog mr-3"></i>
              Настройки
            </a>
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
