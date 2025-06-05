import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageCircle, Brain, Database, Calendar } from "lucide-react";
import MobileSidebar from "@/components/mobile-sidebar";
import TelegramSetup from "@/components/telegram-setup";
import LocalAISetup from "@/components/local-ai-setup";
import PeriodAnalysis from "@/components/period-analysis";
import RAGManagement from "@/components/rag-management";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <MobileSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b mobile-px mobile-py pt-16 lg:pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mobile-text-2xl font-bold text-gray-800 flex items-center">
                <Settings className="w-4 h-4 lg:w-6 lg:h-6 mr-2 lg:mr-3" />
                Настройки системы
              </h2>
              <p className="mobile-text-base text-gray-600">Управление подключениями и конфигурацией AI-копилота</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto mobile-p">
          <div className="max-w-4xl mx-auto">

      <Tabs defaultValue="telegram" className="space-y-4 lg:space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="telegram" className="flex items-center mobile-text-sm">
            <MessageCircle className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden lg:inline">Telegram</span>
            <span className="lg:hidden">TG</span>
          </TabsTrigger>
          <TabsTrigger value="local-ai" className="flex items-center mobile-text-sm">
            <Brain className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden lg:inline">Локальный AI</span>
            <span className="lg:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="rag" className="flex items-center mobile-text-sm">
            <Brain className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden lg:inline">RAG система</span>
            <span className="lg:hidden">RAG</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center mobile-text-sm">
            <Calendar className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            <span className="hidden lg:inline">Анализ периодов</span>
            <span className="lg:hidden">Анализ</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telegram">
          <TelegramSetup />
        </TabsContent>

        <TabsContent value="local-ai">
          <LocalAISetup />
        </TabsContent>

        <TabsContent value="rag">
          <RAGManagement />
        </TabsContent>

        <TabsContent value="analysis">
          <PeriodAnalysis />
        </TabsContent>
      </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}