import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Database, 
  Search, 
  Loader2, 
  CheckCircle, 
  BarChart3,
  MessageSquare,
  Users,
  Clock
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RAGManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { toast } = useToast();

  // Get RAG system stats
  const { data: ragStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/rag/stats'],
    refetchInterval: 5000,
  });

  // Initialize RAG system
  const initializeRAGMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/rag/initialize", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rag/stats'] });
      toast({
        title: "RAG система инициализирована",
        description: `Обработано ${data.stats?.totalMessages || 0} сообщений из ${data.stats?.totalChats || 0} чатов`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка инициализации",
        description: error.message || "Не удалось инициализировать RAG систему",
        variant: "destructive",
      });
    },
  });

  // Semantic search
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      return await apiRequest("POST", "/api/rag/search", {
        query,
        limit: 20
      });
    },
    onSuccess: (data: any) => {
      setSearchResults(data || []);
      toast({
        title: "Поиск завершен",
        description: `Найдено ${data?.length || 0} релевантных сообщений`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка поиска",
        description: error.message || "Не удалось выполнить семантический поиск",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Введите запрос",
        description: "Для поиска необходимо ввести текст запроса",
        variant: "destructive",
      });
      return;
    }
    searchMutation.mutate(searchQuery);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-6">
      {/* RAG System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Статус RAG-системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? "..." : ((ragStats as any)?.totalMessages || 0)}
              </div>
              <div className="text-sm text-blue-600">Сообщений в системе</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? "..." : ((ragStats as any)?.totalChats || 0)}
              </div>
              <div className="text-sm text-green-600">Проанализированных чатов</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? "..." : ((ragStats as any)?.totalContexts || 0)}
              </div>
              <div className="text-sm text-purple-600">Контекстов бесед</div>
            </div>
          </div>

          <Button
            onClick={() => initializeRAGMutation.mutate()}
            disabled={initializeRAGMutation.isPending}
            className="w-full"
          >
            {initializeRAGMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Инициализация RAG-системы...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                {ragStats?.totalMessages > 0 ? 'Переинициализировать RAG-систему' : 'Инициализировать RAG-систему'}
              </>
            )}
          </Button>
          
          {ragStats?.totalMessages > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">RAG-система активна</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Система готова к анализу с полным историческим контекстом
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Semantic Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Семантический поиск по истории переписок
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-query">Поисковый запрос</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="search-query"
                  placeholder="Например: проблемы с оплатой, встреча по проекту, обсуждение бюджета..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={searchMutation.isPending || !searchQuery.trim()}
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">
                  Результаты поиска ({searchResults.length})
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {result.chatTitle}
                          </Badge>
                          <Badge variant="secondary">
                            Релевантность: {(result.similarity * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(result.timestamp)}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {result.senderName || 'Неизвестный'}:
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-3">
                        {result.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchMutation.isSuccess && searchResults.length === 0 && (
              <div className="text-center p-6 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Ничего не найдено по запросу "{searchQuery}"</p>
                <p className="text-sm">Попробуйте изменить поисковый запрос</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Возможности RAG-системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Семантический поиск по всей истории переписок с векторными эмбеддингами</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Автоматический анализ контекста каждой беседы с определением тем и типа отношений</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Контекстный анализ с учетом полной истории общения для каждого контакта</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Автоматическое обновление базы знаний при поступлении новых сообщений</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Связывание текущих обсуждений с предыдущими разговорами на похожие темы</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}