"use client";

import { cn } from "@/lib/utils";
import { Plus, Grid2X2, Grid3X3, LayoutGrid, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// Select components removed - using button-based layout selector instead
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MultiWindowGridConfig } from "@/types/monitoring";

interface GridControlsProps {
  /** Cantidad de paneles activos */
  panelCount: number;
  /** Máximo de paneles permitidos */
  maxPanels: number;
  /** Configuración actual del grid */
  gridConfig: MultiWindowGridConfig;
  /** Callback para agregar vehículos */
  onAddVehicles: () => void;
  /** Callback para cambiar layout */
  onLayoutChange: (layout: MultiWindowGridConfig["layout"]) => void;
  /** Callback para limpiar todos */
  onClearAll: () => void;
  /** Clase adicional */
  className?: string;
}

/**
 * Controles para el grid de multiventana
 */
export function GridControls({
  panelCount,
  maxPanels,
  gridConfig,
  onAddVehicles,
  onLayoutChange,
  onClearAll,
  className,
}: GridControlsProps) {
  const canAddMore = panelCount < maxPanels;
  const remainingSlots = maxPanels - panelCount;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {/* Info y botón agregar */}
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="font-medium">{panelCount}</span>
          <span className="text-muted-foreground"> de {maxPanels} unidades</span>
        </div>

        <Button
          onClick={onAddVehicles}
          disabled={!canAddMore}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar unidad
          {canAddMore && (
            <span className="ml-1 text-xs opacity-70">
              ({remainingSlots} disponible{remainingSlots !== 1 ? "s" : ""})
            </span>
          )}
        </Button>
      </div>

      {/* Controles de layout */}
      <div className="flex items-center gap-2">
        {/* Selector de layout */}
        <TooltipProvider>
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridConfig.layout === "2x2" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onLayoutChange("2x2")}
                >
                  <Grid2X2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>2x2 (4 paneles)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridConfig.layout === "3x3" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onLayoutChange("3x3")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>3x3 (9 paneles)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridConfig.layout === "4x4" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onLayoutChange("4x4")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>4x4 (16 paneles)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridConfig.layout === "auto" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onLayoutChange("auto")}
                >
                  <span className="text-xs font-medium">Auto</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajuste automático</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Botón limpiar */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={onClearAll}
                disabled={panelCount === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Quitar todos</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
