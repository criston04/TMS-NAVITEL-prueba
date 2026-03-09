'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';

import { useOrder, useOrders } from '@/hooks/useOrders';

import type { CreateOrderDTO } from '@/types/order';

// Componentes
import { PageWrapper } from '@/components/page-wrapper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderFormWizard } from '@/components/orders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderEditPageProps {
  params: Promise<{ id: string }>;
}

// COMPONENTE SKELETON

function OrderEditSkeleton() {
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40 mt-1" />
          </div>
        </div>

        {/* Form skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </PageWrapper>
  );
}

// COMPONENTE PRINCIPAL

export default function OrderEditPage({ params }: OrderEditPageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const { order, isLoading: orderLoading, error: orderError } = useOrder(id);
  const { updateOrder } = useOrders();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Handlers
  const handleBack = () => {
    router.push(`/orders/${id}`);
  };

  const handleSubmit = async (data: CreateOrderDTO) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.info('[OrderEditPage] Actualizando orden:', { id, data });
      
      await updateOrder(id, data);
      
      console.info('[OrderEditPage] Orden actualizada exitosamente');
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('[OrderEditPage] Error al actualizar orden:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar la orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDetail = () => {
    router.push(`/orders/${id}`);
  };

  const handleGoToList = () => {
    router.push('/orders');
  };

  // Loading state
  if (orderLoading) {
    return <OrderEditSkeleton />;
  }

  // Error state
  if (orderError || !order) {
    return (
      <PageWrapper>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Error</h1>
              <p className="text-muted-foreground">
                No se pudo cargar la orden
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <p className="font-medium">Error al cargar la orden</p>
            <p className="text-sm mt-1">{orderError || 'La orden no existe'}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/orders')}
            >
              Volver a la lista
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

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
              Editar Orden {order.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              Modifica los datos de la orden de transporte
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <p className="font-medium">Error al actualizar la orden</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <OrderFormWizard
          initialData={{
            customerId: order.customerId,
            carrierId: order.carrierId,
            vehicleId: order.vehicleId,
            driverId: order.driverId,
            workflowId: order.workflowId,
            priority: order.priority,
            cargo: order.cargo,
            milestones: order.milestones.map(m => ({
              geofenceId: m.geofenceId,
              geofenceName: m.geofenceName,
              type: m.type,
              sequence: m.sequence,
              address: m.address,
              coordinates: m.coordinates,
              estimatedArrival: m.estimatedArrival,
              estimatedDeparture: m.estimatedDeparture,
              notes: m.notes,
              contact: m.contact,
            })),
            scheduledStartDate: order.scheduledStartDate,
            scheduledEndDate: order.scheduledEndDate,
            externalReference: order.externalReference,
            notes: order.notes,
            tags: order.tags || [],
            serviceType: order.serviceType,
          }}
          onSubmit={handleSubmit}
          onCancel={handleBack}
          isSubmitting={isSubmitting}
          mode="edit"
        />

        {/* Dialog de éxito */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Package className="w-5 h-5" />
                ¡Orden Actualizada!
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    La orden <strong>{order.orderNumber}</strong> ha sido actualizada correctamente.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleGoToList}>
                Ir a la lista
              </Button>
              <Button onClick={handleGoToDetail}>
                Ver orden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
