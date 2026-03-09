'use client';

import { use, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Send,
  Download,
  Clock,
  MapPin,
  Truck,
  User,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PlayCircle,
  Lock,
  Calendar,
  FileText,
  ClipboardEdit,
  Trash2,
  Printer,
} from 'lucide-react';
// No se necesitan imports de tipo aquí, se infieren de los hooks

import { useOrder, useOrders } from '@/hooks/useOrders';
import { useWorkflowProgress } from '@/hooks/useWorkflows';
import { useOrderIncidents } from '@/hooks/useIncidents';
import { useOrderExport } from '@/hooks/useOrderImportExport';
import { useToast } from '@/components/ui/toast';
import { AlertModal } from '@/components/ui/alert-modal';
import { useTranslations } from '@/contexts/locale-context';

// Componentes
import { PageWrapper } from '@/components/page-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTimeline, STATUS_CONFIG, PRIORITY_CONFIG, MilestoneManualEntryModal, printOrderReport } from '@/components/orders';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { OrderMilestone } from '@/types/order';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Formatea una fecha
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Formatea fecha corta
 */
function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// COMPONENTE SKELETON

function OrderDetailSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>

        {/* Cards principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

// COMPONENTE PRINCIPAL

/**
 * Página de detalle de una orden
 */
export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'timeline' | 'incidents' | 'history'>('timeline');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<OrderMilestone | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeObservations, setCloseObservations] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { order, isLoading, error, startTrip, sendToExternal } = useOrder(id, {
    realtimeUpdates: true,
  });
  const { closeOrder, deleteOrder } = useOrders({ autoFetch: false });
  const { progress, percentComplete, nextStep } = useWorkflowProgress(order);
  const { incidents, pendingIncidents } = useOrderIncidents(id);
  const { exportOrders } = useOrderExport();
  const { success: toastSuccess, error: toastError } = useToast();
  const t = useTranslations();
  const [printBlockedAlert, setPrintBlockedAlert] = useState(false);

  // Navegación
  const handleBack = useCallback(() => {
    router.push('/orders');
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/orders/${id}/edit`);
  }, [router, id]);

  const handleStartTrip = useCallback(async () => {
    await startTrip();
  }, [startTrip]);

  const handleSendToExternal = useCallback(async () => {
    await sendToExternal();
  }, [sendToExternal]);

  const handleExport = useCallback(async () => {
    if (order) {
      await exportOrders([order]);
    }
  }, [order, exportOrders]);

  /**
   * Abre modal de llenado manual para un hito
   */
  const handleMilestoneManualEntry = useCallback((milestone: OrderMilestone) => {
    setSelectedMilestone(milestone);
    setManualEntryOpen(true);
  }, []);

  /**
   * Guarda el registro manual de un hito
   */
  const handleSaveManualEntry = useCallback(async (milestoneId: string, data: {
    actualEntry: string;
    actualExit?: string;
    isManual: true;
    manualEntryData: {
      registeredBy: string;
      registeredAt: string;
      observation: string;
      reason: 'sin_senal_gps' | 'falla_equipo' | 'carga_retroactiva' | 'correccion' | 'otro';
    };
  }) => {
    try {
      // Simulación del guardado - en producción llamará al servicio real
      const { orderService } = await import('@/services/orders');
      await orderService.updateMilestone(id, milestoneId, {
        actualEntry: data.actualEntry,
        actualExit: data.actualExit,
        isManual: data.isManual,
        manualEntryData: data.manualEntryData,
      });
      toastSuccess('Hito actualizado', `Registro manual del hito guardado correctamente`);
    } catch {
      toastError('Error', 'No se pudo guardar el registro manual del hito');
    } finally {
      setManualEntryOpen(false);
      setSelectedMilestone(null);
    }
  }, [id, toastSuccess, toastError]);

  /**
   * Cierra la orden (cambia estado a 'closed')
   */
  const handleCloseOrder = useCallback(async () => {
    if (!order) return;
    setIsClosing(true);
    try {
      await closeOrder(order.id, {
        observations: closeObservations || 'Cierre de orden desde detalle',
        incidents: [],
        deviationReasons: [],
        closedBy: 'current-user',
        closedByName: 'Usuario Actual',
      });
      toastSuccess(t('orders.orderClosed'), `${order.orderNumber}`);
      setCloseDialogOpen(false);
      setCloseObservations('');
    } catch {
      toastError(t('common.error'), t('orders.closeError'));
    } finally {
      setIsClosing(false);
    }
  }, [order, closeOrder, closeObservations, toastSuccess, toastError]);

  /**
   * Elimina la orden
   */
  const handleDeleteOrder = useCallback(async () => {
    if (!order) return;
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      toastSuccess(t('orders.orderDeleted'), `${order.orderNumber}`);
      router.push('/orders');
    } catch {
      toastError(t('common.error'), t('orders.deleteError'));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [order, deleteOrder, router, toastSuccess, toastError]);

  // Loading
  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  // Error o no encontrado
  if (error || !order) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-100">
          <XCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Orden no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'La orden que buscas no existe o fue eliminada'}
          </p>
          <Button onClick={handleBack}>Volver a órdenes</Button>
        </div>
      </PageWrapper>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status];
  const priorityConfig = PRIORITY_CONFIG[order.priority];
  const StatusIcon = statusConfig.icon;

  // Determinar acciones disponibles
  const canStartTrip = order.status === 'assigned' && order.vehicle && order.driver;
  const canSendToExternal = order.status === 'pending' || order.status === 'assigned';
  const canClose = order.status === 'completed';

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{order.orderNumber}</h1>
                <Badge className={cn('text-sm', statusConfig.className)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className={priorityConfig.className}>
                  {priorityConfig.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {order.customer?.name || 'Cliente no disponible'}
                {order.customer?.code && ` (${order.customer.code})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canStartTrip && (
              <Button className="gap-2" onClick={handleStartTrip}>
                <PlayCircle className="w-4 h-4" />
                Iniciar viaje
              </Button>
            )}
            {canSendToExternal && (
              <Button variant="outline" className="gap-2" onClick={handleSendToExternal}>
                <Send className="w-4 h-4" />
                Enviar
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => { if (!printOrderReport(order)) setPrintBlockedAlert(true); }} title="Imprimir orden">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleEdit}>
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progreso del workflow */}
        {progress && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progreso del viaje</span>
                <span className="text-sm text-muted-foreground">{percentComplete}%</span>
              </div>
              <Progress value={percentComplete} className="h-2" />
              {nextStep && (
                <p className="text-sm text-muted-foreground mt-2">
                  Siguiente: <span className="font-medium">{nextStep.name}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Timeline y tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b">
              <button
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === 'timeline'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setActiveTab('timeline')}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Timeline
              </button>
              <button
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === 'incidents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setActiveTab('incidents')}
              >
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Incidencias
                {pendingIncidents.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingIncidents.length}
                  </Badge>
                )}
              </button>
              <button
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setActiveTab('history')}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Historial
              </button>
            </div>

            {/* Contenido del tab */}
            <Card>
              <CardContent className="p-6">
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {/* Botón de registro manual */}
                    {order.status !== 'completed' && order.status !== 'closed' && order.status !== 'cancelled' && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2">
                          <ClipboardEdit className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-orange-700 dark:text-orange-400">
                            ¿Sin señal GPS? Registre un hito manualmente haciendo clic en él.
                          </span>
                        </div>
                      </div>
                    )}
                    <OrderTimeline
                      order={order}
                      showTimes
                      interactive
                      onMilestoneClick={handleMilestoneManualEntry}
                    />
                  </div>
                )}

                {activeTab === 'incidents' && (
                  <div className="space-y-4">
                    {incidents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hay incidencias registradas</p>
                      </div>
                    ) : (
                      incidents.map((incident) => (
                        <div
                          key={incident.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <AlertTriangle
                            className={cn(
                              'w-5 h-5 mt-0.5',
                              incident.severity === 'critical' && 'text-red-500',
                              incident.severity === 'high' && 'text-orange-500',
                              incident.severity === 'medium' && 'text-yellow-500',
                              incident.severity === 'low' && 'text-gray-500'
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{incident.description}</span>
                              <Badge variant={incident.resolutionStatus === 'resolved' ? 'secondary' : 'destructive'}>
                                {incident.resolutionStatus === 'resolved' ? 'Resuelto' : 'Pendiente'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatShortDate(new Date(incident.reportedAt))}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-3">
                    {order.statusHistory.map((history, index) => (
                      <div
                        key={history.id || index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {STATUS_CONFIG[history.toStatus]?.label || history.toStatus}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatShortDate(new Date(history.changedAt))}
                            </span>
                          </div>
                          {history.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {history.reason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Por: {history.changedByName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha - Info */}
          <div className="space-y-6">
            {/* Información general */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información general</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de carga</p>
                    <p className="font-medium">{order.cargo.type}</p>
                  </div>
                </div>

                {Boolean(order.cargo.weightKg) && (
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Peso</p>
                      <p className="font-medium">{order.cargo.weightKg.toLocaleString()} kg</p>
                    </div>
                  </div>
                )}

                {order.serviceType && (
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de servicio</p>
                      <p className="font-medium capitalize">{order.serviceType.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                )}

                {order.reference && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Referencia</p>
                      <p className="font-medium font-mono">{order.reference}</p>
                    </div>
                  </div>
                )}

                {order.externalReference && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ref. externa</p>
                      <p className="font-medium font-mono text-muted-foreground">{order.externalReference}</p>
                    </div>
                  </div>
                )}

                <Separator />

                {order.vehicle && (
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vehículo</p>
                      <p className="font-medium">{order.vehicle.plate}</p>
                      <p className="text-xs text-muted-foreground">{order.vehicle.type}</p>
                    </div>
                  </div>
                )}

                {order.driver && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Operador</p>
                      <p className="font-medium">{order.driver.fullName}</p>
                      {order.driver.phone && (
                        <p className="text-xs text-muted-foreground">{order.driver.phone}</p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Creada</p>
                    <p className="font-medium">{formatDate(new Date(order.createdAt))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carrier y GPS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asignaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transportista</p>
                  <p className="font-medium">{order.carrierName || 'Sin asignar'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Operador GPS</p>
                  <p className="font-medium">{order.gpsOperatorName || 'Sin asignar'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Cierre de orden */}
            {canClose && (
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-lg text-green-600">
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Cerrar orden
                  </CardTitle>
                  <CardDescription>
                    Esta orden está lista para ser cerrada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full gap-2"
                    variant="default"
                    onClick={() => setCloseDialogOpen(true)}
                  >
                    <Lock className="w-4 h-4" />
                    Cerrar orden
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Eliminar orden */}
            {order.status === 'draft' || order.status === 'pending' ? (
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <Button
                    className="w-full gap-2"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar orden
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {/* Notas */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <FileText className="w-5 h-5 inline mr-2" />
                    Notas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal de registro manual de hitos */}
      <MilestoneManualEntryModal
        open={manualEntryOpen}
        onClose={() => { setManualEntryOpen(false); setSelectedMilestone(null); }}
        milestone={selectedMilestone}
        onSave={handleSaveManualEntry}
      />

      {/* Dialog de cierre de orden */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Lock className="w-5 h-5" />
              {t('orders.closeOrder')}
            </DialogTitle>
            <DialogDescription>
              {t('orders.closeOrderDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="closeObservations">{t('orders.closeObservations')}</Label>
              <Textarea
                id="closeObservations"
                placeholder={t('orders.closeObservationsPlaceholder')}
                value={closeObservations}
                onChange={(e) => setCloseObservations(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)} disabled={isClosing}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCloseOrder} disabled={isClosing}>
              {isClosing ? t('orders.closing') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('orders.deleteOrderConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('orders.deleteOrderDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? `${t('common.loading')}` : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertModal
        open={printBlockedAlert}
        onOpenChange={setPrintBlockedAlert}
        title="Ventana bloqueada"
        description="El navegador bloqueó la ventana de impresión. Por favor, permita las ventanas emergentes para este sitio e intente nuevamente."
        variant="error"
      />
    </PageWrapper>
  );
}
