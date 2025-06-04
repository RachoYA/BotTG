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
  const [needsCode, setNeedsCode] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/telegram/status'],
    refetchInterval: 5000,
  });

  const connectMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return await apiRequest('POST', '/api/telegram/connect', { phoneNumber });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      if (data?.needsCode) {
        setNeedsCode(true);
        toast({
          title: "Код подтверждения",
          description: "Введите код, который пришел в Telegram",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
        toast({
          title: "Подключение к Telegram",
          description: "Telegram подключен успешно",
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

  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest('POST', '/api/telegram/verify', { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setNeedsCode(false);
      setVerificationCode("");
      toast({
        title: "Успешно подключено",
        description: "Telegram подключен успешно",
      });
    },
    onError: () => {
      toast({
        title: "Неверный код",
        description: "Проверьте код и попробуйте снова",
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

  const handleVerifyCode = () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Введите код",
        description: "Код подтверждения обязателен",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(verificationCode);
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

            <Button 
              onClick={handleConnect}
              disabled={connectMutation.isPending || !phoneNumber.trim()}
              className="w-full"
            >
              {connectMutation.isPending ? "Подключение..." : "Подключиться к Telegram"}
            </Button>
          </div>
        )}

        {/* Модальное окно для ввода кода */}
        <Dialog open={needsCode} onOpenChange={setNeedsCode}>
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
            <p><strong>API ID:</strong> 24788533 ✓</p>
            <p><strong>API Hash:</strong> 3a5e530327b9e7e8e90b54c6ab0259a1 ✓</p>
            <p className="text-xs text-gray-500 mt-2">
              API ключи настроены и готовы к использованию
            </p>
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

        <div className="text-xs text-gray-500">
          Telegram Client API предоставляет полный доступ к вашим чатам и сообщениям.
          Данные обрабатываются локально и не передаются третьим лицам.
        </div>
      </CardContent>
    </Card>
  );
}