import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * Props para el componente KPICard
 * @interface KPICardProps
 */
interface KPICardProps {
  /** Título descriptivo de la métrica */
  title: string;
  /** Valor principal a mostrar */
  value: string | number;
  /** Indicador de cambio/tendencia (opcional) */
  change?: {
    /** Valor del cambio (ej: "+12%") */
    value: string;
    /** Dirección de la tendencia */
    trend: "up" | "down" | "neutral";
  };
  /** Componente de icono de Lucide */
  icon: LucideIcon;
  /** Variante de color de la tarjeta */
  variant?: "default" | "warning" | "danger" | "info";
}

/** Estilos por variante - Configuración centralizada */
const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    border: "border-l-primary",
  },
  warning: {
    icon: "bg-amber-500/10 text-amber-500",
    border: "border-l-amber-500",
  },
  danger: {
    icon: "bg-destructive/10 text-destructive",
    border: "border-l-destructive",
  },
  info: {
    icon: "bg-[#34b7ff]/10 text-[#34b7ff]",
    border: "border-l-[#34b7ff]",
  },
} as const;

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
}: Readonly<KPICardProps>) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn(
      "border-l-4 hover-lift cursor-pointer",
      styles.border
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            <p className="text-sm text-muted-foreground">{title}</p>
            {change && (
              <p
                className={cn(
                  "text-xs font-medium",
                  change.trend === "up" && "text-emerald-500",
                  change.trend === "down" && "text-destructive",
                  change.trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change.value}{" "}
                <span className="text-muted-foreground font-normal">vs semana pasada</span>
              </p>
            )}
          </div>
          <div className={cn(
            "rounded-lg p-3 transition-transform hover:scale-110",
            styles.icon
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
