import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar, 
  Brain, 
  Settings,
  AlertTriangle,
  Users,
  Menu,
  X
} from "lucide-react";

export default function MobileSidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get dashboard stats for sidebar metrics
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => fetch("/api/dashboard/stats").then(res => res.json()),
    refetchInterval: 30000
  });

  const navItems = [
    {
      href: "/",
      label: "Главная панель",
      icon: LayoutDashboard,
      active: location === "/",
    },
    {
      href: "/chats",
      label: "Управление чатами",
      icon: Users,
      active: location === "/chats",
    },
    {
      href: "/analysis",
      label: "Анализ переписки",
      icon: Calendar,
      active: location === "/analysis",
    },
    {
      href: "/tasks",
      label: "Задачи и запросы",
      icon: MessageSquare,
      active: location === "/tasks",
      badge: stats.pendingAnalyses > 0 ? stats.pendingAnalyses : null,
    },
    {
      href: "/insights",
      label: "AI Инсайты",
      icon: Brain,
      active: location === "/insights",
    },
    {
      href: "/analytics",
      label: "Аналитика",
      icon: AlertTriangle,
      active: location === "/analytics",
    },
    {
      href: "/settings",
      label: "Настройки",
      icon: Settings,
      active: location === "/settings",
    },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={item.active ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <Badge variant="destructive" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Button>
          </Link>
        ))}
      </nav>

      <Separator />

      <div className="p-4 space-y-3">
        {/* Quick Stats */}
        <Card>
          <CardContent className="p-3">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Активность</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Чаты</span>
                <span className="text-xs font-medium">{stats.activeChats || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Сообщения</span>
                <span className="text-xs font-medium">{stats.unreadMessages || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Ответы</span>
                <span className="text-xs font-medium text-red-600">{stats.responseRequiredChats || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span>Система активна</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">AI Копилот</h1>
          <p className="text-sm text-gray-600 mt-1">Анализ переписок</p>
        </div>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-lg font-bold text-gray-900">AI Копилот</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}