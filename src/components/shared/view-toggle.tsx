"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "cards" | "table";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ viewMode, onViewModeChange, className }: ViewToggleProps) {
  return (
    <div className={cn("flex items-center border rounded-md", className)}>
      <Button
        variant={viewMode === "cards" ? "default" : "ghost"}
        size="sm"
        className="rounded-r-none"
        onClick={() => onViewModeChange("cards")}
        title="Vista de tarjetas"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "table" ? "default" : "ghost"}
        size="sm"
        className="rounded-l-none"
        onClick={() => onViewModeChange("table")}
        title="Vista de tabla"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
