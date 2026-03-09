"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Variantes de estilo del toast
 */
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
        error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
        info: "border-[#34b7ff]/30 bg-[#34b7ff]/10 text-[#34b7ff] dark:border-[#34b7ff]/20 dark:bg-[#34b7ff]/20 dark:text-[#34b7ff]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * Iconos por variante
 */
const VARIANT_ICONS = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Tipos de toast
 */
export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

/**
 * Datos de un toast
 */
export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Props del componente Toast
 */
interface ToastProps extends VariantProps<typeof toastVariants> {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

/**
 * Componente Toast individual
 */
const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ toast, onDismiss, variant }, ref) => {
    const Icon = VARIANT_ICONS[toast.variant || "default"];
    
    React.useEffect(() => {
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        const timer = setTimeout(() => {
          onDismiss(toast.id);
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [toast.id, toast.duration, onDismiss]);
    
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant: toast.variant || variant }))}
        role="alert"
      >
        <div className="flex items-start gap-3 flex-1">
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description && (
              <p className="text-sm opacity-90 mt-1">{toast.description}</p>
            )}
          </div>
        </div>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium underline-offset-4 hover:underline shrink-0"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={() => onDismiss(toast.id)}
          className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>
      </div>
    );
  }
);
Toast.displayName = "Toast";

/**
 * Contenedor de toasts
 */
interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

const positionClasses = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

export function ToastContainer({ 
  toasts, 
  onDismiss, 
  position = "top-right" 
}: ToastContainerProps) {
  if (toasts.length === 0) return null;
  
  return (
    <div
      className={cn(
        "fixed z-100 flex flex-col gap-2 w-full max-w-105 pointer-events-none",
        positionClasses[position]
      )}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

/**
 * Contexto para el sistema de toasts
 */
interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

/**
 * Provider del sistema de toasts
 */
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastContainerProps["position"];
  maxToasts?: number;
}

export function ToastProvider({ 
  children, 
  position = "top-right",
  maxToasts = 5 
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  
  const addToast = React.useCallback((toast: Omit<ToastData, "id">): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts((prev) => {
      const newToasts = [{ ...toast, id }, ...prev];
      // Limitar cantidad de toasts
      return newToasts.slice(0, maxToasts);
    });
    
    return id;
  }, [maxToasts]);
  
  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  
  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);
  
  const success = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: "success" });
  }, [addToast]);
  
  const error = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: "error", duration: 7000 });
  }, [addToast]);
  
  const warning = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: "warning" });
  }, [addToast]);
  
  const info = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: "info" });
  }, [addToast]);
  
  const contextValue = React.useMemo<ToastContextValue>(() => ({
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  }), [toasts, addToast, removeToast, clearToasts, success, error, warning, info]);
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer 
        toasts={toasts} 
        onDismiss={removeToast} 
        position={position} 
      />
    </ToastContext.Provider>
  );
}

/**
 * Hook para usar el sistema de toasts
 */
export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
}

export { Toast, toastVariants };
