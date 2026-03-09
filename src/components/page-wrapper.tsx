"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

/**
 * Props para el componente PageWrapper
 * @interface PageWrapperProps
 */
interface PageWrapperProps {
  /** Contenido de la página */
  children: ReactNode;
  /** Clases CSS adicionales */
  className?: string;
  /** Título de la página (opcional) */
  title?: string;
  /** Descripción de la página (opcional) */
  description?: string;
  /** Acciones para el header como botones (opcional) */
  actions?: ReactNode;
  /** Sin padding - para páginas con layout propio como Scheduling */
  noPadding?: boolean;
}

export function PageWrapper({
  children,
  className,
  title,
  description,
  actions,
  noPadding = false,
}: Readonly<PageWrapperProps>) {
  return (
    <div
      className={cn(
        // Spacing - responsive padding
        !noPadding && 'p-3 sm:p-4 md:p-6',
        'space-y-3 sm:space-y-4',
        // Animation
        'animate-fade-in',
        className
      )}
    >
      {/* Page Header */}
      {(title || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title && (
            <div className="animate-slide-in-left">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap animate-slide-in-right">{actions}</div>
          )}
        </div>
      )}

      {/* Page Content */}
      {children}
    </div>
  );
}
