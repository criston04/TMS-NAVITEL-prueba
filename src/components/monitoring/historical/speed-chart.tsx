"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Gauge, AlertTriangle } from "lucide-react";
import type { HistoricalRoutePoint } from "@/types/monitoring";

interface SpeedChartProps {
  points: HistoricalRoutePoint[];
  speedLimit?: number;
  currentIndex?: number;
  className?: string;
}

/**
 * Gráfico SVG de velocidad vs tiempo para ruta histórica
 */
export function SpeedChart({ points, speedLimit = 80, currentIndex, className }: SpeedChartProps) {
  const chartData = useMemo(() => {
    if (points.length === 0) return { path: "", overSpeedPath: "", maxSpeed: 0, areaPath: "" };

    // Sample points to avoid rendering thousands of SVG points
    const step = Math.max(1, Math.floor(points.length / 300));
    const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);

    const maxSpeed = Math.max(...sampled.map((p) => p.speed), speedLimit + 10);
    const width = 100;
    const height = 100;

    const getX = (i: number) => (i / (sampled.length - 1)) * width;
    const getY = (speed: number) => height - (speed / maxSpeed) * height;

    // Main speed line
    const pathParts = sampled.map((p, i) => {
      const x = getX(i);
      const y = getY(p.speed);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    // Area fill under the line
    const areaParts = [
      ...pathParts,
      `L ${width} ${height}`,
      `L 0 ${height}`,
      "Z",
    ];

    // Over speed segments
    const overSpeedParts: string[] = [];
    let inOverSpeed = false;
    sampled.forEach((p, i) => {
      if (p.speed > speedLimit) {
        const x = getX(i);
        const y = getY(p.speed);
        if (!inOverSpeed) {
          overSpeedParts.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
          inOverSpeed = true;
        } else {
          overSpeedParts.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
        }
      } else {
        inOverSpeed = false;
      }
    });

    const overSpeedCount = sampled.filter((p) => p.speed > speedLimit).length;

    return {
      path: pathParts.join(" "),
      areaPath: areaParts.join(" "),
      overSpeedPath: overSpeedParts.join(" "),
      maxSpeed,
      overSpeedCount,
      sampled,
      getX,
      getY,
      speedLimitY: getY(speedLimit),
    };
  }, [points, speedLimit]);

  const currentX = useMemo(() => {
    if (currentIndex === undefined || points.length === 0) return null;
    return (currentIndex / (points.length - 1)) * 100;
  }, [currentIndex, points.length]);

  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Velocidad vs Tiempo</span>
        </div>
        {chartData.overSpeedCount !== undefined && chartData.overSpeedCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertTriangle className="h-3 w-3" />
            {chartData.overSpeedCount} excesos
          </span>
        )}
      </div>

      <div className="relative h-40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Area fill */}
          <path d={chartData.areaPath} fill="url(#speedGradient)" opacity={0.3} />

          {/* Speed limit line */}
          {chartData.speedLimitY !== undefined && (
            <line
              x1={0}
              y1={chartData.speedLimitY}
              x2={100}
              y2={chartData.speedLimitY}
              stroke="#ef4444"
              strokeWidth={0.3}
              strokeDasharray="2 1"
              opacity={0.6}
            />
          )}

          {/* Main speed line */}
          <path d={chartData.path} fill="none" stroke="#3b82f6" strokeWidth={0.5} />

          {/* Over speed segments */}
          {chartData.overSpeedPath && (
            <path d={chartData.overSpeedPath} fill="none" stroke="#ef4444" strokeWidth={0.8} />
          )}

          {/* Current position indicator */}
          {currentX !== null && (
            <line
              x1={currentX}
              y1={0}
              x2={currentX}
              y2={100}
              stroke="#06b6d4"
              strokeWidth={0.4}
              opacity={0.8}
            />
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] text-muted-foreground pointer-events-none -ml-1">
          <span>{chartData.maxSpeed?.toFixed(0)}</span>
          <span className="text-red-500">{speedLimit}</span>
          <span>0</span>
        </div>
      </div>

      {/* X-axis */}
      <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
        <span>
          {points.length > 0
            ? new Date(points[0].timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
            : ""}
        </span>
        <span>Límite: {speedLimit} km/h</span>
        <span>
          {points.length > 0
            ? new Date(points[points.length - 1].timestamp).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
            : ""}
        </span>
      </div>
    </div>
  );
}
