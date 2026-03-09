"use client";

import { cn } from "@/lib/utils";

interface HeadingIndicatorProps {
  /** Rumbo en grados (0-360, 0=Norte) */
  heading: number;
  /** Tamaño del componente */
  size?: number;
  className?: string;
}

const CARDINAL = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

function headingToCardinal(deg: number): string {
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return CARDINAL[idx];
}

/**
 * Indicador visual de dirección/rumbo del vehículo
 */
export function HeadingIndicator({ heading, size = 28, className }: HeadingIndicatorProps) {
  const normalized = ((heading % 360) + 360) % 360;
  const half = size / 2;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="flex-shrink-0"
      >
        {/* Compass circle */}
        <circle
          cx={half}
          cy={half}
          r={half - 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.2}
        />

        {/* Direction arrow */}
        <g transform={`rotate(${normalized}, ${half}, ${half})`}>
          <polygon
            points={`${half},${3} ${half - 4},${half + 2} ${half},${half - 2} ${half + 4},${half + 2}`}
            fill="#3b82f6"
            opacity={0.9}
          />
        </g>

        {/* North marker */}
        <circle cx={half} cy={3} r={1} fill="#ef4444" opacity={0.6} />
      </svg>

      <span className="text-[10px] font-mono text-muted-foreground">
        {normalized.toFixed(0)}° {headingToCardinal(normalized)}
      </span>
    </div>
  );
}
