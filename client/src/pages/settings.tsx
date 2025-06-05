import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageCircle, Brain, Database, Calendar } from "lucide-react";
import MobileSidebar from "@/components/mobile-sidebar";
import TelegramSetup from "@/components/telegram-setup";
import AIModelTesting from "@/components/ai-model-testing";
import DatabaseManagement from "@/components/database-management";
import PeriodAnalysis from "@/components/period-analysis";
import RAGManagement from "@/components/rag-management";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Settings className="w-6 h-6 mr-3" />
                Настройки системы
              </h2>
              <p className="text-gray-600">Управление подключениями и конфигурацией AI-копилота</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">

      <Tabs defaultValue="telegram" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="telegram" className="flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            AI модель
          </TabsTrigger>
          <TabsTrigger value="rag" className="flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            RAG система
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Анализ периодов
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
          <AIModelTesting />
        </TabsContent>

        <TabsContent value="rag">
          <RAGManagement />
        </TabsContent>

        <TabsContent value="analysis">
          <PeriodAnalysis />
        </TabsContent>

        <TabsContent value="database">
          <DatabaseManagement />
        </TabsContent>
      </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}