/**
 * @fileoverview Formulario para crear nuevo repuesto
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, ArrowLeft, Save } from 'lucide-react';
import { AlertModal } from '@/components/ui/alert-modal';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { PartCategory } from '@/types/maintenance';
import Link from 'next/link';

export default function NewPartPage() {
  const router = useRouter();
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState(false);
  const [formData, setFormData] = useState({
    partNumber: '',
    name: '',
    category: '',
    description: '',
    currentStock: 0,
    minStock: 0,
    unitCost: 0,
    supplierName: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await maintenance.createPart({
        ...formData,
        category: formData.category as PartCategory,
        unit: 'pieza',
        isActive: true,
      });

      router.push('/maintenance/parts');
    } catch (error) {
      console.error('Error creating part:', error);
      setErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            Nuevo Repuesto
          </h1>
          <p className="text-muted-foreground mt-1">
            Registrar un nuevo repuesto en el inventario
          </p>
        </div>
        <Link href="/maintenance/parts">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="space-y-6">
            {/* Información Básica */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Información Básica</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="partNumber">Código/Número de Parte *</Label>
                  <Input
                    id="partNumber"
                    value={formData.partNumber}
                    onChange={(e) => handleChange('partNumber', e.target.value.toUpperCase())}
                    placeholder="Ej: FLT-001"
                    required
                    className="uppercase"
                  />
                </div>

                <div>
                  <Label htmlFor="name">Nombre del Repuesto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ej: Filtro de Aceite"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engine">Motor</SelectItem>
                      <SelectItem value="transmission">Transmisión</SelectItem>
                      <SelectItem value="brakes">Frenos</SelectItem>
                      <SelectItem value="suspension">Suspensión</SelectItem>
                      <SelectItem value="electrical">Eléctrico</SelectItem>
                      <SelectItem value="filters">Filtros</SelectItem>
                      <SelectItem value="fluids">Fluidos/Lubricantes</SelectItem>
                      <SelectItem value="tires">Neumáticos</SelectItem>
                      <SelectItem value="body">Carrocería</SelectItem>
                      <SelectItem value="accessories">Accesorios</SelectItem>
                      <SelectItem value="other">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="supplierName">Proveedor</Label>
                  <Input
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => handleChange('supplierName', e.target.value)}
                    placeholder="Ej: Repuestos S.A."
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Descripción detallada del repuesto..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Inventario y Precios */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Inventario y Precios</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currentStock">Cantidad Actual *</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => handleChange('currentStock', parseInt(e.target.value) || 0)}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="minStock">Stock Mínimo *</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="unitCost">Precio Unitario *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => handleChange('unitCost', parseFloat(e.target.value) || 0)}
                    min="0"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Ubicación en Almacén</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Ej: Estante A-3"
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/maintenance/parts">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Crear Repuesto
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
      <AlertModal
        open={errorAlert}
        onOpenChange={setErrorAlert}
        title="Error"
        description="Error al crear el repuesto. Intente nuevamente."
        variant="error"
      />
    </div>
  );
}
