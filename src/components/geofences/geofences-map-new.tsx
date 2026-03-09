"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useLeafletMap, type MapLayerType } from "@/hooks/useLeafletMap";
import { useDrawingTools } from "@/hooks/useDrawingTools";
import { Geofence } from "@/types/models/geofence";
import { cn } from "@/lib/utils";

/**
 * Props para GeofencesMapNew
 */
interface GeofencesMapNewProps {
  
  geofences: Geofence[];
  /** IDs de geocercas seleccionadas */
  selectedGeofenceIds?: Set<string>;
  /** ID de geocerca en edición */
  editingGeofenceId?: string | null;
  /** Capa inicial del mapa */
  initialLayer?: MapLayerType;
  /** Callback cuando se crea una geometría */
  onGeometryCreated?: (event: { type: string; geometry: unknown }) => void;
  /** Callback cuando se edita una geometría */
  onGeometryEdited?: (event: { id: string; geometry: unknown }) => void;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Ref expuesta del mapa
 */
export interface GeofencesMapNewRef {
  drawPolygon: () => void;
  drawCircle: () => void;
  drawRectangle: () => void;
  drawPentagon: () => void;
  zoomToGeofence: (id: string) => void;
  editGeofence: (id: string) => void;
  cancelEditing: () => void;
  deleteGeofenceLayer: (id: string) => void;
  setMapLayer: (layer: MapLayerType) => void;
  getLayerGeometry: () => unknown;
}

/**
 * Componente de mapa de geocercas con hooks mejorados
 */
export const GeofencesMapNew = forwardRef<GeofencesMapNewRef, GeofencesMapNewProps>(
  function GeofencesMapNew(
    {
      geofences,
      selectedGeofenceIds = new Set(),
      editingGeofenceId = null,
      initialLayer = "voyager",
      onGeometryCreated,
      onGeometryEdited,
      className,
    },
    ref
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geofenceLayersRef = useRef<Map<string, any>>(new Map());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentEditingLayerRef = useRef<any>(null);

    const {
      mapRef,
      leafletMap,
      isReady: isMapReady,
      setLayer,
      L: LeafletLib,
      drawnItems,
    } = useLeafletMap({
      layerType: initialLayer,
      center: [23.6345, -102.5528], // Mexico
      zoom: 5,
    });
    
    const {
      startDrawPolygon,
      startDrawCircle,
      startDrawRectangle,
      createPentagon,
      cancelDrawing,
      createLayerFromGeofence,
      getLayerGeometry: getGeometryFromLayerFn,
      enableEditing,
      disableEditing,
    } = useDrawingTools({
      map: leafletMap,
      drawnItems,
      L: LeafletLib,
      onGeometryCreated: (event) => {
        currentEditingLayerRef.current = event.layer;
        if (onGeometryCreated) {
          onGeometryCreated({
            type: event.type,
            geometry: event.geometry,
          });
        }
      },
    });
    
    // Crear capas de geocercas
    const createGeofenceLayers = useCallback(() => {
      if (!leafletMap || !isMapReady) return;
      
      // Limpiar capas existentes
      geofenceLayersRef.current.forEach((layer) => {
        leafletMap.removeLayer(layer);
      });
      geofenceLayersRef.current.clear();
      
      // Crear nuevas capas
      geofences.forEach((geofence) => {
        if (geofence.id === editingGeofenceId) return;
        
        const layer = createLayerFromGeofence(geofence);
        if (layer) {
          // Estilo según selección
          const isSelected = selectedGeofenceIds.has(geofence.id);
          if ("setStyle" in layer) {
            (layer as L.Path).setStyle({
              weight: isSelected ? 3 : 2,
            });
          }
          
          // Popup
          layer.bindPopup(`
            <div class="p-2">
              <strong class="text-sm">${geofence.name}</strong>
              ${geofence.description ? `<p class="text-xs text-gray-500 mt-1">${geofence.description}</p>` : ""}
            </div>
          `);
          
          // Tooltip
          layer.bindTooltip(geofence.name, {
            permanent: false,
            direction: "center",
          });
          
          leafletMap.addLayer(layer);
          geofenceLayersRef.current.set(geofence.id, layer);
        }
      });
    }, [leafletMap, isMapReady, geofences, editingGeofenceId, selectedGeofenceIds, createLayerFromGeofence]);
    
    // Inicializar y actualizar capas
    useEffect(() => {
      if (!isMapReady) return;
      
      createGeofenceLayers();
    }, [isMapReady, createGeofenceLayers]);
    
    // Zoom a geocerca
    const zoomToGeofence = useCallback((id: string) => {
      const layer = geofenceLayersRef.current.get(id);
      if (layer && leafletMap) {
        if ("getBounds" in layer) {
          leafletMap.fitBounds((layer as L.Polygon).getBounds(), { padding: [50, 50] });
        } else if ("getLatLng" in layer) {
          const circle = layer as L.Circle;
          const center = circle.getLatLng();
          leafletMap.setView(center, 14);
        }
      }
    }, [leafletMap]);
    
    // Editar geocerca
    const editGeofence = useCallback((id: string) => {
      const geofence = geofences.find((g) => g.id === id);
      if (!geofence || !leafletMap) return;
      
      // Ocultar capa original
      const existingLayer = geofenceLayersRef.current.get(id);
      if (existingLayer) {
        leafletMap.removeLayer(existingLayer);
      }
      
      // Crear capa editable
      const layer = createLayerFromGeofence(geofence);
      if (layer) {
        leafletMap.addLayer(layer);
        currentEditingLayerRef.current = layer;
        enableEditing(layer);
        
        // Zoom a la geocerca
        if ("getBounds" in layer) {
          leafletMap.fitBounds((layer as L.Polygon).getBounds(), { padding: [50, 50] });
        }
      }
    }, [geofences, leafletMap, createLayerFromGeofence, enableEditing]);
    
    // Cancelar edición
    const cancelEditingFn = useCallback(() => {
      if (currentEditingLayerRef.current) {
        disableEditing(currentEditingLayerRef.current);
      }
      cancelDrawing();
      
      if (currentEditingLayerRef.current && leafletMap) {
        leafletMap.removeLayer(currentEditingLayerRef.current);
        currentEditingLayerRef.current = null;
      }
      
      // Recrear capas
      createGeofenceLayers();
    }, [leafletMap, disableEditing, cancelDrawing, createGeofenceLayers]);
    
    // Eliminar capa de geocerca
    const deleteGeofenceLayer = useCallback((id: string) => {
      const layer = geofenceLayersRef.current.get(id);
      if (layer && leafletMap) {
        leafletMap.removeLayer(layer);
        geofenceLayersRef.current.delete(id);
      }
    }, [leafletMap]);
    
    // Obtener geometría de la capa actual
    const getLayerGeometry = useCallback(() => {
      if (currentEditingLayerRef.current) {
        return getGeometryFromLayerFn(currentEditingLayerRef.current);
      }
      return null;
    }, [getGeometryFromLayerFn]);

    // Crear pentagono
    const drawPentagon = useCallback(() => {
      if (!leafletMap) return;

      // Usar el centro del mapa
      const center = leafletMap.getCenter();
      const layer = createPentagon({ lat: center.lat, lng: center.lng });

      if (layer) {
        currentEditingLayerRef.current = layer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        leafletMap.addLayer(layer as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enableEditing(layer as any);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geometry = getGeometryFromLayerFn(layer as any);
        if (geometry && onGeometryCreated) {
          onGeometryCreated({ type: "polygon", geometry });
        }
      }
    }, [leafletMap, createPentagon, enableEditing, getGeometryFromLayerFn, onGeometryCreated]);
    
    // Handle geometry edited callback
    useEffect(() => {
      if (!leafletMap || !editingGeofenceId) return;
      
      const handleEdit = () => {
        if (currentEditingLayerRef.current && onGeometryEdited) {
          const geometry = getGeometryFromLayerFn(currentEditingLayerRef.current);
          if (geometry) {
            onGeometryEdited({
              id: editingGeofenceId,
              geometry,
            });
          }
        }
      };
      
      leafletMap.on("draw:editstop", handleEdit);
      
      return () => {
        leafletMap.off("draw:editstop", handleEdit);
      };
    }, [leafletMap, editingGeofenceId, getGeometryFromLayerFn, onGeometryEdited]);
    
    // Exponer métodos al padre
    useImperativeHandle(ref, () => ({
      drawPolygon: () => startDrawPolygon(),
      drawCircle: () => startDrawCircle(),
      drawRectangle: () => startDrawRectangle(),
      drawPentagon,
      zoomToGeofence,
      editGeofence,
      cancelEditing: cancelEditingFn,
      deleteGeofenceLayer,
      setMapLayer: setLayer,
      getLayerGeometry,
    }), [
      startDrawPolygon,
      startDrawCircle,
      startDrawRectangle,
      drawPentagon,
      zoomToGeofence,
      editGeofence,
      cancelEditingFn,
      deleteGeofenceLayer,
      setLayer,
      getLayerGeometry,
    ]);
    
    return (
      <div ref={mapRef} className={cn("w-full h-full", className)} />
    );
  }
);

export default GeofencesMapNew;
