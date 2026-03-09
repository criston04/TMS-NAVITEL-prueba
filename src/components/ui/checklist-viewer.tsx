"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  ClipboardCheck,
  Camera,
  MessageSquare,
} from "lucide-react";


/**
 * Estado de un ítem del checklist
 */
export type ChecklistItemStatus = 
  | "pending"    // No revisado
  | "passed"     // Aprobado
  | "failed"     // Rechazado
  | "na";        // No aplica

/**
 * Ítem individual del checklist
 */
export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  status: ChecklistItemStatus;
  notes?: string;
  photoUrl?: string;
  isRequired: boolean;
  order: number;
}

/**
 * Categoría/Sección del checklist
 */
export interface ChecklistCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  items: ChecklistItem[];
  order: number;
}

/**
 * Checklist completo
 */
export interface Checklist {
  id: string;
  name: string;
  description?: string;
  type: "vehicle_inspection" | "driver_inspection" | "pre_trip" | "post_trip" | "custom";
  categories: ChecklistCategory[];
  createdAt?: string;
  completedAt?: string;
  completedBy?: string;
}

/**
 * Props del componente
 */
export interface ChecklistViewerProps {
  /** Checklist a mostrar/editar */
  checklist: Checklist;
  /** Modo de visualización */
  mode?: "view" | "edit";
  /** Callback cuando cambia un ítem */
  onItemChange?: (categoryId: string, itemId: string, updates: Partial<ChecklistItem>) => void;
  /** Callback cuando se completa el checklist */
  onComplete?: (checklist: Checklist) => void;
  /** Callback cuando se guarda */
  onSave?: (checklist: Checklist) => void;
  /** Mostrar progreso */
  showProgress?: boolean;
  /** Mostrar estadísticas */
  showStats?: boolean;
  /** Permitir agregar notas */
  allowNotes?: boolean;
  /** Permitir agregar fotos */
  allowPhotos?: boolean;
  /** Clase CSS adicional */
  className?: string;
}


const STATUS_CONFIG: Record<ChecklistItemStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: {
    label: "Pendiente",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: () => <span className="w-4 h-4 rounded-full border-2 border-gray-300" />,
  },
  passed: {
    label: "Aprobado",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle,
  },
  failed: {
    label: "Rechazado",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: XCircle,
  },
  na: {
    label: "N/A",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    icon: AlertTriangle,
  },
};


interface ChecklistItemRowProps {
  item: ChecklistItem;
  categoryId: string;
  mode: "view" | "edit";
  allowNotes: boolean;
  allowPhotos: boolean;
  onChange?: (updates: Partial<ChecklistItem>) => void;
}

