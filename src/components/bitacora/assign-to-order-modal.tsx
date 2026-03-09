'use client';

/**
 * Modal para asignar un evento de bitácora a una orden existente.
 * Permite buscar y filtrar órdenes por número, placa o cliente,
 * y vincular el evento seleccionado a una orden.
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Search,
  Check,
  Truck,
  Calendar,
  Loader2,
  Package,
  ArrowRight,
} from 'lucide-react';
import type { BitacoraEntry } from '@/types/bitacora';
import type { Order } from '@/types/order';

interface AssignToOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: BitacoraEntry | null;
  orders: Order[];
  onConfirm: (entryId: string, orderId: string, orderNumber: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  in_transit: { label: 'En tránsito', variant: 'default' },
  delivered: { label: 'Entregado', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  assigned: { label: 'Asignado', variant: 'default' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  picked_up: { label: 'Recogido', variant: 'default' },
  at_destination: { label: 'En destino', variant: 'default' },
  delayed: { label: 'Retrasado', variant: 'destructive' },
};

export function AssignToOrderModal({
  open,
  onOpenChange,
  entry,
  orders,
  onConfirm,
}: AssignToOrderModalProps) {
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtrar órdenes activas y por texto de búsqueda
  const filteredOrders = useMemo(() => {
    const activeOrders = orders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.status)
    );

    if (!search.trim()) return activeOrders.slice(0, 20);

    const q = search.toLowerCase();
    return activeOrders.filter((o) => {
      const orderNum = o.orderNumber?.toLowerCase() || '';
      const vehicle = o.vehicleId?.toLowerCase() || '';
      const customer = o.customerId?.toLowerCase() || '';
      return orderNum.includes(q) || vehicle.includes(q) || customer.includes(q);
    }).slice(0, 20);
  }, [orders, search]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleConfirm = async () => {
    if (!entry || !selectedOrder) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    onConfirm(entry.id, selectedOrder.id, selectedOrder.orderNumber || selectedOrder.id);
    setLoading(false);
    setSelectedOrderId(null);
    setSearch('');
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setSelectedOrderId(null);
      setSearch('');
    }
    onOpenChange(value);
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Asignar a orden existente
          </DialogTitle>
          <DialogDescription>
            Vincular el evento <span className="font-semibold text-foreground">{entry.id}</span> a
            una orden de transporte existente.
          </DialogDescription>
        </DialogHeader>

        {/* Info resumida del evento */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2.5 border text-sm">
          <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{entry.vehiclePlate}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground truncate">
            {entry.geofenceName || entry.address || 'Ubicación desconocida'}
          </span>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por N° orden, placa o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de órdenes */}
        <div className="flex-1 min-h-0 max-h-[280px] border rounded-lg overflow-y-auto">
          <div className="p-1">
            {filteredOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No se encontraron órdenes activas
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const statusInfo = STATUS_LABELS[order.status] || { label: order.status, variant: 'outline' as const };
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                    className={`w-full text-left p-3 rounded-md mb-1 transition-all border ${
                      isSelected
                        ? 'bg-primary/5 border-primary ring-1 ring-primary/30'
                        : 'bg-background border-transparent hover:bg-accent hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <span className="font-semibold text-sm">
                          {order.orderNumber || order.id}
                        </span>
                      </div>
                      <Badge variant={statusInfo.variant} className="text-[10px]">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {order.vehicleId && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {order.vehicleId}
                        </span>
                      )}
                      {order.scheduledStartDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.scheduledStartDate).toLocaleDateString('es-PE')}
                        </span>
                      )}
                      {order.customerId && (
                        <span className="truncate max-w-[150px]">{order.customerId}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {filteredOrders.length > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Mostrando {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''} activa{filteredOrders.length !== 1 ? 's' : ''}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !selectedOrderId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Asignando...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Asignar a orden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
