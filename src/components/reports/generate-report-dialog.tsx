"use client";

import { useState } from "react";
import {
  Play,
  FileText,
  Calendar,
  Filter,
  Download,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ReportDefinition, ExportFormat } from "@/types/report";

// Tipo local para rango de fechas
type DateRangeType = 
  | "today" 
  | "yesterday" 
  | "this_week" 
  | "last_week" 
  | "this_month" 
  | "last_month" 
  | "this_quarter" 
  | "last_quarter" 
  | "this_year" 
  | "last_year" 
  | "custom";

interface GenerateReportDialogProps {
  trigger?: React.ReactNode;
  definition?: ReportDefinition;
  onGenerate?: (params: GenerateReportParams) => void;
  isGenerating?: boolean;
}

interface GenerateReportParams {
  definitionId: string;
  format: ExportFormat;
  dateRangeType: DateRangeType;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, unknown>;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

const dateRangeTypes: { value: DateRangeType; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "this_week", label: "Esta Semana" },
  { value: "last_week", label: "Semana Pasada" },
  { value: "this_month", label: "Este Mes" },
  { value: "last_month", label: "Mes Pasado" },
  { value: "this_quarter", label: "Este Trimestre" },
  { value: "last_quarter", label: "Trimestre Pasado" },
  { value: "this_year", label: "Este Año" },
  { value: "last_year", label: "Año Pasado" },
  { value: "custom", label: "Personalizado" },
];

const formats: { value: ExportFormat; label: string; icon: string }[] = [
  { value: "pdf", label: "PDF", icon: "📄" },
  { value: "excel", label: "Excel", icon: "📊" },
  { value: "csv", label: "CSV", icon: "📑" },
  { value: "json", label: "JSON", icon: "📋" },
  { value: "html", label: "HTML", icon: "🌐" },
];

export function GenerateReportDialog({
  trigger,
  definition,
  onGenerate,
  isGenerating = false,
}: GenerateReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("excel");
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>("this_month");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);

  const handleGenerate = () => {
    if (!definition) return;

    const params: GenerateReportParams = {
      definitionId: definition.id,
      format: selectedFormat,
      dateRangeType,
      includeCharts,
      includeSummary,
    };

    if (dateRangeType === "custom" && startDate && endDate) {
      params.dateRange = { startDate, endDate };
    }

    onGenerate?.(params);
  };

  // Formatos disponibles por defecto
  const availableFormats: ExportFormat[] = ["excel", "pdf", "csv", "json", "html"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Generar Reporte
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Reporte
          </DialogTitle>
          <DialogDescription>
            {definition ? (
              <>Configurar parámetros para: <strong>{definition.name}</strong></>
            ) : (
              "Selecciona el formato y período del reporte"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Formato de salida */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Formato de Salida
            </Label>
            <RadioGroup
              value={selectedFormat}
              onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
              className="grid grid-cols-5 gap-2"
            >
              {formats.map((fmt) => {
                const isAvailable = availableFormats.includes(fmt.value);
                return (
                  <Label
                    key={fmt.value}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors",
                      selectedFormat === fmt.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                      !isAvailable && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <RadioGroupItem
                      value={fmt.value}
                      disabled={!isAvailable}
                      className="sr-only"
                    />
                    <span className="text-lg">{fmt.icon}</span>
                    <span className="text-xs font-medium">{fmt.label}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <Separator />

          {/* Período */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período del Reporte
            </Label>
            <Select
              value={dateRangeType}
              onValueChange={(value) => setDateRangeType(value as DateRangeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Rango personalizado */}
            {dateRangeType === "custom" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm">Desde</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate
                          ? format(startDate, "PP", { locale: es })
                          : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Hasta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate
                          ? format(endDate, "PP", { locale: es })
                          : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={es}
                        disabled={(date) =>
                          startDate ? date < startDate : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Opciones adicionales */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Opciones Adicionales
            </Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                />
                <Label htmlFor="includeCharts" className="text-sm font-normal">
                  Incluir gráficos (solo PDF y Excel)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSummary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(!!checked)}
                />
                <Label htmlFor="includeSummary" className="text-sm font-normal">
                  Incluir resumen ejecutivo
                </Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {definition && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="secondary">{definition.type}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Columnas:</span>
                <span>{definition.columns?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Categoría:</span>
                <Badge variant="outline">{definition.category}</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              (dateRangeType === "custom" && (!startDate || !endDate))
            }
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generar Reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