function ChecklistItemRow({
  item,
  categoryId: _categoryId,
  mode,
  allowNotes,
  allowPhotos,
  onChange,
}: ChecklistItemRowProps) {
  const [showNotes, setShowNotes] = React.useState(!!item.notes);
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;

  const handleStatusChange = (status: ChecklistItemStatus) => {
    if (mode === "edit" && onChange) {
      onChange({ status });
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-3">
        {/* Status indicator / Toggle */}
        <div className="shrink-0 pt-0.5">
          {mode === "view" ? (
            <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
          ) : (
            <Select
              value={item.status}
              onValueChange={(value) => handleStatusChange(value as ChecklistItemStatus)}
            >
              <SelectTrigger className="w-30 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Item content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-medium",
              item.status === "failed" && "text-red-700"
            )}>
              {item.label}
              {item.isRequired && <span className="text-red-500 ml-1">*</span>}
            </p>
            {mode === "view" && item.status !== "pending" && (
              <Badge
                variant="outline"
                className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.description}
            </p>
          )}
        </div>

        {/* Actions */}
        {mode === "edit" && (
          <div className="flex items-center gap-1">
            {allowNotes && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", showNotes && "bg-muted")}
                onClick={() => setShowNotes(!showNotes)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            {allowPhotos && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Notes section */}
      {(showNotes || item.notes) && (
        <div className="ml-8">
          {mode === "edit" ? (
            <Textarea
              placeholder="Agregar observaciones..."
              value={item.notes || ""}
              onChange={(e) => onChange?.({ notes: e.target.value })}
              className="text-sm min-h-15"
            />
          ) : item.notes ? (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {item.notes}
            </p>
          ) : null}
        </div>
      )}

      {/* Photo preview */}
      {item.photoUrl && (
        <div className="ml-8 relative h-20 w-20">
          <Image
            src={item.photoUrl}
            alt="Evidencia"
            fill
            className="object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
}


export function ChecklistViewer({
  checklist,
  mode = "view",
  onItemChange,
  onComplete,
  onSave,
  showProgress = true,
  showStats = true,
  allowNotes = true,
  allowPhotos = true,
  className,
}: ChecklistViewerProps) {
  const [localChecklist, setLocalChecklist] = React.useState<Checklist>(checklist);
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>(
    checklist.categories.map((c) => c.id)
  );

  // Sincronizar con prop
  React.useEffect(() => {
    setLocalChecklist(checklist);
  }, [checklist]);

  // Calcular estadísticas
  const stats = React.useMemo(() => {
    const allItems = localChecklist.categories.flatMap((c) => c.items);
    const total = allItems.length;
    const passed = allItems.filter((i) => i.status === "passed").length;
    const failed = allItems.filter((i) => i.status === "failed").length;
    const pending = allItems.filter((i) => i.status === "pending").length;
    const na = allItems.filter((i) => i.status === "na").length;
    const required = allItems.filter((i) => i.isRequired);
    const requiredPending = required.filter((i) => i.status === "pending").length;
    const completed = total - pending;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const canComplete = requiredPending === 0;

    return { total, passed, failed, pending, na, completed, progress, canComplete };
  }, [localChecklist]);

  const handleItemChange = (
    categoryId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    setLocalChecklist((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : cat
      ),
    }));

    if (onItemChange) {
      onItemChange(categoryId, itemId, updates);
    }
  };

  const handleComplete = () => {
    const completedChecklist: Checklist = {
      ...localChecklist,
      completedAt: new Date().toISOString(),
    };
    if (onComplete) {
      onComplete(completedChecklist);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(localChecklist);
    }
  };

  const handleReset = () => {
    setLocalChecklist({
      ...checklist,
      categories: checklist.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({
          ...item,
          status: "pending" as const,
          notes: undefined,
        })),
      })),
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {localChecklist.name}
          </h3>
          {localChecklist.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {localChecklist.description}
            </p>
          )}
        </div>
        {mode === "edit" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reiniciar
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        )}
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progreso: {stats.completed} de {stats.total}</span>
            <span className="font-medium">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>
      )}

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-center">
            <p className="text-lg font-bold text-green-700">{stats.passed}</p>
            <p className="text-xs text-green-600">Aprobados</p>
          </div>
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
            <p className="text-lg font-bold text-red-700">{stats.failed}</p>
            <p className="text-xs text-red-600">Rechazados</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-center">
            <p className="text-lg font-bold text-gray-700">{stats.pending}</p>
            <p className="text-xs text-gray-600">Pendientes</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="text-lg font-bold text-amber-700">{stats.na}</p>
            <p className="text-xs text-amber-600">N/A</p>
          </div>
        </div>
      )}

      {/* Categories */}
      <Accordion
        type="multiple"
        value={expandedCategories}
        onValueChange={setExpandedCategories}
        className="space-y-2"
      >
        {localChecklist.categories
          .sort((a, b) => a.order - b.order)
          .map((category) => {
            const categoryItems = category.items;
            const categoryPassed = categoryItems.filter((i) => i.status === "passed").length;
            const categoryFailed = categoryItems.filter((i) => i.status === "failed").length;
            const categoryTotal = categoryItems.length;

            return (
              <AccordionItem
                key={category.id}
                value={category.id}
                className="border rounded-lg"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      {category.description && (
                        <span className="text-xs text-muted-foreground">
                          ({category.description})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {categoryFailed > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {categoryFailed} rechazados
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {categoryPassed}/{categoryTotal}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {categoryItems
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <ChecklistItemRow
                          key={item.id}
                          item={item}
                          categoryId={category.id}
                          mode={mode}
                          allowNotes={allowNotes}
                          allowPhotos={allowPhotos}
                          onChange={(updates) =>
                            handleItemChange(category.id, item.id, updates)
                          }
                        />
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
      </Accordion>

      {/* Complete button */}
      {mode === "edit" && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleComplete}
            disabled={!stats.canComplete}
            className="min-w-50"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Completar Inspección
          </Button>
        </div>
      )}

      {!stats.canComplete && mode === "edit" && (
        <p className="text-sm text-amber-600 text-center">
          Complete todos los ítems requeridos (*) antes de finalizar
        </p>
      )}

      {/* Completed info */}
      {localChecklist.completedAt && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Inspección completada</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            {new Date(localChecklist.completedAt).toLocaleString("es-PE")}
            {localChecklist.completedBy && ` por ${localChecklist.completedBy}`}
          </p>
        </div>
      )}
    </div>
  );
}


/**
 * Checklist de inspección pre-viaje para vehículos de carga
 */
export const PRE_TRIP_VEHICLE_CHECKLIST: Omit<Checklist, "id" | "createdAt"> = {
  name: "Inspección Pre-Viaje",
  description: "Checklist de inspección antes de iniciar el viaje",
  type: "pre_trip",
  categories: [
    {
      id: "exterior",
      name: "Exterior del Vehículo",
      order: 1,
      items: [
        { id: "ext-1", label: "Luces delanteras funcionando", status: "pending", isRequired: true, order: 1 },
        { id: "ext-2", label: "Luces traseras funcionando", status: "pending", isRequired: true, order: 2 },
        { id: "ext-3", label: "Luces direccionales funcionando", status: "pending", isRequired: true, order: 3 },
        { id: "ext-4", label: "Estado de neumáticos (desgaste, presión)", status: "pending", isRequired: true, order: 4 },
        { id: "ext-5", label: "Espejos retrovisores en buen estado", status: "pending", isRequired: true, order: 5 },
        { id: "ext-6", label: "Parabrisas sin rajaduras", status: "pending", isRequired: true, order: 6 },
        { id: "ext-7", label: "Limpiaparabrisas funcionando", status: "pending", isRequired: true, order: 7 },
        { id: "ext-8", label: "Placas visibles y legibles", status: "pending", isRequired: true, order: 8 },
      ],
    },
    {
      id: "interior",
      name: "Interior del Vehículo",
      order: 2,
      items: [
        { id: "int-1", label: "Cinturón de seguridad funcionando", status: "pending", isRequired: true, order: 1 },
        { id: "int-2", label: "Freno de mano funcionando", status: "pending", isRequired: true, order: 2 },
        { id: "int-3", label: "Panel de instrumentos sin alertas", status: "pending", isRequired: true, order: 3 },
        { id: "int-4", label: "Bocina funcionando", status: "pending", isRequired: true, order: 4 },
        { id: "int-5", label: "Aire acondicionado/calefacción", status: "pending", isRequired: false, order: 5 },
        { id: "int-6", label: "Radio/comunicación funcionando", status: "pending", isRequired: false, order: 6 },
      ],
    },
    {
      id: "fluids",
      name: "Niveles de Fluidos",
      order: 3,
      items: [
        { id: "flu-1", label: "Nivel de combustible adecuado", status: "pending", isRequired: true, order: 1 },
        { id: "flu-2", label: "Nivel de aceite de motor", status: "pending", isRequired: true, order: 2 },
        { id: "flu-3", label: "Nivel de líquido refrigerante", status: "pending", isRequired: true, order: 3 },
        { id: "flu-4", label: "Nivel de líquido de frenos", status: "pending", isRequired: true, order: 4 },
        { id: "flu-5", label: "Nivel de líquido limpiaparabrisas", status: "pending", isRequired: false, order: 5 },
      ],
    },
    {
      id: "documents",
      name: "Documentación",
      order: 4,
      items: [
        { id: "doc-1", label: "Licencia de conducir vigente", status: "pending", isRequired: true, order: 1 },
        { id: "doc-2", label: "Tarjeta de propiedad", status: "pending", isRequired: true, order: 2 },
        { id: "doc-3", label: "SOAT vigente", status: "pending", isRequired: true, order: 3 },
        { id: "doc-4", label: "Revisión técnica vigente", status: "pending", isRequired: true, order: 4 },
        { id: "doc-5", label: "Certificado de operación MTC", status: "pending", isRequired: true, order: 5 },
        { id: "doc-6", label: "Guía de remisión", status: "pending", isRequired: true, order: 6 },
      ],
    },
    {
      id: "safety",
      name: "Equipamiento de Seguridad",
      order: 5,
      items: [
        { id: "saf-1", label: "Extintor vigente y accesible", status: "pending", isRequired: true, order: 1 },
        { id: "saf-2", label: "Triángulos de seguridad", status: "pending", isRequired: true, order: 2 },
        { id: "saf-3", label: "Botiquín de primeros auxilios", status: "pending", isRequired: true, order: 3 },
        { id: "saf-4", label: "Conos de seguridad", status: "pending", isRequired: false, order: 4 },
        { id: "saf-5", label: "Chaleco reflectivo", status: "pending", isRequired: true, order: 5 },
        { id: "saf-6", label: "Llanta de repuesto y herramientas", status: "pending", isRequired: true, order: 6 },
      ],
    },
  ],
};

export default ChecklistViewer;
