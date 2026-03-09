/**
 * NavGroup Component - Grupo de navegación colapsable con título y items
 * Estructura: OPERACIONES, FINANZAS, MAESTRO, etc.
 */

"use client";

import { useState, type FC } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroupProps } from "@/types/navigation";
import { NavLink } from "./nav-link";

export const NavGroup: FC<Readonly<NavGroupProps>> = ({
  group,
  isCollapsed,
  isActive,
}) => {
  // Las secciones inician expandidas; si algún item está activo, queda abierto
  const hasActiveItem = group.items.some(item => isActive(item.href));
  const [isExpanded, setIsExpanded] = useState(true);

  // Cuando el sidebar está colapsado, siempre mostrar items (sin título)
  if (isCollapsed) {
    return (
      <div className="mb-3">
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={isActive(item.href)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1">
      {/* Título del grupo - clickeable para colapsar/expandir */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className={cn(
          "flex w-full items-center justify-between px-2.5 py-1.5 rounded-md",
          "text-[10px] font-semibold uppercase tracking-wider",
          "text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50",
          "transition-all duration-200 ease-out select-none"
        )}
      >
        <span>{group.groupTitle}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            !isExpanded && "-rotate-90"
          )}
        />
      </button>

      {/* Items del grupo con animación de colapso */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-0.5 mt-0.5">
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isCollapsed={isCollapsed}
              isActive={isActive(item.href)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};