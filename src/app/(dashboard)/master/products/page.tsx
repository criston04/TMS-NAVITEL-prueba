'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageWrapper } from '@/components/page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Box,
  Plus,
  Upload,
  Download,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Filter,
  X,
  Thermometer,
  AlertTriangle,
  Snowflake,
  Package,
  Apple,
  Layers,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from "sonner";
import { productsService } from "@/services/master";
import type { CreateProductDTO, UpdateProductDTO } from "@/services/master";
import { useService } from "@/hooks/use-service";
import type { Product, ProductStats, ProductCategory } from "@/types/models/product";
import type { EntityStatus } from "@/types/common";
import { exportToExcel, EXPORT_CONFIGS } from "@/lib/excel-utils";
import { ProductFormModal } from "@/components/products/product-form-modal";
import type { ProductFormData } from "@/components/products/product-form-modal";
import { ImportModal } from "@/components/shared/import-modal";

// ---- Constantes ----
const CATEGORY_CONFIG: Record<ProductCategory, { label: string; icon: React.ReactNode; color: string; badgeClass: string }> = {
  general:     { label: "General",     icon: <Package className="h-3.5 w-3.5" />, color: "bg-slate-500",   badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  perecible:   { label: "Perecible",   icon: <Apple className="h-3.5 w-3.5" />,   color: "bg-orange-500",  badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  peligroso:   { label: "Peligroso",   icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-red-500", badgeClass: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  fragil:      { label: "Frágil",      icon: <Box className="h-3.5 w-3.5" />,     color: "bg-amber-500",   badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  refrigerado: { label: "Refrigerado", icon: <Thermometer className="h-3.5 w-3.5" />, color: "bg-blue-500", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  congelado:   { label: "Congelado",   icon: <Snowflake className="h-3.5 w-3.5" />, color: "bg-cyan-500", badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  granel:      { label: "Granel",      icon: <Layers className="h-3.5 w-3.5" />,  color: "bg-purple-500",  badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const UNIT_LABELS: Record<string, string> = {
  kg: "kg", ton: "ton", lt: "lt", m3: "m³", unit: "und", pallet: "pallet", container: "cont",
};

// ---- Stat Card ----
function StatCard({ title, value, icon: Icon, variant = "default" }: Readonly<{
  title: string; value: number | string; icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}>) {
  const styles = {
    default: "bg-muted/50",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    danger: "bg-red-500/10 text-red-600",
    info: "bg-blue-500/10 text-blue-600",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${styles[variant]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Product Detail Drawer ----
function ProductDetailDrawer({ open, onOpenChange, product, onEdit, onDelete }: {
  open: boolean; onOpenChange: (v: boolean) => void; product: Product | null;
  onEdit: (p: Product) => void; onDelete: (p: Product) => void;
}) {
  if (!product) return null;
  const cat = CATEGORY_CONFIG[product.category];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" /> {product.name}
          </SheetTitle>
          <SheetDescription>{product.sku}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-10rem)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Info básica */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Información General</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Categoría</span>
                  <div className="mt-1"><Badge className={cat.badgeClass}>{cat.icon}<span className="ml-1">{cat.label}</span></Badge></div>
                </div>
                <div><span className="text-muted-foreground">Unidad</span><p className="font-medium mt-1">{UNIT_LABELS[product.unitOfMeasure]}</p></div>
                <div><span className="text-muted-foreground">Estado</span>
                  <div className="mt-1"><Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status === "active" ? "Activo" : "Inactivo"}</Badge></div>
                </div>
                {product.unitPrice != null && <div><span className="text-muted-foreground">Precio</span><p className="font-medium mt-1">S/ {product.unitPrice.toFixed(2)}</p></div>}
                {product.barcode && <div><span className="text-muted-foreground">Código de Barras</span><p className="font-mono text-xs mt-1">{product.barcode}</p></div>}
              </div>
              {product.description && <div><span className="text-muted-foreground text-sm">Descripción</span><p className="text-sm mt-1">{product.description}</p></div>}
            </div>

            <Separator />

            {/* Dimensiones */}
            {product.dimensions && (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Dimensiones</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {product.dimensions.length != null && <div><span className="text-muted-foreground">Largo</span><p className="font-medium">{product.dimensions.length} cm</p></div>}
                    {product.dimensions.width != null && <div><span className="text-muted-foreground">Ancho</span><p className="font-medium">{product.dimensions.width} cm</p></div>}
                    {product.dimensions.height != null && <div><span className="text-muted-foreground">Alto</span><p className="font-medium">{product.dimensions.height} cm</p></div>}
                    {product.dimensions.weight != null && <div><span className="text-muted-foreground">Peso</span><p className="font-medium">{product.dimensions.weight} kg</p></div>}
                    {product.dimensions.volume != null && <div><span className="text-muted-foreground">Volumen</span><p className="font-medium">{product.dimensions.volume} m³</p></div>}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Condiciones de transporte */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Condiciones de Transporte</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-blue-500" />
                  <span>Refrigeración: {product.transportConditions.requiresRefrigeration ? "Sí" : "No"}</span>
                  {product.transportConditions.requiresRefrigeration && product.transportConditions.minTemperature != null && (
                    <Badge variant="outline" className="ml-auto">
                      {product.transportConditions.minTemperature}°C a {product.transportConditions.maxTemperature}°C
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Manejo especial: {product.transportConditions.requiresSpecialHandling ? "Sí" : "No"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-500" />
                  <span>Apilable: {product.transportConditions.stackable ? "Sí" : "No"}</span>
                  {product.transportConditions.maxStackHeight && (
                    <Badge variant="outline" className="ml-auto">Máx. {product.transportConditions.maxStackHeight} niveles</Badge>
                  )}
                </div>
                {product.transportConditions.handlingInstructions && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-xs">
                    <p className="font-medium mb-1">Instrucciones:</p>
                    <p>{product.transportConditions.handlingInstructions}</p>
                  </div>
                )}
              </div>
            </div>

            {product.notes && (
              <>
                <Separator />
                <div><h4 className="text-sm font-medium text-muted-foreground mb-1">Notas</h4><p className="text-sm">{product.notes}</p></div>
              </>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-4">
          <Button className="flex-1" onClick={() => { onEdit(product); onOpenChange(false); }}>
            <Pencil className="h-4 w-4 mr-2" />Editar
          </Button>
          <Button variant="destructive" onClick={() => { onDelete(product); onOpenChange(false); }}>
            <Trash2 className="h-4 w-4 mr-2" />Eliminar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Página Principal ----
export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<EntityStatus | "all">("all");

  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data
  const { data: productsRaw, loading, execute: refreshProducts } = useService<Product[]>(
    () => productsService.getAll({ search }),
    { immediate: true }
  );
  const { data: stats, execute: refreshStats } = useService<ProductStats>(
    () => productsService.getStats(),
    { immediate: true }
  );

  const refresh = useCallback(() => {
    refreshProducts();
    refreshStats();
  }, [refreshProducts, refreshStats]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => refreshProducts(), 300);
    return () => clearTimeout(t);
  }, [search, refreshProducts]);

  // Filters
  const hasActiveFilters = categoryFilter !== "all" || statusFilter !== "all";

  const filteredProducts = useMemo(() => {
    return productsRaw?.filter(p => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    }) ?? [];
  }, [productsRaw, categoryFilter, statusFilter]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [categoryFilter, statusFilter, search]);

  // Selection
  const isAllSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id));
  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => { const s = new Set(prev); selected ? s.add(id) : s.delete(id); return s; });
  }, []);
  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedIds(selected ? new Set(paginatedProducts.map(p => p.id)) : new Set());
  }, [paginatedProducts]);

  // CRUD handlers
  const handleFormSubmit = useCallback(async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const dto: CreateProductDTO = {
        sku: data.sku,
        name: data.name,
        description: data.description,
        category: data.category,
        unitOfMeasure: data.unitOfMeasure,
        barcode: data.barcode || undefined,
        unitPrice: data.unitPrice,
        dimensions: (data.length || data.width || data.height || data.weight || data.volume) ? {
          length: data.length, width: data.width, height: data.height, weight: data.weight, volume: data.volume,
        } : undefined,
        transportConditions: {
          requiresRefrigeration: data.requiresRefrigeration,
          minTemperature: data.requiresRefrigeration ? data.minTemperature : undefined,
          maxTemperature: data.requiresRefrigeration ? data.maxTemperature : undefined,
          requiresSpecialHandling: data.requiresSpecialHandling,
          handlingInstructions: data.requiresSpecialHandling ? data.handlingInstructions : undefined,
          stackable: data.stackable,
          maxStackHeight: data.maxStackHeight,
        },
        customerId: data.customerId || undefined,
        notes: data.notes || undefined,
      };

      if (selectedProduct) {
        await productsService.update(selectedProduct.id, dto as UpdateProductDTO);
        toast.success("Producto actualizado correctamente");
      } else {
        await productsService.create(dto);
        toast.success("Producto creado correctamente");
      }
      setIsFormOpen(false);
      setSelectedProduct(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar producto");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProduct, refresh]);

  const handleDelete = useCallback(async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await productsService.delete(selectedProduct.id);
      toast.success("Producto eliminado");
      setIsDeleteOpen(false);
      setSelectedProduct(null);
      refresh();
    } catch { toast.error("Error al eliminar producto"); }
    finally { setIsSubmitting(false); }
  }, [selectedProduct, refresh]);

  const handleBulkDelete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      for (const id of selectedIds) { await productsService.delete(id); }
      toast.success(`${selectedIds.size} producto(s) eliminado(s)`);
      setIsBulkDeleteOpen(false);
      setSelectedIds(new Set());
      refresh();
    } catch { toast.error("Error al eliminar productos"); }
    finally { setIsSubmitting(false); }
  }, [selectedIds, refresh]);

  const handleDuplicate = useCallback(async (product: Product) => {
    try {
      await productsService.duplicate(product.id);
      toast.success(`Producto "${product.name}" duplicado`);
      refresh();
    } catch { toast.error("Error al duplicar producto"); }
  }, [refresh]);

  const handleToggleStatus = useCallback(async (product: Product) => {
    try {
      const newStatus: EntityStatus = product.status === "active" ? "inactive" : "active";
      await productsService.changeStatus(product.id, newStatus);
      toast.success(`Producto ${newStatus === "active" ? "activado" : "desactivado"}`);
      refresh();
    } catch { toast.error("Error al cambiar estado"); }
  }, [refresh]);

  // Export
  const handleExport = useCallback(() => {
    if (filteredProducts.length === 0) { toast.error("No hay datos para exportar"); return; }
    try {
      exportToExcel(filteredProducts, EXPORT_CONFIGS.products);
      toast.success(`${filteredProducts.length} productos exportados`);
    } catch { toast.error("Error al exportar"); }
  }, [filteredProducts]);

  // Import
  const handleImport = useCallback(async (data: Record<string, unknown>[]) => {
    let successCount = 0, errorCount = 0;
    const errors: Array<{ row: number; field: string; message: string; value?: string }> = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        await productsService.create({
          sku: String(row.sku || `SKU-IMP-${String(i + 1).padStart(3, "0")}`),
          name: String(row.name || ""),
          category: (row.category as ProductCategory) || "general",
          unitOfMeasure: (row.unitOfMeasure as Product["unitOfMeasure"]) || "kg",
          dimensions: { weight: row.weight ? Number(row.weight) : undefined, volume: row.volume ? Number(row.volume) : undefined },
          transportConditions: {
            requiresRefrigeration: row.requiresRefrigeration === "Sí" || row.requiresRefrigeration === true,
            requiresSpecialHandling: row.requiresSpecialHandling === "Sí" || row.requiresSpecialHandling === true,
            stackable: row.stackable !== "No" && row.stackable !== false,
          },
          barcode: row.barcode ? String(row.barcode) : undefined,
          unitPrice: row.unitPrice ? Number(row.unitPrice) : undefined,
          description: row.description ? String(row.description) : undefined,
        } as CreateProductDTO);
        successCount++;
      } catch {
        errorCount++;
        errors.push({ row: i + 2, field: "general", message: "Error al crear producto" });
      }
    }
    refresh();
    return { totalRows: data.length, successCount, errorCount, errors };
  }, [refresh]);

  const importColumnMapping = [
    { excelHeader: "SKU", fieldKey: "sku", required: true },
    { excelHeader: "Nombre", fieldKey: "name", required: true },
    { excelHeader: "Categoría", fieldKey: "category", required: true },
    { excelHeader: "Unidad", fieldKey: "unitOfMeasure" },
    { excelHeader: "Peso (kg)", fieldKey: "weight" },
    { excelHeader: "Volumen (m³)", fieldKey: "volume" },
    { excelHeader: "Precio Unitario", fieldKey: "unitPrice" },
    { excelHeader: "Código de Barras", fieldKey: "barcode" },
    { excelHeader: "Requiere Refrigeración", fieldKey: "requiresRefrigeration" },
    { excelHeader: "Manejo Especial", fieldKey: "requiresSpecialHandling" },
    { excelHeader: "Apilable", fieldKey: "stackable" },
    { excelHeader: "Descripción", fieldKey: "description" },
  ];

  const importTemplateConfig = {
    filename: "plantilla_productos",
    columns: [
      { header: "SKU", example: "SKU-GEN-001" },
      { header: "Nombre", example: "Carga General" },
      { header: "Categoría", example: "general" },
      { header: "Unidad", example: "kg" },
      { header: "Peso (kg)", example: "1000" },
      { header: "Volumen (m³)", example: "2" },
      { header: "Precio Unitario", example: "150.00" },
      { header: "Código de Barras", example: "7501234567890" },
      { header: "Requiere Refrigeración", example: "No" },
      { header: "Manejo Especial", example: "No" },
      { header: "Apilable", example: "Sí" },
      { header: "Descripción", example: "Producto de carga general" },
    ],
  };

  return (
    <PageWrapper title="Productos">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Box className="h-6 w-6" />Catálogo de Productos</h1>
          <p className="text-muted-foreground">Gestión y estandarización del catálogo de productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />Importar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />Exportar
          </Button>
          <Button size="sm" onClick={() => { setSelectedProduct(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Productos" value={stats?.total ?? 0} icon={Box} />
        <StatCard title="Activos" value={stats?.active ?? 0} icon={CheckCircle} variant="success" />
        <StatCard title="Inactivos" value={stats?.inactive ?? 0} icon={XCircle} variant="danger" />
        <StatCard title="Categorías" value={stats ? Object.values(stats.byCategory).filter(v => v > 0).length : 0} icon={Layers} variant="info" />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, SKU, categoría..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as ProductCategory | "all")}>
              <SelectTrigger className="w-[170px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}><span className="flex items-center gap-1.5">{v.icon} {v.label}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as EntityStatus | "all")}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); setSearch(""); }}>
                <X className="h-4 w-4 mr-1" />Limpiar
              </Button>
            )}
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)} className="ml-auto">
                <Trash2 className="h-4 w-4 mr-1" />Eliminar ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Catálogo de Productos
            <Badge variant="outline" className="text-[10px]">{totalItems} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(k => <Skeleton key={k} className="h-12 w-full" />)}
            </div>
          ) : paginatedProducts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <Checkbox checked={isAllSelected} onCheckedChange={c => handleSelectAll(!!c)} />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map(product => {
                    const cat = CATEGORY_CONFIG[product.category];
                    return (
                      <TableRow key={product.id} className={selectedIds.has(product.id) ? "bg-muted/50" : ""}>
                        <TableCell className="pl-4">
                          <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={c => handleToggleSelect(product.id, !!c)} />
                        </TableCell>
                        <TableCell><span className="font-mono text-xs">{product.sku}</span></TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell><Badge className={cat.badgeClass + " text-xs"}>{cat.icon}<span className="ml-1">{cat.label}</span></Badge></TableCell>
                        <TableCell className="text-sm">{UNIT_LABELS[product.unitOfMeasure]}</TableCell>
                        <TableCell className="text-sm">{product.dimensions?.weight != null ? `${product.dimensions.weight} kg` : "—"}</TableCell>
                        <TableCell className="text-sm">{product.unitPrice != null ? `S/ ${product.unitPrice.toFixed(2)}` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={product.status === "active" ? "default" : "secondary"} className={product.status === "active" ? "bg-green-500" : ""}>
                            {product.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedProduct(product); setIsDetailOpen(true); }}>
                                <Eye className="h-4 w-4 mr-2" />Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedProduct(product); setIsFormOpen(true); }}>
                                <Pencil className="h-4 w-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                                <Copy className="h-4 w-4 mr-2" />Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                                {product.status === "active" ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                {product.status === "active" ? "Desactivar" : "Activar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedProduct(product); setIsDeleteOpen(true); }} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} de {totalItems}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Box className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{search || hasActiveFilters ? "No se encontraron productos" : "No hay productos registrados"}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {search || hasActiveFilters ? "Ajusta los filtros o la búsqueda" : "Agrega productos manualmente o importa desde Excel"}
              </p>
              {!search && !hasActiveFilters && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}><Upload className="h-4 w-4 mr-1.5" />Importar</Button>
                  <Button size="sm" onClick={() => { setSelectedProduct(null); setIsFormOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Agregar</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ProductFormModal open={isFormOpen} onOpenChange={setIsFormOpen} product={selectedProduct} onSubmit={handleFormSubmit} isLoading={isSubmitting} />

      <ProductDetailDrawer open={isDetailOpen} onOpenChange={setIsDetailOpen} product={selectedProduct}
        onEdit={p => { setSelectedProduct(p); setIsFormOpen(true); }}
        onDelete={p => { setSelectedProduct(p); setIsDeleteOpen(true); }}
      />

      <ImportModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        title="Importar Productos"
        description="Carga masiva de productos desde archivo Excel/CSV"
        columnMapping={importColumnMapping}
        templateConfig={importTemplateConfig}
        onImport={handleImport}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Producto <strong>{selectedProduct?.name}</strong> ({selectedProduct?.sku}). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} producto(s)?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará permanentemente los productos seleccionados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? "Eliminando..." : `Eliminar ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
