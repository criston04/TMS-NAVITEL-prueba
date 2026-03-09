"use client";

/* ============================================
   COMPONENT: Stop Sequence Editor
   Lista de paradas con drag & drop
   ============================================ */

import { useState, useEffect } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { GripVertical, MapPin, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RouteStop } from "@/types/route-planner";
import { cn } from "@/lib/utils";

interface StopSequenceProps {
  stops: RouteStop[];
  onReorder: (stops: RouteStop[]) => void;
  onRemove?: (stopId: string) => void;
}

export function StopSequence({ stops, onReorder, onRemove }: StopSequenceProps) {
  const [items, setItems] = useState(stops);

  // Sync items when stops prop changes (e.g. after route regeneration)
  useEffect(() => {
    setItems(stops);
  }, [stops]);

  const handleReorder = (newOrder: RouteStop[]) => {
    setItems(newOrder);
    onReorder(newOrder);
  };

  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          No hay paradas en la ruta
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2 p-3">
        <AnimatePresence>
          {items.map((stop, index) => (
            <Reorder.Item
              key={stop.id}
              value={stop}
              className={cn(
                "relative p-3 rounded-lg border border-border bg-card cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                stop.type === "pickup" ? "border-l-4 border-l-green-500" : "border-l-4 border-l-[#3DBAFF]"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <div className="flex items-center justify-center mt-1">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Stop Number */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm shrink-0 mt-0.5",
                    stop.type === "pickup" ? "bg-green-500" : "bg-[#3DBAFF]"
                  )}
                >
                  {index + 1}
                </div>

                {/* Stop Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="font-semibold text-sm">
                        {stop.type === "pickup" ? "Recolección" : "Entrega"}
                      </div>
                      <div className="text-xs text-muted-foreground">{stop.city}</div>
                    </div>
                    <Badge
                      variant={stop.type === "pickup" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {stop.type === "pickup" ? "Pickup" : "Delivery"}
                    </Badge>
                  </div>

                  <div className="text-sm mb-2">{stop.address}</div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {stop.timeWindow && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {stop.timeWindow.start} - {stop.timeWindow.end}
                        </span>
                      </div>
                    )}
                    {stop.estimatedArrival && (
                      <div>
                        ETA: {(() => {
                          // Handle both ISO date strings and HH:MM time strings
                          const raw = stop.estimatedArrival!;
                          const d = raw.includes('T') ? new Date(raw) : new Date(`1970-01-01T${raw}:00`);
                          return isNaN(d.getTime()) ? raw : d.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        })()}
                      </div>
                    )}
                    <div>{stop.duration} min</div>
                  </div>
                </div>

                {/* Remove Button */}
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(stop.id)}
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </ScrollArea>
  );
}
