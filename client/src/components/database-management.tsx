import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Database, Table, BarChart3, Users, MessageSquare, CheckSquare, FileText, Lightbulb } from "lucide-react";

export default function DatabaseManagement() {
  const { data: dbStats } = useQuery({
    queryKey: ['/api/database/stats'],
  });

  const { data: tableStats } = useQuery({
    queryKey: ['/api/database/tables'],
  });

  return (
    <div className="space-y-6">
      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Статус базы данных
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Badge variant="default" className="flex items-center">
              <Database className="w-4 h-4 mr-2" />
              PostgreSQL подключена
            </Badge>
            <div className="text-sm text-gray-600">
              Последнее обновление: {new Date().toLocaleString('ru-RU')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Статистика данных
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-900">{dbStats?.users || 0}</div>
              <div className="text-sm text-blue-700">Пользователи</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-900">{dbStats?.chats || 0}</div>
              <div className="text-sm text-green-700">Чаты</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-900">{dbStats?.messages || 0}</div>
              <div className="text-sm text-purple-700">Сообщения</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-900">{dbStats?.tasks || 0}</div>
              <div className="text-sm text-orange-700">Задачи</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Schema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Table className="w-5 h-5 mr-2" />
            Схема базы данных
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tables" className="w-full">
            <TabsList>
              <TabsTrigger value="tables">Таблицы</TabsTrigger>
              <TabsTrigger value="relations">Связи</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tables" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Users Table */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    users
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">id</span>
                      <span className="font-mono text-blue-600">SERIAL PRIMARY KEY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">username</span>
                      <span className="font-mono text-blue-600">VARCHAR UNIQUE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">password</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                  </div>
                </div>

                {/* Telegram Chats Table */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    telegram_chats
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">id</span>
                      <span className="font-mono text-blue-600">SERIAL PRIMARY KEY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">chat_id</span>
                      <span className="font-mono text-blue-600">VARCHAR UNIQUE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">title</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">is_monitored</span>
                      <span className="font-mono text-blue-600">BOOLEAN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">participant_count</span>
                      <span className="font-mono text-blue-600">INTEGER</span>
                    </div>
                  </div>
                </div>

                {/* Telegram Messages Table */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    telegram_messages
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">id</span>
                      <span className="font-mono text-blue-600">SERIAL PRIMARY KEY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">message_id</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">chat_id</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">content</span>
                      <span className="font-mono text-blue-600">TEXT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">sender_name</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">timestamp</span>
                      <span className="font-mono text-blue-600">TIMESTAMP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">is_processed</span>
                      <span className="font-mono text-blue-600">BOOLEAN</span>
                    </div>
                  </div>
                </div>

                {/* Extracted Tasks Table */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    extracted_tasks
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">id</span>
                      <span className="font-mono text-blue-600">SERIAL PRIMARY KEY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">title</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">description</span>
                      <span className="font-mono text-blue-600">TEXT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">status</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">urgency</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">deadline</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">chat_id</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                  </div>
                </div>

                {/* Daily Summaries Table */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    daily_summaries
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">id</span>
                      <span className="font-mono text-blue-600">SERIAL PRIMARY KEY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">date</span>
                      <span className="font-mono text-blue-600">VARCHAR UNIQUE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">summary</span>
                      <span className="font-mono text-blue-600">TEXT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">requires_response</span>
                      <span className="font-mono text-blue-600">TEXT[]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">key_topics</span>
                      <span className="font-mono text-blue-600">TEXT[]</span>
                    </div>
                  </div>
                </div>

                {/* AI Insights Table */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    ai_insights
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">id</span>
                      <span className="font-mono text-blue-600">SERIAL PRIMARY KEY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">type</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">title</span>
                      <span className="font-mono text-blue-600">VARCHAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">description</span>
                      <span className="font-mono text-blue-600">TEXT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">confidence_score</span>
                      <span className="font-mono text-blue-600">DECIMAL</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="relations" className="space-y-4">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Связи между таблицами</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-mono text-sm">telegram_messages.chat_id</span>
                      <span className="text-gray-500">→</span>
                      <span className="font-mono text-sm">telegram_chats.chat_id</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-mono text-sm">extracted_tasks.chat_id</span>
                      <span className="text-gray-500">→</span>
                      <span className="font-mono text-sm">telegram_chats.chat_id</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-mono text-sm">extracted_tasks.message_id</span>
                      <span className="text-gray-500">→</span>
                      <span className="font-mono text-sm">telegram_messages.message_id</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}