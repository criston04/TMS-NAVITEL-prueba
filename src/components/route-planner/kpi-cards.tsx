"use client";

/* ============================================
   COMPONENT: KPI Cards
   Tarjetas animadas con métricas de ruta
   ============================================ */

import { motion } from "framer-motion";
import {
  Route,
  Clock,
  MapPin,
  DollarSign,
  Fuel,
  TrendingUp,
  LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Route as RouteType } from "@/types/route-planner";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

interface KpiCardsProps {
  route: RouteType | null;
}

interface KpiData {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/* ============================================
   ANIMATED COUNTER HOOK
   ============================================ */
function useAnimatedValue(
  endValue: number,
  duration: number = 1000,
  decimals: number = 0
): string {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [endValue, duration]);

  return decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toString();
}

/* ============================================
   EMPTY KPI DATA (placeholder metrics)
   ============================================ */
const emptyKpis = [
  { icon: Route, label: "Distancia Total", color: "text-[#3DBAFF]", bgColor: "bg-[#3DBAFF]/10" },
  { icon: Clock, label: "Tiempo Estimado", color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { icon: MapPin, label: "Paradas", color: "text-green-500", bgColor: "bg-green-500/10" },
  { icon: DollarSign, label: "Costo Estimado", color: "text-orange-500", bgColor: "bg-orange-500/10" },
];

/* ============================================
   SINGLE KPI CARD
   ============================================ */
function KpiCard({
  data,
  index,
  isEmpty = false,
}: {
  data?: KpiData;
  index: number;
  isEmpty?: boolean;
}) {
  if (isEmpty || !data) {
    const emptyData = emptyKpis[index] || emptyKpis[0];
    const Icon = emptyData.icon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="h-full"
      >
        <Card className="px-3 py-2.5 h-full bg-muted/10 border border-dashed border-border/60 hover:border-border transition-colors">
          <div className="flex items-center gap-3">
            <div className={cn("p-1.5 rounded-lg", emptyData.bgColor)}>
              <Icon className={cn("h-4 w-4", emptyData.color)} />
            </div>
            <div>
              <div className="text-base font-semibold text-muted-foreground/40">--</div>
              <div className="text-[11px] text-muted-foreground/60">{emptyData.label}</div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  const Icon = data.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        damping: 20,
        stiffness: 300,
      }}
      whileHover={{ scale: 1.01, y: -1 }}
      className="h-full"
    >
      <Card
        className={cn(
          "p-2 h-full transition-all hover:shadow-lg relative overflow-hidden flex items-center gap-0 bg-gradient-to-br from-card to-card/50 border border-border/50",
          data.borderColor
        )}
      >
        <div className="flex items-center w-full">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: index * 0.08 + 0.2,
              type: "spring",
              damping: 15,
            }}
            className={cn("p-2 bg-[#eaf7ff] rounded-xl flex-shrink-0 flex items-center justify-center", data.bgColor)}
            style={{ minWidth: 38, minHeight: 38 }}
          >
            <Icon className={cn("h-6 w-6 text-[#34b7ff]", data.color)} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 + 0.3 }}
            className="flex flex-col justify-center min-w-0 ml-2"
          >
            <div className="text-[18px] font-bold leading-tight tracking-tight text-black">
              {data.value}
            </div>
            <div className="text-[13px] text-neutral-600 font-medium leading-tight">
              {data.label}
            </div>
            {data.subValue && (
              <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                {data.subValue}
              </div>
            )}
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ============================================
   KPI CARDS COMPONENT
   ============================================ */
export function KpiCards({ route }: KpiCardsProps) {
  const animatedDistance = useAnimatedValue(
    route?.metrics.totalDistance || 0,
    800,
    1
  );
  const animatedCost = useAnimatedValue(
    route?.metrics.estimatedCost || 0,
    800,
    2
  );
  const animatedStops = useAnimatedValue(route?.stops.length || 0, 600);

  if (!route) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-3">
        {[...Array(4)].map((_, i) => (
          <KpiCard key={i} index={i} isEmpty />
        ))}
      </div>
    );
  }

  const hours = Math.floor(route.metrics.estimatedDuration / 60);
  const minutes = route.metrics.estimatedDuration % 60;

  const kpis: KpiData[] = [
    {
      icon: Route,
      label: "Distancia Total",
      value: `${animatedDistance} km`,
      color: "text-[#3DBAFF]",
      bgColor: "bg-[#3DBAFF]/15",
      borderColor: "hover:border-[#3DBAFF]/30",
    },
    {
      icon: Clock,
      label: "Tiempo Estimado",
      value: `${hours}h ${minutes}m`,
      subValue: "Incluye tiempo en paradas",
      color: "text-purple-500",
      bgColor: "bg-purple-500/15",
      borderColor: "hover:border-purple-500/30",
    },
    {
      icon: MapPin,
      label: "Paradas",
      value: animatedStops,
      subValue: `${Math.ceil(parseInt(animatedStops) / 2)} órdenes`,
      color: "text-green-500",
      bgColor: "bg-green-500/15",
      borderColor: "hover:border-green-500/30",
    },
    {
      icon: DollarSign,
      label: "Costo Estimado",
      value: `$${animatedCost}`,
      subValue: `Fuel: $${route.metrics.fuelCost.toFixed(2)} | Peajes: $${route.metrics.tollsCost.toFixed(2)}`,
      color: "text-orange-500",
      bgColor: "bg-orange-500/15",
      borderColor: "hover:border-orange-500/30",
    },
  ];

  return (
    <div className="p-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {kpis.map((kpi, index) => (
          <KpiCard key={kpi.label} data={kpi} index={index} />
        ))}
      </div>

      {/* Capacity Indicator */}
      {route.vehicle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-1"
        >
          <Card className="p-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] font-medium">Utilización de Capacidad</div>
              <div className="text-[10px] text-muted-foreground">
                {route.vehicle.brand} {route.vehicle.model}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Weight */}
              <div>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">Peso</span>
                  <span className="font-medium">
                    {route.metrics.totalWeight} / {route.vehicle.capacity.weight} kg
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((route.metrics.totalWeight / route.vehicle.capacity.weight) * 100, 100)}%`,
                    }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      route.metrics.totalWeight > route.vehicle.capacity.weight
                        ? "bg-red-500"
                        : route.metrics.totalWeight >
                            route.vehicle.capacity.weight * 0.8
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    )}
                  />
                </div>
              </div>

              {/* Volume */}
              <div>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">Volumen</span>
                  <span className="font-medium">
                    {route.metrics.totalVolume} / {route.vehicle.capacity.volume} m³
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((route.metrics.totalVolume / route.vehicle.capacity.volume) * 100, 100)}%`,
                    }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      route.metrics.totalVolume > route.vehicle.capacity.volume
                        ? "bg-red-500"
                        : route.metrics.totalVolume >
                            route.vehicle.capacity.volume * 0.8
                          ? "bg-yellow-500"
                          : "bg-[#3DBAFF]"
                    )}
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
