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

export default function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get dashboard stats for sidebar metrics
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => fetch("/api/dashboard/stats").then(res => res.json()),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const navItems = [
    {
      href: "/",
      label: "Главная панель",
      icon: LayoutDashboard,
      active: location === "/"
    },
    {
      href: "/chats",
      label: "Telegram чаты",
      icon: MessageSquare,
      active: location === "/chats"
    },
    {
      href: "/analysis",
      label: "Анализ переписки",
      icon: Calendar,
      active: location === "/analysis",
      badge: stats.pendingAnalyses > 0 ? stats.pendingAnalyses : null
    },
    {
      href: "/insights",
      label: "AI Инсайты",
      icon: Brain,
      active: location === "/insights"
    },
    {
      href: "/settings",
      label: "Настройки",
      icon: Settings,
      active: location === "/settings"
    }
  ];

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Conversation AI</h1>
        <p className="text-sm text-gray-600">Контекстный анализ переписки</p>
      </div>

      <Separator />

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={item.active ? "default" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.label}
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
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Текущая активность</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Отслеживаемые чаты</span>
                <span className="text-xs font-medium">{stats.activeChats || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Новые сообщения</span>
                <span className="text-xs font-medium">{stats.unreadMessages || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Требует ответа</span>
                <span className="text-xs font-medium text-red-600">{stats.responseRequiredChats || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span>Анализ активен</span>
        </div>
      </div>
    </div>
  );
}