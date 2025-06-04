import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Lightbulb, Clock, TrendingUp } from "lucide-react";

export default function AIInsights() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['/api/insights'],
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'fas fa-lightbulb':
        return <Lightbulb className="w-4 h-4" />;
      case 'fas fa-clock':
        return <Clock className="w-4 h-4" />;
      case 'fas fa-chart-line':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-blue-50 border-l-4 border-primary text-primary';
      case 'accent':
        return 'bg-orange-50 border-l-4 border-accent text-accent';
      case 'success':
        return 'bg-green-50 border-l-4 border-success text-success';
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-warning text-warning';
      default:
        return 'bg-gray-50 border-l-4 border-gray-400 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="w-5 h-5 text-primary mr-2" />
            AI Рекомендации
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="w-5 h-5 text-primary mr-2" />
          AI Рекомендации
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!insights || insights.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Нет рекомендаций</p>
            <p className="text-sm text-gray-400 mt-1">
              AI анализирует ваши данные для формирования рекомендаций
            </p>
          </div>
        ) : (
          insights.map((insight: any) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg ${getColorClasses(insight.color)}`}
            >
              <div className="flex items-start">
                <div className="mt-1 mr-3">
                  {getIcon(insight.icon)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{insight.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
