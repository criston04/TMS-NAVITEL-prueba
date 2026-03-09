/**
 * @fileoverview Formulario para editar vehículo existente
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Truck, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { AlertModal } from '@/components/ui/alert-modal';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Vehicle } from '@/types/maintenance';
import Link from 'next/link';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const maintenance = useMaintenance();
  const vehicleId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updateErrorAlert, setUpdateErrorAlert] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    plate: '',
    type: 'truck' as Vehicle['type'],
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    currentMileage: 0,
    fuelType: 'diesel' as Vehicle['fuelType'],
    capacityKg: 0,
    capacityM3: 0,
    status: 'active' as Vehicle['status'],
    notes: '',
  });

  useEffect(() => {
    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      const vehicles = await maintenance.getVehicles();
      const found = vehicles.find((v) => v.id === vehicleId);
      
      if (found) {
        setVehicle(found);
        setFormData({
          plate: found.plate,
          type: found.type,
          brand: found.brand,
          model: found.model,
          year: found.year,
          vin: found.vin || '',
          currentMileage: found.currentMileage,
          fuelType: found.fuelType,
          capacityKg: found.capacityKg || 0,
          capacityM3: found.capacityM3 || 0,
          status: found.status,
          notes: found.notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedVehicle: Partial<Vehicle> = {
        ...formData,
        id: vehicleId,
        lastMileageUpdate: new Date().toISOString(),
        vin: formData.vin || undefined,
        capacityM3: formData.capacityM3 || undefined,
      };

      // En producción, esto llamaría a la API
      await maintenance.updateVehicle(vehicleId, updatedVehicle);

      // Redirigir al detalle del vehículo
      router.push(`/maintenance/vehicles/${vehicleId}`);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      setUpdateErrorAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando vehículo...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Vehículo no encontrado</h3>
          <p className="text-muted-foreground mb-4">
            No se pudo encontrar el vehículo solicitado
          </p>
          <Link href="/maintenance/vehicles">
            <Button>Volver a la lista</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            Editar Vehículo: {vehicle.plate}
          </h1>
          <p className="text-muted-foreground mt-1">
            Modificar información del vehículo
          </p>
        </div>
        <Link href={`/maintenance/vehicles/${vehicleId}`}>
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
              <Link href={`/maintenance/vehicles/${vehicleId}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
      <AlertModal
        open={updateErrorAlert}
        onOpenChange={setUpdateErrorAlert}
        title="Error"
        description="Error al actualizar el vehículo. Intente nuevamente."
        variant="error"
      />
    </div>
  );
}
