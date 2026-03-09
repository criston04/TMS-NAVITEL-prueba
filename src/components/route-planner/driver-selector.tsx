"use client";

/* ============================================
   COMPONENT: Driver Selector
   Selector visual de conductores
   ============================================ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ChevronDown,
  ChevronUp,
  Check,
  Star,
  Phone,
  Mail,
  Award,
  Calendar,
  Shield,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Driver } from "@/types/route-planner";
import { useRoutePlanner } from "@/contexts/route-planner-context";
import { cn } from "@/lib/utils";

interface DriverSelectorProps {
  drivers: Driver[];
  compact?: boolean;
  onSelect?: (driver: Driver | null) => void;
  selectedDriverId?: string;
}

/* ============================================
   RATING STARS
   ============================================ */
function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3 w-3",
            star <= Math.floor(rating)
              ? "fill-yellow-500 text-yellow-500"
              : star <= rating
                ? "fill-yellow-500/50 text-yellow-500"
                : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className="ml-1 text-xs font-semibold">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ============================================
   DRIVER CARD
   ============================================ */
function DriverCard({
  driver,
  isSelected,
  onClick,
}: {
  driver: Driver;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isUnavailable = driver.status !== "available";
  const initials = `${driver.firstName[0]}${driver.lastName[0]}`;

  // Check license expiry
  const licenseExpiry = new Date(driver.licenseExpiry);
  const today = new Date();
  const daysUntilExpiry = Math.ceil(
    (licenseExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isLicenseExpiringSoon = daysUntilExpiry <= 90;

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
            "border-[#3DBAFF] bg-[#3DBAFF]/5 ring-2 ring-[#3DBAFF]/20 shadow-lg"
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

        {/* Header with Avatar */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
            <AvatarImage src={driver.avatar} />
            <AvatarFallback
              className={cn(
                "text-sm font-semibold",
                isSelected
                  ? "bg-[#3DBAFF]/20 text-[#3DBAFF]"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">
                  {driver.firstName} {driver.lastName}
                </div>
                <RatingStars rating={driver.rating} />
              </div>
              <Badge
                variant={driver.status === "available" ? "default" : "secondary"}
                className="text-xs"
              >
                {driver.status === "available"
                  ? "Disponible"
                  : driver.status === "on_route"
                    ? "En Ruta"
                    : "Fuera de servicio"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            <span>{driver.experience} años de exp.</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>{driver.licenseNumber}</span>
          </div>
        </div>

        {/* License Expiry Warning */}
        {isLicenseExpiringSoon && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-yellow-500 mb-3"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Licencia vence en {daysUntilExpiry} días (
              {licenseExpiry.toLocaleDateString("es-ES")})
            </span>
          </motion.div>
        )}

        {/* Specializations */}
        {driver.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {driver.specializations.map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs py-0.5">
                {spec}
              </Badge>
            ))}
          </div>
        )}

        {/* Contact Info (when selected) */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-border"
          >
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                <span>{driver.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span>{driver.email}</span>
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

/* ============================================
   DRIVER SELECTOR COMPONENT
   ============================================ */
export function DriverSelector({ drivers, compact = false, onSelect, selectedDriverId }: DriverSelectorProps) {
  const { selectedDriver: ctxDriver, selectDriver: ctxSelectDriver } = useRoutePlanner();
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Allow overriding from props (multi-route assignment)
  const selectedDriver = selectedDriverId
    ? drivers.find((d) => d.id === selectedDriverId) || ctxDriver
    : ctxDriver;
  const selectDriver = onSelect || ctxSelectDriver;

  const availableDrivers = drivers.filter((d) => d.status === "available");
  const unavailableDrivers = drivers.filter((d) => d.status !== "available");

  // Sort by rating
  const sortedAvailable = [...availableDrivers].sort((a, b) => b.rating - a.rating);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => compact && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Seleccionar Conductor</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={selectedDriver ? "default" : "secondary"}
            className="text-xs"
          >
            {selectedDriver ? "Seleccionado" : `${availableDrivers.length} disponibles`}
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

      {/* Driver List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3 p-3">
                {/* Available Drivers */}
                {sortedAvailable.map((driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    isSelected={selectedDriver?.id === driver.id}
                    onClick={() =>
                      selectDriver(
                        selectedDriver?.id === driver.id ? null : driver
                      )
                    }
                  />
                ))}

                {/* Unavailable Drivers */}
                {unavailableDrivers.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground pt-2 pb-1">
                      No disponibles ({unavailableDrivers.length})
                    </div>
                    {unavailableDrivers.map((driver) => (
                      <DriverCard
                        key={driver.id}
                        driver={driver}
                        isSelected={false}
                        onClick={() => {}}
                      />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Driver Summary (when collapsed) */}
      {compact && !isExpanded && selectedDriver && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-3 border-[#3DBAFF]/30 bg-[#3DBAFF]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#3DBAFF]/20 text-[#3DBAFF] text-xs">
                    {selectedDriver.firstName[0]}
                    {selectedDriver.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="font-medium text-sm">
                    {selectedDriver.firstName} {selectedDriver.lastName}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-xs">{selectedDriver.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
