"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  X, 
  Bell, 
  BellOff,
  Warehouse,
  User,
  Factory,
  Anchor,
  Shield,
  AlertTriangle,
  Package,
  MapPin,
  Clock,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  GeofenceCategory, 
  GeofenceAlerts,
  GeofenceAddress 
} from "@/types/models/geofence";
import { geofenceCategories, geofenceColors } from "@/mocks/master/geofences.mock";

/**
 * Iconos por categoría
 */
const CATEGORY_ICONS: Record<GeofenceCategory, React.ElementType> = {
  warehouse: Warehouse,
  customer: User,
  plant: Factory,
  port: Anchor,
  checkpoint: Shield,
  restricted: AlertTriangle,
  delivery: Package,
  other: MapPin,
};

/**
 * Datos del formulario
 */
export interface GeofenceFormData {
  name: string;
  description: string;
  tags: string;
  color: string;
  category: GeofenceCategory;
  alerts: GeofenceAlerts;
  customerId?: string;
  structuredAddress?: GeofenceAddress;
}

/**
 * Props del componente
 */
interface GeofenceFormProps {
  formData: GeofenceFormData;
  onFormDataChange: (data: Partial<GeofenceFormData>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing?: boolean;
  showAreaInfo?: boolean;
  area?: number;
  perimeter?: number;
}

/**
 * Formatea un número como área
 */
const formatArea = (area: number): string => {
  if (area >= 1000000) {
    return `${(area / 1000000).toFixed(2)} km²`;
  }
  return `${area.toFixed(0)} m²`;
};

/**
 * Formatea un número como perímetro
 */
const formatPerimeter = (perimeter: number): string => {
  if (perimeter >= 1000) {
    return `${(perimeter / 1000).toFixed(2)} km`;
  }
  return `${perimeter.toFixed(0)} m`;
};

/**
 * Formulario completo de geocerca
 */
export default function GeofenceForm({
  formData,
  onFormDataChange,
  onSave,
  onCancel,
  isEditing = false,
  showAreaInfo = false,
  area = 0,
  perimeter = 0,
}: GeofenceFormProps) {
  const [showAdvancedAlerts, setShowAdvancedAlerts] = useState(false);
  
  // Valores por defecto para alerts si no existen
  const alerts: GeofenceAlerts = formData.alerts ?? {
    onEntry: false,
    onExit: false,
    onDwell: false,
  };
  
  // Handler para cambios en alertas
  const handleAlertChange = useCallback((key: keyof GeofenceAlerts, value: boolean | number | string[]) => {
    onFormDataChange({
      alerts: {
        ...alerts,
        [key]: value,
      },
    });
  }, [alerts, onFormDataChange]);
  
  // Handler para cambios en emails
  const handleEmailsChange = useCallback((emailsString: string) => {
    const emails = emailsString
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    handleAlertChange("notifyEmails", emails);
  }, [handleAlertChange]);
  
  // Verificar si hay alguna alerta activa
  const hasActiveAlerts = alerts.onEntry || 
    alerts.onExit || 
    alerts.onDwell;
  
  return (
    <div className="space-y-6 pb-6">
      {/* Información de área (solo si está disponible) */}
      {showAreaInfo && (area > 0 || perimeter > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-2">
          {area > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 text-center transition-all hover:shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Área</span>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-1">{formatArea(area)}</p>
            </div>
          )}
          {perimeter > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 text-center transition-all hover:shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Perímetro</span>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-1">{formatPerimeter(perimeter)}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Nombre */}
      <div className="space-y-2">
        <Label htmlFor="geofence-name-input" className="text-slate-700 dark:text-slate-200 font-semibold">
          Nombre de la Geocerca <span className="text-red-500">*</span>
        </Label>
        <Input
          id="geofence-name-input"
          value={formData.name}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          placeholder="Ej. Zona Norte - Almacén"
          className={cn(
            "h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 transition-all focus:ring-2 focus:ring-primary/20",
            !formData.name.trim() && "border-red-300 focus:border-red-500 bg-red-50/10"
          )}
        />
        {!formData.name.trim() && (
          <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="w-3 h-3" />
            El nombre es requerido para identificar la zona
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Categoría */}
        <div className="space-y-2">
          <Label htmlFor="geofence-category" className="text-slate-700 dark:text-slate-200 font-semibold">Categoría</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => onFormDataChange({ category: value as GeofenceCategory })}
          >
            <SelectTrigger id="geofence-category" className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {geofenceCategories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.value];
                return (
                  <SelectItem key={cat.value} value={cat.value} className="cursor-pointer py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        <Icon className="h-4 w-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-sm">{cat.label}</span>
                        <span className="text-[10px] text-muted-foreground">{cat.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="geofence-description-input" className="text-slate-700 dark:text-slate-200 font-semibold">Descripción</Label>
        <textarea
          id="geofence-description-input"
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          placeholder="Añade detalles adicionales sobre esta zona..."
          rows={3}
          className="w-full px-4 py-3 text-sm border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none placeholder:text-slate-400"
        />
      </div>
      
      {/* Color con paleta predefinida */}
      <div className="space-y-3">
        <Label className="text-slate-700 dark:text-slate-200 font-semibold">Color de identificación</Label>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap gap-3">
            {geofenceColors.map((colorOption) => (
              <button
                key={colorOption.value}
                type="button"
                onClick={() => onFormDataChange({ color: colorOption.value })}
                className={cn(
                  "w-9 h-9 rounded-full shadow-sm transition-all hover:scale-110 flex items-center justify-center",
                  formData.color === colorOption.value
                    ? "ring-2 ring-offset-2 ring-primary ring-offset-white dark:ring-offset-slate-950 scale-110"
                    : "hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-700"
                )}
                style={{ backgroundColor: colorOption.value }}
                title={colorOption.name}
              >
                {formData.color === colorOption.value && (
                  <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                )}
              </button>
            ))}
            {/* Color personalizado */}
            <div className="relative group">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => onFormDataChange({ color: e.target.value })}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                title="Color personalizado"
              />
              <div
                className={cn(
                  "w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center transition-all bg-white dark:bg-slate-900",
                  !geofenceColors.some((c) => c.value === formData.color)
                    ? "border-primary ring-2 ring-offset-2 ring-primary ring-offset-white dark:ring-offset-slate-950"
                    : "border-slate-300 dark:border-slate-600 group-hover:border-slate-400"
                )}
                style={{ 
                  backgroundColor: !geofenceColors.some((c) => c.value === formData.color) 
                    ? formData.color 
                    : undefined
                }}
              >
                {!geofenceColors.some((c) => c.value === formData.color) ? (
                   <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                ) : (
                  <span className="text-xs text-slate-400 group-hover:text-slate-600">+</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Etiquetas */}
      <div className="space-y-2">
        <Label htmlFor="geofence-tags-input" className="text-slate-700 dark:text-slate-200 font-semibold">Etiquetas</Label>
        <Input
          id="geofence-tags-input"
          value={formData.tags}
          onChange={(e) => onFormDataChange({ tags: e.target.value })}
          placeholder="Separadas por comas (ej: Lima, Principal)"
          className="h-11 bg-white dark:bg-slate-900"
        />
        {formData.tags && (
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.tags.split(",").map((tag, idx) => (
              tag.trim() && (
                <Badge
                  key={idx}
                  variant="outline"
                  className="px-2.5 py-0.5 text-xs font-medium border-0"
                  style={{ 
                    backgroundColor: `${formData.color}20`, 
                    color: formData.color 
                  }}
                >
                  #{tag.trim()}
                </Badge>
              )
            ))}
          </div>
        )}
      </div>
      
      {/* Dirección Estructurada */}
      <div className="space-y-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
        <Label className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
            <MapPin className="h-4 w-4 text-slate-500" />
          </div>
          Dirección
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="geo-city" className="text-xs text-slate-600 dark:text-slate-400 font-medium">Ciudad</Label>
            <Input
              id="geo-city"
              value={formData.structuredAddress?.city || ""}
              onChange={(e) =>
                onFormDataChange({
                  structuredAddress: {
                    ...formData.structuredAddress,
                    city: e.target.value,
                  },
                })
              }
              placeholder="Ej. Lima"
              className="h-9 text-sm bg-white dark:bg-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="geo-district" className="text-xs text-slate-600 dark:text-slate-400 font-medium">Distrito</Label>
            <Input
              id="geo-district"
              value={formData.structuredAddress?.district || ""}
              onChange={(e) =>
                onFormDataChange({
                  structuredAddress: {
                    ...formData.structuredAddress,
                    district: e.target.value,
                  },
                })
              }
              placeholder="Ej. San Isidro"
              className="h-9 text-sm bg-white dark:bg-slate-900"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="geo-street" className="text-xs text-slate-600 dark:text-slate-400 font-medium">Calle / Avenida</Label>
          <Input
            id="geo-street"
            value={formData.structuredAddress?.street || ""}
            onChange={(e) =>
              onFormDataChange({
                structuredAddress: {
                  ...formData.structuredAddress,
                  street: e.target.value,
                },
              })
            }
            placeholder="Ej. Av. Javier Prado 1234"
            className="h-9 text-sm bg-white dark:bg-slate-900"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="geo-reference" className="text-xs text-slate-600 dark:text-slate-400 font-medium">Referencia</Label>
          <Input
            id="geo-reference"
            value={formData.structuredAddress?.reference || ""}
            onChange={(e) =>
              onFormDataChange({
                structuredAddress: {
                  ...formData.structuredAddress,
                  reference: e.target.value,
                },
              })
            }
            placeholder="Ej. Frente al parque central"
            className="h-9 text-sm bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Alertas - Diseño mejorado */}
      <div className="space-y-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            {hasActiveAlerts ? (
              <div className="p-1.5 bg-primary/10 rounded-full">
                <Bell className="h-4 w-4 text-primary" />
              </div>
            ) : (
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <BellOff className="h-4 w-4 text-slate-400" />
              </div>
            )}
            Configuración de Alertas
          </Label>
          {hasActiveAlerts && (
            <Badge variant="default" className="text-xs font-normal">
              {[alerts.onEntry, alerts.onExit, alerts.onDwell].filter(Boolean).length} activa(s)
            </Badge>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Alerta de entrada */}
          <label
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group",
              alerts.onEntry 
                ? "border-primary/50 bg-primary/5 dark:bg-primary/10" 
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-primary/30"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2 rounded-full transition-colors",
                alerts.onEntry ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary"
              )}>
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Al entrar</span>
                <span className="text-xs text-muted-foreground">Notificar cuando un vehículo ingrese</span>
              </div>
            </div>
            <Checkbox
              checked={alerts.onEntry}
              onCheckedChange={(checked) => handleAlertChange("onEntry", !!checked)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
            />
          </label>
          
          {/* Alerta de salida */}
          <label
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group",
              alerts.onExit 
                ? "border-primary/50 bg-primary/5 dark:bg-primary/10" 
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-primary/30"
            )}
          >
            <div className="flex items-center gap-4">
               <div className={cn(
                "p-2 rounded-full transition-colors",
                alerts.onExit ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary"
              )}>
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Al salir</span>
                <span className="text-xs text-muted-foreground">Notificar cuando un vehículo salga</span>
              </div>
            </div>
            <Checkbox
              checked={alerts.onExit}
              onCheckedChange={(checked) => handleAlertChange("onExit", !!checked)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
            />
          </label>
          
          {/* Alerta de permanencia */}
          <div className={cn(
              "rounded-xl border transition-all overflow-hidden",
              alerts.onDwell 
                ? "border-primary/50 bg-primary/5 dark:bg-primary/10" 
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50"
            )}>
            <label className="flex items-center justify-between p-4 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                 <div className={cn(
                  "p-2 rounded-full transition-colors",
                  alerts.onDwell ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary"
                )}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Por permanencia</span>
                  <span className="text-xs text-muted-foreground">Tiempo máximo excedido</span>
                </div>
              </div>
              <Checkbox
                checked={alerts.onDwell}
                onCheckedChange={(checked) => handleAlertChange("onDwell", !!checked)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
              />
            </label>
            
            {alerts.onDwell && (
              <div className="px-4 pb-4 pt-0 pl-[4.5rem] animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Más de</span>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={alerts.dwellTimeMinutes || 30}
                    onChange={(e) => handleAlertChange("dwellTimeMinutes", parseInt(e.target.value) || 30)}
                    className="w-16 h-7 text-center px-1 font-bold text-primary border-primary/20 focus:border-primary"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">minutos</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Configuración avanzada de alertas */}
          {hasActiveAlerts && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvancedAlerts(!showAdvancedAlerts)}
                className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors mx-auto"
              >
                <span>{showAdvancedAlerts ? "Ocultar configuración avanzada" : "Configuración avanzada"}</span>
                <div className={cn("transition-transform duration-200", showAdvancedAlerts ? "rotate-180" : "")}>
                   ▼
                </div>
              </button>
              
              {showAdvancedAlerts && (
                <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {/* Emails de notificación */}
                  <div className="space-y-2">
                    <Label htmlFor="alert-emails" className="text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Mail className="h-4 w-4 text-slate-400" />
                      Notificar a (Emails)
                    </Label>
                    <Input
                      id="alert-emails"
                      value={alerts.notifyEmails?.join(", ") || ""}
                      onChange={(e) => handleEmailsChange(e.target.value)}
                      placeholder="email1@empresa.com, supervisor@empresa.com"
                      className="h-9 text-sm bg-white dark:bg-slate-900"
                    />
                    <p className="text-[10px] text-muted-foreground pl-1">
                      Separa múltiples direcciones con comas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Botones de acción */}
      <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm -mx-1 px-1 pb-1">
        <Button
          className="flex-1 h-12 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          onClick={onSave}
          disabled={!formData.name.trim()}
        >
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? "Guardar Cambios" : "Crear Geocerca"}
        </Button>
        <Button
          variant="secondary"
          className="h-12 w-12 px-0 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          onClick={onCancel}
          title="Cancelar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export type { GeofenceFormProps };
