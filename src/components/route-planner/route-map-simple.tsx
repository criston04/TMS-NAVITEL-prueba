"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Route, TransportOrder } from "@/types/route-planner";
import 'leaflet/dist/leaflet.css';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const L = require('leaflet');

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RouteMapSimpleProps {
  route: Route | null;
  selectedOrders?: TransportOrder[];
  showOrderMarkers?: boolean;
}

// Función para obtener ruta desde OSRM (gratuito)
async function fetchOSRMRoute(coordinates: [number, number][]): Promise<[number, number][]> {
  try {
    // Formatear coordenadas como "lng,lat;lng,lat;..."
    const coords = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // Convertir de [lng, lat] a [lat, lng] para Leaflet
      return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    }
    
    return coordinates;
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return coordinates;
  }
}

export function RouteMapSimple({ route, selectedOrders = [], showOrderMarkers = false }: RouteMapSimpleProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Crear mapa
    const map = L.map(mapContainerRef.current, {
      center: [-12.046374, -77.042793], // Lima, Peru
      zoom: 12,
      zoomControl: true,
    });

    // Agregar capa de tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    
    // Marcar como cargado después de un breve delay
    setTimeout(() => {
      setIsLoaded(true);
      map.invalidateSize();
    }, 100);

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.remove();
      }
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  // Dibujar ruta cuando cambia
  useEffect(() => {
    if (!mapRef.current || !route || !isLoaded) return;

    const map = mapRef.current;

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Limpiar polyline anterior
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    let coordinates: [number, number][] = [];

    // Usar polyline si está disponible, sino usar stops
    if (route.polyline && route.polyline.length > 0) {
      coordinates = route.polyline; // Ya en formato [lat, lng]
    } else if (route.stops && route.stops.length > 0) {
      coordinates = route.stops.map(stop => [stop.coordinates[0], stop.coordinates[1]]); // [lat, lng]
    }

    if (coordinates.length === 0) return;

    // Convertir a formato OSRM [lng, lat]
    const osrmCoordinates: [number, number][] = coordinates.map(coord => [coord[1], coord[0]]);

    // Obtener ruta de OSRM (gratuito)
    fetchOSRMRoute(osrmCoordinates).then(routeGeometry => {
      if (!mapRef.current) return;

      if (routeGeometry && routeGeometry.length > 0) {
        // Dibujar polyline
        polylineRef.current = L.polyline(routeGeometry, {
          color: '#3DBAFF',
          weight: 4,
          opacity: 0.8,
        }).addTo(mapRef.current);

        // Ajustar vista a la ruta
        mapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [80, 80] });
      }
    });

    // Agregar marcadores para las paradas
    if (route.stops && route.stops.length > 0) {
      route.stops.forEach((stop, index) => {
        const latLng: [number, number] = [stop.coordinates[0], stop.coordinates[1]]; // [lat, lng]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let icon: any;

        if (index === 0) {
          // Inicio (bandera verde)
          icon = L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="position: relative;">
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="#10b981" stroke="white" stroke-width="3"/>
                  <text x="16" y="21" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🏁</text>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
        } else if (index === route.stops.length - 1) {
          // Fin (diana roja)
          icon = L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="position: relative;">
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="#ef4444" stroke="white" stroke-width="3"/>
                  <text x="16" y="21" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🎯</text>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
        } else {
          // Intermedio (número azul)
          icon = L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="position: relative;">
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="#3DBAFF" stroke="white" stroke-width="3"/>
                  <text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${index}</text>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
        }

        const popupContent = `
          <div style="padding: 8px; min-width: 200px;">
            <p style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #1f2937;">Parada ${stop.sequence}</p>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${stop.address}</p>
            <p style="font-size: 12px; color: #3DBAFF; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">⏱️ Duración: <strong>${stop.duration} min</strong></p>
          </div>
        `;

        const marker = L.marker(latLng, { icon })
          .bindPopup(popupContent)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [route, isLoaded]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {route ? route.name : "Vista de Ruta"}
            </h3>
          </div>
          {route && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {route.stops?.length || 0} paradas
            </Badge>
          )}
        </div>
        
        {route && (
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {route.metrics && (
              <>
                {route.metrics.totalDistance && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {route.metrics.totalDistance.toFixed(1)} km
                  </span>
                )}
                {route.metrics.estimatedDuration && (
                  <span className="flex items-center gap-1">
                    ⏱️ {Math.round(route.metrics.estimatedDuration)} min
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 relative min-h-0">
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '400px' }}
        />
        
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Cargando mapa profesional...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
