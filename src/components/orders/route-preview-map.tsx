'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { MapPin, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Fix para los tiles de Leaflet en Next.js
const leafletStyles = `
  .leaflet-container {
    width: 100% !important;
    height: 100% !important;
    z-index: 1;
    background: #e5e7eb;
  }
  .leaflet-tile-pane {
    z-index: 1;
  }
  .leaflet-tile {
    visibility: visible !important;
  }
  .leaflet-tile-container img {
    visibility: visible !important;
  }
  .route-marker {
    background: transparent !important;
    border: none !important;
  }
`;

interface RoutePoint {
  id: string;
  name: string;
  type: 'origin' | 'waypoint' | 'destination';
  coordinates: { lat: number; lng: number };
  sequence: number;
}

interface RoutePreviewMapProps {
  /** Puntos de la ruta */
  points: RoutePoint[];
  /** Alto del mapa */
  height?: number;
  /** Mostrar controles de zoom */
  showZoomControls?: boolean;
  /** Mostrar botón de expandir */
  showExpandButton?: boolean;
  /** Callback al hacer click en un punto */
  onPointClick?: (pointId: string) => void;
  /** Clase adicional */
  className?: string;
}

const MARKER_COLORS = {
  origin: '#22c55e',      // green-500
  waypoint: '#3b82f6',    // blue-500
  destination: '#ef4444', // red-500
};

const LINE_COLOR = '#6366f1'; // indigo-500
const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 }; // Lima, Perú
const DEFAULT_ZOOM = 12;

/**
 * Crea un icono SVG para marcador
 */
