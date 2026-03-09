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
import { AlertTriangle, Loader2 } from "lucide-react";
import { Customer } from "@/types/models";

interface CustomerDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  customer: Customer | null;
  isLoading?: boolean;
}

export function CustomerDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  customer,
  isLoading = false,
}: CustomerDeleteDialogProps) {
  if (!customer) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Eliminar Cliente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                ¿Estás seguro de que deseas eliminar el cliente{" "}
                <span className="font-semibold text-foreground">{customer.name}</span>?
              </p>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                  Esta acción no se puede deshacer
                </p>
                <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
                  <li>Se eliminarán todas las direcciones asociadas</li>
                  <li>Se eliminarán todos los contactos</li>
                  <li>El historial de órdenes quedará huérfano</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Recomendación:</strong> En lugar de eliminar, considera desactivar el cliente
                para mantener el historial.
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
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar Cliente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
