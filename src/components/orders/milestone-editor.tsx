'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Lock,
  AlertCircle,
} from 'lucide-react';
import type { Geofence } from '@/types/models/geofence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MilestoneFormData {
  id: string;
  geofenceId: string;
  geofenceName: string;
  type: 'origin' | 'waypoint' | 'destination';
  sequence: number;
  address: string;
  coordinates: { lat: number; lng: number };
  estimatedArrival: string;
  estimatedDeparture?: string;
  notes?: string;
  /** Si fue generado desde workflow (no editable tipo) */
  isFromWorkflow?: boolean;
}

interface MilestoneEditorProps {
  
  milestones: MilestoneFormData[];
  /** Lista de geocercas disponibles */
  geofences: Geofence[];
  /** Callback al cambiar milestones */
  onChange: (milestones: MilestoneFormData[]) => void;
  /** Error de validación */
  error?: string;
  /** Permitir editar milestones de workflow */
  allowEditWorkflowMilestones?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Genera un ID único para milestone
 */
function generateMilestoneId(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Obtiene el color del badge según tipo
 */
function getMilestoneTypeColor(type: 'origin' | 'waypoint' | 'destination'): string {
  switch (type) {
    case 'origin': return 'bg-green-500';
    case 'destination': return 'bg-red-500';
    default: return 'bg-blue-500';
  }
}

/**
 * Obtiene la etiqueta del tipo
 */
function getMilestoneTypeLabel(type: 'origin' | 'waypoint' | 'destination'): string {
  switch (type) {
    case 'origin': return 'Origen';
    case 'destination': return 'Destino';
    default: return 'Parada';
  }
}

// COMPONENTE DE MILESTONE INDIVIDUAL

interface MilestoneItemProps {
  milestone: MilestoneFormData;
  index: number;
  totalCount: number;
  geofences: Geofence[];
  onUpdate: (id: string, field: keyof MilestoneFormData, value: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  canEdit: boolean;
  canRemove: boolean;
}

function MilestoneItem({
  milestone,
  index,
  totalCount,
  geofences,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canEdit,
  canRemove,
}: MilestoneItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isFirst = index === 0;
  const isLast = index === totalCount - 1;

  return (
    <div
      className={cn(
        'border rounded-lg transition-all',
        milestone.isFromWorkflow ? 'bg-muted/30 border-muted' : 'bg-card',
        !milestone.geofenceId && 'border-red-300 bg-red-50/50'
      )}
    >
      {/* Header del milestone */}
      <div className="flex items-center gap-2 p-3">
        {/* Controles de reorden */}
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onMoveUp(milestone.id)}
            disabled={isFirst || !canEdit}
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onMoveDown(milestone.id)}
            disabled={isLast || !canEdit}
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>

        {/* Indicador de secuencia */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
            getMilestoneTypeColor(milestone.type)
          )}
        >
          {index + 1}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              {getMilestoneTypeLabel(milestone.type)}
            </Badge>
            
            {milestone.isFromWorkflow && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Lock className="w-3 h-3" />
                Workflow
              </Badge>
            )}
            
            <span className="font-medium text-sm truncate">
              {milestone.geofenceName || 'Sin ubicación'}
            </span>
          </div>
          
