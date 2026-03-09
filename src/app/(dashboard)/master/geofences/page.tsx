"use client";

import { useState, useMemo, useRef, useEffect, useCallback, startTransition } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Plus, 
  FileUp, 
  Download,
  X,
  MapPin,
  Check,
  Pencil,
  Trash2,
  Copy,
  Palette,
  Layers,
  MoreVertical,
  CheckSquare,
  Square,
  Map,
  Satellite,
  Moon,
  Warehouse,
  User,
  Factory,
  Anchor,
  Shield,
  AlertTriangle,
  Package,
  Filter
} from "lucide-react";
import GeofenceForm, { type GeofenceFormData } from "@/components/geofences/geofence-form";
import { type GeofencesMapNewRef } from "@/components/geofences/geofences-map-new";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { useGeofences } from "@/hooks/useGeofences";
import { type MapLayerType } from "@/hooks/useLeafletMap";
import { Geofence, GeofenceCategory } from "@/types/models/geofence";
import { geofenceCategories, geofenceColors } from "@/mocks/master/geofences.mock";
import { cn } from "@/lib/utils";

const GeofencesMapNew = dynamic(
  async () => {
    const mod = await import("@/components/geofences/geofences-map-new");
    return mod.GeofencesMapNew;
  },
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    )
  }
);

/**
 * Iconos por categoría
 */
const CATEGORY_ICONS: Record<GeofenceCategory, React.ElementType> = {
  warehouse: Warehouse,
  customer: User,
  plant: Factory,
  port: Anchor,
  checkpoint: Shield,
  restricted: AlertTriangle,
  delivery: Package,
  other: MapPin,
};

/**
 * Iconos por tipo de capa
 */
const LAYER_ICONS: Record<MapLayerType, React.ElementType> = {
  voyager: Map,
  satellite: Satellite,
  dark: Moon,
  streets: Map,
  terrain: Map,
};

/**
 * Contenido principal de la página (envuelto en ToastProvider)
 */
