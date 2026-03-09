"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  BarChart3,
  Table as TableIcon,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { ReportType, ExportFormat, ReportColumn } from "@/types/report";

// Tipo local para categoría de reporte
type ReportCategory = "summary" | "detail" | "analysis" | "comparison" | "trend" | "audit";

interface CreateReportDialogProps {
  trigger?: React.ReactNode;
  onCreate?: (data: CreateReportData) => void;
}

interface CreateReportData {
  code: string;
  name: string;
  description?: string;
  type: ReportType;
  category: ReportCategory;
  formats: ExportFormat[];
  columns: ReportColumn[];
}

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "operational", label: "Operacional" },
  { value: "financial", label: "Financiero" },
  { value: "fleet", label: "Flota" },
  { value: "driver", label: "Conductores" },
  { value: "customer", label: "Clientes" },
  { value: "order", label: "Órdenes" },
  { value: "route", label: "Rutas" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "fuel", label: "Combustible" },
  { value: "incident", label: "Incidentes" },
  { value: "compliance", label: "Cumplimiento" },
  { value: "kpi", label: "KPIs" },
  { value: "custom", label: "Personalizado" },
];

const reportCategories: { value: ReportCategory; label: string }[] = [
  { value: "summary", label: "Resumen" },
  { value: "detail", label: "Detalle" },
  { value: "analysis", label: "Análisis" },
  { value: "comparison", label: "Comparativo" },
  { value: "trend", label: "Tendencia" },
  { value: "audit", label: "Auditoría" },
];

const formats: { value: ExportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
];

const columnFormats = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "datetime", label: "Fecha y Hora" },
  { value: "boolean", label: "Booleano" },
  { value: "currency", label: "Moneda" },
  { value: "percentage", label: "Porcentaje" },
];

export function CreateReportDialog({ trigger, onCreate }: CreateReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateReportData>({
    code: "",
    name: "",
    description: "",
    type: "custom",
    category: "detail",
    formats: ["excel", "pdf"],
    columns: [],
  });
  const [newColumn, setNewColumn] = useState<Partial<ReportColumn>>({
    field: "",
    header: "",
    format: "text",
    isVisible: true,
    sortable: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate?.(formData);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      type: "custom",
      category: "detail",
      formats: ["excel", "pdf"],
      columns: [],
    });
    setNewColumn({
      field: "",
      header: "",
      format: "text",
      isVisible: true,
      sortable: true,
    });
  };

  const toggleFormat = (format: ExportFormat) => {
    setFormData((prev) => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter((f) => f !== format)
        : [...prev.formats, format],
    }));
  };

  const addColumn = () => {
    if (newColumn.field && newColumn.header) {
      const columnToAdd: ReportColumn = {
        id: `col-${Date.now()}`,
        field: newColumn.field,
        header: newColumn.header,
        format: newColumn.format || "text",
        isVisible: newColumn.isVisible ?? true,
        sortable: newColumn.sortable ?? true,
      };
      setFormData((prev) => ({
        ...prev,
        columns: [...prev.columns, columnToAdd],
      }));
      setNewColumn({
        field: "",
        header: "",
        format: "text",
        isVisible: true,
        sortable: true,
      });
    }
  };

  const removeColumn = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Reporte
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Definición de Reporte
          </DialogTitle>
          <DialogDescription>
            Define la estructura y configuración de un nuevo tipo de reporte
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Información Básica
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="RPT-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Reporte de Entregas"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe el propósito del reporte..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ReportType) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ReportCategory) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Formatos disponibles */}
          <div className="space-y-4">
            <Label>Formatos Disponibles</Label>
            <div className="flex flex-wrap gap-2">
              {formats.map((format) => (
                <Badge
                  key={format.value}
                  variant={formData.formats.includes(format.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFormat(format.value)}
                >
                  {format.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Columnas */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Columnas del Reporte
            </h4>

            {/* Lista de columnas */}
            {formData.columns.length > 0 && (
              <div className="border rounded-lg divide-y">
                {formData.columns.map((col, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{col.header}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {col.field}
                        </p>
                      </div>
                      <Badge variant="secondary">{col.format}</Badge>
                      {col.sortable && (
                        <Badge variant="outline">Ordenable</Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeColumn(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar columna */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <Label className="text-sm text-muted-foreground">
                Agregar nueva columna
              </Label>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Campo (field)"
                  value={newColumn.field}
                  onChange={(e) =>
                    setNewColumn((prev) => ({ ...prev, field: e.target.value }))
                  }
                />
                <Input
                  placeholder="Encabezado"
                  value={newColumn.header}
                  onChange={(e) =>
                    setNewColumn((prev) => ({ ...prev, header: e.target.value }))
                  }
                />
                <Select
                  value={newColumn.format}
                  onValueChange={(value) =>
                    setNewColumn((prev) => ({ ...prev, format: value as ReportColumn["format"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnFormats.map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addColumn} disabled={!newColumn.field || !newColumn.header}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sortable"
                  checked={newColumn.sortable}
                  onCheckedChange={(checked) =>
                    setNewColumn((prev) => ({ ...prev, sortable: !!checked }))
                  }
                />
                <Label htmlFor="sortable" className="text-sm">
                  Permitir ordenar por esta columna
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!formData.code || !formData.name || formData.formats.length === 0}
            >
              Crear Definición
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
