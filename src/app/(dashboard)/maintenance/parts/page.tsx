/**
 * @fileoverview Página de Inventario de Repuestos
 * Gestión de stock, alertas y movimientos de repuestos
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertModal } from '@/components/ui/alert-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  AlertTriangle,
  TrendingDown,
  Box,
  DollarSign,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Part, PartCategory } from '@/types/maintenance';
import Link from 'next/link';

const statusConfig = {
  in_stock: {
    label: 'En Stock',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  low_stock: {
    label: 'Stock Bajo',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  out_of_stock: {
    label: 'Sin Stock',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  ordered: {
    label: 'Pedido',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
} as const;

export default function PartsInventoryPage() {
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<Part[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [importAlert, setImportAlert] = useState<{ open: boolean; count: number }>({ open: false, count: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const partsData = await maintenance.getParts();
      setParts(partsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener categorías únicas
  const categories = Array.from(new Set(parts.map((p) => p.category)));

  // Filtrado
  const filteredParts = parts.filter((part) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      part.name.toLowerCase().includes(searchLower) ||
      part.partNumber.toLowerCase().includes(searchLower) ||
      part.description?.toLowerCase().includes(searchLower);

    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Estadísticas
  const stats = {
    total: parts.length,
    inStock: parts.filter((p) => p.currentStock > 0).length,
    lowStock: parts.filter((p) => p.currentStock <= p.minStock && p.currentStock > 0).length,
    outOfStock: parts.filter((p) => p.currentStock === 0).length,
    totalValue: parts.reduce((sum, p) => sum + p.unitCost * p.currentStock, 0),
  };
  const handleExport = () => {
    const csvContent = [
      ['Código', 'Nombre', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Precio Unitario', 'Proveedor'].join(','),
      ...filteredParts.map(p => [
        p.partNumber,
        p.name,
        p.category,
        p.currentStock,
        p.minStock,
        p.unitCost,
        p.supplierName || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_repuestos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').slice(1); // Skip header
        
        let successCount = 0;
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const [partNumber, name, category, quantity, minimumStock, unitPrice, , supplier] = line.split(',');
          try {
            await maintenance.createPart({
              partNumber: partNumber.trim(),
              name: name.trim(),
              category: category.trim() as PartCategory,
              currentStock: parseInt(quantity),
              minStock: parseInt(minimumStock),
              unitCost: parseFloat(unitPrice),
              unit: 'pieza',
              isActive: true,
              supplierName: supplier?.trim(),
            });
            successCount++;
          } catch (error) {
            console.error('Error importing part:', error);
          }
        }
        
        setImportAlert({ open: true, count: successCount });
        loadData();
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Calcular el porcentaje de stock
  const getStockPercentage = (part: Part) => {
    if (!part.maxStock || part.maxStock === 0) return 0;
    return (part.currentStock / part.maxStock) * 100;
  };

  // Calculate part status based on stock levels
  const getPartStatus = (part: Part): 'out_of_stock' | 'low_stock' | 'in_stock' => {
    if (part.currentStock === 0) return 'out_of_stock';
    if (part.currentStock <= part.minStock) return 'low_stock';
    return 'in_stock';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/maintenance">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            Inventario de Repuestos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de stock y movimientos de repuestos
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleImport}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Link href="/maintenance/parts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Repuesto
            </Button>
          </Link>
        </div>
      </div>

      {/* Alertas de Stock Bajo */}
      {stats.lowStock > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="p-4 flex items-center gap-3">
            <TrendingDown className="h-6 w-6 text-yellow-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">
                {stats.lowStock} Repuesto{stats.lowStock > 1 ? 's' : ''} con Stock Bajo
              </h3>
              <p className="text-sm text-yellow-700">Considere realizar un pedido</p>
            </div>
          </div>
        </Card>
      )}

      {stats.outOfStock > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {stats.outOfStock} Repuesto{stats.outOfStock > 1 ? 's' : ''} sin Stock
              </h3>
              <p className="text-sm text-red-700">Requiere atención inmediata</p>
            </div>
          </div>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Repuestos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En Stock</p>
              <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
            </div>
            <Box className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sin Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">S/ {stats.totalValue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('all')}
              size="sm"
            >
              Todas
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? 'default' : 'outline'}
                onClick={() => setCategoryFilter(category)}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabla de Repuestos */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock Actual</TableHead>
                <TableHead>Nivel de Stock</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Costo Unitario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts
                .sort((a, b) => {
                  // Ordenar por estado (sin stock primero)
                  const statusOrder = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
                  const aStatus = getPartStatus(a);
                  const bStatus = getPartStatus(b);
                  return statusOrder[aStatus] - statusOrder[bStatus];
                })
                .map((part) => {
                  const partStatus = getPartStatus(part);
                  const statusInfo = statusConfig[partStatus as keyof typeof statusConfig] || statusConfig.in_stock;
                  const stockPercentage = getStockPercentage(part);

                  return (
                    <TableRow key={part.id} className="hover:bg-slate-50">
                      <TableCell>
                        <p className="font-mono font-bold">{part.partNumber}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{part.name}</p>
                          {part.description && (
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {part.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{part.currentStock}</p>
                          <p className="text-sm text-muted-foreground">
                            / {part.maxStock || 'N/A'} {part.unit}
                          </p>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              stockPercentage <= 20
                                ? 'bg-red-500'
                                : stockPercentage <= 50
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-muted-foreground">
                            Min: <span className="font-medium">{part.minStock}</span>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{part.location}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">S/ {part.unitCost.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          Total: S/ {(part.currentStock * part.unitCost).toLocaleString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/maintenance/parts/${part.id}`}>
                            <Button size="sm" variant="ghost">
                              Ver
                            </Button>
                          </Link>
                          {partStatus === 'low_stock' || partStatus === 'out_of_stock' ? (
                            <Button size="sm" variant="default">
                              Pedir
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        {filteredParts.length === 0 && (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No se encontraron repuestos</p>
          </div>
        )}
      </Card>
      <AlertModal
        open={importAlert.open}
        onOpenChange={(open) => setImportAlert({ open, count: 0 })}
        title="Importación exitosa"
        description={`Se importaron ${importAlert.count} repuestos exitosamente.`}
        variant="success"
      />
    </div>
  );
}
