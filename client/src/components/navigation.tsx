import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="flex items-center space-x-2 mb-6">
      <Link href="/">
        <Button 
          variant={location === "/" ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex items-center",
            location === "/" && "bg-primary text-primary-foreground"
          )}
        >
          <Home className="w-4 h-4 mr-2" />
          Дашборд
        </Button>
      </Link>
      
      <Link href="/settings">
        <Button 
          variant={location === "/settings" ? "default" : "outline"}
          size="sm"
          className={cn(
            "flex items-center",
            location === "/settings" && "bg-primary text-primary-foreground"
          )}
        >
          <Settings className="w-4 h-4 mr-2" />
          Настройки
        </Button>
      </Link>
    </nav>
  );
}