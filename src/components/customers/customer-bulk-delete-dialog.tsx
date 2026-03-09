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
import { AlertTriangle, Loader2, Users } from "lucide-react";

interface CustomerBulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  selectedCount: number;
  isLoading?: boolean;
}

export function CustomerBulkDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isLoading = false,
}: CustomerBulkDeleteDialogProps) {
  if (selectedCount === 0) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Eliminar Múltiples Clientes
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="p-2 bg-red-100 dark:bg-red-950/30 rounded-full">
                  <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedCount} cliente{selectedCount > 1 ? "s" : ""} seleccionado{selectedCount > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Serán eliminados permanentemente
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                  ⚠️ Esta acción no se puede deshacer
                </p>
                <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
                  <li>Se eliminarán todas las direcciones asociadas</li>
                  <li>Se eliminarán todos los contactos</li>
                  <li>El historial de órdenes quedará huérfano</li>
                </ul>
              </div>
              
              <p className="text-sm text-muted-foreground">
                <strong>Recomendación:</strong> En lugar de eliminar, considera desactivar los 
                clientes para mantener el historial y datos asociados.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>Eliminar {selectedCount} cliente{selectedCount > 1 ? "s" : ""}</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
