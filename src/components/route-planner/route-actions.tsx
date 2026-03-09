"use client";

/* ============================================
   COMPONENT: Route Actions
   Botones de acción para gestionar rutas
   ============================================ */

import { motion } from "framer-motion";
import { Navigation, RotateCw, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoutePlanner } from "@/contexts/route-planner-context";
import { cn } from "@/lib/utils";

export function RouteActions() {
  const {
    selectedOrders,
    currentRoute,
    selectedVehicle,
    selectedDriver,
    generateRoute,
    confirmRoute,
    resetRoute,
  } = useRoutePlanner();

  const canGenerate = selectedOrders.length > 0;
  const canConfirm = currentRoute && currentRoute.status === "generated" && selectedVehicle && selectedDriver;
  const isConfirmed = currentRoute?.status === "confirmed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      {/* Generate/Reoptimize Button */}
      {!isConfirmed && (
        <Button
          onClick={generateRoute}
          disabled={!canGenerate}
          size="lg"
          className={cn(
            "gap-2",
            currentRoute ? "bg-purple-500 hover:bg-purple-600" : "bg-[#3DBAFF] hover:bg-[#3DBAFF]/90"
          )}
        >
          {currentRoute ? (
            <>
              <RotateCw className="h-5 w-5" />
              Reoptimizar Ruta
            </>
          ) : (
            <>
              <Navigation className="h-5 w-5" />
              Generar Ruta
            </>
          )}
        </Button>
      )}

      {/* Confirm Button */}
      {currentRoute && !isConfirmed && (
        <Button
          onClick={confirmRoute}
          disabled={!canConfirm}
          size="lg"
          className="gap-2 bg-green-500 hover:bg-green-600"
        >
          <Check className="h-5 w-5" />
          Confirmar Ruta
        </Button>
      )}

      {/* Reset Button */}
      {currentRoute && (
        <Button
          onClick={resetRoute}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Trash2 className="h-5 w-5" />
          {isConfirmed ? "Nueva Ruta" : "Limpiar"}
        </Button>
      )}

      {/* Info Text */}
      {!canGenerate && !currentRoute && (
        <div className="text-sm text-muted-foreground">
          Selecciona órdenes para comenzar
        </div>
      )}

      {canGenerate && !currentRoute && (
        <div className="text-sm text-muted-foreground">
          {selectedOrders.length} {selectedOrders.length === 1 ? "orden seleccionada" : "órdenes seleccionadas"}
        </div>
      )}

      {currentRoute && !isConfirmed && (
        <div className="text-sm text-muted-foreground">
          {!selectedVehicle && "Asigna un vehículo"}
          {selectedVehicle && !selectedDriver && "Asigna un conductor"}
          {selectedVehicle && selectedDriver && "Listo para confirmar"}
        </div>
      )}

      {isConfirmed && (
        <div className="flex items-center gap-2 text-sm text-green-500">
          <Check className="h-4 w-4" />
          <span className="font-semibold">Ruta confirmada y lista para despacho</span>
        </div>
      )}
    </motion.div>
  );
}
