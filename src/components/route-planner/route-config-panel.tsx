"use client";

/* ============================================
   COMPONENT: Route Configuration Panel
   Selectores de vehículo, conductor y opciones
   ============================================ */

import { useState } from "react";
import { motion } from "framer-motion";
import { Truck, User, Settings2, DollarSign, Zap, Navigation2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Vehicle, Driver, Priority } from "@/types/route-planner";
import { useRoutePlanner } from "@/contexts/route-planner-context";
import { cn } from "@/lib/utils";

interface RouteConfigPanelProps {
  vehicles: Vehicle[];
  drivers: Driver[];
}

export function RouteConfigPanel({ vehicles, drivers }: RouteConfigPanelProps) {
  const {
    selectedVehicle,
    selectedDriver,
    configuration,
    selectVehicle,
    selectDriver,
    updateConfiguration,
  } = useRoutePlanner();

  const [showVehicles, setShowVehicles] = useState(true);
  const [showDrivers, setShowDrivers] = useState(false);

  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const availableDrivers = drivers.filter((d) => d.status === "available");

  return (
    <div className="flex h-full flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-[#3DBAFF]" />
          Configuración de Ruta
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Vehicle Selection */}
          <div>
            <div
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => setShowVehicles(!showVehicles)}
            >
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Vehículo</h3>
              </div>
              <Badge variant={selectedVehicle ? "default" : "secondary"} className="text-xs">
                {selectedVehicle ? "Seleccionado" : "No asignado"}
              </Badge>
            </div>

            {showVehicles && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2 p-1"
              >
                {availableVehicles.map((vehicle) => (
                  <motion.div
                    key={vehicle.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      onClick={() => selectVehicle(vehicle)}
                      className={cn(
                        "p-3 cursor-pointer transition-all hover:shadow-md",
                        selectedVehicle?.id === vehicle.id &&
                          "border-[#3DBAFF] bg-[#3DBAFF]/5 ring-1 ring-[#3DBAFF]/20"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm">
                            {vehicle.brand} {vehicle.model}
                          </div>
                          <div className="text-xs text-muted-foreground">{vehicle.plate}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {vehicle.year}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Capacidad</div>
                          <div className="font-medium">{vehicle.capacity.weight} kg</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Volumen</div>
                          <div className="font-medium">{vehicle.capacity.volume} m³</div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Navigation2 className="h-3 w-3" />
                          <span>{vehicle.fuelConsumption} km/L</span>
                          <span className="mx-1">•</span>
                          <span>{vehicle.fuelType}</span>
                        </div>
                      </div>

                      {vehicle.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {vehicle.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}

                {availableVehicles.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No hay vehículos disponibles
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Driver Selection */}
          <div>
            <div
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => setShowDrivers(!showDrivers)}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Conductor</h3>
              </div>
              <Badge variant={selectedDriver ? "default" : "secondary"} className="text-xs">
                {selectedDriver ? "Seleccionado" : "No asignado"}
              </Badge>
            </div>

            {showDrivers && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2 p-1"
              >
                {availableDrivers.map((driver) => (
                  <motion.div
                    key={driver.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      onClick={() => selectDriver(driver)}
                      className={cn(
                        "p-3 cursor-pointer transition-all hover:shadow-md",
                        selectedDriver?.id === driver.id &&
                          "border-[#3DBAFF] bg-[#3DBAFF]/5 ring-1 ring-[#3DBAFF]/20"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm">
                            {driver.firstName} {driver.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{driver.licenseNumber}</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mb-2">
                        {driver.experience} años de experiencia
                      </div>

                      {driver.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {driver.specializations.map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}

                {availableDrivers.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No hay conductores disponibles
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Route Options */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Opciones de Ruta</h3>
            </div>

            <Card className="p-4 space-y-4">
              {/* Avoid Tolls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Evitar peajes</span>
                </div>
                <button
                  onClick={() => updateConfiguration({ avoidTolls: !configuration.avoidTolls })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    configuration.avoidTolls ? "bg-[#3DBAFF]" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      configuration.avoidTolls ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Consider Traffic */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Considerar tráfico</span>
                </div>
                <button
                  onClick={() =>
                    updateConfiguration({ considerTraffic: !configuration.considerTraffic })
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    configuration.considerTraffic ? "bg-[#3DBAFF]" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      configuration.considerTraffic ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Prioridad</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["speed", "balanced", "cost"] as Priority[]).map((priority) => (
                    <Button
                      key={priority}
                      variant={configuration.priority === priority ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateConfiguration({ priority })}
                      className="text-xs"
                    >
                      {priority === "speed" && (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          Rapidez
                        </>
                      )}
                      {priority === "balanced" && "Balance"}
                      {priority === "cost" && (
                        <>
                          <DollarSign className="h-3 w-3 mr-1" />
                          Costo
                        </>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time Buffer */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Buffer de tiempo (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={configuration.timeBuffer}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateConfiguration({ timeBuffer: isNaN(val) ? 0 : Math.max(0, Math.min(60, val)) });
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
