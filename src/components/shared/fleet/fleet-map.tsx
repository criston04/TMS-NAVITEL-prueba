"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Vehicle } from "@/types/fleet";
import { cn } from "@/lib/utils";

// Colores del mapa según estado

interface FleetMapProps {
  readonly vehicles: Vehicle[];
  readonly selectedVehicle: Vehicle | null;
  readonly onSelectVehicle: (vehicle: Vehicle) => void;
  readonly className?: string;
}

// Colores según estado
const statusColors: Record<string, string> = {
  available: '#10b981',
  in_transit: '#3DBAFF',
  loading: '#f59e0b',
  unloading: '#f59e0b',
  maintenance: '#ef4444',
  out_of_service: '#6b7280'
};

// Etiquetas de estado
const statusLabels: Record<string, {label: string, color: string}> = {
  available: { label: 'Disponible', color: '#10b981' },
  in_transit: { label: 'En Tránsito', color: '#3DBAFF' },
  loading: { label: 'Cargando', color: '#f59e0b' },
  unloading: { label: 'Descargando', color: '#f59e0b' },
  maintenance: { label: 'Mantenimiento', color: '#ef4444' },
  out_of_service: { label: 'Fuera de Servicio', color: '#6b7280' }
};

export function FleetMap({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  className,
}: FleetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  const createVehicleIcon = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L: any, isSelected: boolean) => {
      const size = isSelected ? 52 : 40;

      // Icono de camion simple y limpio
      const svg = isSelected 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" fill="#00c9ff" opacity="0.25"/>
            <circle cx="26" cy="26" r="18" fill="#00c9ff" opacity="0.15"/>
            <g transform="translate(14, 16)">
              <rect x="0" y="2" width="24" height="14" rx="2" fill="#1e293b"/>
              <rect x="16" y="4" width="7" height="10" rx="1.5" fill="#334155"/>
              <circle cx="6" cy="16" r="3" fill="#1e293b"/>
              <circle cx="18" cy="16" r="3" fill="#1e293b"/>
              <circle cx="6" cy="16" r="1.5" fill="#94a3b8"/>
              <circle cx="18" cy="16" r="1.5" fill="#94a3b8"/>
            </g>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
            <g transform="translate(8, 10)">
              <rect x="0" y="2" width="24" height="14" rx="2" fill="#1e293b"/>
              <rect x="16" y="4" width="7" height="10" rx="1.5" fill="#334155"/>
              <circle cx="6" cy="16" r="3" fill="#1e293b"/>
              <circle cx="18" cy="16" r="3" fill="#1e293b"/>
              <circle cx="6" cy="16" r="1.5" fill="#94a3b8"/>
              <circle cx="18" cy="16" r="1.5" fill="#94a3b8"/>
            </g>
          </svg>`;

      return L.divIcon({
        className: "custom-vehicle-marker",
        html: svg,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    },
    []
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Verificar que el contenedor tenga dimensiones
    const container = mapRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      // Esperar a que el contenedor tenga dimensiones
      const checkDimensions = setInterval(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          clearInterval(checkDimensions);
          setIsMapReady(true);
        }
      }, 50);
      return () => clearInterval(checkDimensions);
    }
    setIsMapReady(true);
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = await import("leaflet") as any;
      leafletRef.current = L;

      // Crear el mapa
      const map = L.map(mapRef.current!, {
        center: [40.7512, -74.0123],
        zoom: 12,
        zoomControl: false,
        preferCanvas: true,
      });

      // Usar CartoDB Positron para el estilo gris minimalista
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        updateWhenZooming: false,
        updateWhenIdle: true,
      }).addTo(map);

      // Agregar controles de zoom en la esquina derecha
      L.control.zoom({
        position: 'topright'
      }).addTo(map);

      mapInstanceRef.current = map;

      // Esperar a que el mapa se renderice completamente
      map.whenReady(() => {
        map.invalidateSize();
      });
      
      // Segundo invalidateSize con delay para asegurar renderizado
      setTimeout(() => {
        map.invalidateSize();
        setIsLoaded(true);
      }, 300);
    };

    initMap();

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isLoaded || vehicles.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = leafletRef.current as any;
    const map = mapInstanceRef.current;

    // Remover marcadores que ya no existen
    markersRef.current.forEach((marker, id) => {
      if (!vehicles.find(v => v.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Preparar bounds para ajustar vista
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allLatLngs: any[] = [];

    vehicles.forEach((vehicle) => {
      const lat = vehicle.location?.lat;
      const lng = vehicle.location?.lng;
      if (lat && lng) {
        allLatLngs.push([lat, lng]);
      }
    });

    // Ajustar vista para mostrar todos los vehículos
    if (allLatLngs.length > 0 && map) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = leafletRef.current as any;
      if (L) {
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
      }
    }
  }, [vehicles, isLoaded, createVehicleIcon, onSelectVehicle]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVehicle || !isLoaded) return;
    const lat = selectedVehicle.location?.lat;
    const lng = selectedVehicle.location?.lng;
    if (lat && lng) {
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 0.8 });
    }
  }, [selectedVehicle, isLoaded]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;
    
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoaded]);

  return (
    <div className={cn("relative h-full w-full rounded-lg overflow-hidden", className)}>
      <div ref={mapContainerRef} className="absolute inset-0" />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Cargando mapa de flota...</p>
          </div>
        </div>
      )}
    </div>
  );
}

