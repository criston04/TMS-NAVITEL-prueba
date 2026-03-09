"use client";

/* ============================================
   COMPONENT: Route Confirmation Modal
   Modal para confirmar ruta antes del despacho
   ============================================ */

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Truck,
  User,
  MapPin,
  Clock,
  DollarSign,
  Route,
  AlertTriangle,
  Package,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Route as RouteType } from "@/types/route-planner";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  route: RouteType | null;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  route,
  isLoading = false,
}: ConfirmationModalProps) {
  if (!route) return null;

  const hasAlerts = route.alerts && route.alerts.length > 0;
  const hasCapacityWarning = route.alerts?.some(
    (a) => a.code === "CAPACITY_EXCEEDED"
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[2001] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2"
          >
            <Card className="overflow-hidden border-border bg-card/95 backdrop-blur-xl shadow-2xl">
              {/* Header */}
              <div className="relative border-b border-border bg-gradient-to-r from-[#3DBAFF]/10 to-transparent p-6">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3DBAFF]/20">
                    <Route className="h-7 w-7 text-[#3DBAFF]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Confirmar Ruta</h2>
                    <p className="text-sm text-muted-foreground">
                      Revisa los detalles antes de confirmar el despacho
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="max-h-[60vh]">
                <div className="p-6 space-y-6">
                  {/* Alerts */}
                  {hasAlerts && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "rounded-lg p-4 border",
                        hasCapacityWarning
                          ? "bg-red-500/10 border-red-500/20"
                          : "bg-yellow-500/10 border-yellow-500/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={cn(
                            "h-5 w-5 shrink-0 mt-0.5",
                            hasCapacityWarning
                              ? "text-red-500"
                              : "text-yellow-500"
                          )}
                        />
                        <div>
                          <div className="font-semibold text-sm mb-2">
                            {hasCapacityWarning
                              ? "⚠️ Alertas Críticas"
                              : "⚠️ Advertencias"}
                          </div>
                          <ul className="space-y-1">
                            {route.alerts!.map((alert) => (
                              <li
                                key={alert.id}
                                className="text-sm text-muted-foreground"
                              >
                                • {alert.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Route Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="p-4 bg-[#3DBAFF]/5 border-[#3DBAFF]/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Route className="h-4 w-4 text-[#3DBAFF]" />
                          <span className="text-xs text-muted-foreground">
                            Distancia
                          </span>
                        </div>
                        <div className="text-xl font-bold">
                          {route.metrics.totalDistance} km
                        </div>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <Card className="p-4 bg-purple-500/5 border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span className="text-xs text-muted-foreground">
                            Tiempo
                          </span>
                        </div>
                        <div className="text-xl font-bold">
                          {Math.floor(route.metrics.estimatedDuration / 60)}h{" "}
                          {route.metrics.estimatedDuration % 60}m
                        </div>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className="p-4 bg-green-500/5 border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">
                            Paradas
                          </span>
                        </div>
                        <div className="text-xl font-bold">
                          {route.stops.length}
                        </div>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <Card className="p-4 bg-orange-500/5 border-orange-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          <span className="text-xs text-muted-foreground">
                            Costo
                          </span>
                        </div>
                        <div className="text-xl font-bold">
                          ${route.metrics.estimatedCost.toFixed(2)}
                        </div>
                      </Card>
                    </motion.div>
                  </div>

                  {/* Vehicle & Driver */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Vehicle */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3DBAFF]/10">
                            <Truck className="h-5 w-5 text-[#3DBAFF]" />
                          </div>
                          <div>
                            <div className="font-semibold">Vehículo</div>
                            <div className="text-xs text-muted-foreground">
                              Asignado para esta ruta
                            </div>
                          </div>
                        </div>
                        {route.vehicle ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {route.vehicle.brand} {route.vehicle.model}
                              </span>
                              <Badge variant="outline">
                                {route.vehicle.plate}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Capacidad: {route.vehicle.capacity.weight}kg /{" "}
                              {route.vehicle.capacity.volume}m³
                            </div>
                            <div className="flex gap-1">
                              {route.vehicle.features.map((f) => (
                                <Badge
                                  key={f}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Sin vehículo asignado
                          </div>
                        )}
                      </Card>
                    </motion.div>

                    {/* Driver */}
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                            <User className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <div className="font-semibold">Conductor</div>
                            <div className="text-xs text-muted-foreground">
                              Responsable de la entrega
                            </div>
                          </div>
                        </div>
                        {route.driver ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {route.driver.firstName} {route.driver.lastName}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500">★</span>
                                <span className="text-sm font-semibold">
                                  {route.driver.rating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Licencia: {route.driver.licenseNumber}
                            </div>
                            <div className="flex gap-1">
                              {route.driver.specializations
                                .slice(0, 3)
                                .map((s) => (
                                  <Badge
                                    key={s}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {s}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Sin conductor asignado
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  </div>

                  {/* Cargo Summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                          <Package className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                          <div className="font-semibold">Resumen de Carga</div>
                          <div className="text-xs text-muted-foreground">
                            Peso y volumen total
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Peso Total
                          </div>
                          <div className="text-lg font-semibold">
                            {route.metrics.totalWeight} kg
                          </div>
                          {route.vehicle && (
                            <div className="text-xs text-muted-foreground">
                              {(
                                (route.metrics.totalWeight /
                                  route.vehicle.capacity.weight) *
                                100
                              ).toFixed(0)}
                              % de capacidad
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Volumen Total
                          </div>
                          <div className="text-lg font-semibold">
                            {route.metrics.totalVolume} m³
                          </div>
                          {route.vehicle && (
                            <div className="text-xs text-muted-foreground">
                              {(
                                (route.metrics.totalVolume /
                                  route.vehicle.capacity.volume) *
                                100
                              ).toFixed(0)}
                              % de capacidad
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Stops Preview */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <Card className="p-4">
                      <div className="font-semibold mb-3">
                        Secuencia de Paradas
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {route.stops.map((stop, index) => (
                          <div
                            key={stop.id}
                            className="flex items-center gap-3 text-sm"
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold",
                                stop.type === "pickup"
                                  ? "bg-green-500"
                                  : "bg-[#3DBAFF]"
                              )}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">
                                {stop.type === "pickup"
                                  ? "Recolección"
                                  : "Entrega"}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                • {stop.city}
                              </span>
                            </div>
                            {stop.timeWindow && (
                              <div className="text-xs text-muted-foreground">
                                {stop.timeWindow.start} - {stop.timeWindow.end}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="border-t border-border p-6 bg-muted/30">
                <div className="flex items-center justify-end gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={onConfirm}
                    disabled={isLoading || hasCapacityWarning}
                    className="gap-2 bg-green-500 hover:bg-green-600"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Confirmar y Despachar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
