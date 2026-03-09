"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Mountain } from "lucide-react";
import type { HistoricalRoutePoint } from "@/types/monitoring";

interface AltitudeChartProps {
  points: HistoricalRoutePoint[];
  currentIndex?: number;
  className?: string;
}

/**
 * Gráfico SVG de perfil de altitud del recorrido
 */
export function AltitudeChart({ points, currentIndex, className }: AltitudeChartProps) {
  const chartData = useMemo(() => {
    const withAlt = points.filter((p) => p.altitude !== undefined);
    if (withAlt.length < 2) return null;

    const step = Math.max(1, Math.floor(withAlt.length / 200));
    const sampled = withAlt.filter((_, i) => i % step === 0 || i === withAlt.length - 1);

    const altitudes = sampled.map((p) => p.altitude!);
    const minAlt = Math.min(...altitudes);
    const maxAlt = Math.max(...altitudes);
    const range = maxAlt - minAlt || 1;

    const width = 100;
    const height = 100;

    const getX = (i: number) => (i / (sampled.length - 1)) * width;
    const getY = (alt: number) => height - ((alt - minAlt) / range) * height * 0.9 - 5;

    const pathParts = sampled.map((p, i) => {
      const x = getX(i);
      const y = getY(p.altitude!);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    const areaParts = [
      ...pathParts,
      `L ${width} ${height}`,
      `L 0 ${height}`,
      "Z",
    ];

    return {
      path: pathParts.join(" "),
      areaPath: areaParts.join(" "),
      minAlt,
      maxAlt,
      avgAlt: altitudes.reduce((a, b) => a + b, 0) / altitudes.length,
      totalClimb: altitudes.reduce((acc, alt, i) => {
        if (i === 0) return 0;
        const diff = alt - altitudes[i - 1];
        return acc + (diff > 0 ? diff : 0);
      }, 0),
    };
  }, [points]);

  const currentX = useMemo(() => {
    if (currentIndex === undefined || points.length === 0) return null;
    return (currentIndex / (points.length - 1)) * 100;
  }, [currentIndex, points.length]);

  if (!chartData) {
    return (
      <div className={cn("rounded-lg border bg-card p-4 text-center", className)}>
        <Mountain className="h-6 w-6 text-muted-foreground/40 mx-auto" />
        <p className="mt-1 text-xs text-muted-foreground">Datos de altitud no disponibles</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Perfil de altitud</span>
        </div>
        <span className="text-xs text-muted-foreground">
          ↑ {chartData.totalClimb.toFixed(0)} m desnivel
        </span>
      </div>

      <div className="relative h-28">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <path d={chartData.areaPath} fill="url(#altGradient)" />
          <path d={chartData.path} fill="none" stroke="#8b5cf6" strokeWidth={0.5} />
          {currentX !== null && (
            <line x1={currentX} y1={0} x2={currentX} y2={100} stroke="#06b6d4" strokeWidth={0.4} />
          )}
        </svg>
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] text-muted-foreground -ml-1">
          <span>{chartData.maxAlt.toFixed(0)} m</span>
          <span>{chartData.minAlt.toFixed(0)} m</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
        <span>Inicio</span>
        <span>Prom: {chartData.avgAlt.toFixed(0)} m</span>
        <span>Fin</span>
      </div>
    </div>
  );
}