function createMarkerIcon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any,
  type: 'origin' | 'waypoint' | 'destination',
  sequence: number
): L.DivIcon {
  const color = MARKER_COLORS[type];
  const size = type === 'waypoint' ? 28 : 36;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="white" font-size="${size * 0.4}" font-weight="bold">${sequence}</text>
    </svg>
  `;

  return L.divIcon({
    className: 'route-marker',
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Calcula los bounds para ajustar el mapa a todos los puntos
 */
function calculateBounds(points: RoutePoint[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  
  const lats = points.map(p => p.coordinates.lat).filter(l => l !== 0);
  const lngs = points.map(p => p.coordinates.lng).filter(l => l !== 0);
  
  if (lats.length === 0 || lngs.length === 0) return null;
  
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

// COMPONENTE PRINCIPAL

function RoutePreviewMapComponent({
  points,
  height = 300,
  showZoomControls = true,
  showExpandButton = true,
  onPointClick,
  className,
}: Readonly<RoutePreviewMapProps>) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const mapIdRef = useRef(`map-${Math.random().toString(36).substring(2, 9)}`);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Inicializar mapa
  useEffect(() => {
    // Si ya hay una instancia, no reinicializar
    if (mapInstanceRef.current) return;
    // Si no hay contenedor, no inicializar
    if (!mapRef.current) return;

    const initMap = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (await import('leaflet')).default as any;
      leafletRef.current = L;

      // Usar ID único para evitar conflictos con React Strict Mode
      const container = document.getElementById(mapIdRef.current);
      if (!container) return;

      // Verificar que el contenedor no tenga ya un mapa
      // @ts-expect-error Leaflet internal property
      if (container._leaflet_id) {
        return;
      }

      // Asegurar que el contenedor tenga dimensiones antes de inicializar
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        // Reintentar después de un breve delay
        setTimeout(() => initMap(), 100);
        return;
      }

      const map = L.map(container, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: DEFAULT_ZOOM,
        zoomControl: showZoomControls,
        attributionControl: false,
        preferCanvas: true,
      });

      // OpenStreetMap tiles con múltiples servidores de fallback
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
        subdomains: ['a', 'b', 'c'],
        crossOrigin: true,
      }).addTo(map);

      // Evento cuando los tiles empiezan a cargar
      tileLayer.on('loading', () => {
        console.debug('[RoutePreviewMap] Tiles loading...');
      });

      // Evento cuando los tiles terminan de cargar
      tileLayer.on('load', () => {
        console.debug('[RoutePreviewMap] Tiles loaded');
      });

      // Evento de error en tiles
      tileLayer.on('tileerror', (e: unknown) => {
        console.warn('[RoutePreviewMap] Tile error:', e);
      });

      mapInstanceRef.current = map;

      // Forzar invalidación del tamaño después de que el mapa esté listo
      map.whenReady(() => {
        setIsLoaded(true);
        // Múltiples invalidaciones para asegurar renderizado correcto
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 100);
        setTimeout(() => map.invalidateSize(), 300);
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        leafletRef.current = null;
        markersRef.current.clear();
        polylineRef.current = null;
        setIsLoaded(false);
      }
    };
  }, [showZoomControls]);

  // Actualizar marcadores y línea cuando cambian los puntos
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !leafletRef.current) return;

    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Limpiar línea anterior
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Filtrar puntos con coordenadas válidas
    const validPoints = points.filter(
      p => p.coordinates.lat !== 0 && p.coordinates.lng !== 0
    );

    if (validPoints.length === 0) return;

    // Ordenar por secuencia
    const sortedPoints = [...validPoints].sort((a, b) => a.sequence - b.sequence);

    // Crear marcadores
    sortedPoints.forEach((point) => {
      const icon = createMarkerIcon(L, point.type, point.sequence);
      
      const marker = L.marker([point.coordinates.lat, point.coordinates.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 120px;">
            <strong>${point.name}</strong>
            <br/>
            <span style="color: #666; font-size: 12px;">
              ${point.type === 'origin' ? '📍 Origen' : 
                point.type === 'destination' ? '🏁 Destino' : 
                '📌 Parada ' + point.sequence}
            </span>
          </div>
        `);

      if (onPointClick) {
        marker.on('click', () => onPointClick(point.id));
      }

      markersRef.current.set(point.id, marker);
    });

    // Crear línea conectando puntos
    if (sortedPoints.length > 1) {
      const latLngs = sortedPoints.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number]);
      
      polylineRef.current = L.polyline(latLngs, {
        color: LINE_COLOR,
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(map);
    }

    // Ajustar vista a todos los puntos
    const bounds = calculateBounds(sortedPoints);
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points, isLoaded, onPointClick]);

  // Manejar cambio de tamaño
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      // Usar requestAnimationFrame para mejor sincronización
      requestAnimationFrame(() => {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 350); // Después de la transición CSS (300ms)
      });
    }
  }, [isExpanded, isLoaded]);

  // Recalcular vista
  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current) return;
    
    const validPoints = points.filter(
      p => p.coordinates.lat !== 0 && p.coordinates.lng !== 0
    );
    
    const bounds = calculateBounds(validPoints);
    if (bounds) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points]);

  // Contar puntos válidos
  const validPointsCount = points.filter(
    p => p.coordinates.lat !== 0 && p.coordinates.lng !== 0
  ).length;

  return (
    <>
      {/* Estilos para Leaflet */}
      <style dangerouslySetInnerHTML={{ __html: leafletStyles }} />

      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Vista Previa de Ruta
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {validPointsCount} puntos
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRecenter}
                title="Recentrar mapa"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              {showExpandButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Reducir' : 'Expandir'}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 relative">
        <div
          ref={mapRef}
          id={mapIdRef.current}
          style={{ 
            height: `${isExpanded ? height * 1.5 : height}px`,
            minHeight: '200px',
          }}
          className={cn(
            'w-full transition-all duration-300',
            !isLoaded && 'bg-muted animate-pulse'
          )}
        />
        
        {/* Leyenda */}
        <div className="flex items-center justify-center gap-4 py-2 px-4 bg-muted/30 border-t text-xs">
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: MARKER_COLORS.origin }}
            />
            <span>Origen</span>
          </div>
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: MARKER_COLORS.waypoint }}
            />
            <span>Paradas</span>
          </div>
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: MARKER_COLORS.destination }}
            />
            <span>Destino</span>
          </div>
        </div>

        {/* Mensaje si no hay puntos */}
        {validPointsCount === 0 && isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin puntos para mostrar</p>
              <p className="text-xs">Agrega milestones con ubicación</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}

/**
 * Exportación memoizada
 */
export const RoutePreviewMap = memo(RoutePreviewMapComponent);
