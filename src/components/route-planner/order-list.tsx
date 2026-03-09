"use client";

/* ============================================
   COMPONENT: Order List
   Panel de selección de órdenes
   ============================================ */

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Package2, MapPin, Weight, Box, AlertCircle, CheckSquare, Check, Upload, FileSpreadsheet, X, Loader2, Download, PenTool } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TransportOrder, OrderFilters } from "@/types/route-planner";
import { useRoutePlanner } from "@/contexts/route-planner-context";
import { readExcelFile, exportToExcel } from "@/lib/excel-utils";
import { cn } from "@/lib/utils";

interface OrderListProps {
  orders: TransportOrder[];
  onImportOrders?: (orders: TransportOrder[]) => void;
  onClearImported?: () => void;
  importedCount?: number;
  onCreateManual?: () => void;
}

export function OrderList({ orders, onImportOrders, onClearImported, importedCount = 0, onCreateManual }: OrderListProps) {
  const { selectedOrders, addOrder, removeOrder, clearOrders } = useRoutePlanner();
  const [filters, setFilters] = useState<OrderFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ============================================
     FILTERED ORDERS
     ============================================ */
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !order.orderNumber.toLowerCase().includes(term) &&
          !order.client.name.toLowerCase().includes(term) &&
          !order.pickup.city.toLowerCase().includes(term) &&
          !order.delivery.city.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      // Zone filter
      if (filters.zone && order.zone !== filters.zone) return false;

      // Priority filter
      if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(order.priority)) {
        return false;
      }

      return true;
    });
  }, [orders, searchTerm, filters]);

  /* ============================================
     ZONE OPTIONS
     ============================================ */
  const zones = useMemo(() => {
    const uniqueZones = Array.from(new Set(orders.map((o) => o.zone)));
    return uniqueZones.sort();
  }, [orders]);

  /* ============================================
     TOGGLE ORDER SELECTION
     ============================================ */
  const toggleOrder = (order: TransportOrder) => {
    const isSelected = selectedOrders.find((o) => o.id === order.id);
    if (isSelected) {
      removeOrder(order.id);
    } else {
      addOrder(order);
    }
  };

  /* ============================================
     SELECT ALL FILTERED ORDERS
     ============================================ */
  const selectAll = useCallback(() => {
    filteredOrders.forEach((order) => {
      if (!selectedOrders.find((o) => o.id === order.id)) {
        addOrder(order);
      }
    });
  }, [filteredOrders, selectedOrders, addOrder]);

  /* ============================================
     IMPORT ORDERS FROM EXCEL FILE
     ============================================ */
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // Leer archivo Excel
      const rows = await readExcelFile<Record<string, unknown>>(file, {
        columnMapping: {
          'Número de Orden': 'orderNumber',
          'Cliente': 'clientName',
          'Teléfono': 'clientPhone',
          'Dirección Recogida': 'pickupAddress',
          'Ciudad Recogida': 'pickupCity',
          'Latitud Recogida': 'pickupLat',
          'Longitud Recogida': 'pickupLng',
          'Dirección Entrega': 'deliveryAddress',
          'Ciudad Entrega': 'deliveryCity',
          'Latitud Entrega': 'deliveryLat',
          'Longitud Entrega': 'deliveryLng',
          'Peso (kg)': 'cargoWeight',
          'Volumen (m³)': 'cargoVolume',
          'Descripción': 'cargoDescription',
          'Prioridad': 'priority',
          'Zona': 'zone',
        }
      });

      // Convertir filas a TransportOrder
      const importedOrders: TransportOrder[] = rows.map((row, index) => ({
        id: `imported-${Date.now()}-${index}`,
        orderNumber: String(row.orderNumber || `IMP-${Date.now()}-${index}`),
        client: {
          name: String(row.clientName || 'Cliente Importado'),
          phone: String(row.clientPhone || ''),
        },
        pickup: {
          address: String(row.pickupAddress || ''),
          city: String(row.pickupCity || ''),
          coordinates: [
            Number(row.pickupLat) || 0,
            Number(row.pickupLng) || 0,
          ] as [number, number],
        },
        delivery: {
          address: String(row.deliveryAddress || ''),
          city: String(row.deliveryCity || ''),
          coordinates: [
            Number(row.deliveryLat) || 0,
            Number(row.deliveryLng) || 0,
          ] as [number, number],
        },
        cargo: {
          weight: Number(row.cargoWeight) || 0,
          volume: Number(row.cargoVolume) || 0,
          description: String(row.cargoDescription || 'Carga importada'),
        },
        status: 'pending',
        priority: (row.priority === 'high' || row.priority === 'medium' || row.priority === 'low') 
          ? row.priority as 'high' | 'medium' | 'low' 
          : 'medium',
        requestedDate: new Date().toISOString(),
        zone: String(row.zone || 'General'),
      }));

      // Validar que al menos haya coordenadas válidas
      const validOrders = importedOrders.filter(order => 
        order.pickup.coordinates[0] !== 0 && 
        order.pickup.coordinates[1] !== 0 &&
        order.delivery.coordinates[0] !== 0 &&
        order.delivery.coordinates[1] !== 0
      );

      if (validOrders.length === 0) {
        setImportError('No se encontraron órdenes válidas con coordenadas en el archivo');
        return;
      }

      // Llamar al callback
      if (onImportOrders) {
        onImportOrders(validOrders);
      }

      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error importando archivo:', error);
      setImportError(error instanceof Error ? error.message : 'Error al procesar el archivo');
    } finally {
      setIsImporting(false);
    }
  }, [onImportOrders]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Número de Orden': 'ORD-001',
        'Cliente': 'Empresa ABC',
        'Teléfono': '987654321',
        'Dirección Recogida': 'Av. Principal 123',
        'Ciudad Recogida': 'Lima',
        'Latitud Recogida': -12.046374,
        'Longitud Recogida': -77.042793,
        'Dirección Entrega': 'Calle Secundaria 456',
        'Ciudad Entrega': 'Callao',
        'Latitud Entrega': -12.056389,
        'Longitud Entrega': -77.118749,
        'Peso (kg)': 500,
        'Volumen (m³)': 2.5,
        'Descripción': 'Productos lácteos refrigerados',
        'Prioridad': 'high',
        'Zona': 'Norte',
      },
      {
        'Número de Orden': 'ORD-002',
        'Cliente': 'Corporación XYZ',
        'Teléfono': '912345678',
        'Dirección Recogida': 'Jr. Comercio 789',
        'Ciudad Recogida': 'Arequipa',
        'Latitud Recogida': -16.409047,
        'Longitud Recogida': -71.537451,
        'Dirección Entrega': 'Av. Industrial 321',
        'Ciudad Entrega': 'Cusco',
        'Latitud Entrega': -13.531950,
        'Longitud Entrega': -71.967463,
        'Peso (kg)': 1200,
        'Volumen (m³)': 5.0,
        'Descripción': 'Maquinaria pesada',
        'Prioridad': 'medium',
        'Zona': 'Sur',
      },
    ];

    exportToExcel(templateData, {
      filename: 'plantilla_ordenes_tms',
      sheetName: 'Órdenes',
      columns: [
        { key: 'Número de Orden', header: 'Número de Orden' },
        { key: 'Cliente', header: 'Cliente' },
        { key: 'Teléfono', header: 'Teléfono' },
        { key: 'Dirección Recogida', header: 'Dirección Recogida' },
        { key: 'Ciudad Recogida', header: 'Ciudad Recogida' },
        { key: 'Latitud Recogida', header: 'Latitud Recogida' },
        { key: 'Longitud Recogida', header: 'Longitud Recogida' },
        { key: 'Dirección Entrega', header: 'Dirección Entrega' },
        { key: 'Ciudad Entrega', header: 'Ciudad Entrega' },
        { key: 'Latitud Entrega', header: 'Latitud Entrega' },
        { key: 'Longitud Entrega', header: 'Longitud Entrega' },
        { key: 'Peso (kg)', header: 'Peso (kg)' },
        { key: 'Volumen (m³)', header: 'Volumen (m³)' },
        { key: 'Descripción', header: 'Descripción' },
        { key: 'Prioridad', header: 'Prioridad' },
        { key: 'Zona', header: 'Zona' },
      ],
    });
  };

  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrders.find((s) => s.id === o.id));

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Órdenes Disponibles</h2>
          <Badge variant="secondary" className="text-xs">
            {filteredOrders.length} órdenes
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por orden, cliente, ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Toggle & Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateManual}
              className="gap-1.5 bg-[#3DBAFF] hover:bg-[#3DBAFF]/90 text-white border-[#3DBAFF]"
              title="Crear ruta manual"
            >
              <PenTool className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              disabled={isImporting}
              className="gap-1.5"
              title="Importar desde Excel"
            >
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5"
              title="Descargar plantilla Excel"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
          {!allSelected && filteredOrders.length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAll} className="gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" />
              Todos
            </Button>
          )}
          {selectedOrders.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearOrders}>
              Limpiar ({selectedOrders.length})
            </Button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileImport}
          className="hidden"
        />

        {/* Import Feedback */}
        {importedCount > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {importedCount} orden{importedCount !== 1 ? 'es' : ''} importada{importedCount !== 1 ? 's' : ''}
              </span>
            </div>
            {onClearImported && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearImported}
                className="h-6 w-6 p-0 hover:bg-green-500/20"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Import Error */}
        {importError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-600 dark:text-red-400">{importError}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportError(null)}
              className="h-6 w-6 p-0 hover:bg-red-500/20 shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {/* Zone Filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Zona</label>
                <select
                  value={filters.zone || ""}
                  onChange={(e) => setFilters({ ...filters, zone: e.target.value || undefined })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Todas las zonas</option>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Prioridad</label>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as const).map((priority) => (
                    <Button
                      key={priority}
                      variant={filters.priority?.includes(priority) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const current = filters.priority || [];
                        const updated = current.includes(priority)
                          ? current.filter((p) => p !== priority)
                          : [...current, priority];
                        setFilters({ ...filters, priority: updated.length > 0 ? updated : undefined });
                      }}
                      className="flex-1 text-xs"
                    >
                      {priority === "high" ? "Alta" : priority === "medium" ? "Media" : "Baja"}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Order List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          <AnimatePresence>
            {filteredOrders.map((order) => {
              const isSelected = selectedOrders.find((o) => o.id === order.id);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => toggleOrder(order)}
                  className={cn(
                    "relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                    isSelected
                      ? "border-[#3DBAFF] bg-[#3DBAFF]/5 ring-1 ring-[#3DBAFF]/20"
                      : "border-border bg-card"
                  )}
                >
                  {/* Selection indicator */}
                  <div className="absolute top-3 right-3">
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                        isSelected
                          ? "border-[#3DBAFF] bg-[#3DBAFF]"
                          : "border-muted-foreground/30 bg-background"
                      )}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                          <Check className="h-3.5 w-3.5 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Order Number & Priority */}
                  <div className="flex items-start gap-2 mb-2 pr-8">
                    <Package2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">{order.client.name}</div>
                    </div>
                    <Badge
                      variant={
                        order.priority === "high"
                          ? "destructive"
                          : order.priority === "medium"
                            ? "default"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {order.priority === "high" ? "Alta" : order.priority === "medium" ? "Media" : "Baja"}
                    </Badge>
                  </div>

                  {/* Locations */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="h-3 w-3 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-muted-foreground">Origen</div>
                        <div>{order.pickup.city}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="h-3 w-3 text-[#3DBAFF] mt-0.5" />
                      <div className="flex-1">
                        <div className="text-muted-foreground">Destino</div>
                        <div>{order.delivery.city}</div>
                      </div>
                    </div>
                  </div>

                  {/* Cargo Info */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      <span>{order.cargo.weight}kg</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Box className="h-3 w-3" />
                      <span>{order.cargo.volume}m³</span>
                    </div>
                  </div>

                  {/* Special Requirements */}
                  {(order.cargo.requiresRefrigeration || order.cargo.fragile) && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                      <div className="text-xs text-muted-foreground">
                        {order.cargo.requiresRefrigeration && "Refrigerado"}
                        {order.cargo.requiresRefrigeration && order.cargo.fragile && " • "}
                        {order.cargo.fragile && "Frágil"}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package2 className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No se encontraron órdenes</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
