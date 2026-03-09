'use client';

/**
 * Modal para mostrar los detalles completos de un evento de bitácora.
 * Muestra toda la información disponible del evento de forma organizada.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Navigation,
  Gauge,
  Route,
  Shield,
  Package,
  Eye,
  StickyNote,
} from 'lucide-react';
import type { BitacoraEntry } from '@/types/bitacora';

interface EntryDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: BitacoraEntry | null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  entry: 'Ingreso a geocerca',
  exit: 'Salida de geocerca',
  unplanned_stop: 'Parada no planificada',
  unplanned_route: 'Recorrido no planificado',
  dwell: 'Permanencia prolongada',
  deviation: 'Desviación de ruta',
  idle: 'Tiempo inactivo',
  speeding: 'Exceso de velocidad',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  reviewed: { label: 'Revisado', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  order_created: { label: 'Orden creada', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  dismissed: { label: 'Descartado', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Media', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Crítica', color: 'bg-red-100 text-red-700' },
};

const SOURCE_LABELS: Record<string, string> = {
  automatic: 'Automático',
  manual: 'Manual',
  geofence: 'Geocerca',
  monitoring: 'Monitoreo',
};

function DetailRow({ icon: Icon, label, value, className = '' }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </div>
        <div className="text-sm font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export function EntryDetailModal({
  open,
  onOpenChange,
  entry,
}: EntryDetailModalProps) {
  if (!entry) return null;

  const statusConf = STATUS_CONFIG[entry.status] || STATUS_CONFIG.active;
  const severityConf = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.low;

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}min`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detalle del evento
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="font-mono text-foreground font-semibold">{entry.id}</span>
            <Badge className={`text-[10px] ${statusConf.color}`}>
              {statusConf.label}
            </Badge>
            <Badge className={`text-[10px] ${severityConf.color}`}>
              Severidad: {severityConf.label}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Tipo de evento */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">
              {EVENT_TYPE_LABELS[entry.eventType] || entry.eventType}
            </span>
          </div>
          {entry.description && (
            <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">
              {entry.wasExpected ? '✓ Esperado' : '✗ No esperado'}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Fuente: {SOURCE_LABELS[entry.source] || entry.source}
            </Badge>
          </div>
        </div>

        {/* Grid de detalles */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Vehículo y conductor
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={Truck} label="Vehículo" value={entry.vehiclePlate} />
            <DetailRow
              icon={User}
              label="Conductor"
              value={entry.driverName || 'No asignado'}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Ubicación
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow
              icon={MapPin}
              label="Geocerca"
              value={entry.geofenceName || 'Sin geocerca'}
            />
            <DetailRow
              icon={Navigation}
              label="Coordenadas"
              value={`${entry.coordinates.lat.toFixed(5)}, ${entry.coordinates.lng.toFixed(5)}`}
            />
          </div>
          {entry.address && (
            <DetailRow
              icon={MapPin}
              label="Dirección"
              value={entry.address}
              className="mt-3"
            />
          )}
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Tiempos
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow
              icon={Calendar}
              label="Inicio"
              value={new Date(entry.startTimestamp).toLocaleString('es-PE')}
            />
            {entry.endTimestamp && (
              <DetailRow
                icon={Calendar}
                label="Fin"
                value={new Date(entry.endTimestamp).toLocaleString('es-PE')}
              />
            )}
            {entry.durationMinutes && (
              <DetailRow
                icon={Clock}
                label="Duración"
                value={formatDuration(entry.durationMinutes)}
              />
            )}
            {entry.dwellTimeMinutes && (
              <DetailRow
                icon={Clock}
                label="Tiempo de permanencia"
                value={formatDuration(entry.dwellTimeMinutes)}
              />
            )}
          </div>
        </div>

        {/* Datos adicionales */}
        {(entry.speed || entry.deviationKm) && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Datos adicionales
              </div>
              <div className="grid grid-cols-2 gap-3">
                {entry.speed !== undefined && (
                  <DetailRow
                    icon={Gauge}
                    label="Velocidad"
                    value={`${entry.speed} km/h`}
                  />
                )}
                {entry.deviationKm !== undefined && (
                  <DetailRow
                    icon={Route}
                    label="Desviación"
                    value={`${entry.deviationKm} km`}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Órdenes vinculadas */}
        {(entry.relatedOrderNumber || entry.createdOrderNumber) && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Órdenes vinculadas
              </div>
              <div className="grid grid-cols-2 gap-3">
                {entry.relatedOrderNumber && (
                  <DetailRow
                    icon={Package}
                    label="Orden relacionada"
                    value={entry.relatedOrderNumber}
                  />
                )}
                {entry.createdOrderNumber && (
                  <DetailRow
                    icon={Package}
                    label="Orden creada"
                    value={entry.createdOrderNumber}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Revisión */}
        {entry.reviewedBy && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Revisión
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DetailRow
                  icon={Eye}
                  label="Revisado por"
                  value={entry.reviewedBy}
                />
                {entry.reviewedAt && (
                  <DetailRow
                    icon={Calendar}
                    label="Fecha de revisión"
                    value={new Date(entry.reviewedAt).toLocaleString('es-PE')}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Notas del operador */}
        {entry.operatorNotes && (
          <>
            <Separator />
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                <StickyNote className="h-3 w-3" />
                Notas del operador
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-300">{entry.operatorNotes}</p>
            </div>
          </>
        )}

        {/* Auditoría */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 border">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            ID: {entry.id}
          </div>
          <span>Vehículo ID: {entry.vehicleId}</span>
          {entry.driverId && <span>Conductor ID: {entry.driverId}</span>}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
