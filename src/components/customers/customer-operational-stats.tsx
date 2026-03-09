"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  TrendingUp,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Scale,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Customer, CustomerOperationalStats } from "@/types/models";

interface CustomerOperationalStatsProps {
  customer: Customer;
  className?: string;
}

export function CustomerOperationalStatsCard({
  customer,
  className,
}: CustomerOperationalStatsProps) {
  const stats: CustomerOperationalStats = useMemo(() => customer.operationalStats || {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    onTimeDeliveryRate: 0,
    totalVolumeKg: 0,
  }, [customer.operationalStats]);

  // Calcular métricas derivadas
  const metrics = useMemo(() => {
    const completionRate = stats.totalOrders > 0 
      ? Math.round((stats.completedOrders / stats.totalOrders) * 100) 
      : 0;
    
    const pendingOrders = stats.totalOrders - stats.completedOrders - stats.cancelledOrders;
    
    const averageOrderValue = stats.totalOrders > 0 && stats.totalBilledAmount
      ? stats.totalBilledAmount / stats.totalOrders
      : 0;

    return {
      completionRate,
      pendingOrders,
      averageOrderValue,
    };
  }, [stats]);

  // Formatear fecha
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Formatear moneda
  const formatCurrency = (amount?: number) => {
    if (!amount) return "S/ 0.00";
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount);
  };

  // Formatear peso
  const formatWeight = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)} ton`;
    }
    return `${kg.toLocaleString()} kg`;
  };

  // Obtener color del rate
  const getRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Estadísticas Operacionales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen de órdenes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Package className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total Órdenes</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
            <p className="text-xs text-muted-foreground">Canceladas</p>
          </div>
        </div>

        {/* Tasa de cumplimiento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Target className="h-4 w-4 text-muted-foreground" />
              Tasa de Cumplimiento
            </span>
            <span className={cn("text-sm font-bold", getRateColor(metrics.completionRate))}>
              {metrics.completionRate}%
            </span>
          </div>
          <Progress 
            value={metrics.completionRate} 
            className={cn("h-2", getProgressColor(metrics.completionRate))}
          />
        </div>

        {/* Tasa de entregas a tiempo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Entregas a Tiempo
            </span>
            <span className={cn("text-sm font-bold", getRateColor(stats.onTimeDeliveryRate))}>
              {stats.onTimeDeliveryRate}%
            </span>
          </div>
          <Progress 
            value={stats.onTimeDeliveryRate} 
            className={cn("h-2", getProgressColor(stats.onTimeDeliveryRate))}
          />
        </div>

        {/* Métricas adicionales */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Scale className="h-3.5 w-3.5" />
              <span className="text-xs">Volumen Transportado</span>
            </div>
            <p className="font-semibold text-sm">{formatWeight(stats.totalVolumeKg)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-xs">Total Facturado</span>
            </div>
            <p className="font-semibold text-sm">{formatCurrency(stats.totalBilledAmount)}</p>
          </div>
        </div>

        {/* Última orden y promedio */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Última Orden</span>
            </div>
            <p className="font-semibold text-sm">{formatDate(stats.lastOrderDate)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              <span className="text-xs">Valor Promedio</span>
            </div>
            <p className="font-semibold text-sm">{formatCurrency(metrics.averageOrderValue)}</p>
          </div>
        </div>

        {/* Badge de estado del cliente */}
        {stats.totalOrders >= 50 && metrics.completionRate >= 90 && (
          <div className="pt-2 border-t">
            <Badge className="w-full justify-center py-1.5 bg-linear-to-r from-amber-500 to-orange-500 text-white">
              ⭐ Cliente Frecuente y Confiable
            </Badge>
          </div>
        )}
        {stats.totalOrders >= 20 && stats.totalOrders < 50 && metrics.completionRate >= 80 && (
          <div className="pt-2 border-t">
            <Badge className="w-full justify-center py-1.5 bg-linear-to-r from-blue-500 to-cyan-500 text-white">
              📈 Cliente en Crecimiento
            </Badge>
          </div>
        )}
        {stats.totalOrders > 0 && metrics.completionRate < 70 && (
          <div className="pt-2 border-t">
            <Badge variant="destructive" className="w-full justify-center py-1.5">
              ⚠️ Requiere Atención - Bajo Cumplimiento
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
