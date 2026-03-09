"use client";

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Usar estilo con tiles gratuitos de OpenStreetMap
const FREE_STYLE: mapboxgl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export interface MapboxBaseProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  className?: string;
  onLoad?: (map: mapboxgl.Map) => void;
  interactive?: boolean;
  children?: React.ReactNode;
}

export function MapboxBase({
  center = [-77.042793, -12.046374], // Lima, Peru por defecto
  zoom = 12,
  className = 'w-full h-full',
  onLoad,
  interactive = true,
  children
}: MapboxBaseProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Crear mapa
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: FREE_STYLE,
      center,
      zoom,
      attributionControl: true,
      interactive
    });

    // Agregar controles
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100 }), 'bottom-left');

    // Esperar a que el mapa se cargue
    map.on('load', () => {
      setIsLoaded(true);
      onLoad?.(map);
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  // Actualizar centro y zoom cuando cambien
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.flyTo({
        center,
        zoom,
        duration: 1000
      });
    }
  }, [center, zoom, isLoaded]);

  return (
    <div ref={mapContainerRef} className={className}>
      {isLoaded && children}
    </div>
  );
}

// Hook personalizado para usar el mapa
export function useMapbox() {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const setMap = (map: mapboxgl.Map) => {
    mapRef.current = map;
  };

  return { map: mapRef.current, setMap };
}
