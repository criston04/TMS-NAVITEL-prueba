"use client";

/* ============================================
   COMPONENT: Vehicle Selector
   Selector visual de vehículos con capacidad
   ============================================ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  ChevronDown,
  ChevronUp,
  Check,
  Fuel,
  Weight,
  Box,
  Navigation2,
  Snowflake,
  Shield,
  Camera,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Vehicle } from "@/types/route-planner";
import { useRoutePlanner } from "@/contexts/route-planner-context";
import { cn } from "@/lib/utils";

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  compact?: boolean;
  onSelect?: (vehicle: Vehicle | null) => void;
  selectedVehicleId?: string;
  /** Route-specific total weight (for multi-route mode) */
  routeWeight?: number;
  /** Route-specific total volume (for multi-route mode) */
  routeVolume?: number;
}

/* ============================================
   FEATURE ICON MAPPING
   ============================================ */
const featureIcons: Record<string, React.ReactNode> = {
  GPS: <Navigation2 className="h-3 w-3" />,
  Refrigeración: <Snowflake className="h-3 w-3" />,
  "Sistema de seguridad": <Shield className="h-3 w-3" />,
  "Cámara reversa": <Camera className="h-3 w-3" />,
  "Control de temperatura": <Snowflake className="h-3 w-3" />,
  "Portón hidráulico": <Box className="h-3 w-3" />,
};

/* ============================================
   CAPACITY BAR
   ============================================ */
function CapacityBar({
  current,
  max,
  label,
  unit,
}: {
  current: number;
  max: number;
  label: string;
  unit: string;
}) {
  const percentage = (current / max) * 100;
  const isOverCapacity = current > max;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {max} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            isOverCapacity
              ? "bg-red-500"
              : percentage > 80
                ? "bg-yellow-500"
                : "bg-[#3DBAFF]"
          )}
        />
      </div>
    </div>
  );
}

/* ============================================
   VEHICLE CARD
   ============================================ */
