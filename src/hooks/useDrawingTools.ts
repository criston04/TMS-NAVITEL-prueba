import { useEffect, useRef, useState, useCallback } from "react";
import { Geofence, PolygonGeometry, CircleGeometry, GeoCoordinate } from "@/types/models/geofence";

/**
 * Tipo de dibujo activo
 */
export type DrawingMode = "polygon" | "circle" | "rectangle" | "none";

/**
 * Opciones de estilo para dibujo
 */
interface DrawingStyle {
  color: string;
  fillOpacity: number;
  weight?: number;
}

/**
 * Evento de creacion de geometria
 */
interface GeometryCreatedEvent {
  type: "polygon" | "circle";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layer: any;
  geometry: PolygonGeometry | CircleGeometry;
}

/**
 * Opciones del hook
 */
interface UseDrawingToolsOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawnItems: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
  defaultStyle?: DrawingStyle;
  onGeometryCreated?: (event: GeometryCreatedEvent) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGeometryEdited?: (layer: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGeometryDeleted?: (layer: any) => void;
}

/**
 * Retorno del hook
 */
interface UseDrawingToolsReturn {
  drawingMode: DrawingMode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeLayer: any;
  isEditing: boolean;

  startDrawPolygon: () => void;
  startDrawCircle: () => void;
  startDrawRectangle: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPentagon: (center?: GeoCoordinate) => any;
  cancelDrawing: () => void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enableEditing: (layer: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  disableEditing: (layer: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enableDragging: (layer: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  disableDragging: (layer: any) => void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addLayer: (layer: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeLayer: (layer: any) => void;
  clearAllLayers: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLayerGeometry: (layer: any) => PolygonGeometry | CircleGeometry | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPolygonLayer: (coordinates: GeoCoordinate[], style?: DrawingStyle) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCircleLayer: (center: GeoCoordinate, radius: number, style?: DrawingStyle) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createLayerFromGeofence: (geofence: Geofence) => any;
  
  // Estilo
  setLayerStyle: (layer: L.Layer, style: DrawingStyle) => void;
  currentStyle: DrawingStyle;
  setCurrentStyle: (style: DrawingStyle) => void;
  
  zoomToLayer: (layer: L.Layer, padding?: number) => void;
  getLayerBounds: (layer: L.Layer) => L.LatLngBounds | null;
}

/**
 * Estilo por defecto
 */
const DEFAULT_STYLE: DrawingStyle = {
  color: "#00c9ff",
  fillOpacity: 0.2,
  weight: 2,
};

/**
 * Hook para herramientas de dibujo en Leaflet
 * 
 * @param options - Opciones de configuración
 * @returns Estado y acciones de dibujo
 * 
 */
export function useDrawingTools(options: UseDrawingToolsOptions): UseDrawingToolsReturn {
  const {
    map,
    drawnItems,
    L,
    defaultStyle = DEFAULT_STYLE,
    onGeometryCreated,
    onGeometryEdited,
    onGeometryDeleted,
  } = options;
  
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [currentStyle, setCurrentStyle] = useState<DrawingStyle>(defaultStyle);
  const [isEditing, setIsEditing] = useState(false);

  // Referencias
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawHandlerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawControlRef = useRef<any>(null);
  const eventsRegisteredRef = useRef(false);

  // Registrar eventos de dibujo
  useEffect(() => {
    if (!map || !L || !drawnItems || eventsRegisteredRef.current) return;

    eventsRegisteredRef.current = true;

    // Evento: Geometria creada
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      // Inicializar dragging
      initializeDragging(layer);
      
      // Agregar al FeatureGroup
      drawnItems.addLayer(layer);
      activeLayerRef.current = layer;
      
      // Obtener geometría
      const geometry = getLayerGeometry(layer);
      if (geometry && onGeometryCreated) {
        onGeometryCreated({
          type: geometry.type as "polygon" | "circle",
          layer,
          geometry,
        });
      }

      setDrawingMode("none");
    });

    // Evento: Geometria editada
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on(L.Draw.Event.EDITED, (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      e.layers.eachLayer((layer: any) => {
        if (onGeometryEdited) {
          onGeometryEdited(layer);
        }
      });
    });

    // Evento: Geometria eliminada
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on(L.Draw.Event.DELETED, (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      e.layers.eachLayer((layer: any) => {
        if (onGeometryDeleted) {
          onGeometryDeleted(layer);
        }
      });
    });

    return () => {
      if (map && L) {
        map.off(L.Draw.Event.CREATED);
        map.off(L.Draw.Event.EDITED);
        map.off(L.Draw.Event.DELETED);
      }
      eventsRegisteredRef.current = false;
    };
  }, [map, L, drawnItems, onGeometryCreated, onGeometryEdited, onGeometryDeleted]);

  /**
   * Inicializa dragging en una capa
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initializeDragging = useCallback((layer: any) => {
    if (!L) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedLayer = layer as any;

    if (!typedLayer.dragging) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Handler = (L as any).Handler;
        if (Handler?.PathDrag) {
          typedLayer.dragging = new Handler.PathDrag(layer);
        }
      } catch (err) {
        console.warn("No se pudo inicializar dragging:", err);
      }
    }
    
    if (typedLayer.dragging) {
      typedLayer.dragging.enable();
      
      // Sincronizar edición con dragging
      layer.on("dragstart", () => {
        if (typedLayer.editing && (typedLayer.editing as { _enabled?: boolean })._enabled) {
          typedLayer.editing.disable();
        }
      });
      
      layer.on("dragend", () => {
        // No reactivar automáticamente
      });
    }
  }, [L]);

  /**
   * Obtiene geometria de una capa
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLayerGeometry = useCallback((layer: any): PolygonGeometry | CircleGeometry | null => {
    if (!L) return null;

    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      return {
        type: "circle",
        center: { lat: center.lat, lng: center.lng },
        radius,
      };
    }

    if (layer instanceof L.Polygon) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const latlngs = layer.getLatLngs()[0] as any[];
      const coordinates: GeoCoordinate[] = latlngs.map((ll) => ({
        lat: ll.lat,
        lng: ll.lng,
      }));
      return {
        type: "polygon",
        coordinates,
      };
    }

    return null;
  }, [L]);

  const startDrawPolygon = useCallback(() => {
    if (!map || !L || !drawnItems) return;

    cancelDrawing();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new (L as any).Draw.Polygon(map, {
      allowIntersection: false,
      shapeOptions: {
        color: currentStyle.color,
        fillOpacity: currentStyle.fillOpacity,
        weight: currentStyle.weight,
      },
    });

    drawHandlerRef.current = handler;
    handler.enable();
    setDrawingMode("polygon");
  }, [map, L, drawnItems, currentStyle]);

  const startDrawCircle = useCallback(() => {
    if (!map || !L || !drawnItems) return;

    cancelDrawing();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new (L as any).Draw.Circle(map, {
      shapeOptions: {
        color: currentStyle.color,
        fillOpacity: currentStyle.fillOpacity,
        weight: currentStyle.weight,
      },
    });

    drawHandlerRef.current = handler;
    handler.enable();
    setDrawingMode("circle");
  }, [map, L, drawnItems, currentStyle]);

  const startDrawRectangle = useCallback(() => {
    if (!map || !L || !drawnItems) return;

    cancelDrawing();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new (L as any).Draw.Rectangle(map, {
      shapeOptions: {
        color: currentStyle.color,
        fillOpacity: currentStyle.fillOpacity,
        weight: currentStyle.weight,
      },
    });

    drawHandlerRef.current = handler;
    handler.enable();
    setDrawingMode("rectangle");
  }, [map, L, drawnItems, currentStyle]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPentagon = useCallback((center?: GeoCoordinate): any => {
    if (!map || !L || !drawnItems) return null;

    const mapCenter = center || { 
      lat: map.getCenter().lat, 
      lng: map.getCenter().lng 
    };
    const zoom = map.getZoom();

    // Calcular radio basado en zoom
    const radiusInDegrees = 0.5 / Math.pow(2, zoom - 8);

    // Crear 5 puntos para el pentagono
    const pentagon: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const lat = mapCenter.lat + radiusInDegrees * Math.cos(angle);
      const lng = mapCenter.lng + radiusInDegrees * Math.sin(angle) / Math.cos(mapCenter.lat * Math.PI / 180);
      pentagon.push([lat, lng]);
    }

    // Crear poligono
    const polygonLayer = L.polygon(pentagon, {
      color: currentStyle.color,
      fillOpacity: currentStyle.fillOpacity,
      weight: currentStyle.weight,
    });

    // Agregar a drawnItems
    drawnItems.addLayer(polygonLayer);

    // Inicializar dragging y edicion
    initializeDragging(polygonLayer);

    // Inicializar edicion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedPolygon = polygonLayer as any;
    if (!typedPolygon.editing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typedPolygon.editing = new (L as any).Edit.Poly(polygonLayer, {
        icon: new L.DivIcon({
          iconSize: new L.Point(12, 12),
          className: "leaflet-div-icon leaflet-editing-icon",
        }),
      });
    }
    typedPolygon.editing.enable();

    activeLayerRef.current = polygonLayer;
    setIsEditing(true);

    // Notificar creacion
    const geometry = getLayerGeometry(polygonLayer);
    if (geometry && onGeometryCreated) {
      onGeometryCreated({
        type: "polygon",
        layer: polygonLayer,
        geometry,
      });
    }

    return polygonLayer;
  }, [map, L, drawnItems, currentStyle, initializeDragging, getLayerGeometry, onGeometryCreated]);

  const cancelDrawing = useCallback(() => {
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
    setDrawingMode("none");
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enableEditing = useCallback((layer: any) => {
    if (!L) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedLayer = layer as any;

    if (layer instanceof L.Polygon && !typedLayer.editing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typedLayer.editing = new (L as any).Edit.Poly(layer, {
        icon: new L.DivIcon({
          iconSize: new L.Point(12, 12),
          className: "leaflet-div-icon leaflet-editing-icon",
        }),
      });
    } else if (layer instanceof L.Circle && !typedLayer.editing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typedLayer.editing = new (L as any).Edit.Circle(layer);
    }

    if (typedLayer.editing) {
      typedLayer.editing.enable();
      setIsEditing(true);
    }
  }, [L]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const disableEditing = useCallback((layer: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedLayer = layer as any;

    if (typedLayer.editing && typedLayer.editing._enabled) {
      typedLayer.editing.disable();
      setIsEditing(false);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enableDragging = useCallback((layer: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedLayer = layer as any;
    if (typedLayer.dragging) {
      typedLayer.dragging.enable();
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const disableDragging = useCallback((layer: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedLayer = layer as any;
    if (typedLayer.dragging) {
      typedLayer.dragging.disable();
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addLayer = useCallback((layer: any) => {
    if (!drawnItems) return;
    drawnItems.addLayer(layer);
  }, [drawnItems]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const removeLayer = useCallback((layer: any) => {
    if (!drawnItems) return;
    drawnItems.removeLayer(layer);
  }, [drawnItems]);

  const clearAllLayers = useCallback(() => {
    if (!drawnItems) return;
    drawnItems.clearLayers();
    activeLayerRef.current = null;
  }, [drawnItems]);

  // Crear capas desde geometria
  const createPolygonLayer = useCallback((
    coordinates: GeoCoordinate[], 
    style?: DrawingStyle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any => {
    if (!L) return null;

    const latlngs = coordinates.map((c) => [c.lat, c.lng] as [number, number]);
    const layerStyle = style || currentStyle;

    return L.polygon(latlngs, {
      color: layerStyle.color,
      fillOpacity: layerStyle.fillOpacity,
      weight: layerStyle.weight,
    });
  }, [L, currentStyle]);

  const createCircleLayer = useCallback((
    center: GeoCoordinate, 
    radius: number, 
    style?: DrawingStyle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any => {
    if (!L) return null;

    const layerStyle = style || currentStyle;

    return L.circle([center.lat, center.lng], {
      radius,
      color: layerStyle.color,
      fillOpacity: layerStyle.fillOpacity,
      weight: layerStyle.weight,
    });
  }, [L, currentStyle]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createLayerFromGeofence = useCallback((geofence: Geofence): any => {
    if (!L) return null;

    const style: DrawingStyle = {
      color: geofence.color,
      fillOpacity: geofence.opacity,
      weight: 2,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let layer: any = null;

    if (geofence.geometry.type === "polygon") {
      const polygonGeom = geofence.geometry as PolygonGeometry;
      layer = createPolygonLayer(polygonGeom.coordinates, style);
    } else if (geofence.geometry.type === "circle") {
      const circleGeom = geofence.geometry as CircleGeometry;
      layer = createCircleLayer(circleGeom.center, circleGeom.radius, style);
    }

    if (layer) {
      // Agregar ID de geocerca
      layer.geofenceId = geofence.id;

      // Inicializar dragging
      initializeDragging(layer);
    }

    return layer;
  }, [L, createPolygonLayer, createCircleLayer, initializeDragging]);

  // Estilo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setLayerStyle = useCallback((layer: any, style: DrawingStyle) => {
    if (layer && layer.setStyle) {
      layer.setStyle({
        color: style.color,
        fillOpacity: style.fillOpacity,
        weight: style.weight,
      });
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomToLayer = useCallback((layer: any, padding = 50) => {
    if (!map) return;

    if (layer instanceof L.Circle) {
      map.setView(layer.getLatLng(), 14);
    } else if (layer.getBounds) {
      map.fitBounds(layer.getBounds(), { padding: [padding, padding] });
    }
  }, [map, L]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLayerBounds = useCallback((layer: any): any => {
    if (!L) return null;

    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      return center.toBounds(radius * 2);
    }

    if (layer.getBounds) {
      return layer.getBounds();
    }

    return null;
  }, [L]);
  
  return {
    drawingMode,
    activeLayer: activeLayerRef.current,
    isEditing,
    
    startDrawPolygon,
    startDrawCircle,
    startDrawRectangle,
    createPentagon,
    cancelDrawing,
    
    enableEditing,
    disableEditing,
    enableDragging,
    disableDragging,
    
    addLayer,
    removeLayer,
    clearAllLayers,
    getLayerGeometry,
    
    // Crear capas desde geometría
    createPolygonLayer,
    createCircleLayer,
    createLayerFromGeofence,
    
    // Estilo
    setLayerStyle,
    currentStyle,
    setCurrentStyle,
    
    zoomToLayer,
    getLayerBounds,
  };
}

export type { DrawingStyle, GeometryCreatedEvent, UseDrawingToolsOptions, UseDrawingToolsReturn };
