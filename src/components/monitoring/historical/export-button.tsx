"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Download, FileJson, FileSpreadsheet, FileCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HistoricalRoute, RouteExportFormat } from "@/types/monitoring";

interface ExportButtonProps {
  /** Ruta a exportar */
  route: HistoricalRoute | null;
  /** Callback para exportar */
  onExport: (format: RouteExportFormat) => Promise<void>;
  /** Clase adicional */
  className?: string;
}

const EXPORT_FORMATS: Array<{
  format: RouteExportFormat;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    format: "csv",
    label: "CSV",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    description: "Hoja de cálculo",
  },
  {
    format: "json",
    label: "JSON",
    icon: <FileJson className="h-4 w-4" />,
    description: "Datos estructurados",
  },
  {
    format: "gpx",
    label: "GPX",
    icon: <FileCode className="h-4 w-4" />,
    description: "GPS Exchange",
  },
];

/**
 * Botón de exportar con dropdown de formatos
 */
export function ExportButton({
  route,
  onExport,
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<RouteExportFormat | null>(null);

  const handleExport = async (format: RouteExportFormat) => {
    setIsExporting(true);
    setExportingFormat(format);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!route || isExporting}
          className={cn("gap-2", className)}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {EXPORT_FORMATS.map(({ format, label, icon, description }) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format)}
            disabled={isExporting}
            className="flex items-center gap-3"
          >
            {exportingFormat === format ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              icon
            )}
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
