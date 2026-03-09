"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  Fuel,
  AlertTriangle,
  Settings,
  Save,
  Clock,
  Gauge,
  BellRing,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { FleetSettings as FleetSettingsType } from "@/types/settings";

interface FleetSettingsProps {
  settings?: FleetSettingsType;
  loading: boolean;
  onUpdate?: (data: Partial<FleetSettingsType>) => void;
}

export function FleetSettings({ settings, loading, onUpdate }: FleetSettingsProps) {
  const [formData, setFormData] = useState<Partial<FleetSettingsType>>({
    defaultSpeedLimit: 80,
    fuelCostPerKm: 0.5,
    maintenanceIntervalKm: 10000,
    maintenanceIntervalDays: 90,
    documentExpiryWarningDays: 30,
    enableSpeedAlerts: true,
    enableFuelAlerts: true,
    enableMaintenanceAlerts: true,
    enableGeofenceAlerts: true,
    idleTimeThresholdMinutes: 15,
    maxDrivingHoursPerDay: 8,
    restBreakMinutes: 30,
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = <K extends keyof FleetSettingsType>(
    field: K,
    value: FleetSettingsType[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.(formData);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Parámetros de Operación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Parámetros de Operación
          </CardTitle>
          <CardDescription>
            Configuración general de operación de la flota
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Velocidad Máxima por Defecto (km/h)
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[formData.defaultSpeedLimit || 80]}
                  onValueChange={([value]) =>
                    handleChange("defaultSpeedLimit", value)
                  }
                  min={40}
                  max={120}
                  step={5}
                  className="flex-1"
                />
                <span className="w-16 text-center font-mono">
                  {formData.defaultSpeedLimit} km/h
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tiempo Máximo de Ralentí (min)
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[formData.idleTimeThresholdMinutes || 15]}
                  onValueChange={([value]) =>
                    handleChange("idleTimeThresholdMinutes", value)
                  }
                  min={5}
                  max={60}
                  step={5}
                  className="flex-1"
                />
                <span className="w-16 text-center font-mono">
                  {formData.idleTimeThresholdMinutes} min
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxDriving">Horas Max. Conducción/Día</Label>
              <Input
                id="maxDriving"
                type="number"
                value={formData.maxDrivingHoursPerDay || 8}
                onChange={(e) =>
                  handleChange("maxDrivingHoursPerDay", parseInt(e.target.value))
                }
                min={4}
                max={12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restBreak">Descanso Obligatorio (min)</Label>
              <Input
                id="restBreak"
                type="number"
                value={formData.restBreakMinutes || 30}
                onChange={(e) =>
                  handleChange("restBreakMinutes", parseInt(e.target.value))
                }
                min={15}
                max={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distanceUnit">Unidad de Distancia</Label>
              <Select
                value={formData.distanceUnit || "km"}
                onValueChange={(value) => handleChange("distanceUnit", value as "km" | "mi")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Kilómetros</SelectItem>
                  <SelectItem value="mi">Millas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Combustible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Configuración de Combustible
          </CardTitle>
          <CardDescription>
            Parámetros para el seguimiento de combustible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelCost">Costo por km (USD)</Label>
              <Input
                id="fuelCost"
                type="number"
                step="0.01"
                value={formData.fuelCostPerKm || 0.5}
                onChange={(e) =>
                  handleChange("fuelCostPerKm", parseFloat(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelType">Tipo de Combustible Default</Label>
              <Select
                value={formData.defaultFuelType || "diesel"}
                onValueChange={(value) =>
                  handleChange("defaultFuelType", value as "diesel" | "gasoline" | "electric" | "hybrid")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diésel</SelectItem>
                  <SelectItem value="gasoline">Gasolina</SelectItem>
                  <SelectItem value="electric">Eléctrico</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelCapacity">Capacidad Tanque Default (L)</Label>
              <Input
                id="fuelCapacity"
                type="number"
                value={formData.defaultFuelCapacity || 200}
                onChange={(e) =>
                  handleChange("defaultFuelCapacity", parseInt(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mantenimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Mantenimiento
          </CardTitle>
          <CardDescription>
            Intervalos y alertas de mantenimiento preventivo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintKm">Intervalo Mantenimiento (km)</Label>
              <Input
                id="maintKm"
                type="number"
                value={formData.maintenanceIntervalKm || 10000}
                onChange={(e) =>
                  handleChange("maintenanceIntervalKm", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintDays">Intervalo Mantenimiento (días)</Label>
              <Input
                id="maintDays"
                type="number"
                value={formData.maintenanceIntervalDays || 90}
                onChange={(e) =>
                  handleChange("maintenanceIntervalDays", parseInt(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docExpiry">
              Días de Aviso Vencimiento Documentos
            </Label>
            <Input
              id="docExpiry"
              type="number"
              value={formData.documentExpiryWarningDays || 30}
              onChange={(e) =>
                handleChange("documentExpiryWarningDays", parseInt(e.target.value))
              }
            />
            <p className="text-sm text-muted-foreground">
              Recibirás alertas cuando los documentos estén por vencer
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Alertas de Flota
          </CardTitle>
          <CardDescription>
            Configura qué alertas deseas recibir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Alertas de Velocidad
              </Label>
              <p className="text-sm text-muted-foreground">
                Notificar cuando un vehículo exceda el límite
              </p>
            </div>
            <Switch
              checked={formData.enableSpeedAlerts}
              onCheckedChange={(checked) =>
                handleChange("enableSpeedAlerts", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                Alertas de Combustible
              </Label>
              <p className="text-sm text-muted-foreground">
                Notificar nivel bajo o consumo anómalo
              </p>
            </div>
            <Switch
              checked={formData.enableFuelAlerts}
              onCheckedChange={(checked) =>
                handleChange("enableFuelAlerts", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Alertas de Mantenimiento
              </Label>
              <p className="text-sm text-muted-foreground">
                Notificar mantenimientos próximos o vencidos
              </p>
            </div>
            <Switch
              checked={formData.enableMaintenanceAlerts}
              onCheckedChange={(checked) =>
                handleChange("enableMaintenanceAlerts", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas de Geocercas
              </Label>
              <p className="text-sm text-muted-foreground">
                Notificar entrada/salida de zonas definidas
              </p>
            </div>
            <Switch
              checked={formData.enableGeofenceAlerts}
              onCheckedChange={(checked) =>
                handleChange("enableGeofenceAlerts", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
