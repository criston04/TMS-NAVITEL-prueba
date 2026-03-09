"use client";

import {
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceStats } from "@/types/finance";

interface FinanceStatsCardsProps {
  stats: FinanceStats | null;
  loading: boolean;
}

export function FinanceStatsCards({ stats, loading }: FinanceStatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Facturado",
      value: `S/ ${stats.totalInvoiced?.toLocaleString() || 0}`,
      description: `${stats.invoiceCount || 0} facturas emitidas`,
      icon: FileText,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Cobrado",
      value: `S/ ${stats.totalPaid?.toLocaleString() || 0}`,
      description: `${stats.paidCount || 0} pagos recibidos`,
      icon: CheckCircle,
      iconColor: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "Pendiente",
      value: `S/ ${stats.totalPending?.toLocaleString() || 0}`,
      description: `${stats.pendingCount || 0} facturas por cobrar`,
      icon: DollarSign,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
    },
    {
      title: "Vencido",
      value: `S/ ${stats.totalOverdue?.toLocaleString() || 0}`,
      description: `${stats.overdueCount || 0} facturas vencidas`,
      icon: AlertTriangle,
      iconColor: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Card adicional de Margen */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/20">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingreso Bruto</p>
                <p className="text-lg font-semibold">
                  S/ {stats.grossRevenue?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-50 dark:bg-red-950/20">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Costos</p>
                <p className="text-lg font-semibold">
                  S/ {stats.totalCosts?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-950/20">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingreso Neto</p>
                <p className="text-lg font-semibold">
                  S/ {stats.netRevenue?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-violet-50 dark:bg-violet-950/20">
                <TrendingUp className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margen</p>
                <p className="text-lg font-semibold">
                  {stats.profitMargin?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
