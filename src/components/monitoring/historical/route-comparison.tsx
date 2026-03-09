"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { GitCompare, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HistoricalRoutePoint } from "@/types/monitoring";

interface RouteComparisonProps {
  /** Ruta A */
  routeA?: {
    label: string;
    date: string;
    points: HistoricalRoutePoint[];
  };
  /** Ruta B */
  routeB?: {
    label: string;
    date: string;
    points: HistoricalRoutePoint[];
  };
  /** Callback para activar selección de rutas */
  onSelectRoutes?: () => void;
  className?: string;
}

interface RouteStats {
  distanceKm: number;
  durationMin: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  stopCount: number;
  pointCount: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcStats(points: HistoricalRoutePoint[]): RouteStats {
  if (points.length < 2)
    return {
      distanceKm: 0,
      durationMin: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      stopCount: 0,
      pointCount: points.length,
    };

  let totalDist = 0;
  let maxSpeed = 0;
  let stopCount = 0;
  let inStop = false;

  for (let i = 1; i < points.length; i++) {
    totalDist += haversineKm(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
    const speed = points[i].speed ?? 0;
    if (speed > maxSpeed) maxSpeed = speed;
    if (speed < 3 && !inStop) {
      stopCount++;
      inStop = true;
    } else if (speed >= 3) {
      inStop = false;
    }
  }

  const durationMs =
    new Date(points[points.length - 1].timestamp).getTime() -
    new Date(points[0].timestamp).getTime();
  const durationMin = durationMs / 60000;
  const avgSpeed = durationMin > 0 ? (totalDist / durationMin) * 60 : 0;

  return {
    distanceKm: totalDist,
    durationMin,
    avgSpeedKmh: avgSpeed,
    maxSpeedKmh: maxSpeed,
    stopCount,
    pointCount: points.length,
  };
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DiffBadge({ a, b, unit, inverse }: { a: number; b: number; unit: string; inverse?: boolean }) {
  const diff = b - a;
  const pct = a > 0 ? (diff / a) * 100 : 0;
  const better = inverse ? diff < 0 : diff > 0;
  const worse = inverse ? diff > 0 : diff < 0;

  return (
    <span
      className={cn(
        "text-[10px] font-medium",
        better ? "text-emerald-500" : worse ? "text-red-500" : "text-muted-foreground"
      )}
    >
      {diff > 0 ? "+" : ""}
      {diff.toFixed(1)} {unit} ({pct > 0 ? "+" : ""}
      {pct.toFixed(0)}%)
    </span>
  );
}

/**
 * Componente para comparar dos rutas históricas lado a lado
 */
export function RouteComparison({
  routeA,
  routeB,
  onSelectRoutes,
  className,
}: RouteComparisonProps) {
  const statsA = useMemo(() => (routeA ? calcStats(routeA.points) : null), [routeA]);
  const statsB = useMemo(() => (routeB ? calcStats(routeB.points) : null), [routeB]);

  if (!routeA || !routeB || !statsA || !statsB) {
    return (
      <div className={cn("rounded-lg border bg-card p-4 text-center", className)}>
        <GitCompare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          Selecciona dos rutas para comparar
        </p>
        <Button size="sm" variant="outline" onClick={onSelectRoutes}>
          <GitCompare className="h-3.5 w-3.5 mr-1" />
          Seleccionar rutas
        </Button>
      </div>
    );
  }

  const metrics = [
    {
      label: "Distancia",
      a: statsA.distanceKm.toFixed(1),
      b: statsB.distanceKm.toFixed(1),
      unit: "km",
      aNum: statsA.distanceKm,
      bNum: statsB.distanceKm,
      inverse: true,
    },
    {
      label: "Duración",
      a: formatDuration(statsA.durationMin),
      b: formatDuration(statsB.durationMin),
      unit: "min",
      aNum: statsA.durationMin,
      bNum: statsB.durationMin,
      inverse: true,
    },
    {
      label: "Vel. Promedio",
      a: statsA.avgSpeedKmh.toFixed(0),
      b: statsB.avgSpeedKmh.toFixed(0),
      unit: "km/h",
      aNum: statsA.avgSpeedKmh,
      bNum: statsB.avgSpeedKmh,
      inverse: false,
    },
    {
      label: "Vel. Máxima",
      a: statsA.maxSpeedKmh.toFixed(0),
      b: statsB.maxSpeedKmh.toFixed(0),
      unit: "km/h",
      aNum: statsA.maxSpeedKmh,
      bNum: statsB.maxSpeedKmh,
      inverse: true,
    },
    {
      label: "Paradas",
      a: String(statsA.stopCount),
      b: String(statsB.stopCount),
      unit: "",
      aNum: statsA.stopCount,
      bNum: statsB.stopCount,
      inverse: true,
    },
  ];

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Comparar rutas</span>
        </div>
      </div>

      {/* Route labels */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 border-b text-xs">
        <div>
          <Badge variant="outline" className="border-blue-500 text-blue-500 text-[10px]">
            A
          </Badge>
          <span className="ml-1.5 font-medium">{routeA.label}</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">{routeA.date}</p>
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className="text-right">
          <Badge variant="outline" className="border-emerald-500 text-emerald-500 text-[10px]">
            B
          </Badge>
          <span className="ml-1.5 font-medium">{routeB.label}</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">{routeB.date}</p>
        </div>
      </div>

      {/* Metric rows */}
      <div className="divide-y">
        {metrics.map((m) => (
          <div key={m.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 text-xs">
            <span className="font-mono">{m.a}</span>
            <span className="text-muted-foreground font-medium px-3">{m.label}</span>
            <div className="text-right">
              <span className="font-mono">{m.b}</span>
              <div>
                <DiffBadge a={m.aNum} b={m.bNum} unit={m.unit} inverse={m.inverse} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
