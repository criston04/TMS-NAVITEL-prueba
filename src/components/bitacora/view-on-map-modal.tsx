'use client';

/**
 * Modal para mostrar la ubicación de un evento de bitácora en un mapa Leaflet.
 * Utiliza el hook useLeafletMap del proyecto para renderizar el mapa.
 */

import { useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Truck,
  Navigation,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import type { BitacoraEntry } from '@/types/bitacora';

interface ViewOnMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: BitacoraEntry | null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  entry: 'Ingreso',
  exit: 'Salida',
  unplanned_stop: 'Parada no planificada',
  unplanned_route: 'Recorrido no planificado',
  dwell: 'Permanencia prolongada',
  deviation: 'Desviación de ruta',
  idle: 'Tiempo inactivo',
  speeding: 'Exceso de velocidad',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  entry: '#22c55e',
  exit: '#3b82f6',
  unplanned_stop: '#ef4444',
  unplanned_route: '#f97316',
  dwell: '#eab308',
  deviation: '#a855f7',
  idle: '#6b7280',
  speeding: '#dc2626',
};

function MapContent({ entry }: { entry: BitacoraEntry }) {
  const { mapRef, isReady, L, leafletMap } = useLeafletMap({
    center: [entry.coordinates.lat, entry.coordinates.lng],
    zoom: 15,
    zoomControl: true,
  });

  // Agregar marcador cuando el mapa esté listo
  useEffect(() => {
    if (!isReady || !L || !leafletMap) return;

    const color = EVENT_TYPE_COLORS[entry.eventType] || '#3b82f6';

    // Crear ícono personalizado
    const icon = L.divIcon({
      className: 'custom-bitacora-marker',
      html: `
        <div style="
          width: 32px; height: 32px; 
          background: ${color}; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'/>
            <circle cx='12' cy='10' r='3'/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    const marker = L.marker([entry.coordinates.lat, entry.coordinates.lng], { icon })
      .addTo(leafletMap);

    // Popup con información
    const popupContent = `
      <div style="min-width: 180px; font-family: system-ui, sans-serif;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">
          ${EVENT_TYPE_LABELS[entry.eventType] || entry.eventType}
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
          🚛 ${entry.vehiclePlate} ${entry.driverName ? `· ${entry.driverName}` : ''}
        </div>
        ${entry.geofenceName ? `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">📍 ${entry.geofenceName}</div>` : ''}
        <div style="font-size: 11px; color: #999; margin-top: 4px;">
          ${new Date(entry.startTimestamp).toLocaleString('es-PE')}
        </div>
      </div>
    `;

    marker.bindPopup(popupContent).openPopup();

    // Centrar el mapa con animación
    setTimeout(() => {
      leafletMap.setView([entry.coordinates.lat, entry.coordinates.lng], 15, {
        animate: true,
      });
      leafletMap.invalidateSize();
    }, 200);

    return () => {
      marker.remove();
    };
  }, [isReady, L, leafletMap, entry]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[350px] rounded-lg border overflow-hidden"
      style={{ minHeight: '350px' }}
    />
  );
}

export function ViewOnMapModal({
  open,
  onOpenChange,
  entry,
}: ViewOnMapModalProps) {
  const handleOpenInGoogleMaps = useCallback(() => {
    if (!entry) return;
    const url = `https://www.google.com/maps?q=${entry.coordinates.lat},${entry.coordinates.lng}&z=16`;
    window.open(url, '_blank');
  }, [entry]);

  const handleCopyCoordinates = useCallback(() => {
    if (!entry) return;
    const coords = `${entry.coordinates.lat}, ${entry.coordinates.lng}`;
    navigator.clipboard.writeText(coords);
  }, [entry]);

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Ubicación del evento
          </DialogTitle>
          <DialogDescription>
            Evento <span className="font-semibold text-foreground">{entry.id}</span> en el mapa
          </DialogDescription>
        </DialogHeader>

        {/* Info compacta */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2.5 border">
          <div className="flex items-center gap-3 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{entry.vehiclePlate}</span>
            <Badge variant="outline" className="text-[10px]">
              {EVENT_TYPE_LABELS[entry.eventType] || entry.eventType}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Navigation className="h-3 w-3" />
            {entry.coordinates.lat.toFixed(5)}, {entry.coordinates.lng.toFixed(5)}
          </div>
        </div>

        {/* Mapa */}
        {open && <MapContent entry={entry} />}

        {/* Dirección */}
        {entry.address && (
          <div className="text-sm text-muted-foreground flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{entry.address}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCopyCoordinates}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar coordenadas
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenInGoogleMaps}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Abrir en Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
