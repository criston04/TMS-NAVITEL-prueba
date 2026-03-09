"use client";

/**
 * @fileoverview Manual Route Creator - Crear rutas manualmente sin Excel
 * Permite agregar múltiples paradas de forma rápida, reordenarlas y guardar la ruta
 */

import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Plus,
  Trash2,
  GripVertical,
  Navigation,
  Clock,
  Package,
  TruckIcon,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RouteStop } from "@/types/route-planner";
import { toast } from "sonner";

interface ManualStop {
  id: string;
  sequence: number;
  type: "pickup" | "delivery";
  address: string;
  city: string;
  lat: string;
  lng: string;
  duration: number;
  notes?: string;
}

interface ManualRouteCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stops: RouteStop[]) => void;
}

export function ManualRouteCreator({
  open,
  onOpenChange,
  onSave,
}: ManualRouteCreatorProps) {
  const [stops, setStops] = useState<ManualStop[]>([]);
  const [isAddingStop, setIsAddingStop] = useState(false);

  // Form state para nueva parada
  const [newStop, setNewStop] = useState<Partial<ManualStop>>({
    type: "delivery",
    duration: 30,
    city: "",
    address: "",
    lat: "",
    lng: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validar formulario de nueva parada
  const validateStop = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newStop.address?.trim()) {
      newErrors.address = "La dirección es requerida";
    }
    if (!newStop.city?.trim()) {
      newErrors.city = "La ciudad es requerida";
    }
    if (!newStop.lat || isNaN(parseFloat(newStop.lat))) {
      newErrors.lat = "Latitud inválida";
    } else {
      const lat = parseFloat(newStop.lat);
      if (lat < -90 || lat > 90) {
        newErrors.lat = "Latitud debe estar entre -90 y 90";
      }
    }
    if (!newStop.lng || isNaN(parseFloat(newStop.lng))) {
      newErrors.lng = "Longitud inválida";
    } else {
      const lng = parseFloat(newStop.lng);
      if (lng < -180 || lng > 180) {
        newErrors.lng = "Longitud debe estar entre -180 y 180";
      }
    }
    if (!newStop.duration || newStop.duration < 5) {
      newErrors.duration = "Duración mínima: 5 minutos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Agregar parada a la lista
  const handleAddStop = () => {
    if (!validateStop()) {
      toast.error("Por favor corrige los errores del formulario");
      return;
    }

    const stop: ManualStop = {
      id: `manual-stop-${Date.now()}`,
      sequence: stops.length + 1,
      type: newStop.type as "pickup" | "delivery",
      address: newStop.address!,
      city: newStop.city!,
      lat: newStop.lat!,
      lng: newStop.lng!,
      duration: newStop.duration || 30,
      notes: newStop.notes,
    };

    setStops([...stops, stop]);
    
    // Reset form pero mantener el formulario abierto y algunos valores para agilizar
    setNewStop({
      type: newStop.type, // Mantener el mismo tipo
      duration: 30,
      city: newStop.city, // Mantener la misma ciudad si es probable
      address: "",
      lat: "",
      lng: "",
      notes: "",
    });
    setErrors({});
    // NO cerrar el formulario para permitir agregar múltiples paradas rápidamente
    
    toast.success(`Parada #${stops.length + 1} agregada`);
  };

  // Eliminar parada
  const handleRemoveStop = (id: string) => {
    setStops((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      // Reajustar secuencias
      return filtered.map((s, idx) => ({ ...s, sequence: idx + 1 }));
    });
    toast.success("Parada eliminada");
  };

  // Reordenar paradas (drag & drop)
  const handleReorder = (newOrder: ManualStop[]) => {
    const reordered = newOrder.map((stop, idx) => ({
      ...stop,
      sequence: idx + 1,
    }));
    setStops(reordered);
  };

  // Guardar ruta
  const handleSaveRoute = () => {
    if (stops.length === 0) {
      toast.error("Debes agregar al menos una parada");
      return;
    }

    // Convertir ManualStop a RouteStop
    const routeStops: RouteStop[] = stops.map((stop) => ({
      id: stop.id,
      orderId: `manual-${stop.id}`,
      sequence: stop.sequence,
      type: stop.type,
      address: stop.address,
      city: stop.city,
      coordinates: [parseFloat(stop.lat), parseFloat(stop.lng)],
      duration: stop.duration,
      status: "pending",
    }));

    onSave(routeStops);
    toast.success(`Ruta manual creada con ${stops.length} paradas`);
    handleClose();
  };

  // Cerrar y limpiar
  const handleClose = () => {
    setStops([]);
    setIsAddingStop(false);
    setNewStop({
      type: "delivery",
      duration: 30,
      city: "",
      address: "",
      lat: "",
      lng: "",
      notes: "",
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Navigation className="h-5 w-5 text-[#3DBAFF]" />
            Crear Ruta Manual
          </DialogTitle>
          <DialogDescription>
            Agrega paradas una por una para crear tu ruta personalizada. Puedes reordenarlas arrastrándolas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6">
          {/* Lista de paradas existentes */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Paradas de la Ruta</h3>
                <Badge variant="secondary">{stops.length}</Badge>
              </div>
              {!isAddingStop && (
                <Button
                  size="sm"
                  onClick={() => setIsAddingStop(true)}
                  className="bg-[#3DBAFF] hover:bg-[#3DBAFF]/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Parada
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              {/* Formulario para agregar nueva parada - Siempre arriba cuando está activo */}
              <AnimatePresence>
                {isAddingStop && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-2 border-dashed border-[#3DBAFF] rounded-lg p-4 mb-4 bg-[#3DBAFF]/5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Plus className="h-4 w-4 text-[#3DBAFF]" />
                        {stops.length === 0 ? "Primera Parada" : `Parada #${stops.length + 1}`}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingStop(false);
                          setErrors({});
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Tipo */}
                      <div className="space-y-1.5">
                        <Label htmlFor="type" className="text-xs">
                          Tipo de Parada *
                        </Label>
                        <Select
                          value={newStop.type}
                          onValueChange={(value) =>
                            setNewStop({ ...newStop, type: value as "pickup" | "delivery" })
                          }
                        >
                          <SelectTrigger id="type" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" />
                                Recolección
                              </div>
                            </SelectItem>
                            <SelectItem value="delivery">
                              <div className="flex items-center gap-2">
                                <TruckIcon className="h-3.5 w-3.5" />
                                Entrega
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Duración */}
                      <div className="space-y-1.5">
                        <Label htmlFor="duration" className="text-xs">
                          Duración (min) *
                        </Label>
                        <Input
                          id="duration"
                          type="number"
                          min={5}
                          value={newStop.duration || ""}
                          onChange={(e) =>
                            setNewStop({ ...newStop, duration: parseInt(e.target.value) || 0 })
                          }
                          className={cn("h-9", errors.duration && "border-destructive")}
                        />
                        {errors.duration && (
                          <p className="text-xs text-destructive">{errors.duration}</p>
                        )}
                      </div>

                      {/* Dirección */}
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="address" className="text-xs">
                          Dirección *
                        </Label>
                        <Input
                          id="address"
                          placeholder="Ej: Av. Principal 123, Col. Centro"
                          value={newStop.address || ""}
                          onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
                          className={cn("h-9", errors.address && "border-destructive")}
                        />
                        {errors.address && (
                          <p className="text-xs text-destructive">{errors.address}</p>
                        )}
                      </div>

                      {/* Ciudad */}
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="city" className="text-xs">
                          Ciudad *
                        </Label>
                        <Input
                          id="city"
                          placeholder="Ej: Ciudad de México"
                          value={newStop.city || ""}
                          onChange={(e) => setNewStop({ ...newStop, city: e.target.value })}
                          className={cn("h-9", errors.city && "border-destructive")}
                        />
                        {errors.city && (
                          <p className="text-xs text-destructive">{errors.city}</p>
                        )}
                      </div>

                      {/* Latitud */}
                      <div className="space-y-1.5">
                        <Label htmlFor="lat" className="text-xs">
                          Latitud *
                        </Label>
                        <Input
                          id="lat"
                          placeholder="19.4326"
                          value={newStop.lat || ""}
                          onChange={(e) => setNewStop({ ...newStop, lat: e.target.value })}
                          className={cn("h-9", errors.lat && "border-destructive")}
                        />
                        {errors.lat && (
                          <p className="text-xs text-destructive">{errors.lat}</p>
                        )}
                      </div>

                      {/* Longitud */}
                      <div className="space-y-1.5">
                        <Label htmlFor="lng" className="text-xs">
                          Longitud *
                        </Label>
                        <Input
                          id="lng"
                          placeholder="-99.1332"
                          value={newStop.lng || ""}
                          onChange={(e) => setNewStop({ ...newStop, lng: e.target.value })}
                          className={cn("h-9", errors.lng && "border-destructive")}
                        />
                        {errors.lng && (
                          <p className="text-xs text-destructive">{errors.lng}</p>
                        )}
                      </div>

                      {/* Notas */}
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="notes" className="text-xs">
                          Notas (opcional)
                        </Label>
                        <Textarea
                          id="notes"
                          placeholder="Instrucciones especiales, contacto, etc."
                          value={newStop.notes || ""}
                          onChange={(e) => setNewStop({ ...newStop, notes: e.target.value })}
                          className="h-16 resize-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Tip: Google Maps → Clic derecho → Copiar coordenadas
                      </p>
                    </div>

                    <div className="flex justify-between gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddingStop(false);
                          setErrors({});
                        }}
                      >
                        Cerrar Formulario
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddStop}
                        className="bg-[#3DBAFF] hover:bg-[#3DBAFF]/90"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar y Continuar
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {stops.length === 0 && !isAddingStop && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    No hay paradas agregadas
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Haz clic en "Agregar Parada" para comenzar
                  </p>
                </div>
              )}

              {/* Lista reordenable de paradas */}
              {stops.length > 0 && (
                <Reorder.Group
                  axis="y"
                  values={stops}
                  onReorder={handleReorder}
                  className="space-y-2 mb-4"
                >
                  {stops.map((stop) => (
                    <Reorder.Item
                      key={stop.id}
                      value={stop}
                      className="bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#3DBAFF] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              #{stop.sequence}
                            </Badge>
                            <Badge
                              variant={stop.type === "pickup" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {stop.type === "pickup" ? (
                                <>
                                  <Package className="h-3 w-3 mr-1" />
                                  Recolección
                                </>
                              ) : (
                                <>
                                  <TruckIcon className="h-3 w-3 mr-1" />
                                  Entrega
                                </>
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {stop.duration} min
                            </Badge>
                          </div>
                          <p className="font-medium text-sm">{stop.address}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {stop.city} • {stop.lat}, {stop.lng}
                          </p>
                          {stop.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {stop.notes}
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveStop(stop.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {isAddingStop ? (
                <p className="text-sm text-muted-foreground">
                  📝 Completa el formulario para agregar la parada
                </p>
              ) : stops.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Agrega al menos una parada para crear la ruta
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-[#3DBAFF]">
                    {stops.length} parada{stops.length !== 1 ? "s" : ""}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    • {stops.filter(s => s.type === "pickup").length} recolección
                    • {stops.filter(s => s.type === "delivery").length} entrega
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRoute}
                disabled={stops.length === 0}
                className="bg-[#3DBAFF] hover:bg-[#3DBAFF]/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {isAddingStop 
                  ? "Terminar y Guardar" 
                  : stops.length > 0 
                    ? `Guardar Ruta (${stops.length})`
                    : "Guardar Ruta"
                }
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
