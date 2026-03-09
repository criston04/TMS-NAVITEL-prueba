"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Eye, EyeOff, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
/** Item individual de configuración de campo visible en panel */
export interface PanelFieldItem {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

interface PanelFieldConfigMenuProps {
  /** Campos disponibles */
  fields: PanelFieldItem[];
  /** Callback al cambiar visibilidad */
  onToggleField: (fieldId: string) => void;
  className?: string;
}

const DEFAULT_FIELDS: PanelFieldItem[] = [
  { id: "speed", label: "Velocidad", visible: true, order: 0 },
  { id: "sparkline", label: "Sparkline velocidad", visible: true, order: 1 },
  { id: "heading", label: "Rumbo", visible: true, order: 2 },
  { id: "eta", label: "ETA destino", visible: true, order: 3 },
  { id: "driver", label: "Conductor", visible: true, order: 4 },
  { id: "plate", label: "Placa", visible: true, order: 5 },
  { id: "status", label: "Estado", visible: true, order: 6 },
  { id: "lastUpdate", label: "Última actualización", visible: false, order: 7 },
  { id: "fuel", label: "Combustible", visible: false, order: 8 },
  { id: "odometer", label: "Odómetro", visible: false, order: 9 },
];

/**
 * Menú de configuración de campos visibles en paneles multiventana
 */
export function PanelFieldConfigMenu({
  fields,
  onToggleField,
  className,
}: PanelFieldConfigMenuProps) {
  const [open, setOpen] = useState(false);
  const visibleCount = fields.filter((f) => f.visible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-6 w-6 p-0", className)}
          title="Configurar campos"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 z-[10001]" align="end">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Campos visibles ({visibleCount})
        </div>
        <div className="space-y-0.5">
          {fields.map((field) => (
            <button
              key={field.id}
              className={cn(
                "w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                field.visible && "font-medium"
              )}
              onClick={() => onToggleField(field.id)}
            >
              {field.visible ? (
                <Eye className="h-3 w-3 text-primary" />
              ) : (
                <EyeOff className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={cn(!field.visible && "text-muted-foreground")}>
                {field.label}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DEFAULT_FIELDS };
