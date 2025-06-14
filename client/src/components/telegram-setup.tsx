import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, CheckCircle, AlertCircle, Phone, Key } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TelegramSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/telegram/status'],
    refetchInterval: 5000,
  });

  const connectMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('POST', '/api/telegram/connect', { phoneNumber });
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("Connect success response:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      if (data?.needsCode === true) {
        console.log("Opening code verification modal");
        setNeedsCode(true);
        toast({
          title: "Код подтверждения",
          description: "Введите код, который пришел в Telegram",
        });
      } else if (data?.connected === true) {
        queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
        toast({
          title: "Подключение к Telegram",
          description: "Telegram подключен успешно",
        });
      } else {
        console.log("Unexpected response:", data);
        toast({
          title: "Ошибка",
          description: "Неожиданный ответ сервера",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Connect error:", error);
      toast({
        title: "Ошибка подключения",
        description: error?.message || "Не удалось подключиться к Telegram",
        variant: "destructive",
      });
    },
  });

  const loadMessagesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/telegram/load-messages', { loadAll: true, limit: 100 });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      toast({
        title: "Сообщения загружены",
        description: `Загружено сообщений из ${data.chatsProcessed}/${data.totalChats} чатов`,
      });
    },
    onError: (error: any) => {
      console.error("Load messages error:", error);
      toast({
        title: "Ошибка загрузки",
        description: error?.message || "Не удалось загрузить сообщения",
        variant: "destructive",
      });
    },
  });

  const resetSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/telegram/reset-session', {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      toast({
        title: "Сессия сброшена",
        description: "Попробуйте подключиться заново",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка сброса сессии",
        description: error?.message || "Не удалось сбросить сессию",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ code, password }: { code: string; password?: string }) => {
      const response = await apiRequest('POST', '/api/telegram/verify', { code, password });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setNeedsCode(false);
      setNeedsPassword(false);
      setVerificationCode("");
      setPassword("");
      toast({
        title: "Успешно подключено",
        description: "Telegram подключен успешно",
      });
    },
    onError: async (error: any) => {
      console.error("Verify error details:", error);
      
      // Пытаемся получить JSON из ответа ошибки
      try {
        if (error.message && error.message.includes("400:")) {
          const responseText = error.message.split("400: ")[1];
          const errorData = JSON.parse(responseText);
          
          if (errorData.needsPassword) {
            console.log("Password required, showing password field");
            setNeedsPassword(true);
            toast({
              title: "Требуется пароль",
              description: "Введите пароль двухфакторной аутентификации",
            });
            return;
          }
        }
      } catch (parseError) {
        console.log("Could not parse error response, checking message text");
      }
      
      // Проверяем текст ошибки напрямую
      if (error.message && error.message.includes("Two-factor authentication password required")) {
        console.log("Password required by message text, showing password field");
        setNeedsPassword(true);
        toast({
          title: "Требуется пароль",
          description: "Введите пароль двухфакторной аутентификации",
        });
        return;
      }
      
      toast({
        title: "Ошибка авторизации",
        description: error?.message || "Проверьте код и попробуйте снова",
        variant: "destructive",
      });
    },
  });

  const handleConnect = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Введите номер телефона",
        description: "Номер телефона обязателен для подключения",
        variant: "destructive",
      });
      return;
    }
    connectMutation.mutate(phoneNumber);
  };

  const handleResetSession = () => {
    resetSessionMutation.mutate();
  };

  const handleVerifyCode = () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Введите код",
        description: "Код подтверждения обязателен",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate({ 
      code: verificationCode, 
      password: needsPassword ? password : undefined 
    });
  };

  const isConnected = status?.connected || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Подключение к Telegram
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div>
            <p className="font-medium text-blue-800">Статус подключения</p>
            <p className="text-sm text-blue-600">
              {isConnected ? "Подключено к Telegram Client API" : "Не подключено"}
            </p>
          </div>
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center">
            {isConnected ? (
              <CheckCircle className="w-4 h-4 mr-1" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-1" />
            )}
            {isConnected ? "Активно" : "Неактивно"}
          </Badge>
        </div>

        {!isConnected && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <div className="flex items-center mt-1">
                <Phone className="w-4 h-4 text-gray-500 mr-2" />
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleConnect}
                disabled={connectMutation.isPending || !phoneNumber.trim()}
                className="w-full"
              >
                {connectMutation.isPending ? "Подключение..." : "Подключиться к Telegram"}
              </Button>
              
              <Button 
                onClick={handleResetSession}
                variant="outline"
                className="w-full text-xs"
                disabled={resetSessionMutation.isPending}
              >
                {resetSessionMutation.isPending ? "Сброс..." : "Сбросить сессию Telegram"}
              </Button>
            </div>
          </div>
        )}

        {/* Модальное окно для ввода кода */}
        <Dialog open={needsCode} onOpenChange={setNeedsCode} modal={true}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Код подтверждения Telegram</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-medium">Код отправлен в Telegram</p>
                <p className="text-sm text-blue-600 mt-1">
                  Введите код подтверждения, который пришел в Telegram на номер {phoneNumber}
                </p>
              </div>

              <div>
                <Label htmlFor="verification-code">Код подтверждения</Label>
                <div className="flex items-center mt-1">
                  <Key className="w-4 h-4 text-gray-500 mr-2" />
                  <Input
                    id="verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="12345"
                    className="flex-1"
                    maxLength={5}
                    autoFocus
                  />
                </div>
              </div>

              {needsPassword && (
                <div>
                  <Label htmlFor="password">Пароль двухфакторной аутентификации</Label>
                  <div className="flex items-center mt-1">
                    <Key className="w-4 h-4 text-gray-500 mr-2" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Введите пароль"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Требуется пароль от двухфакторной аутентификации Telegram
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={handleVerifyCode}
                  disabled={verifyCodeMutation.isPending || !verificationCode.trim()}
                  className="flex-1"
                >
                  {verifyCodeMutation.isPending ? "Проверка..." : "Подтвердить код"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setNeedsCode(false);
                    setVerificationCode("");
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center">
            <Key className="w-4 h-4 mr-2" />
            Настройки API
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>API ключи загружены из конфигурации.</p>
          </div>
        </div>

        {isConnected && (
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-green-800 font-medium">Telegram успешно подключен!</p>
            <p className="text-sm text-green-600 mt-1">
              Теперь вы можете выбирать чаты для мониторинга и получать сообщения в реальном времени.
            </p>
          </div>
        )}

        {isConnected && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Загрузка сообщений</h4>
            <p className="text-sm text-blue-600 mb-3">
              Загрузите сообщения из всех чатов в базу данных для AI-анализа и извлечения задач
            </p>
            <Button 
              onClick={() => loadMessagesMutation.mutate()}
              disabled={loadMessagesMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {loadMessagesMutation.isPending ? "Загрузка сообщений..." : "Загрузить все сообщения"}
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500">
          Telegram Client API предоставляет полный доступ к вашим чатам и сообщениям.
          Данные обрабатываются локально и не передаются третьим лицам.
        </div>
      </CardContent>
    </Card>
  );
}