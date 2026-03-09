"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  /** Etiqueta singular del elemento (ej: "conductor", "vehículo") */
  itemLabel: string;
  /** Etiqueta plural del elemento (ej: "conductores", "vehículos") */
  itemLabelPlural: string;
  /** Callback al confirmar eliminación */
  onConfirm: () => void;
  /** Si está procesando la eliminación */
  isDeleting?: boolean;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  itemLabel,
  itemLabelPlural,
  onConfirm,
  isDeleting = false,
}: BulkDeleteDialogProps) {
  const label = selectedCount === 1 ? itemLabel : itemLabelPlural;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmar eliminación masiva
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              ¿Estás seguro de que deseas eliminar{" "}
              <span className="font-semibold text-foreground">
                {selectedCount} {label}
              </span>
              ?
            </p>
            <p className="text-yellow-600 dark:text-yellow-500">
              ⚠️ Esta acción no se puede deshacer. Todos los datos asociados 
              a {selectedCount === 1 ? `este ${itemLabel}` : `estos ${itemLabelPlural}`} serán eliminados permanentemente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : `Eliminar ${selectedCount} ${label}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
