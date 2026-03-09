'use client';

import { memo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { schedulingService } from '@/services/scheduling-service';
import { cn } from '@/lib/utils';

interface SchedulingExportProps {
  /** Órdenes a exportar */
  orders: Order[];
  /** Nombre de la vista actual */
  viewName?: string;
  /** Clase adicional */
  className?: string;
}

type ExportFormat = 'csv' | 'excel';

// COMPONENTE PRINCIPAL

export const SchedulingExport = memo(function SchedulingExport({
  orders,
  viewName = 'programación',
  className,
}: Readonly<SchedulingExportProps>) {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setLastExport(null);

    try {
      // Simular un pequeño delay para la UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const csvContent = schedulingService.generateScheduleCSV(orders);

      if (format === 'csv') {
        downloadFile(csvContent, `programacion-${getDateStamp()}.csv`, 'text/csv');
      } else {
        // Para Excel, usamos CSV con BOM para compatibilidad
        const bom = '\uFEFF';
        downloadFile(
          bom + csvContent,
          `programacion-${getDateStamp()}.csv`,
          'text/csv;charset=utf-8'
        );
      }

      setLastExport(format);
      setTimeout(() => setLastExport(null), 3000);
    } catch (error) {
      console.error('Error al exportar:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 px-3 text-xs gap-1.5', className)}
          disabled={isExporting || orders.length === 0}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : lastExport ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">
          Exportar {viewName} ({orders.length} órdenes)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-xs gap-2 cursor-pointer"
          onClick={() => handleExport('csv')}
        >
          <FileText className="h-3.5 w-3.5" />
          Exportar como CSV
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-xs gap-2 cursor-pointer"
          onClick={() => handleExport('excel')}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Exportar para Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// UTILIDADES

function getDateStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
