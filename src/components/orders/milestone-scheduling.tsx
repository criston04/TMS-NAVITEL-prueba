'use client';

import { useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MilestoneFormData } from './milestone-editor';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface MilestoneScheduleData {
  milestoneId: string;
  enabled: boolean;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
}

interface MilestoneSchedulingProps {
  milestones: MilestoneFormData[];
  schedules: MilestoneScheduleData[];
  onChange: (schedules: MilestoneScheduleData[]) => void;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const MILESTONE_TYPE_CONFIG: Record<
  'origin' | 'waypoint' | 'destination',
  { label: string; color: string; bgColor: string }
> = {
  origin: {
    label: 'Origen',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-500',
  },
  waypoint: {
    label: 'Parada',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-500',
  },
  destination: {
    label: 'Destino',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-500',
  },
};

// ─── Componente ──────────────────────────────────────────────────────────────

export function MilestoneScheduling({
  milestones,
  schedules,
  onChange,
}: MilestoneSchedulingProps) {
  const updateSchedule = useCallback(
    (milestoneId: string, updates: Partial<MilestoneScheduleData>) => {
      onChange(
        schedules.map((s) =>
          s.milestoneId === milestoneId ? { ...s, ...updates } : s
        )
      );
    },
    [schedules, onChange]
  );

  const toggleSchedule = useCallback(
    (milestoneId: string, enabled: boolean) => {
      updateSchedule(milestoneId, {
        enabled,
        // Limpiar fechas al deshabilitar
        ...(enabled ? {} : { arrivalDate: '', arrivalTime: '08:00', departureDate: '', departureTime: '' }),
      });
    },
    [updateSchedule]
  );

  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay hitos definidos. Agrega hitos en el paso anterior para configurar la programación.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Programación por Hito
        </CardTitle>
        <CardDescription>
          Configura las fechas de llegada y salida para cada punto de la ruta. Puedes desactivar la programación en los hitos que no la requieran.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {milestones.map((milestone, index) => {
          const schedule = schedules.find((s) => s.milestoneId === milestone.id);
          if (!schedule) return null;

          const typeConfig = MILESTONE_TYPE_CONFIG[milestone.type];

          return (
            <div
              key={milestone.id}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                schedule.enabled
                  ? 'border-border bg-card'
                  : 'border-dashed border-muted-foreground/30 bg-muted/30'
              )}
            >
              {/* Encabezado del hito */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Marcador numerado */}
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
                      typeConfig.bgColor
                    )}
                  >
                    {milestone.sequence}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {milestone.geofenceName}
                      </span>
                      <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                        {typeConfig.label}
                      </Badge>
                    </div>
                    {milestone.address && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {milestone.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {schedule.enabled ? 'Programado' : 'Sin programación'}
                  </span>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(checked) => toggleSchedule(milestone.id, checked)}
                    aria-label={`${schedule.enabled ? 'Desactivar' : 'Activar'} programación para ${milestone.geofenceName}`}
                  />
                </div>
              </div>

              {/* Campos de fecha/hora (visible solo si enabled) */}
              {schedule.enabled && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
                  {/* Llegada */}
                  <div className="space-y-2">
                    <Label
                      htmlFor={`arrival-date-${milestone.id}`}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      Llegada estimada
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`arrival-date-${milestone.id}`}
                        type="date"
                        value={schedule.arrivalDate}
                        onChange={(e) =>
                          updateSchedule(milestone.id, { arrivalDate: e.target.value })
                        }
                        className="flex-1"
                        aria-label={`Fecha de llegada a ${milestone.geofenceName}`}
                      />
                      <Input
                        type="time"
                        value={schedule.arrivalTime}
                        onChange={(e) =>
                          updateSchedule(milestone.id, { arrivalTime: e.target.value })
                        }
                        className="w-24 sm:w-28"
                        aria-label={`Hora de llegada a ${milestone.geofenceName}`}
                      />
                    </div>
                  </div>

                  {/* Salida */}
                  <div className="space-y-2">
                    <Label
                      htmlFor={`departure-date-${milestone.id}`}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      Salida estimada
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`departure-date-${milestone.id}`}
                        type="date"
                        value={schedule.departureDate}
                        onChange={(e) =>
                          updateSchedule(milestone.id, { departureDate: e.target.value })
                        }
                        className="flex-1"
                        aria-label={`Fecha de salida de ${milestone.geofenceName}`}
                      />
                      <Input
                        type="time"
                        value={schedule.departureTime}
                        onChange={(e) =>
                          updateSchedule(milestone.id, { departureTime: e.target.value })
                        }
                        className="w-24 sm:w-28"
                        aria-label={`Hora de salida de ${milestone.geofenceName}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Resumen de fechas derivadas */}
        {(() => {
          const enabledSchedules = schedules.filter(
            (s) => s.enabled && s.arrivalDate
          );
          if (enabledSchedules.length === 0) return null;

          const allDates = enabledSchedules.flatMap((s) => {
            const dates: string[] = [];
            if (s.arrivalDate) dates.push(`${s.arrivalDate}T${s.arrivalTime || '00:00'}`);
            if (s.departureDate) dates.push(`${s.departureDate}T${s.departureTime || '23:59'}`);
            return dates;
          });

          if (allDates.length === 0) return null;

          const sorted = allDates.sort();
          const earliest = new Date(sorted[0]);
          const latest = new Date(sorted[sorted.length - 1]);

          const fmt = (d: Date) =>
            d.toLocaleDateString('es-MX', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

          return (
            <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-medium text-primary mb-1">
                Rango general de la orden
              </p>
              <p className="text-sm text-muted-foreground">
                {fmt(earliest)} → {fmt(latest)}
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