function GeofencesPageContent() {
  const { success, error: showError } = useToast();
  
  const {
    geofences,
    filteredGeofences,
    selectedIds,
    editingId,
    filters,
    createGeofence,
    updateGeofence,
    deleteGeofence,
    deleteMany,
    duplicateGeofence,
    toggleSelection,
    selectAll,
    deselectAll,
    startEditing,
    stopEditing,
    setFilters,
    clearFilters,
    exportToKML,
    importFromKML,
    updateColorBatch,
  } = useGeofences({ autoLoad: true });
  
  const [showPanel, setShowPanel] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"all" | "selected">("all");
  const [showDrawOptions, setShowDrawOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>("voyager");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isMounted, setIsMounted] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; geofenceId: string; geofenceName: string }>({ open: false, geofenceId: '', geofenceName: '' });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: "",
    description: "",
    tags: "",
    color: "#00c9ff",
    category: "other",
    alerts: {
      onEntry: false,
      onExit: false,
      onDwell: false,
    },
    structuredAddress: {},
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<GeofencesMapNewRef | null>(null);
  
  // Marcar como montado (usando startTransition para evitar cascading renders)
  useEffect(() => {
    startTransition(() => {
      setIsMounted(true);
    });
  }, []);
  
  // Detectar ancho del sidebar
  useEffect(() => {
    if (!isMounted) return;
    
    const updateSidebarWidth = () => {
      const sidebar = document.querySelector("aside");
      if (sidebar) {
        const width = sidebar.offsetWidth;
        if (width > 0) setSidebarWidth(width);
      }
    };
    
    const interval = setInterval(updateSidebarWidth, 100);
    setTimeout(updateSidebarWidth, 100);
    
    return () => clearInterval(interval);
  }, [isMounted]);
  
  // Actualizar filtros de búsqueda
  useEffect(() => {
    setFilters({ search: searchQuery });
  }, [searchQuery, setFilters]);
  
  const displayedGeofences = useMemo(() => {
    if (selectedTab === "selected") {
      return filteredGeofences.filter((g) => selectedIds.has(g.id));
    }
    return filteredGeofences;
  }, [filteredGeofences, selectedTab, selectedIds]);
  
  // Handlers
  const handleDrawPolygon = useCallback(() => {
    setIsCreatingNew(true);
    setShowDrawOptions(false);
    setFormData({
      name: "",
      description: "",
      tags: "",
      color: "#00c9ff",
      category: "other",
      alerts: { onEntry: false, onExit: false, onDwell: false },
    });
    setTimeout(() => mapRef.current?.drawPolygon(), 100);
  }, []);
  
  const handleDrawCircle = useCallback(() => {
    setIsCreatingNew(true);
    setShowDrawOptions(false);
    setFormData({
      name: "",
      description: "",
      tags: "",
      color: "#00c9ff",
      category: "other",
      alerts: { onEntry: false, onExit: false, onDwell: false },
    });
    setTimeout(() => mapRef.current?.drawCircle(), 100);
  }, []);
  
  const handleEditGeofence = useCallback((geofenceId: string) => {
    const geofence = geofences.find((g) => g.id === geofenceId);
    if (!geofence) return;
    
    startEditing(geofenceId);
    setFormData({
      name: geofence.name,
      description: geofence.description || "",
      tags: geofence.tags.map((t) => t.name).join(", "),
      color: geofence.color,
      category: geofence.category,
      alerts: geofence.alerts,
    });
    
    setTimeout(() => mapRef.current?.editGeofence(geofenceId), 100);
  }, [geofences, startEditing]);
  
  const handleCancelEditing = useCallback(() => {
    mapRef.current?.cancelEditing();
    stopEditing();
    setIsCreatingNew(false);
    setFormData({
      name: "",
      description: "",
      tags: "",
      color: "#00c9ff",
      category: "other",
      alerts: { onEntry: false, onExit: false, onDwell: false },
    });
  }, [stopEditing]);
  
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      showError("Error", "El nombre es requerido");
      return;
    }
    
    try {
      const geometry = mapRef.current?.getLayerGeometry();
      if (!geometry) {
        showError("Error", "No hay geometría para guardar");
        return;
      }
      
      const tags = formData.tags
        ? formData.tags.split(",").map((t) => ({
            id: t.trim().toLowerCase(),
            name: t.trim(),
            color: formData.color,
          }))
        : [];
      
      if (editingId) {
        // Actualizar existente
        await updateGeofence(editingId, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          color: formData.color,
          tags,
          alerts: formData.alerts,
          geometry: geometry as Geofence["geometry"],
        });
        success("Geocerca actualizada", `"${formData.name}" se ha actualizado correctamente`);
      } else {
        // Crear nueva
        await createGeofence({
          code: `GEO-${Date.now()}`,
          name: formData.name,
          description: formData.description,
          type: (geometry as { type: string }).type === "circle" ? "circle" : "polygon",
          category: formData.category,
          geometry: geometry as Geofence["geometry"],
          color: formData.color,
          opacity: 0.2,
          tags,
          alerts: formData.alerts,
          status: "active",
        });
        success("Geocerca creada", `"${formData.name}" se ha creado correctamente`);
      }
      
      handleCancelEditing();
    } catch {
      showError("Error", "No se pudo guardar la geocerca");
    }
  }, [formData, editingId, createGeofence, updateGeofence, handleCancelEditing, success, showError]);
  
  const handleDeleteGeofence = useCallback(async (geofenceId: string) => {
    const geofence = geofences.find((g) => g.id === geofenceId);
    if (!geofence) return;
    
    setDeleteConfirm({ open: true, geofenceId, geofenceName: geofence.name });
  }, [geofences]);

  const confirmDeleteGeofence = useCallback(async () => {
    const { geofenceId, geofenceName } = deleteConfirm;
    try {
      await deleteGeofence(geofenceId);
      mapRef.current?.deleteGeofenceLayer(geofenceId);
      success("Geocerca eliminada", `"${geofenceName}" se ha eliminado`);
    } catch {
      showError("Error", "No se pudo eliminar la geocerca");
    }
    setDeleteConfirm({ open: false, geofenceId: '', geofenceName: '' });
  }, [deleteConfirm, deleteGeofence, success, showError]);
  
  const handleDuplicateGeofence = useCallback(async (geofenceId: string) => {
    try {
      const duplicated = await duplicateGeofence(geofenceId);
      success("Geocerca duplicada", `Se creó "${duplicated.name}"`);
    } catch {
      showError("Error", "No se pudo duplicar la geocerca");
    }
  }, [duplicateGeofence, success, showError]);
  
  const handleImportKML = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const content = await file.text();
      const result = await importFromKML(content);
      
      if (result.imported > 0) {
        success(
          "Importación completada",
          `${result.imported} geocerca(s) importada(s)${result.errors > 0 ? `, ${result.errors} error(es)` : ""}`
        );
      } else {
        showError("Error de importación", "No se encontraron geocercas válidas en el archivo");
      }
    } catch {
      showError("Error", "No se pudo importar el archivo KML");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [importFromKML, success, showError]);
  
  const handleExportKML = useCallback(async (selectedOnly = false) => {
    try {
      const kmlContent = await exportToKML(selectedOnly);
      
      // Descargar archivo
      const blob = new Blob([kmlContent], { type: "application/vnd.google-earth.kml+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `geocercas${selectedOnly ? "-seleccionadas" : ""}-${new Date().toISOString().split("T")[0]}.kml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success("Exportación completada", "Archivo KML descargado");
    } catch {
      showError("Error", "No se pudo exportar a KML");
    }
  }, [exportToKML, success, showError]);
  
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    setBulkDeleteConfirm(true);
  }, [selectedIds]);

  const confirmDeleteSelected = useCallback(async () => {
    try {
      await deleteMany([...selectedIds]);
      [...selectedIds].forEach((id) => mapRef.current?.deleteGeofenceLayer(id));
      success("Geocercas eliminadas", `${selectedIds.size} geocerca(s) eliminada(s)`);
    } catch {
      showError("Error", "No se pudieron eliminar las geocercas");
    }
    setBulkDeleteConfirm(false);
  }, [selectedIds, deleteMany, success, showError]);
  
  const handleChangeColorBatch = useCallback(async (color: string) => {
    if (selectedIds.size === 0) return;
    
    try {
      await updateColorBatch([...selectedIds], color);
      success("Color actualizado", `${selectedIds.size} geocerca(s) actualizada(s)`);
    } catch {
      showError("Error", "No se pudo actualizar el color");
    }
  }, [selectedIds, updateColorBatch, success, showError]);
  
  const handleToggleGeofence = useCallback((id: string) => {
    toggleSelection(id);
    if (!selectedIds.has(id)) {
      mapRef.current?.zoomToGeofence(id);
    }
  }, [toggleSelection, selectedIds]);
  
  const handleLayerChange = useCallback((layer: MapLayerType) => {
    setCurrentLayer(layer);
    mapRef.current?.setMapLayer(layer);
  }, []);
  
  // Callback cuando se crea geometría en el mapa
  const handleGeometryCreated = useCallback((_event: { type: string; geometry: unknown }) => {
    // La geometría se maneja internamente en el mapa
  }, []);
  
  // Loading state
  if (!isMounted) {
    return (
      <div className="geofences-fullscreen fixed transition-all duration-300" 
        style={{ left: "240px", top: 0, right: 0, bottom: 0 }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </div>
    );
  }
  
  const isEditingMode = isCreatingNew || editingId !== null;
  
  return (
    <>
      <style jsx global>{`
        main:has(> div.geofences-fullscreen) {
          padding: 0 !important;
          overflow: hidden !important;
        }
        body:has(div.geofences-fullscreen) header {
          display: none !important;
        }
      `}</style>
      
      <div 
        className="geofences-fullscreen fixed transition-all duration-300" 
        style={{ left: `${sidebarWidth}px`, top: 0, right: 0, bottom: 0 }}
      >
        {/* Mapa a pantalla completa */}
        <div className="w-full h-full relative">
          <GeofencesMapNew
            ref={mapRef}
            className="absolute inset-0"
            geofences={geofences}
            selectedGeofenceIds={selectedIds}
            editingGeofenceId={editingId}
            initialLayer={currentLayer}
            onGeometryCreated={handleGeometryCreated}
          />
          
          {/* Selector de capa de mapa */}
          <div className="absolute top-4 left-4 z-1000">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 shadow-lg">
                  <Layers className="h-4 w-4 mr-2" />
                  Capas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["voyager", "satellite", "dark", "streets"] as MapLayerType[]).map((layer) => {
                  const Icon = LAYER_ICONS[layer];
                  const labels: Record<string, string> = {
                    voyager: "Voyager",
                    satellite: "Satélite",
                    dark: "Oscuro",
                    streets: "Calles",
                  };
                  return (
                    <DropdownMenuItem
                      key={layer}
                      onClick={() => handleLayerChange(layer)}
                      className={cn(currentLayer === layer && "bg-primary/10")}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {labels[layer]}
                      {currentLayer === layer && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Panel lateral */}
          {showPanel && (
            <div className="absolute top-4 right-4 w-96 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-1000 max-h-[calc(100vh-32px)] flex flex-col">
              {!isEditingMode ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-bold">Geocercas</h2>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => fileInputRef.current?.click()}>
                          <FileUp className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExportKML(false)}>
                              Exportar todas
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleExportKML(true)}
                              disabled={selectedIds.size === 0}
                            >
                              Exportar seleccionadas ({selectedIds.size})
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowPanel(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Tabs y botón nuevo */}
                    <div className="flex gap-2 mb-3 items-center">
                      <button
                        onClick={() => setSelectedTab("all")}
                        className={cn(
                          "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          selectedTab === "all"
                            ? "bg-primary text-white"
                            : "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
                        )}
                      >
                        Todas ({geofences.length})
                      </button>
                      <button
                        onClick={() => setSelectedTab("selected")}
                        className={cn(
                          "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          selectedTab === "selected"
                            ? "bg-primary text-white"
                            : "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
                        )}
                      >
                        Elegidas ({selectedIds.size})
                      </button>
                      
                      {/* Botón nuevo */}
                      <div className="relative">
                        <button
                          onClick={() => setShowDrawOptions(!showDrawOptions)}
                          className={cn(
                            "h-10 w-10 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center",
                            showDrawOptions && "rotate-45"
                          )}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                        
                        {showDrawOptions && (
                          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl border p-2 flex flex-col gap-2 z-50">
                            <button
                              onClick={handleDrawPolygon}
                              className="h-10 w-10 rounded-md border hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center"
                              title="Dibujar Polígono"
                            >
                              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2 L22 9 L18 21 L6 21 L2 9 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            </button>
                            <button
                              onClick={handleDrawCircle}
                              className="h-10 w-10 rounded-md border hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center"
                              title="Dibujar Círculo"
                            >
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="9"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Búsqueda y filtros */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Buscar..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Button
                        variant={showFilters ? "default" : "outline"}
                        size="icon"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Filtros expandidos */}
                    {showFilters && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Categoría</label>
                          <Select
                            value={filters.category || "all"}
                            onValueChange={(v) => setFilters({ category: v === "all" ? undefined : v as GeofenceCategory })}
                          >
                            <SelectTrigger className="h-8 mt-1">
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {geofenceCategories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Tipo</label>
                          <Select
                            value={filters.type || "all"}
                            onValueChange={(v) => setFilters({ type: v === "all" ? undefined : v as "polygon" | "circle" })}
                          >
                            <SelectTrigger className="h-8 mt-1">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="polygon">Polígono</SelectItem>
                              <SelectItem value="circle">Círculo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                          Limpiar filtros
                        </Button>
                      </div>
                    )}
                    
                    {/* Acciones en lote */}
                    {selectedIds.size > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{selectedIds.size} seleccionada(s)</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={selectAll}>
                              <CheckSquare className="h-3.5 w-3.5 mr-1" />
                              Todas
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={deselectAll}>
                              <Square className="h-3.5 w-3.5 mr-1" />
                              Ninguna
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="flex-1">
                                <Palette className="h-4 w-4 mr-2" />
                                Color
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <div className="p-2 grid grid-cols-4 gap-1">
                                {geofenceColors.map((c) => (
                                  <button
                                    key={c.value}
                                    onClick={() => handleChangeColorBatch(c.value)}
                                    className="w-8 h-8 rounded border-2 border-transparent hover:border-gray-400"
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                  />
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="flex-1"
                            onClick={handleDeleteSelected}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Lista de geocercas */}
                  <div className="flex-1 overflow-y-auto">
                    {displayedGeofences.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">
                          {searchQuery || filters.category || filters.type
                            ? "No se encontraron geocercas"
                            : "No hay geocercas creadas"}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-slate-700">
                        {displayedGeofences.map((geofence) => {
                          const CategoryIcon = CATEGORY_ICONS[geofence.category];
                          return (
                            <div
                              key={geofence.id}
                              className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => handleToggleGeofence(geofence.id)}
                                  className={cn(
                                    "mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                                    selectedIds.has(geofence.id)
                                      ? "bg-primary border-primary"
                                      : "border-gray-300 dark:border-slate-600 hover:border-primary"
                                  )}
                                >
                                  {selectedIds.has(geofence.id) && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div
                                      className="h-4 w-4 rounded-full shrink-0"
                                      style={{ backgroundColor: geofence.color }}
                                    />
                                    <CategoryIcon 
                                      className="h-4 w-4 shrink-0" 
                                      style={{ color: geofence.color }}
                                    />
                                    <span className="font-medium text-sm truncate flex-1">
                                      {geofence.name}
                                    </span>
                                    
                                    {/* Menú de acciones */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="h-6 w-6 rounded hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center">
                                          <MoreVertical className="h-4 w-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditGeofence(geofence.id)}>
                                          <Pencil className="h-4 w-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicateGeofence(geofence.id)}>
                                          <Copy className="h-4 w-4 mr-2" />
                                          Duplicar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteGeofence(geofence.id)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Eliminar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  
                                  {geofence.description && (
                                    <p className="text-xs text-muted-foreground truncate mb-1">
                                      {geofence.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs">
                                      {geofenceCategories.find((c) => c.value === geofence.category)?.label}
                                    </Badge>
                                    {geofence.alerts.onEntry && (
                                      <Badge variant="secondary" className="text-xs">Entrada</Badge>
                                    )}
                                    {geofence.alerts.onExit && (
                                      <Badge variant="secondary" className="text-xs">Salida</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Formulario de edición */
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold">
                        {editingId ? "Editar Geocerca" : "Nueva Geocerca"}
                      </h2>
                      <Button variant="ghost" size="sm" onClick={handleCancelEditing} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <GeofenceForm
                      formData={formData}
                      onFormDataChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
                      onSave={handleSave}
                      onCancel={handleCancelEditing}
                      isEditing={!!editingId}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Botón para mostrar panel si está oculto */}
          {!showPanel && (
            <button
              onClick={() => setShowPanel(true)}
              className="absolute top-4 right-4 h-10 w-10 rounded-lg bg-white dark:bg-slate-900 shadow-lg border flex items-center justify-center hover:shadow-xl z-1000"
            >
              <MapPin className="h-5 w-5" />
            </button>
          )}
          
          {/* Input oculto para KML */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml"
            onChange={handleImportKML}
            className="hidden"
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => { if (!open) setDeleteConfirm({ open: false, geofenceId: '', geofenceName: '' }); }}
        title="Eliminar geocerca"
        description={`¿Eliminar "${deleteConfirm.geofenceName}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteGeofence}
        confirmText="Eliminar"
        variant="destructive"
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title="Eliminar geocercas"
        description={`¿Eliminar ${selectedIds.size} geocerca(s) seleccionada(s)? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteSelected}
        confirmText="Eliminar todas"
        variant="destructive"
      />
    </>
  );
}

/**
 * Página de Geocercas (con ToastProvider)
 */
export default function GeofencesPage() {
  return (
    <ToastProvider position="top-right">
      <GeofencesPageContent />
    </ToastProvider>
  );
}
