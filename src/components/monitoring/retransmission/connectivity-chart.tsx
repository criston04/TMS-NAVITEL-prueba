"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ConnectivityTrend } from "@/types/monitoring";

interface ConnectivityChartProps {
  data: ConnectivityTrend[];
  className?: string;
}

/**
 * Gráfico de barras apiladas de tendencia de conectividad (SVG puro)
 */
export function ConnectivityChart({ data, className }: ConnectivityChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    // Take last 24 points max
    return data.slice(-24);
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        <p className="text-sm font-semibold mb-2">Tendencia de conectividad</p>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
          Sin datos disponibles
        </div>
      </div>
    );
  }

  const barWidth = 100 / chartData.length;
  const latest = chartData[chartData.length - 1];
  const previous = chartData.length > 1 ? chartData[chartData.length - 2] : latest;
  const trend = latest.onlinePercentage - previous.onlinePercentage;

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Tendencia de conectividad</p>
        <div className="flex items-center gap-1 text-xs">
          {trend > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : trend < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={cn(
            "font-medium",
            trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"
          )}>
            {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Stacked bar chart SVG */}
      <div className="relative h-32">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {chartData.map((point, i) => {
            const x = i * barWidth;
            const w = barWidth * 0.8;
            const yOnline = 100 - point.onlinePercentage;
            const yTemp = yOnline - point.temporaryLossPercentage;
            return (
              <g key={i}>
                {/* Online (green) */}
                <rect
                  x={x}
                  y={yOnline}
                  width={w}
                  height={point.onlinePercentage}
                  fill="#10b981"
                  rx={0.5}
                />
                {/* Temp loss (amber) */}
                <rect
                  x={x}
                  y={yTemp}
                  width={w}
                  height={point.temporaryLossPercentage}
                  fill="#f59e0b"
                  rx={0.5}
                />
                {/* Disconnected (red) */}
                <rect
                  x={x}
                  y={0}
                  width={w}
                  height={point.disconnectedPercentage}
                  fill="#ef4444"
                  rx={0.5}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          En línea ({latest.onlinePercentage.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Pérdida temp. ({latest.temporaryLossPercentage.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Sin conexión ({latest.disconnectedPercentage.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}
