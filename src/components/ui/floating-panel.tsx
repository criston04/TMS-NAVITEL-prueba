"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FloatingPanelProps {
  title?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  defaultPosition?: { x: number; y: number };
  width?: number | string;
  headerActions?: ReactNode;
}

export function FloatingPanel({
  title,
  children,
  onClose,
  className,
  defaultPosition = { x: 20, y: 80 }, // Default offset
  width = 400,
  headerActions
}: FloatingPanelProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position to end up in top-right if preferred, but dragging is absolute.
  // We'll stick to fixed positioning based on top/left for simplicity in dragging.

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Ensure it stays within viewport approximately
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Simple bounds check (optional, but good for UX)
        const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 0);
        const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 0);

        setPosition({
          x: Math.min(Math.max(0, newX), maxX),
          y: Math.min(Math.max(0, newY), maxY)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={panelRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        maxHeight: 'calc(100vh - 40px)',
      }}
      className={cn(
        "fixed bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col z-50 transition-shadow duration-200",
        isDragging ? "shadow-inner cursor-grabbing" : "",
        className
      )}
    >
      {/* Header - Draggable handle */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none bg-gray-50/50 dark:bg-slate-800/50 rounded-t-xl"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <GripHorizontal className="h-4 w-4 text-gray-400" />
          {title}
        </div>
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          {headerActions}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-0">
        {children}
      </div>
    </div>
  );
}