          {milestone.address && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {milestone.address}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Menos' : 'Editar'}
          </Button>

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(milestone.id)}
              className="text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Selector de geocerca */}
          <div className="space-y-1.5">
            <Label className="text-xs">Ubicación (Geocerca)</Label>
            <Select
              value={milestone.geofenceId}
              onValueChange={(v) => onUpdate(milestone.id, 'geofenceId', v)}
              disabled={!canEdit && milestone.isFromWorkflow}
            >
              <SelectTrigger className={cn(!milestone.geofenceId && 'border-red-300')}>
                <SelectValue placeholder="Selecciona una ubicación" />
              </SelectTrigger>
              <SelectContent>
                {geofences.map((geo) => (
                  <SelectItem key={geo.id} value={geo.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: geo.color }}
                      />
                      {geo.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Llegada Estimada</Label>
              <Input
                type="datetime-local"
                value={milestone.estimatedArrival?.split('.')[0] || ''}
                onChange={(e) => onUpdate(milestone.id, 'estimatedArrival', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Salida Estimada</Label>
              <Input
                type="datetime-local"
                value={milestone.estimatedDeparture?.split('.')[0] || ''}
                onChange={(e) => onUpdate(milestone.id, 'estimatedDeparture', e.target.value)}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas / Instrucciones</Label>
            <Input
              placeholder="Instrucciones especiales para este punto..."
              value={milestone.notes || ''}
              onChange={(e) => onUpdate(milestone.id, 'notes', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTE PRINCIPAL

function MilestoneEditorComponent({
  milestones,
  geofences,
  onChange,
  error,
  allowEditWorkflowMilestones = false,
  className,
}: Readonly<MilestoneEditorProps>) {
  
  /**
   * Agrega un nuevo waypoint
   */
  const handleAddWaypoint = useCallback(() => {
    const newMilestone: MilestoneFormData = {
      id: generateMilestoneId(),
      geofenceId: '',
      geofenceName: '',
      type: 'waypoint',
      sequence: milestones.length + 1,
      address: '',
      coordinates: { lat: 0, lng: 0 },
      estimatedArrival: '',
      isFromWorkflow: false,
    };

    // Insertar antes del último (si hay destino)
    const hasDestination = milestones.some(m => m.type === 'destination');
    if (hasDestination && milestones.length > 0) {
      const updated = [...milestones];
      updated.splice(milestones.length - 1, 0, newMilestone);
      // Reordenar secuencias
      const reordered = updated.map((m, i) => ({ ...m, sequence: i + 1 }));
      onChange(reordered);
    } else {
      onChange([...milestones, newMilestone]);
    }
  }, [milestones, onChange]);

  /**
   * Elimina un milestone
   */
  const handleRemove = useCallback((id: string) => {
    const filtered = milestones.filter(m => m.id !== id);
    // Reordenar secuencias y actualizar tipos
    const reordered = filtered.map((m, i, arr) => ({
      ...m,
      sequence: i + 1,
      type: i === 0 ? 'origin' as const : 
            i === arr.length - 1 ? 'destination' as const : 
            'waypoint' as const,
    }));
    onChange(reordered);
  }, [milestones, onChange]);

  /**
   * Actualiza un campo del milestone
   */
  const handleUpdate = useCallback((
    id: string, 
    field: keyof MilestoneFormData, 
    value: string
  ) => {
    const updated = milestones.map(m => {
      if (m.id !== id) return m;

      // Si cambia la geocerca, actualizar datos relacionados
      if (field === 'geofenceId') {
        const geofence = geofences.find(g => g.id === value);
        if (geofence) {
          const coords = geofence.geometry.type === 'circle'
            ? geofence.geometry.center
            : 'coordinates' in geofence.geometry
              ? geofence.geometry.coordinates[0]
              : { lat: 0, lng: 0 };
          
          return {
            ...m,
            geofenceId: value,
            geofenceName: geofence.name,
            address: geofence.address || '',
            coordinates: coords,
          };
        }
      }

      return { ...m, [field]: value };
    });

    onChange(updated);
  }, [milestones, geofences, onChange]);

  /**
   * Mueve milestone hacia arriba
   */
  const handleMoveUp = useCallback((id: string) => {
    const index = milestones.findIndex(m => m.id === id);
    if (index <= 0) return;

    const updated = [...milestones];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    
    // Actualizar secuencias y tipos
    const reordered = updated.map((m, i, arr) => ({
      ...m,
      sequence: i + 1,
      type: i === 0 ? 'origin' as const : 
            i === arr.length - 1 ? 'destination' as const : 
            'waypoint' as const,
    }));
    
    onChange(reordered);
  }, [milestones, onChange]);

  /**
   * Mueve milestone hacia abajo
   */
  const handleMoveDown = useCallback((id: string) => {
    const index = milestones.findIndex(m => m.id === id);
    if (index < 0 || index >= milestones.length - 1) return;

    const updated = [...milestones];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    
    // Actualizar secuencias y tipos
    const reordered = updated.map((m, i, arr) => ({
      ...m,
      sequence: i + 1,
      type: i === 0 ? 'origin' as const : 
            i === arr.length - 1 ? 'destination' as const : 
            'waypoint' as const,
    }));
    
    onChange(reordered);
  }, [milestones, onChange]);

  // Contar tipos de milestones
  const stats = useMemo(() => ({
    total: milestones.length,
    fromWorkflow: milestones.filter(m => m.isFromWorkflow).length,
    waypoints: milestones.filter(m => m.type === 'waypoint').length,
    incomplete: milestones.filter(m => !m.geofenceId).length,
  }), [milestones]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5" />
            Ruta (Hitos)
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddWaypoint}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Agregar Parada
          </Button>
        </div>
        <CardDescription className="flex items-center gap-3">
          <span>{stats.total} puntos en la ruta</span>
          {stats.fromWorkflow > 0 && (
            <Badge variant="secondary" className="text-xs">
              {stats.fromWorkflow} del workflow
            </Badge>
          )}
          {stats.waypoints > 0 && (
            <Badge variant="outline" className="text-xs">
              {stats.waypoints} paradas extra
            </Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Error de validación */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Lista de milestones */}
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay puntos definidos</p>
            <p className="text-xs">Selecciona un workflow o agrega puntos manualmente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {milestones
              .sort((a, b) => a.sequence - b.sequence)
              .map((milestone, index) => (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  index={index}
                  totalCount={milestones.length}
                  geofences={geofences}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  canEdit={allowEditWorkflowMilestones || !milestone.isFromWorkflow}
                  canRemove={!milestone.isFromWorkflow || allowEditWorkflowMilestones}
                />
              ))
            }
          </div>
        )}

        {/* Advertencia si hay milestones incompletos */}
        {stats.incomplete > 0 && (
          <div className="flex items-center gap-2 text-amber-600 text-xs p-2 bg-amber-50 rounded">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {stats.incomplete} punto(s) sin ubicación asignada
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exportación memoizada
 */
export const MilestoneEditor = memo(MilestoneEditorComponent);
