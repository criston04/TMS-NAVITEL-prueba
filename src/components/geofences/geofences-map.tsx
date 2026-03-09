"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertModal } from "@/components/ui/alert-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { X, Save } from "lucide-react";
import ColorPicker from "@/components/geofences/color-picker";
import { 
  Geofence, 
  CircleGeometry, 
  PolygonGeometry, 
  GeofenceCategory 
} from "@/types/models/geofence";
import { EntityStatus } from "@/types/common";

interface GeofencesMapProps {
  className?: string;
  onGeofenceCreated?: (geofence: Geofence) => void;
  onGeofenceUpdated?: (geofence: Geofence) => void;
  onKMLImported?: (geofences: Geofence[]) => void;
  onEditingComplete?: () => void;
  onFormDataChange?: (data: { name: string; description: string; tags: string; color: string }) => void;
  geofences?: Geofence[];
  selectedGeofenceIds?: Set<string>;
  sidebarWidth?: number;
  isEditingMode?: boolean;
  editingGeofenceId?: string | null;
}

export function GeofencesMap({ 
  className, 
  onGeofenceCreated,
  onGeofenceUpdated,
  onKMLImported,
  onEditingComplete,
  onFormDataChange,
  geofences = [],
  selectedGeofenceIds = new Set(),
  sidebarWidth = 240,
  isEditingMode = false,
  editingGeofenceId = null
}: GeofencesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const drawControlRef = useRef<any>(null);
  const drawnLayerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [kmlImportProgress, setKmlImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; description: string; variant: 'info' | 'success' | 'warning' | 'error' }>({ open: false, title: '', description: '', variant: 'error' });
  const [kmlConfirm, setKmlConfirm] = useState<{ open: boolean; message: string; resolve: ((value: boolean) => void) | null }>({ open: false, message: '', resolve: null });
  const eventsRegisteredRef = useRef(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;
    
    // Prevenir múltiples inicializaciones simultáneas
    if (initializingRef.current) return;
    
    // Verificar si el contenedor ya tiene un mapa (usando _leaflet_id que Leaflet añade)
    if ((mapRef.current as any)._leaflet_id) {
      console.log('Contenedor ya tiene mapa, limpiando...');
      // Limpiar el contenedor manualmente
      mapRef.current.innerHTML = '';
      delete (mapRef.current as any)._leaflet_id;
    }
    
    // Limpiar el mapa existente si ya está inicializado
    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      } catch (e) {
        console.warn('Error limpiando mapa existente:', e);
      }
    }

    let map: any;
    let L: any;
    let isMounted = true;

    const initMap = async () => {
      initializingRef.current = true;
      
      try {
        L = (await import("leaflet")).default;
        
        // Verificar que el componente sigue montado
        if (!isMounted || !mapRef.current) {
          initializingRef.current = false;
          return;
        }
        
        // Doble verificación después de las importaciones asíncronas
        if ((mapRef.current as any)._leaflet_id) {
          console.log('Contenedor ya inicializado después de importaciones, abortando...');
          initializingRef.current = false;
          return;
        }
        
        await import("leaflet/dist/leaflet.css");
        await import("@/styles/leaflet-custom.css");
        
        const LeafletDraw = await import("leaflet-draw");
        await import("leaflet-draw/dist/leaflet.draw.css");
      
        await import("leaflet-path-drag");

        // Verificar nuevamente que el componente sigue montado
        if (!isMounted || !mapRef.current) {
          initializingRef.current = false;
          return;
        }

        // Fix para los iconos de Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Crear el mapa
        map = L.map(mapRef.current!, {
          center: [-12.0464, -77.0428], // Lima, Perú
          zoom: 12,
          minZoom: 2,
          maxZoom: 18,
          zoomControl: true,
          worldCopyJump: true,
          maxBounds: [[-90, -180], [90, 180]],
          maxBoundsViscosity: 1.0
        });

        leafletMapRef.current = map;

        // Agregar capa de tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '© OpenStreetMap contributors © CARTO',
          maxZoom: 19,
          noWrap: true,
          className: 'map-tiles-enhanced'
        }).addTo(map);

        // Aplicar filtro CSS para realzar áreas verdes
        if (mapRef.current) {
          const style = document.createElement('style');
          style.textContent = `
            .map-tiles-enhanced {
              filter: saturate(1.3) brightness(1.02);
            }
        `;
        document.head.appendChild(style);
      }

      // Capa para elementos dibujados
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polyline: false,
          marker: false,
          circlemarker: false,
          rectangle: false,
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: '#00c9ff', // Paleta: Cyan brillante
              fillOpacity: 0.2
            },
            icon: new L.DivIcon({
              iconSize: new L.Point(8, 8),
              className: 'leaflet-div-icon leaflet-editing-icon'
            })
          },
          circle: {
            shapeOptions: {
              color: '#00c9ff', // Paleta: Cyan brillante
              fillOpacity: 0.2
            }
          }
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
          edit: {
            selectedPathOptions: {
              maintainColor: true,
              opacity: 0.3
            }
          }
        }
      });

      drawControlRef.current = drawControl;
      map.addControl(drawControl);

      // Registrar eventos solo una vez
      if (!eventsRegisteredRef.current) {
        eventsRegisteredRef.current = true;

        // Eventos de dibujo
        map.on(L.Draw.Event.CREATED, (e: any) => {
          const layer = e.layer;
          
          // Forzar inicialización de dragging si no existe
          if (!layer.dragging && (layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.Circle)) {
            try {
              const Handler = (L as any).Handler;
              if (Handler && Handler.PathDrag) {
                (layer as any).dragging = new Handler.PathDrag(layer);
              }
            } catch (err) {
              console.warn('No se pudo inicializar dragging:', err);
            }
          }
          
          // Habilitar dragging
          if (layer.dragging) {
            layer.dragging.enable();
            
            // Desactivar edición al mover
            layer.on('dragstart', () => {
              if (layer.editing && layer.editing._enabled) {
                layer.editing.disable();
              }
            });
            
            layer.on('dragend', () => {
              // No reactivar automáticamente la edición después del drag
            });
          }
          
          drawnItems.addLayer(layer);
          drawnLayerRef.current = layer;
        });

        map.on(L.Draw.Event.EDITED, (e: any) => {
          // Aquí podrías manejar la edición de geocercas existentes
        });

        map.on(L.Draw.Event.DELETED, (e: any) => {
          // Aquí podrías manejar la eliminación de geocercas
        });
      }

      // Exponer funciones para controlar desde fuera
      (window as any).__drawPolygon = () => {
        // Crear un pentágono predefinido centrado en el mapa
        const center = map.getCenter();
        const zoom = map.getZoom();
        
        // Calcular el radio basado en el nivel de zoom
        const radiusInDegrees = 0.5 / Math.pow(2, zoom - 8);
        
        // Crear 5 puntos para el pentágono
        const pentagon: [number, number][] = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 72 - 90) * (Math.PI / 180); // 72 grados entre cada punto, comenzando desde arriba
          const lat = center.lat + radiusInDegrees * Math.cos(angle);
          const lng = center.lng + radiusInDegrees * Math.sin(angle) / Math.cos(center.lat * Math.PI / 180);
          pentagon.push([lat, lng]);
        }
        
        // Crear el polígono
        const polygonLayer = L.polygon(pentagon, {
          color: '#00c9ff', // Paleta: Cyan brillante
          fillOpacity: 0.2
        });
        
        // Añadir a la capa de elementos dibujados
        drawnItems.addLayer(polygonLayer);
        
        // Forzar inicialización de dragging si no existe
        if (!polygonLayer.dragging) {
          try {
            const Handler = (L as any).Handler;
            if (Handler && Handler.PathDrag) {
              (polygonLayer as any).dragging = new Handler.PathDrag(polygonLayer);
              console.log('Dragging inicializado manualmente');
            }
          } catch (e) {
            console.warn('No se pudo inicializar dragging:', e);
          }
        }
        
        // Inicializar edición ANTES de habilitar dragging
        if (!polygonLayer.editing) {
          polygonLayer.editing = new (L.Edit as any).Poly(polygonLayer, {
            icon: new L.DivIcon({
              iconSize: new L.Point(12, 12),
              className: 'leaflet-div-icon leaflet-editing-icon'
            })
          });
        }
        
        // Habilitar dragging con el plugin
        if (polygonLayer.dragging) {
          polygonLayer.dragging.enable();
          console.log('Dragging habilitado');
          
          // Sincronizar edición con dragging
          polygonLayer.on('dragstart', () => {
            if (polygonLayer.editing && polygonLayer.editing._enabled) {
              polygonLayer.editing.disable();
            }
          });
          
          polygonLayer.on('dragend', () => {
            if (polygonLayer.editing) {
              polygonLayer.editing.enable();
            }
          });
        } else {
          console.warn('Dragging NO está disponible en el layer');
        }
        
        // Habilitar edición de vértices
        polygonLayer.editing.enable();
        
        // Guardar el layer dibujado
        drawnLayerRef.current = polygonLayer;
      };

      (window as any).__drawCircle = () => {
        new L.Draw.Circle(map, drawControl.options.draw.circle).enable();
      };

      (window as any).__flyToCoordinates = (lat: number, lng: number, zoom = 16) => {
        map.flyTo([lat, lng], zoom, { duration: 1.5 });
      };

      // Marcador de búsqueda de dirección
      let searchMarker: any = null;
      (window as any).__addSearchMarker = (lat: number, lng: number, label: string) => {
        // Remover marcador anterior si existe
        if (searchMarker) {
          map.removeLayer(searchMarker);
        }
        const shortLabel = label.split(',')[0];
        const icon = L.divIcon({
          className: 'search-marker-icon',
          html: `<div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:#0ea5e9;color:white;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);max-width:220px;overflow:hidden;text-overflow:ellipsis;">${shortLabel}</div>
            <div style="width:3px;height:16px;background:#0ea5e9;"></div>
            <div style="width:12px;height:12px;background:#0ea5e9;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
          </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 50],
        });
        searchMarker = L.marker([lat, lng], { icon }).addTo(map);
        // Añadir popup con la dirección completa
        searchMarker.bindPopup(`<div style="font-size:13px;max-width:250px;"><b>📍 Dirección encontrada</b><br/>${label}</div>`).openPopup();
      };
      (window as any).__removeSearchMarker = () => {
        if (searchMarker) {
          map.removeLayer(searchMarker);
          searchMarker = null;
        }
      };

      (window as any).__zoomToGeofence = (geofenceId: string) => {
        const geofence = geofences.find(g => g.id === geofenceId);
        if (!geofence) return;

        if (geofence.geometry.type === 'circle') {
          const circleGeom = geofence.geometry as CircleGeometry;
          map.setView([circleGeom.center.lat, circleGeom.center.lng], 14);
        } else if (geofence.geometry.type === 'polygon') {
          const polygonGeom = geofence.geometry as PolygonGeometry;
          const coords = polygonGeom.coordinates.map(c => [c.lat, c.lng]);
          const bounds = L.latLngBounds(coords);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      };

      (window as any).__editGeofence = (geofenceId: string) => {
        // Buscar la geocerca en el array
        const geofence = geofences.find(g => g.id === geofenceId);
        if (!geofence) {
          console.error('No se encontró la geocerca con id:', geofenceId);
          return;
        }

        // Buscar la capa en drawnItems que corresponde a esta geocerca
        let targetLayer: any = null;
        drawnItems.eachLayer((layer: any) => {
          if (layer.geofenceId === geofenceId) {
            targetLayer = layer;
          }
        });

        // Si no existe el layer, crearlo
        if (!targetLayer) {
          console.log('Layer no encontrado, creándolo para:', geofenceId);
          
          if (geofence.geometry.type === 'circle') {
            const circleGeom = geofence.geometry as CircleGeometry;
            targetLayer = L.circle([circleGeom.center.lat, circleGeom.center.lng], {
              radius: circleGeom.radius,
              color: geofence.color,
              fillOpacity: geofence.opacity
            });
          } else if (geofence.geometry.type === 'polygon') {
            const polygonGeom = geofence.geometry as PolygonGeometry;
            const coords = polygonGeom.coordinates.map(c => [c.lat, c.lng]);
            targetLayer = L.polygon(coords, {
              color: geofence.color,
              fillOpacity: geofence.opacity
            });
          }
          
          if (targetLayer) {
            targetLayer.geofenceId = geofenceId;
            drawnItems.addLayer(targetLayer);
            
            // Forzar inicialización de dragging si no existe
            if (!targetLayer.dragging && (targetLayer instanceof L.Polygon || targetLayer instanceof L.Polyline || targetLayer instanceof L.Circle)) {
              try {
                const Handler = (L as any).Handler;
                if (Handler && Handler.PathDrag) {
                  (targetLayer as any).dragging = new Handler.PathDrag(targetLayer);
                }
              } catch (e) {
                console.warn('No se pudo inicializar dragging en layer creado:', e);
              }
            }
            
            // Habilitar dragging
            if (targetLayer.dragging) {
              targetLayer.dragging.enable();
            }
          } else {
            console.error('No se pudo crear el layer');
            return;
          }
        }

        // Deshabilitar edición de todas las demás capas
        drawnItems.eachLayer((layer: any) => {
          if (layer.editing && layer.editing._enabled) {
            layer.editing.disable();
          }
        });

        // Para polígonos, asegurar que tengan los métodos de edición
        if (targetLayer instanceof L.Polygon || targetLayer instanceof L.Polyline) {
          console.log('Configurando polígono para edición');
          console.log('targetLayer.dragging existe:', !!targetLayer.dragging);
          
          // Asegurar que el dragging esté disponible
          if (!targetLayer.dragging) {
            console.warn('Dragging no disponible para este layer');
          } else {
            targetLayer.dragging.enable();
            console.log('Dragging habilitado');
            
            // Sincronizar edición con dragging
            targetLayer.on('dragstart', () => {
              console.log('Drag iniciado - deshabilitando vértices');
              if (targetLayer.editing && targetLayer.editing._enabled) {
                targetLayer.editing.disable();
              }
            });
            
            targetLayer.on('dragend', () => {
              console.log('Drag finalizado - habilitando vértices');
              // No reactivar automáticamente la edición
            });
          }
          
          // Habilitar el modo de edición directamente
          if (!targetLayer.editing) {
            // Inicializar L.Edit.Poly para el layer
            targetLayer.editing = new (L.Edit as any).Poly(targetLayer, {
              icon: new L.DivIcon({
                iconSize: new L.Point(12, 12),
                className: 'leaflet-div-icon leaflet-editing-icon'
              })
            });
          }
          
          targetLayer.editing.enable();
          console.log('Edición de vértices habilitada');
        } else if (targetLayer instanceof L.Circle) {
          if (!targetLayer.editing) {
            targetLayer.editing = new (L.Edit as any).Circle(targetLayer);
          }
          
          if (targetLayer.dragging) {
            targetLayer.dragging.enable();
            
            targetLayer.on('dragstart', () => {
              if (targetLayer.editing && targetLayer.editing._enabled) {
                targetLayer.editing.disable();
              }
            });
            
            targetLayer.on('dragend', () => {
              // No reactivar automáticamente
            });
          }
          
          targetLayer.editing.enable();
        }

        // Hacer zoom a la geocerca
        if (targetLayer instanceof L.Circle) {
          map.setView(targetLayer.getLatLng(), 14);
        } else if (targetLayer.getBounds) {
          map.fitBounds(targetLayer.getBounds(), { padding: [50, 50] });
        }

        // Guardar datos del formulario
        console.log('__editGeofence: Guardando layer en drawnLayerRef:', targetLayer);
        setEditingGeofence(geofence);
        drawnLayerRef.current = targetLayer;
        
        // Log para verificar que se guardó
        console.log('__editGeofence: drawnLayerRef.current después de guardar:', drawnLayerRef.current);
        
        // Actualizar formData del padre
        if (onFormDataChange) {
          onFormDataChange({
            name: geofence.name,
            description: geofence.description || "",
            tags: geofence.tags.map(t => t.name).join(", "),
            color: geofence.color
          });
        }
      };

      (window as any).__cancelEditing = () => {
        // Remover el layer en edición si no ha sido guardado
        const drawnLayer = drawnLayerRef.current;
        if (drawnLayer) {
          // Verificar si el layer tiene geofenceId (fue guardado) o no
          const hasBeenSaved = (drawnLayer as any).geofenceId;
          
          if (!hasBeenSaved) {
            // Si no ha sido guardado, remover completamente
            drawnItems.removeLayer(drawnLayer);
          } else if (drawnLayer.editing && drawnLayer.editing._enabled) {
            // Si está siendo editado, solo deshabilitar edición
            drawnLayer.editing.disable();
          }
        }
        drawnLayerRef.current = null;
        setEditingGeofence(null);
      };

      (window as any).__saveGeofence = (formData: any) => {
        handleSave(formData);
      };

      (window as any).__deleteGeofence = (geofenceId: string) => {
        // Buscar y remover el layer del mapa
        drawnItems.eachLayer((layer: any) => {
          if (layer.geofenceId === geofenceId) {
            drawnItems.removeLayer(layer);
          }
        });
      };

      (window as any).__importKML = async (file: File) => {
        try {
          const text = await file.text();
          const togeojson = (await import("@mapbox/togeojson")).default;
          const parser = new DOMParser();
          const kml = parser.parseFromString(text, "text/xml");
          const geojson = togeojson.kml(kml);

          const MAX_FEATURES = 500;
          const allFeatures = geojson.features || [];
          
          if (allFeatures.length > MAX_FEATURES) {
            const proceed = await new Promise<boolean>((resolve) => {
              setKmlConfirm({
                open: true,
                message: `El archivo KML contiene ${allFeatures.length} elementos. Se importarán solo los primeros ${MAX_FEATURES}. ¿Desea continuar?`,
                resolve,
              });
            });
            if (!proceed) return;
          }

          const features = allFeatures.slice(0, MAX_FEATURES);
          const importedGeofences: Geofence[] = [];
          const BATCH_SIZE = 50;
          const totalFeatures = features.length;

          setKmlImportProgress({ current: 0, total: totalFeatures });

          // Procesar features en lotes para evitar bloquear el UI
          const processBatch = (startIdx: number): Promise<void> => {
            return new Promise((resolve) => {
              requestAnimationFrame(() => {
                const endIdx = Math.min(startIdx + BATCH_SIZE, features.length);
                for (let i = startIdx; i < endIdx; i++) {
                  const feature = features[i];
                  if (!feature.geometry) continue;

                  const layer = L.geoJSON(feature, {
                    style: { color: '#00c9ff', fillOpacity: 0.2 },
                  });

                  layer.eachLayer((l: any) => {
                    if (l.dragging) l.dragging.enable();
                    drawnItems.addLayer(l);
                  });

                  const geofence: Geofence = {
                    id: `kml-${Date.now()}-${i}`,
                    code: `KML-${Date.now()}-${i}`,
                    name: feature.properties?.name || `Geocerca importada ${i + 1}`,
                    description: feature.properties?.description || "",
                    type: feature.geometry.type.toLowerCase() === 'point' ? 'circle' : 'polygon',
                    category: 'other' as GeofenceCategory,
                    geometry: {
                      type: 'polygon',
                      coordinates: ((feature.geometry as any).coordinates || []).map((coord: any) => ({
                        lat: coord[1],
                        lng: coord[0]
                      }))
                    } as PolygonGeometry,
                    color: '#00c9ff',
                    opacity: 0.2,
                    tags: [],
                    alerts: { onEntry: false, onExit: false, onDwell: false },
                    status: 'active' as EntityStatus,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  importedGeofences.push(geofence);
                }
                setKmlImportProgress({ current: endIdx, total: totalFeatures });
                resolve();
              });
            });
          };

          // Procesar todos los lotes secuencialmente
          for (let i = 0; i < features.length; i += BATCH_SIZE) {
            await processBatch(i);
          }

          setKmlImportProgress(null);

          if (importedGeofences.length > 0 && onKMLImported) {
            onKMLImported(importedGeofences);
          }

          // Ajustar vista a las geocercas importadas
          if (drawnItems.getLayers().length > 0) {
            map.fitBounds(drawnItems.getBounds());
          }
        } catch (error) {
          console.error("Error importing KML:", error);
          setKmlImportProgress(null);
          setAlertModal({ open: true, title: 'Error de importación', description: 'Error al importar el archivo KML. Verifique que el archivo sea válido.', variant: 'error' });
        }
      };

      // Renderizar geocercas existentes
      renderExistingGeofences(L, map, drawnItems);

      // Invalidar el tamaño del mapa después de un breve delay
      setTimeout(() => {
        if (map && isMounted) {
          map.invalidateSize();
          setIsMapReady(true);
        }
      }, 100);
      
      } catch (error) {
        console.error('Error inicializando mapa:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    const renderExistingGeofences = (L: any, map: any, drawnItems: any) => {
      // Limpiar capas existentes excepto las que están en edición
      drawnItems.eachLayer((layer: any) => {
        if (!layer.editing || !layer.editing._enabled) {
          drawnItems.removeLayer(layer);
        }
      });

      geofences.forEach(geofence => {
        let layer;
        
        if (geofence.geometry.type === 'circle') {
          const circleGeom = geofence.geometry as CircleGeometry;
          layer = L.circle([circleGeom.center.lat, circleGeom.center.lng], {
            radius: circleGeom.radius,
            color: geofence.color,
            fillOpacity: geofence.opacity
          });
        } else if (geofence.geometry.type === 'polygon') {
          const polygonGeom = geofence.geometry as PolygonGeometry;
          const coords = polygonGeom.coordinates.map(c => [c.lat, c.lng]);
          layer = L.polygon(coords, {
            color: geofence.color,
            fillOpacity: geofence.opacity
          });
        }

        if (layer) {
          // Habilitar dragging con el plugin después de añadir al mapa
          drawnItems.addLayer(layer);
          
          if (layer.dragging) {
            layer.dragging.enable();
            
            // Sincronizar edición con dragging
            layer.on('dragstart', () => {
              if (layer.editing && layer.editing._enabled) {
                layer.editing.disable();
              }
            });
            
            layer.on('dragend', () => {
              // No reactivar automáticamente la edición
            });
          }
          
          // Agregar ID de geocerca como propiedad del layer
          (layer as any).geofenceId = geofence.id;
          
          layer.bindPopup(`
            <div class="p-2">
              <h3 class="font-bold">${geofence.name}</h3>
              ${geofence.description ? `<p class="text-sm">${geofence.description}</p>` : ''}
              ${geofence.tags.length > 0 ? `<div class="flex gap-1 mt-2">${geofence.tags.map(t => `<span class="text-xs bg-primary/10 px-2 py-1 rounded">${t.name}</span>`).join('')}</div>` : ''}
            </div>
          `);
        }
      });
    };

    initMap();

    return () => {
      isMounted = false;
      initializingRef.current = false;
      eventsRegisteredRef.current = false;
      
      // Limpiar funciones globales
      delete (window as any).__drawPolygon;
      delete (window as any).__drawCircle;
      delete (window as any).__importKML;
      delete (window as any).__flyToCoordinates;
      delete (window as any).__addSearchMarker;
      delete (window as any).__removeSearchMarker;
      delete (window as any).__zoomToGeofence;
      delete (window as any).__editGeofence;
      delete (window as any).__cancelEditing;
      delete (window as any).__saveGeofence;
      delete (window as any).__deleteGeofence;
      
      // Limpiar mapa
      if (leafletMapRef.current) {
        try {
          const L = (window as any).L;
          if (L && leafletMapRef.current) {
            // Remover listeners de eventos
            leafletMapRef.current.off(L.Draw.Event.CREATED);
            leafletMapRef.current.off(L.Draw.Event.EDITED);
            leafletMapRef.current.off(L.Draw.Event.DELETED);
            
            // Limpiar todas las capas
            leafletMapRef.current.eachLayer((layer: any) => {
              leafletMapRef.current.removeLayer(layer);
            });
          }
          
          // Remover el mapa completamente
          leafletMapRef.current.remove();
        } catch (e) {
          console.warn('Error al limpiar el mapa:', e);
        } finally {
          leafletMapRef.current = null;
          drawnItemsRef.current = null;
          drawControlRef.current = null;
          drawnLayerRef.current = null;
        }
      }
      
      // Limpiar el contenedor del DOM
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
        // Remover la clase _leaflet_id que puede causar problemas
        if ((mapRef.current as any)._leaflet_id) {
          delete (mapRef.current as any)._leaflet_id;
        }
      }
    };
  }, []);

  // Effect separado para re-renderizar geocercas cuando cambien
  useEffect(() => {
    if (!leafletMapRef.current || !drawnItemsRef.current || !isMapReady) return;

    const L = (window as any).L;
    if (!L) return;

    // Limpiar todas las capas de geocercas (excepto las que están en edición)
    const layersToRemove: any[] = [];
    const currentEditingLayer = drawnLayerRef.current;
    
    drawnItemsRef.current.eachLayer((layer: any) => {
      // No remover el layer que está siendo editado actualmente
      if (layer === currentEditingLayer) {
        return;
      }
      
      if (layer.geofenceId && (!layer.editing || !layer.editing._enabled)) {
        layersToRemove.push(layer);
      }
    });
    layersToRemove.forEach(layer => drawnItemsRef.current.removeLayer(layer));

    // Renderizar solo las geocercas seleccionadas
    geofences.forEach(geofence => {
      // Solo mostrar si está seleccionada O si es la que se está editando
      const isBeingEdited = editingGeofenceId === geofence.id;
      const isSelected = selectedGeofenceIds.has(geofence.id);
      
      if (!isSelected && !isBeingEdited) return;

      let layer;
      
      if (geofence.geometry.type === 'circle') {
        const circleGeom = geofence.geometry as CircleGeometry;
        layer = L.circle([circleGeom.center.lat, circleGeom.center.lng], {
          radius: circleGeom.radius,
          color: geofence.color,
          fillOpacity: geofence.opacity
        });
      } else if (geofence.geometry.type === 'polygon') {
        const polygonGeom = geofence.geometry as PolygonGeometry;
        const coords = polygonGeom.coordinates.map(c => [c.lat, c.lng]);
        layer = L.polygon(coords, {
          color: geofence.color,
          fillOpacity: geofence.opacity
        });
      }

      if (layer) {
        // Agregar ID de geocerca como propiedad del layer
        (layer as any).geofenceId = geofence.id;
        
        // Forzar inicialización de dragging si no existe
        if (!layer.dragging && (layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.Circle)) {
          // Inicializar dragging manualmente
          try {
            const Handler = (L as any).Handler;
            if (Handler && Handler.PathDrag) {
              (layer as any).dragging = new Handler.PathDrag(layer);
            }
          } catch (e) {
            console.warn('No se pudo inicializar dragging:', e);
          }
        }
        
        // Habilitar dragging si está disponible
        if (layer.dragging) {
          layer.dragging.enable();
        }
        
        // Agregar layer al FeatureGroup
        drawnItemsRef.current.addLayer(layer);
        
        // Bind popup
        layer.bindPopup(`
          <div class="p-2">
            <h3 class="font-bold">${geofence.name}</h3>
            ${geofence.description ? `<p class="text-sm">${geofence.description}</p>` : ''}
            ${geofence.tags.length > 0 ? `<div class="flex gap-1 mt-2">${geofence.tags.map(t => `<span class="text-xs bg-primary/10 px-2 py-1 rounded">${t.name}</span>`).join('')}</div>` : ''}
          </div>
        `);
      }
    });
  }, [geofences, selectedGeofenceIds, isMapReady, editingGeofenceId]);

  // Invalidar tamaño del mapa cuando cambie el ancho del sidebar
  useEffect(() => {
    if (leafletMapRef.current && isMapReady) {
      setTimeout(() => {
        leafletMapRef.current.invalidateSize();
      }, 350); // Esperar a que termine la transición CSS
    }
  }, [sidebarWidth, isMapReady]);

  const handleSave = (formDataParam: { name: string; description: string; tags: string; color: string }) => {
    console.log('═══ INICIO HANDLE SAVE ═══');
    console.log('formDataParam:', formDataParam);
    console.log('drawnLayerRef.current:', drawnLayerRef.current);
    console.log('editingGeofence:', editingGeofence);
    console.log('editingGeofenceId (prop):', editingGeofenceId);
    
    if (!formDataParam.name.trim()) {
      console.error('❌ No se puede guardar - nombre vacío');
      return;
    }

    const L = (window as any).L;
    let drawnLayer = drawnLayerRef.current;
    
    // Si estamos editando y el ref es null, buscar el layer por editingGeofenceId o por el prop
    const idToSearch = editingGeofence?.id || editingGeofenceId;
    console.log('ID a buscar:', idToSearch);
    
    if (!drawnLayer && idToSearch && drawnItemsRef.current) {
      console.log('🔍 drawnLayerRef es null, buscando layer por id:', idToSearch);
      console.log('🔍 drawnItemsRef.current existe:', !!drawnItemsRef.current);
      
      const allLayers: any[] = [];
      drawnItemsRef.current.eachLayer((layer: any) => {
        console.log('🔍 Layer en drawnItems:', {
          geofenceId: layer.geofenceId,
          type: layer instanceof L.Circle ? 'Circle' : 'Polygon',
          hasGeofenceId: !!layer.geofenceId
        });
        allLayers.push(layer);
        
        if (layer.geofenceId === idToSearch) {
          drawnLayer = layer;
          console.log('✅ Layer encontrado!');
        }
      });
      
      console.log('🔍 Total layers en drawnItems:', allLayers.length);
      console.log('🔍 Layer encontrado:', !!drawnLayer);
      
      if (!drawnLayer) {
        console.error('❌ No se pudo encontrar el layer con id:', idToSearch);
        console.error('❌ Layers disponibles:', allLayers.map(l => l.geofenceId));
        setAlertModal({ open: true, title: 'Error', description: 'No se pudo encontrar la geocerca en el mapa.', variant: 'error' });
        return;
      }
    }
    
    if (!drawnLayer) {
      console.error('❌ FALLO FINAL: No hay layer para guardar');
      console.error('❌ drawnLayerRef.current:', drawnLayerRef.current);
      console.error('❌ editingGeofence:', editingGeofence);
      console.error('❌ editingGeofenceId:', editingGeofenceId);
      console.error('❌ idToSearch:', idToSearch);
      setAlertModal({ open: true, title: 'Error', description: 'No hay layer para guardar.', variant: 'error' });
      return;
    }
    
    console.log('✅ Layer listo para guardar:', drawnLayer);
    
    // Determinar si estamos editando chequeando si el layer ya tiene un geofenceId
    const layerGeofenceId = (drawnLayer as any).geofenceId;
    const existingGeofence = layerGeofenceId 
      ? geofences.find(g => g.id === layerGeofenceId)
      : (editingGeofence || (editingGeofenceId ? geofences.find(g => g.id === editingGeofenceId) : null));
    
    console.log('layerGeofenceId:', layerGeofenceId);
    console.log('existingGeofence:', existingGeofence);
    
    let geofence: Geofence;

    // Si estamos editando, actualizar la geocerca existente
    if (existingGeofence) {
      // Obtener la geometría actualizada del layer
      if (drawnLayer instanceof L.Circle) {
        const center = drawnLayer.getLatLng();
        const radius = drawnLayer.getRadius();
        
        geofence = {
          ...existingGeofence,
          name: formDataParam.name,
          description: formDataParam.description,
          geometry: {
            type: 'circle',
            center: { lat: center.lat, lng: center.lng },
            radius
          } as CircleGeometry,
          color: formDataParam.color,
          tags: formDataParam.tags
            ? formDataParam.tags.split(',').map(t => ({
                id: t.trim().toLowerCase(),
                name: t.trim(),
                color: formDataParam.color
              }))
            : [],
          updatedAt: new Date().toISOString()
        };
      } else {
        const latlngs = drawnLayer.getLatLngs()[0];
        const coordinates = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
        
        geofence = {
          ...existingGeofence,
          name: formDataParam.name,
          description: formDataParam.description,
          geometry: {
            type: 'polygon',
            coordinates
          } as PolygonGeometry,
          color: formDataParam.color,
          tags: formDataParam.tags
            ? formDataParam.tags.split(',').map(t => ({
                id: t.trim().toLowerCase(),
                name: t.trim(),
                color: formDataParam.color
              }))
            : [],
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      // Crear nueva geocerca
      if (drawnLayer instanceof L.Circle) {
        const center = drawnLayer.getLatLng();
        const radius = drawnLayer.getRadius();
        
        geofence = {
          id: `geo-${Date.now()}`,
          code: `GEO-${Date.now()}`,
          name: formDataParam.name,
          description: formDataParam.description,
          type: 'circle',
          category: 'other' as GeofenceCategory,
          geometry: {
            type: 'circle',
            center: { lat: center.lat, lng: center.lng },
            radius
          } as CircleGeometry,
          color: formDataParam.color,
          opacity: 0.2,
          tags: formDataParam.tags
            ? formDataParam.tags.split(',').map(t => ({
                id: t.trim().toLowerCase(),
                name: t.trim(),
                color: formDataParam.color
              }))
            : [],
          alerts: {
            onEntry: false,
            onExit: false,
            onDwell: false
          },
          status: 'active' as EntityStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        const latlngs = drawnLayer.getLatLngs()[0];
        const coordinates = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
        
        geofence = {
          id: `geo-${Date.now()}`,
          code: `GEO-${Date.now()}`,
          name: formDataParam.name,
          description: formDataParam.description,
          type: 'polygon',
          category: 'other' as GeofenceCategory,
          geometry: {
            type: 'polygon',
            coordinates
          } as PolygonGeometry,
          color: formDataParam.color,
          opacity: 0.2,
          tags: formDataParam.tags
            ? formDataParam.tags.split(',').map(t => ({
                id: t.trim().toLowerCase(),
                name: t.trim(),
                color: formDataParam.color
              }))
            : [],
          alerts: {
            onEntry: false,
            onExit: false,
            onDwell: false
          },
          status: 'active' as EntityStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    // Actualizar el color de la capa
    drawnLayer.setStyle({
      color: formDataParam.color,
      fillOpacity: 0.2
    });

    // Agregar ID de geocerca al layer
    (drawnLayer as any).geofenceId = geofence.id;

    // Deshabilitar edición
    if (drawnLayer.editing) {
      drawnLayer.editing.disable();
    }

    // Agregar popup
    drawnLayer.bindPopup(`
      <div class="p-2">
        <h3 class="font-bold">${geofence.name}</h3>
        ${geofence.description ? `<p class="text-sm">${geofence.description}</p>` : ''}
        ${geofence.tags.length > 0 ? `<div class="flex gap-1 mt-2">${geofence.tags.map(t => `<span class="text-xs bg-primary/10 px-2 py-1 rounded">${t.name}</span>`).join('')}</div>` : ''}
      </div>
    `);

    // Llamar al callback correspondiente
    if (existingGeofence && onGeofenceUpdated) {
      console.log('✅ Llamando onGeofenceUpdated con:', geofence);
      onGeofenceUpdated(geofence);
    } else if (!existingGeofence && onGeofenceCreated) {
      console.log('✅ Llamando onGeofenceCreated con:', geofence);
      onGeofenceCreated(geofence);
    }

    // Resetear estado
    drawnLayerRef.current = null;
    setEditingGeofence(null);

    // Notificar al padre que la edición se completó
    if (onEditingComplete) {
      onEditingComplete();
    }
  };

  return (
    <>
      <div 
        ref={mapRef} 
        className={cn("w-full h-full rounded-lg relative", className)} 
        style={{ minHeight: "400px" }}
      >
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Cargando mapa...</p>
            </div>
          </div>
        )}
        {/* Barra de progreso de importación KML */}
        {kmlImportProgress && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 px-5 py-3 min-w-[320px]">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Importando KML...
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {kmlImportProgress.current} / {kmlImportProgress.total}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round((kmlImportProgress.current / kmlImportProgress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {Math.round((kmlImportProgress.current / kmlImportProgress.total) * 100)}% completado
            </p>
          </div>
        )}
      </div>

      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
        title={alertModal.title}
        description={alertModal.description}
        variant={alertModal.variant}
      />
      <ConfirmDialog
        open={kmlConfirm.open}
        onOpenChange={(open) => {
          if (!open && kmlConfirm.resolve) {
            kmlConfirm.resolve(false);
          }
          setKmlConfirm({ open: false, message: '', resolve: null });
        }}
        title="Importar KML"
        description={kmlConfirm.message}
        onConfirm={() => {
          if (kmlConfirm.resolve) kmlConfirm.resolve(true);
          setKmlConfirm({ open: false, message: '', resolve: null });
        }}
        confirmText="Continuar"
        cancelText="Cancelar"
      />
    </>
  );
}
