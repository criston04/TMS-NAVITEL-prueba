"use client";

/* ============================================
   COMPONENT: Route Metrics KPIs
   Tarjetas animadas con métricas de ruta
   ============================================ */

import { motion } from "framer-motion";
import { Route, TrendingUp, DollarSign, MapPin, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Route as RouteType } from "@/types/route-planner";
import { cn } from "@/lib/utils";

interface RouteMetricsProps {
  route: RouteType | null;
}

export function RouteMetrics({ route }: RouteMetricsProps) {
  if (!route) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 bg-muted/20">
            <div className="h-12 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin datos</p>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      icon: Route,
      label: "Distancia Total",
      value: `${route.metrics.totalDistance} km`,
      color: "text-[#3DBAFF]",
      bgColor: "bg-[#3DBAFF]/10",
    },
    {
      icon: Clock,
      label: "Tiempo Estimado",
      value: `${Math.floor(route.metrics.estimatedDuration / 60)}h ${route.metrics.estimatedDuration % 60}m`,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: MapPin,
      label: "Paradas",
      value: route.stops.length.toString(),
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: DollarSign,
      label: "Costo Estimado",
      value: `$${route.metrics.estimatedCost.toFixed(2)}`,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const hasAlerts = route.alerts && route.alerts.length > 0;

  return (
    <div className="space-y-4 p-4">
      {/* Alerts */}
      {hasAlerts && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm mb-1">Alertas de Ruta</div>
              <div className="space-y-1">
                {route.alerts!.map((alert) => (
                  <div key={alert.id} className="text-xs text-muted-foreground">
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                    <Icon className={cn("h-5 w-5", metric.color)} />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.label}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Details */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Combustible</div>
              <div className="font-semibold">${route.metrics.fuelCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Peajes</div>
              <div className="font-semibold">
                {route.metrics.tollsCost > 0 ? `$${route.metrics.tollsCost.toFixed(2)}` : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Peso Total</div>
              <div className="font-semibold">{route.metrics.totalWeight} kg</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Volumen Total</div>
              <div className="font-semibold">{route.metrics.totalVolume} m³</div>
            </div>
          </div>

          {route.vehicle && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Vehículo Asignado</div>
                  <div className="font-semibold">
                    {route.vehicle.brand} {route.vehicle.model} • {route.vehicle.plate}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground mb-1">Capacidad Utilizada</div>
                  <div className="font-semibold">
                    {((route.metrics.totalWeight / route.vehicle.capacity.weight) * 100).toFixed(0)}% peso •{" "}
                    {((route.metrics.totalVolume / route.vehicle.capacity.volume) * 100).toFixed(0)}% volumen
                  </div>
                </div>
              </div>
            </div>
          )}

          {route.driver && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Conductor Asignado</div>
                  <div className="font-semibold">
                    {route.driver.firstName} {route.driver.lastName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold">{route.driver.rating.toFixed(1)}</span>
                  </div>
                  <div className="text-muted-foreground">• {route.driver.experience} años exp.</div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
