import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Tipos de capa base disponibles
 */
export type MapLayerType = 
  | "voyager" 
  | "satellite" 
  | "dark" 
  | "streets" 
  | "terrain";

/**
 * Configuración de capa base
 */
interface MapLayerConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

/**
 * Capas base disponibles
 */
const MAP_LAYERS: Record<MapLayerType, MapLayerConfig> = {
  voyager: {
    name: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap © CARTO",
    maxZoom: 19,
  },
  satellite: {
    name: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
    maxZoom: 18,
  },
  dark: {
    name: "Oscuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap © CARTO",
    maxZoom: 19,
  },
  streets: {
    name: "Calles",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  terrain: {
    name: "Terreno",
    url: "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png",
    attribution: "© Stamen Design © OpenStreetMap",
    maxZoom: 18,
  },
};

/**
 * Opciones de configuración del mapa
 */
interface MapOptions {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  layerType?: MapLayerType;
  zoomControl?: boolean;
}

/**
 * Estado del hook useLeafletMap
 */
interface UseLeafletMapReturn {
  // Referencias
  mapRef: React.RefObject<HTMLDivElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leafletMap: any;
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;

  // Leaflet instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;

  setCenter: (lat: number, lng: number, zoom?: number) => void;
  setZoom: (zoom: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fitBounds: (bounds: any, options?: any) => void;
  invalidateSize: () => void;

  // Capas base
  currentLayer: MapLayerType;
  setLayer: (layer: MapLayerType) => void;
  availableLayers: Array<{ type: MapLayerType; name: string }>;

  // Feature groups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawnItems: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCenter: () => any;
  getZoom: () => number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBounds: () => any;
}

// Declaracion de tipo para Leaflet global
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

/**
 * Hook para inicialización y gestión del mapa Leaflet
 * 
 * @param options - Opciones de configuración del mapa
 * @returns Estado y acciones del mapa
 * 
 */
export function useLeafletMap(options: MapOptions = {}): UseLeafletMapReturn {
  const {
    center = [-12.0464, -77.0428],
    zoom = 12,
    minZoom = 2,
    maxZoom = 18,
    layerType = "voyager",
    zoomControl = true,
  } = options;

  // Referencias
  const mapRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawnItemsRef = useRef<any>(null);
  const initializingRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>(layerType);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leafletInstance, setLeafletInstance] = useState<any>(null);

  // Inicializar mapa
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;
    if (initializingRef.current) return;

    // Limpiar mapa existente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) {
      mapRef.current.innerHTML = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (mapRef.current as any)._leaflet_id;
    }

    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      } catch (e) {
        console.warn("Error limpiando mapa existente:", e);
      }
    }

    let isMounted = true;

    const initMap = async () => {
      initializingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (await import("leaflet")).default as any;

        if (!isMounted || !mapRef.current) {
          initializingRef.current = false;
          return;
        }
        
        await import("leaflet/dist/leaflet.css");
        await import("@/styles/leaflet-custom.css");
        
        await import("leaflet-draw");
        await import("leaflet-draw/dist/leaflet.draw.css");
        await import("leaflet-path-drag");

        if (!isMounted || !mapRef.current) {
          initializingRef.current = false;
          return;
        }

        // Fix iconos de Leaflet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const LTyped = L as any;
        delete LTyped.Icon.Default.prototype._getIconUrl;
        LTyped.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        // Crear mapa
        const map = L.map(mapRef.current, {
          center: center,
          zoom,
          minZoom,
          maxZoom,
          zoomControl,
          worldCopyJump: true,
          maxBounds: [[-90, -180], [90, 180]],
          maxBoundsViscosity: 1.0,
        });

        leafletMapRef.current = map;

        // Agregar capa base
        const layerConfig = MAP_LAYERS[currentLayer];
        const tileLayer = L.tileLayer(layerConfig.url, {
          attribution: layerConfig.attribution,
          maxZoom: layerConfig.maxZoom,
          noWrap: true,
        }).addTo(map);

        tileLayerRef.current = tileLayer;

        // Crear FeatureGroup para elementos dibujados
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        // Guardar instancia de Leaflet
        setLeafletInstance(L);
        window.L = L;

        // Invalidar tamano despues de inicializar
        setTimeout(() => {
          if (map && isMounted) {
            map.invalidateSize();
            setIsReady(true);
            setIsLoading(false);
          }
        }, 100);
        
      } catch (err) {
        console.error("Error inicializando mapa:", err);
        setError(err instanceof Error ? err : new Error("Error al inicializar mapa"));
        setIsLoading(false);
      } finally {
        initializingRef.current = false;
      }
    };
    
    initMap();
    
    return () => {
      isMounted = false;
      initializingRef.current = false;
      
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (e) {
          console.warn("Error al limpiar mapa:", e);
        } finally {
          leafletMapRef.current = null;
          tileLayerRef.current = null;
          drawnItemsRef.current = null;
        }
      }
      
      if (mapRef.current) {
        mapRef.current.innerHTML = "";
        delete (mapRef.current as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, []); // Solo ejecutar una vez
  
  // Cambiar capa base
  const setLayer = useCallback((layer: MapLayerType) => {
    if (!leafletMapRef.current || !leafletInstance) return;
    
    const map = leafletMapRef.current;
    const L = leafletInstance;
    
    // Remover capa actual
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    
    // Agregar nueva capa
    const layerConfig = MAP_LAYERS[layer];
    const newTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
      noWrap: true,
    }).addTo(map);
    
    tileLayerRef.current = newTileLayer;
    setCurrentLayer(layer);
  }, [leafletInstance]);
  
  const setCenter = useCallback((lat: number, lng: number, newZoom?: number) => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.setView([lat, lng], newZoom ?? leafletMapRef.current.getZoom());
  }, []);
  
  const setZoom = useCallback((newZoom: number) => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.setZoom(newZoom);
  }, []);
  
  const fitBounds = useCallback((
    bounds: L.LatLngBoundsExpression, 
    fitOptions?: L.FitBoundsOptions
  ) => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.fitBounds(bounds, fitOptions);
  }, []);
  
  const invalidateSize = useCallback(() => {
    if (!leafletMapRef.current) return;
    leafletMapRef.current.invalidateSize();
  }, []);
  
  const getCenter = useCallback((): L.LatLng | null => {
    return leafletMapRef.current?.getCenter() ?? null;
  }, []);
  
  const getZoom = useCallback((): number | null => {
    return leafletMapRef.current?.getZoom() ?? null;
  }, []);
  
  const getBounds = useCallback((): L.LatLngBounds | null => {
    return leafletMapRef.current?.getBounds() ?? null;
  }, []);
  
  // Lista de capas disponibles
  const availableLayers = Object.entries(MAP_LAYERS).map(([type, config]) => ({
    type: type as MapLayerType,
    name: config.name,
  }));
  
  return {
    // Referencias
    mapRef,
    leafletMap: leafletMapRef.current,
    isReady,
    isLoading,
    error,
    
    // Leaflet instance
    L: leafletInstance,
    
    setCenter,
    setZoom,
    fitBounds,
    invalidateSize,
    
    // Capas base
    currentLayer,
    setLayer,
    availableLayers,
    
    // Feature groups
    drawnItems: drawnItemsRef.current,
    
    getCenter,
    getZoom,
    getBounds,
  };
}

export { MAP_LAYERS };
export type { MapOptions, MapLayerConfig };
