"use client";

/* ============================================
   COMPONENT: Stop Sequence Editor (Enhanced)
   Lista de paradas con drag & drop y animaciones
   ============================================ */

import { useState, useEffect } from "react";
import { motion, Reorder, AnimatePresence, useDragControls } from "framer-motion";
import {
  GripVertical,
  MapPin,
  Clock,
  Trash2,
  Package,
  ChevronDown,
  ChevronUp,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RouteStop } from "@/types/route-planner";
import { cn } from "@/lib/utils";

interface StopSequenceProps {
  stops: RouteStop[];
  onReorder: (stops: RouteStop[]) => void;
  onRemove?: (stopId: string) => void;
  compact?: boolean;
}

/* ============================================
   TIMELINE CONNECTOR
   ============================================ */
function TimelineConnector({ isLast }: { isLast: boolean }) {
  if (isLast) return null;

  return (
    <motion.div
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-border to-transparent"
      style={{ originY: 0 }}
    />
  );
}

/* ============================================
   STOP ITEM COMPONENT
   ============================================ */
function StopItem({
  stop,
  index,
  isLast,
  onRemove,
  isExpanded,
  onToggleExpand,
}: {
  stop: RouteStop;
  index: number;
  isLast: boolean;
  onRemove?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const dragControls = useDragControls();
  const isPickup = stop.type === "pickup";

  // Check if time window conflict
  const hasTimeConflict = stop.timeWindow && stop.estimatedArrival && (() => {
    const [arrH, arrM] = stop.estimatedArrival!.split(":").map(Number);
    const [endH, endM] = stop.timeWindow!.end.split(":").map(Number);
    return arrH * 60 + arrM > endH * 60 + endM;
  })();

  return (
    <Reorder.Item
      value={stop}
      dragListener={false}
      dragControls={dragControls}
      className="relative"
    >
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "relative ml-1 rounded-lg border bg-card transition-all",
          "hover:shadow-md hover:border-[#3DBAFF]/30",
          isPickup
            ? "border-l-2 border-l-green-500"
            : "border-l-2 border-l-[#3DBAFF]",
          hasTimeConflict && "border-yellow-500/50"
        )}
      >
        {/* Timeline Connector */}
        <TimelineConnector isLast={isLast} />

        <div className="p-2.5">
          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <motion.div
              className="flex items-center justify-center mt-1 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground/50" />
            </motion.div>

            {/* Stop Number */}
            <motion.div
              layout
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-white font-bold text-xs shrink-0 shadow",
                isPickup
                  ? "bg-gradient-to-br from-green-400 to-green-600"
                  : "bg-gradient-to-br from-[#3DBAFF] to-blue-600"
              )}
              whileHover={{ scale: 1.05 }}
            >
              {index + 1}
            </motion.div>

            {/* Stop Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {isPickup ? "Recolección" : "Entrega"}
                    </span>
                    {hasTimeConflict && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 text-yellow-500"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-xs">Riesgo</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{stop.city}</div>
                </div>
                <Badge
                  variant={isPickup ? "default" : "secondary"}
                  className={cn(
                    "text-xs shrink-0",
                    isPickup
                      ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                      : "bg-[#3DBAFF]/10 text-[#3DBAFF] hover:bg-[#3DBAFF]/20"
                  )}
                >
                  {isPickup ? "Pickup" : "Delivery"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-1">
                {stop.address}
              </p>

              {/* Compact Info */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {stop.estimatedArrival && (
                  <div className={cn(
                    "flex items-center gap-1 font-medium",
                    hasTimeConflict ? "text-yellow-500" : "text-foreground"
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>ETA {stop.estimatedArrival}</span>
                  </div>
                )}
                {stop.timeWindow && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {stop.timeWindow.start} - {stop.timeWindow.end}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  <span>{stop.duration} min</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-border overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">Dirección completa</div>
                    <div className="font-medium">{stop.address}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Ciudad</div>
                    <div className="font-medium">{stop.city}</div>
                  </div>
                  {stop.estimatedArrival && (
                    <div>
                      <div className="text-muted-foreground mb-1">ETA</div>
                      <div className="font-medium">
                        {stop.estimatedArrival}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-muted-foreground mb-1">Coordenadas</div>
                    <div className="font-medium font-mono text-xs">
                      {stop.coordinates[0].toFixed(4)}, {stop.coordinates[1].toFixed(4)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

/* ============================================
   STOP SEQUENCE COMPONENT
   ============================================ */
export function StopSequenceEnhanced({
  stops,
  onReorder,
  onRemove,
  compact = false,
}: StopSequenceProps) {
  const [items, setItems] = useState(stops);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sync with external stops
  useEffect(() => {
    setItems(stops);
  }, [stops]);

  const handleReorder = (newOrder: RouteStop[]) => {
    setItems(newOrder);
    onReorder(newOrder);
  };

  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
            <MapPin className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </motion.div>
        <p className="text-sm text-muted-foreground mb-1">
          No hay paradas en la ruta
        </p>
        <p className="text-xs text-muted-foreground/70">
          Genera una ruta para ver las paradas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-1"
      >
        <div className="flex items-center gap-1 text-[11px]">
          <div className="flex items-center gap-0.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">
              {items.filter((s) => s.type === "pickup").length} pickups
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-2 w-2 rounded-full bg-[#3DBAFF]" />
            <span className="text-muted-foreground">
              {items.filter((s) => s.type === "delivery").length} entregas
            </span>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground/80 font-medium">
          {items.length} paradas
        </div>
      </motion.div>

      {/* Reorderable List */}
      <ScrollArea className={cn("pr-0.5", compact ? "max-h-[300px]" : "max-h-[calc(100vh-400px)]")}> 
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-1 p-0.5"
        >
          <AnimatePresence mode="popLayout">
            {items.map((stop, index) => (
              <StopItem
                key={stop.id}
                stop={stop}
                index={index}
                isLast={index === items.length - 1}
                onRemove={onRemove ? () => onRemove(stop.id) : undefined}
                isExpanded={expandedId === stop.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === stop.id ? null : stop.id)
                }
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </ScrollArea>

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center py-0.5"
      >
        <p className="text-[10px] text-muted-foreground/70">
          Arrastra para reordenar
        </p>
      </motion.div>
    </div>
  );
}
