"use client";

import { cn } from "@/lib/utils";

interface SpeedSparklineProps {
  /** Historial de velocidades (últimas N lecturas) */
  speeds: number[];
  /** Alto del SVG */
  height?: number;
  /** Ancho del SVG */
  width?: number;
  /** Límite de velocidad para resaltar */
  speedLimit?: number;
  className?: string;
}

/**
 * Mini gráfico sparkline de velocidad para paneles multiventana
 */
export function SpeedSparkline({
  speeds,
  height = 24,
  width = 80,
  speedLimit,
  className,
}: SpeedSparklineProps) {
  if (speeds.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ width, height }}
      >
        <span className="text-[8px] text-muted-foreground">—</span>
      </div>
    );
  }

  const maxSpeed = Math.max(...speeds, speedLimit ?? 0, 10);
  const padding = 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = speeds.map((speed, i) => {
    const x = padding + (i / (speeds.length - 1)) * innerW;
    const y = padding + innerH - (speed / maxSpeed) * innerH;
    return { x, y, speed };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Fill path (area under curve)
  const fillD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${height - padding} L${padding},${height - padding} Z`;

  const currentSpeed = speeds[speeds.length - 1];
  const isOverSpeed = speedLimit ? currentSpeed > speedLimit : false;
  const strokeColor = isOverSpeed ? "#ef4444" : "#3b82f6";
  const fillColor = isOverSpeed ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)";

  return (
    <svg
      width={width}
      height={height}
      className={cn("flex-shrink-0", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Area fill */}
      <path d={fillD} fill={fillColor} />

      {/* Speed limit line */}
      {speedLimit && speedLimit < maxSpeed && (
        <line
          x1={padding}
          y1={padding + innerH - (speedLimit / maxSpeed) * innerH}
          x2={width - padding}
          y2={padding + innerH - (speedLimit / maxSpeed) * innerH}
          stroke="#ef4444"
          strokeWidth={0.5}
          strokeDasharray="2,2"
          opacity={0.5}
        />
      )}

      {/* Line */}
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Current point */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={strokeColor}
      />
    </svg>
  );
}
