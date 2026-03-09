/**
 * @fileoverview Formulario para crear nuevo vehículo
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Truck, ArrowLeft, Save } from 'lucide-react';
import { AlertModal } from '@/components/ui/alert-modal';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Vehicle } from '@/types/maintenance';
import Link from 'next/link';

export default function NewVehiclePage() {
  const router = useRouter();
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState(false);
  const [formData, setFormData] = useState({
    plate: '',
    type: 'truck' as Vehicle['type'],
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    currentMileage: 0,
    fuelType: 'diesel' as Vehicle['fuelType'],
    transmission: 'manual' as Vehicle['transmission'],
    capacityKg: 0,
    capacityM3: 0,
    maintenanceKmInterval: 5000,
    maintenanceDaysInterval: 90,
    status: 'active' as Vehicle['status'],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newVehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        lastMileageUpdate: new Date().toISOString(),
        vin: formData.vin || undefined,
        capacityM3: formData.capacityM3 || undefined,
        transmission: formData.transmission || 'manual',
        maintenanceKmInterval: formData.maintenanceKmInterval || 5000,
        maintenanceDaysInterval: formData.maintenanceDaysInterval || 90,
        createdBy: 'system',
      };

      // En producción, esto llamaría a la API
      await maintenance.createVehicle(newVehicle);

      // Redirigir a la lista de vehículos
      router.push('/maintenance/vehicles');
    } catch (error) {
      console.error('Error creating vehicle:', error);
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
            <Truck className="h-8 w-8 text-primary" />
            Nuevo Vehículo
          </h1>
          <p className="text-muted-foreground mt-1">
            Registrar un nuevo vehículo en la flota
          </p>
        </div>
        <Link href="/maintenance/vehicles">
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
                  <Label htmlFor="plate">Placa *</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => handleChange('plate', e.target.value.toUpperCase())}
                    placeholder="ABC-123"
                    required
                    className="uppercase"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Vehículo *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="truck">Camión</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="trailer">Trailer</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="motorcycle">Motocicleta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="brand">Marca *</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="Ej: Volvo, Mercedes-Benz"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="model">Modelo *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    placeholder="Ej: FH16, Actros"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="year">Año *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleChange('year', parseInt(e.target.value))}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="vin">VIN (Número de Chasis)</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
                    placeholder="17 caracteres"
                    maxLength={17}
                    className="uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Especificaciones Técnicas */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Especificaciones Técnicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fuelType">Tipo de Combustible *</Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value) => handleChange('fuelType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="gasoline">Gasolina</SelectItem>
                      <SelectItem value="electric">Eléctrico</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                      <SelectItem value="cng">GNC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currentMileage">Kilometraje Actual *</Label>
                  <Input
                    id="currentMileage"
                    type="number"
                    value={formData.currentMileage}
                    onChange={(e) => handleChange('currentMileage', parseInt(e.target.value) || 0)}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="capacityKg">Capacidad de Carga (kg) *</Label>
                  <Input
                    id="capacityKg"
                    type="number"
                    value={formData.capacityKg}
                    onChange={(e) => handleChange('capacityKg', parseInt(e.target.value) || 0)}
                    min="0"
                    placeholder="Kilogramos"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="capacityM3">Capacidad Volumétrica (m³)</Label>
                  <Input
                    id="capacityM3"
                    type="number"
                    value={formData.capacityM3}
                    onChange={(e) => handleChange('capacityM3', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    placeholder="Metros cúbicos"
                  />
                </div>
              </div>
            </div>

            {/* Estado */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Estado</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Estado Operacional *</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="maintenance">En Mantenimiento</SelectItem>
                      <SelectItem value="out_of_service">Fuera de Servicio</SelectItem>
                      <SelectItem value="retired">Retirado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Información adicional sobre el vehículo..."
                rows={4}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/maintenance/vehicles">
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
                    Crear Vehículo
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
        description="Error al crear el vehículo. Intente nuevamente."
        variant="error"
      />
    </div>
  );
}
