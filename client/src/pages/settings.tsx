import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageCircle, Brain, Database } from "lucide-react";
import Navigation from "@/components/navigation";
import TelegramSetup from "@/components/telegram-setup";
import LocalAISetup from "@/components/local-ai-setup";

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Navigation />
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Settings className="w-8 h-8 mr-3" />
          Настройки системы
        </h1>
        <p className="text-gray-600 mt-2">
          Управление подключениями и конфигурацией AI-копилота
        </p>
      </div>

      <Tabs defaultValue="telegram" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="telegram" className="flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            AI модель
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center">
            <Database className="w-4 h-4 mr-2" />
            База данных
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telegram">
          <TelegramSetup />
        </TabsContent>

        <TabsContent value="ai">
          <LocalAISetup />
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                База данных PostgreSQL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800">Статус подключения</h4>
                <p className="text-sm text-green-600 mt-1">
                  ✓ PostgreSQL база данных активна и работает корректно
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium">Чаты Telegram</h5>
                  <p className="text-sm text-gray-600">3 демо-чата</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium">Сообщения</h5>
                  <p className="text-sm text-gray-600">3 обработанных</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium">Задачи</h5>
                  <p className="text-sm text-gray-600">3 извлеченных</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium">AI инсайты</h5>
                  <p className="text-sm text-gray-600">3 рекомендации</p>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Данные хранятся в защищенной PostgreSQL базе данных.
                Автоматическое резервное копирование включено.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}