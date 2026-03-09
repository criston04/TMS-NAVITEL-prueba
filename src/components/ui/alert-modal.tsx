"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "error";

const VARIANT_CONFIG: Record<AlertVariant, { icon: React.ElementType; color: string; bgColor: string }> = {
  info: { icon: Info, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950" },
  success: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950" },
  error: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950" },
};

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  variant?: AlertVariant;
  buttonText?: string;
}

/**
 * Modal de alerta informativa con un solo botón "Aceptar".
 * Reemplaza los alert() nativos del navegador.
 * 
 * Variantes: info (default), success, warning, error
 */
export function AlertModal({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  buttonText = "Aceptar",
}: AlertModalProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
