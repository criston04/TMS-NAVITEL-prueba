"use client";

/* ============================================
   PAGE: Route Planner (Enhanced)
   Módulo completo de planificación de rutas
   ============================================ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Settings2,
  Map,
  Truck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoutePlannerProvider, useRoutePlanner } from "@/contexts/route-planner-context";

// Components
import { OrderList } from "@/components/route-planner/order-list";
import { RouteMap } from "@/components/route-planner/route-map-enhanced";
import { KpiCards } from "@/components/route-planner/kpi-cards";
import { VehicleSelector } from "@/components/route-planner/vehicle-selector";
import { DriverSelector } from "@/components/route-planner/driver-selector";
import { RouteActionsEnhanced } from "@/components/route-planner/route-actions-enhanced";
import { StopSequenceEnhanced } from "@/components/route-planner/stop-sequence-enhanced";
import { RouteAlerts } from "@/components/route-planner/route-alerts";

// Mock Data
import { mockOrders, mockVehicles, mockDrivers } from "@/lib/mock-data/route-planner";

import { cn } from "@/lib/utils";

/* ============================================
   ROUTE PLANNER CONTENT
   ============================================ */
function RoutePlannerContent() {
  const { currentRoute, reorderStops, selectedOrders } = useRoutePlanner();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showStopSequence, setShowStopSequence] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState("vehicle");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* ============================================
            LEFT PANEL: Orders
            ============================================ */}
        <motion.div
          initial={false}
          animate={{
            width: leftPanelCollapsed ? "0px" : "340px",
            opacity: leftPanelCollapsed ? 0 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative overflow-hidden border-r border-border bg-card"
        >
          {!leftPanelCollapsed && <OrderList orders={mockOrders} />}

          {/* Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="absolute top-4 -right-4 z-20 h-8 w-8 rounded-full p-0 shadow-lg bg-card border border-border hover:bg-muted"
          >
            {leftPanelCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </motion.div>

        {/* ============================================
            CENTER CONTENT: Map & KPIs
            ============================================ */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Map Area */}
          <div className="flex-1 relative">
            <RouteMap
              route={currentRoute}
              selectedOrders={selectedOrders}
              onStopReorder={reorderStops}
              showOrderMarkers={!currentRoute}
            />

            {/* Stop Sequence Toggle Button */}
            {currentRoute && currentRoute.stops.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 right-16 z-[1000]"
              >
                <Button
                  variant={showStopSequence ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowStopSequence(!showStopSequence)}
                  className={cn(
                    "gap-2 shadow-lg",
                    !showStopSequence && "bg-card/95 backdrop-blur-sm"
                  )}
                >
                  <ListOrdered className="h-4 w-4" />
                  {showStopSequence ? "Ocultar" : "Secuencia"}
                </Button>
              </motion.div>
            )}

            {/* Stop Sequence Overlay Panel */}
            <AnimatePresence>
              {showStopSequence && currentRoute && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute top-16 right-4 bottom-4 w-96 z-[1000]"
                >
                  <Card className="h-full bg-card/95 backdrop-blur-xl border-border shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-border bg-gradient-to-r from-[#3DBAFF]/10 to-transparent">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Secuencia de Paradas</h3>
                          <p className="text-xs text-muted-foreground">
                            Arrastra para reordenar
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {currentRoute.stops.length} paradas
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 h-[calc(100%-80px)] overflow-auto">
                      <StopSequenceEnhanced
                        stops={currentRoute.stops}
                        onReorder={reorderStops}
                      />
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================
              BOTTOM: KPIs & Alerts
              ============================================ */}
          <motion.div
            layout
            className="border-t border-border bg-card/50 backdrop-blur-sm"
          >
            {/* Alerts Section */}
            {currentRoute?.alerts && currentRoute.alerts.length > 0 && (
              <div className="px-4 pt-4">
                <RouteAlerts alerts={currentRoute.alerts} />
              </div>
            )}

            {/* KPI Cards */}
            <KpiCards route={currentRoute} />
          </motion.div>

          {/* ============================================
              ACTIONS BAR
              ============================================ */}
          <div className="border-t border-border bg-card px-6 py-4">
            <RouteActionsEnhanced />
          </div>
        </div>

        {/* ============================================
            RIGHT PANEL: Configuration
            ============================================ */}
        <motion.div
          initial={false}
          animate={{
            width: rightPanelCollapsed ? "0px" : "360px",
            opacity: rightPanelCollapsed ? 0 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative overflow-hidden border-l border-border bg-card"
        >
          {/* Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="absolute top-4 -left-4 z-20 h-8 w-8 rounded-full p-0 shadow-lg bg-card border border-border hover:bg-muted"
          >
            {rightPanelCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          {!rightPanelCollapsed && (
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-[#3DBAFF]" />
                  Configuración
                </h2>
                <p className="text-sm text-muted-foreground">
                  Asigna vehículo y conductor
                </p>
              </div>

              {/* Tabs */}
              <Tabs
                value={activeConfigTab}
                onValueChange={setActiveConfigTab}
                className="flex-1 flex flex-col"
              >
                <div className="px-4 pt-2">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="vehicle" className="gap-2">
                      <Truck className="h-4 w-4" />
                      Vehículo
                    </TabsTrigger>
                    <TabsTrigger value="driver" className="gap-2">
                      <User className="h-4 w-4" />
                      Conductor
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <TabsContent value="vehicle" className="p-4 mt-0">
                    <VehicleSelector vehicles={mockVehicles} />
                  </TabsContent>
                  <TabsContent value="driver" className="p-4 mt-0">
                    <DriverSelector drivers={mockDrivers} />
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* Route Options */}
              <RouteOptionsPanel />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================
   ROUTE OPTIONS PANEL
   ============================================ */
function RouteOptionsPanel() {
  const { configuration, updateConfiguration } = useRoutePlanner();

  return (
    <div className="border-t border-border p-4 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        Opciones de Ruta
      </h3>

      {/* Toggle Options */}
      <div className="space-y-3">
        {/* Avoid Tolls */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Evitar peajes</span>
          <button
            onClick={() =>
              updateConfiguration({ avoidTolls: !configuration.avoidTolls })
            }
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              configuration.avoidTolls ? "bg-[#3DBAFF]" : "bg-muted"
            )}
          >
            <motion.span
              layout
              className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
              animate={{ x: configuration.avoidTolls ? 24 : 4 }}
            />
          </button>
        </div>

        {/* Consider Traffic */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Tráfico en tiempo real</span>
          <button
            onClick={() =>
              updateConfiguration({
                considerTraffic: !configuration.considerTraffic,
              })
            }
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              configuration.considerTraffic ? "bg-[#3DBAFF]" : "bg-muted"
            )}
          >
            <motion.span
              layout
              className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
              animate={{ x: configuration.considerTraffic ? 24 : 4 }}
            />
          </button>
        </div>
      </div>

      {/* Priority Selection */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          Priorizar
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["speed", "balanced", "cost"] as const).map((priority) => (
            <Button
              key={priority}
              variant={configuration.priority === priority ? "default" : "outline"}
              size="sm"
              onClick={() => updateConfiguration({ priority })}
              className={cn(
                "text-xs",
                configuration.priority === priority && "bg-[#3DBAFF] hover:bg-[#3DBAFF]/90"
              )}
            >
              {priority === "speed"
                ? "⚡ Rapidez"
                : priority === "balanced"
                  ? "⚖️ Balance"
                  : "💰 Costo"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   ROUTE PLANNER PAGE
   ============================================ */
export default function RoutePlannerPage() {
  return (
    <RoutePlannerProvider>
      <div className="h-full">
        <RoutePlannerContent />
      </div>
    </RoutePlannerProvider>
  );
}
