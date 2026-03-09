'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import type { CreateOrderDTO } from '@/types/order';

// Componentes
import { PageWrapper } from '@/components/page-wrapper';
import { Button } from '@/components/ui/button';
import { OrderFormWizard } from '@/components/orders/order-form-wizard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useOrders } from '@/hooks/useOrders';

// COMPONENTE PRINCIPAL

export default function NewOrderPage() {
  const router = useRouter();
  const { createOrder } = useOrders({ autoFetch: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Volver a la lista
  const handleBack = useCallback(() => {
    router.push('/orders');
  }, [router]);

  // Crear orden
  const handleSubmit = useCallback(async (data: CreateOrderDTO) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.info('[NewOrderPage] Creando orden con datos:', data);
      
      // Llamar al hook que encapsula el servicio con workflows
      const createdOrder = await createOrder(data);
      
      console.info('[NewOrderPage] Orden creada exitosamente:', {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        workflowId: createdOrder.workflowId,
        workflowName: createdOrder.workflowName,
        status: createdOrder.status,
      });

      setCreatedOrderId(createdOrder.id);
      setCreatedOrderNumber(createdOrder.orderNumber);
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('[NewOrderPage] Error al crear orden:', err);
      setError(err instanceof Error ? err.message : 'Error al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Ir al detalle de la orden creada
  const handleGoToOrder = useCallback(() => {
    if (createdOrderId) {
      router.push(`/orders/${createdOrderId}`);
    }
  }, [router, createdOrderId]);

  // Ir a la lista de órdenes
  const handleGoToList = useCallback(() => {
    router.push('/orders');
  }, [router]);

  // Crear otra orden
  const handleCreateAnother = useCallback(() => {
    setShowSuccessDialog(false);
    setCreatedOrderId(null);
    setCreatedOrderNumber(null);
    // El formulario se resetea automáticamente al recargar
    router.refresh();
  }, [router]);

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Nueva Orden
            </h1>
            <p className="text-muted-foreground">
              Crea una nueva orden de transporte
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <p className="font-medium">Error al crear la orden</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <OrderFormWizard
          onSubmit={handleSubmit}
          onCancel={handleBack}
          isSubmitting={isSubmitting}
        />

        {/* Dialog de éxito */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Package className="w-5 h-5" />
                ¡Orden Creada Exitosamente!
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    La orden <strong>{createdOrderNumber}</strong> ha sido creada correctamente.
                  </p>
                  <p>
                    El workflow ha sido asignado automáticamente basado en el cliente y tipo de carga.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleGoToList}>
                Ir a la lista
              </Button>
              <Button variant="outline" onClick={handleCreateAnother}>
                Crear otra orden
              </Button>
              <Button onClick={handleGoToOrder}>
                Ver orden creada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