function VehicleCard({
  vehicle,
  isSelected,
  onClick,
  totalWeight,
  totalVolume,
}: {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
  totalWeight: number;
  totalVolume: number;
}) {
  const weightPercentage = totalWeight > 0 ? (totalWeight / vehicle.capacity.weight) * 100 : 0;
  const volumePercentage = totalVolume > 0 ? (totalVolume / vehicle.capacity.volume) * 100 : 0;
  const isOverWeight = totalWeight > vehicle.capacity.weight;
  const isOverVolume = totalVolume > vehicle.capacity.volume;
  const isUnavailable = vehicle.status !== "available";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: isUnavailable ? 1 : 1.02 }}
      whileTap={{ scale: isUnavailable ? 1 : 0.98 }}
      onClick={isUnavailable ? undefined : onClick}
      className={cn(
        "relative",
        isUnavailable && "opacity-50 cursor-not-allowed"
      )}
    >
      <Card
        className={cn(
          "p-4 transition-all",
          !isUnavailable && "cursor-pointer hover:shadow-lg",
          isSelected &&
            "border-[#3DBAFF] bg-[#3DBAFF]/5 ring-2 ring-[#3DBAFF]/20 shadow-lg",
          (isOverWeight || isOverVolume) && isSelected && "border-red-500 ring-red-500/20"
        )}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 z-10"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3DBAFF] shadow-lg">
              <Check className="h-4 w-4 text-white" />
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                isSelected ? "bg-[#3DBAFF]/20" : "bg-muted"
              )}
            >
              <Truck
                className={cn(
                  "h-5 w-5",
                  isSelected ? "text-[#3DBAFF]" : "text-muted-foreground"
                )}
              />
            </div>
            <div>
              <div className="font-semibold">
                {vehicle.brand} {vehicle.model}
              </div>
              <div className="text-xs text-muted-foreground">{vehicle.plate}</div>
            </div>
          </div>
          <Badge
            variant={vehicle.status === "available" ? "default" : "secondary"}
            className="text-xs"
          >
            {vehicle.status === "available"
              ? "Disponible"
              : vehicle.status === "in_route"
                ? "En Ruta"
                : "No disponible"}
          </Badge>
        </div>

        {/* Capacity Indicators */}
        <div className="space-y-2 mb-3">
          <CapacityBar
            current={totalWeight}
            max={vehicle.capacity.weight}
            label="Peso"
            unit="kg"
          />
          <CapacityBar
            current={totalVolume}
            max={vehicle.capacity.volume}
            label="Volumen"
            unit="m³"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Fuel className="h-3.5 w-3.5" />
            <span>{vehicle.fuelConsumption} km/L</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="capitalize">{vehicle.fuelType}</span>
            <span>• {vehicle.year}</span>
          </div>
        </div>

        {/* Features */}
        {vehicle.features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vehicle.features.map((feature) => (
              <Badge
                key={feature}
                variant="secondary"
                className="text-xs gap-1 py-0.5"
              >
                {featureIcons[feature] || null}
                {feature}
              </Badge>
            ))}
          </div>
        )}

        {/* Over Capacity Warning */}
        {(isOverWeight || isOverVolume) && isSelected && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 pt-3 border-t border-red-500/20"
          >
            <div className="flex items-center gap-2 text-xs text-red-500">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-medium">
                {isOverWeight && isOverVolume
                  ? "Excede peso y volumen"
                  : isOverWeight
                    ? "Excede capacidad de peso"
                    : "Excede capacidad de volumen"}
              </span>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

/* ============================================
   VEHICLE SELECTOR COMPONENT
   ============================================ */
export function VehicleSelector({ vehicles, compact = false, onSelect, selectedVehicleId, routeWeight, routeVolume }: VehicleSelectorProps) {
  const { selectedVehicle: ctxVehicle, selectVehicle: ctxSelectVehicle, selectedOrders } = useRoutePlanner();
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Allow overriding from props (multi-route assignment)
  const selectedVehicle = selectedVehicleId
    ? vehicles.find((v) => v.id === selectedVehicleId) || ctxVehicle
    : ctxVehicle;
  const selectVehicle = onSelect || ctxSelectVehicle;

  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const unavailableVehicles = vehicles.filter((v) => v.status !== "available");

  // Calculate total cargo - use route-specific values if provided, else from context orders
  const totalWeight = routeWeight ?? selectedOrders.reduce((sum, o) => sum + o.cargo.weight, 0);
  const totalVolume = routeVolume ?? selectedOrders.reduce((sum, o) => sum + o.cargo.volume, 0);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => compact && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Seleccionar Vehículo</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={selectedVehicle ? "default" : "secondary"}
            className="text-xs"
          >
            {selectedVehicle ? "Seleccionado" : `${availableVehicles.length} disponibles`}
          </Badge>
          {compact && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Current Cargo Summary */}
      {(routeWeight != null || selectedOrders.length > 0) && (
        <Card className="p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground mb-2">
            {routeWeight != null ? "Carga de la ruta" : "Carga actual"}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{totalWeight} kg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Box className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{totalVolume} m³</span>
            </div>
          </div>
        </Card>
      )}

      {/* Vehicle List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3 p-3">
                {/* Available Vehicles */}
                {availableVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    isSelected={selectedVehicle?.id === vehicle.id}
                    onClick={() =>
                      selectVehicle(
                        selectedVehicle?.id === vehicle.id ? null : vehicle
                      )
                    }
                    totalWeight={totalWeight}
                    totalVolume={totalVolume}
                  />
                ))}

                {/* Unavailable Vehicles */}
                {unavailableVehicles.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground pt-2 pb-1">
                      No disponibles ({unavailableVehicles.length})
                    </div>
                    {unavailableVehicles.map((vehicle) => (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        isSelected={false}
                        onClick={() => {}}
                        totalWeight={0}
                        totalVolume={0}
                      />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Vehicle Summary (when collapsed) */}
      {compact && !isExpanded && selectedVehicle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="p-3 border-[#3DBAFF]/30 bg-[#3DBAFF]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#3DBAFF]" />
                <span className="font-medium text-sm">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedVehicle.plate}
              </Badge>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
