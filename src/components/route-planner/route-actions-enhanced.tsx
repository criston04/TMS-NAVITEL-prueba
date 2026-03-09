"use client";

/* ============================================
   COMPONENT: Route Actions Enhanced
   Botones de acción mejorados con estados
   ============================================ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  RotateCw,
  Check,
  Trash2,
  Loader2,
  Sparkles,
  Send,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoutePlanner } from "@/contexts/route-planner-context";
import { ConfirmationModal } from "./confirmation-modal";
import { cn } from "@/lib/utils";

export function RouteActionsEnhanced() {
  const {
    selectedOrders,
    currentRoute,
    selectedVehicle,
    selectedDriver,
    generateRoute,
    confirmRoute,
    resetRoute,
    isGenerating: contextIsGenerating,
  } = useRoutePlanner();

  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const canGenerate = selectedOrders.length > 0;
  const canConfirm =
    currentRoute &&
    currentRoute.status === "generated" &&
    selectedVehicle &&
    selectedDriver;
  const isConfirmed = currentRoute?.status === "confirmed";
  const hasCapacityErrors = currentRoute?.alerts?.some(
    (a) => a.code === "CAPACITY_EXCEEDED" && a.type === "error"
  );

  // Handle generate — no artificial delay; context tracks isGenerating
  const handleGenerate = () => {
    generateRoute();
  };

  // Handle confirm — no artificial delay
  const handleConfirm = () => {
    setIsConfirming(true);
    confirmRoute();
    setIsConfirming(false);
    setShowConfirmModal(false);
  };

  // Get status message
  const getStatusMessage = () => {
    if (!canGenerate && !currentRoute) {
      return {
        text: "Selecciona órdenes para comenzar",
        icon: null,
      };
    }
    if (canGenerate && !currentRoute) {
      return {
        text: `${selectedOrders.length} orden${selectedOrders.length !== 1 ? "es" : ""} seleccionada${selectedOrders.length !== 1 ? "s" : ""}`,
        icon: null,
      };
    }
    if (currentRoute && !isConfirmed) {
      if (hasCapacityErrors) {
        return {
          text: "Resuelve las alertas de capacidad",
          icon: AlertTriangle,
          color: "text-red-500",
        };
      }
      if (!selectedVehicle) {
        return {
          text: "Asigna un vehículo",
          icon: null,
        };
      }
      if (!selectedDriver) {
        return {
          text: "Asigna un conductor",
          icon: null,
        };
      }
      return {
        text: "Listo para confirmar",
        icon: Check,
        color: "text-green-500",
      };
    }
    if (isConfirmed) {
      return {
        text: "Ruta confirmada y lista para despacho",
        icon: Check,
        color: "text-green-500",
      };
    }
    return { text: "", icon: null };
  };

  const status = getStatusMessage();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Back/Reset Button - always visible when route exists */}
          {currentRoute && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button onClick={resetRoute} variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-5 w-5" />
                <span>Volver</span>
              </Button>
            </motion.div>
          )}

          {/* Generate/Reoptimize Button - SIEMPRE visible cuando hay órdenes */}
          {(canGenerate || currentRoute) && !isConfirmed && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || contextIsGenerating}
                size="lg"
                className={cn(
                  "gap-2 relative overflow-hidden min-w-[160px]",
                  currentRoute
                    ? "bg-purple-500 hover:bg-purple-600"
                    : "bg-gradient-to-r from-[#3DBAFF] to-blue-600 hover:from-[#3DBAFF]/90 hover:to-blue-600/90"
                )}
              >
                {contextIsGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : currentRoute ? (
                  <>
                    <RotateCw className="h-5 w-5" />
                    <span>Reoptimizar</span>
                  </>
                ) : (
                  <>
                    <Navigation className="h-5 w-5" />
                    <span>Generar Ruta</span>
                  </>
                )}

                {/* Shimmer Effect */}
                {!contextIsGenerating && (
                  <motion.div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ translateX: ["100%", "-100%"] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "linear",
                      repeatDelay: 3,
                    }}
                  />
                )}
              </Button>
            </motion.div>
          )}

          {/* Confirm Button */}
          {currentRoute && !isConfirmed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: canConfirm ? 1.02 : 1 }}
              whileTap={{ scale: canConfirm ? 0.98 : 1 }}
            >
              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={!canConfirm || hasCapacityErrors}
                size="lg"
                className={cn(
                  "gap-2 min-w-[160px]",
                  canConfirm && !hasCapacityErrors
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90"
                    : ""
                )}
              >
                <Check className="h-5 w-5" />
                <span>Confirmar Ruta</span>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Status Message */}
        <motion.div
          layout
          className="flex items-center gap-2 text-sm"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={status.text}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={cn(
                "flex items-center gap-2",
                status.color || "text-muted-foreground"
              )}
            >
              {status.icon && <status.icon className="h-4 w-4" />}
              <span className={status.color ? "font-medium" : ""}>
                {status.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Route Status Badge */}
        {currentRoute && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto"
          >
            <Badge
              variant={isConfirmed ? "default" : "secondary"}
              className={cn(
                "px-3 py-1",
                isConfirmed
                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                  : "bg-[#3DBAFF]/10 text-[#3DBAFF] border-[#3DBAFF]/30"
              )}
            >
              {isConfirmed ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Confirmada
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Generada
                </span>
              )}
            </Badge>
          </motion.div>
        )}
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        route={currentRoute}
        isLoading={isConfirming}
      />
    </>
  );
}
