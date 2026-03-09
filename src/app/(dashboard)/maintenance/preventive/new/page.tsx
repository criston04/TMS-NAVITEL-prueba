/**
 * @fileoverview Formulario para crear nueva programación de mantenimiento preventivo
 */

'use client';

import { useState, useEffect } from 'react';
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
import { Calendar as CalendarIcon, ArrowLeft, Save } from 'lucide-react';
import { AlertModal } from '@/components/ui/alert-modal';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Vehicle, MaintenanceType } from '@/types/maintenance';
import Link from 'next/link';

const maintenanceTypeOptions = [
  { value: 'oil_change', label: 'Cambio de Aceite' },
  { value: 'filter_change', label: 'Cambio de Filtros' },
  { value: 'tire_rotation', label: 'Rotación de Neumáticos' },
  { value: 'brake_inspection', label: 'Inspección de Frenos' },
  { value: 'general_inspection', label: 'Inspección General' },
  { value: 'technical_review', label: 'Revisión Técnica' },
  { value: 'tune_up', label: 'Afinamiento' },
  { value: 'alignment', label: 'Alineación' },
  { value: 'battery_check', label: 'Revisión de Batería' },
  { value: 'cooling_system', label: 'Sistema de Refrigeración' },
  { value: 'transmission_service', label: 'Servicio de Transmisión' },
  { value: 'custom', label: 'Personalizado' },
];

export default function NewPreventiveMaintenancePage() {
  const router = useRouter();
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [errorAlert, setErrorAlert] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    maintenanceType: '',
    customType: '',
    scheduledDate: '',
    intervalKm: 0,
    intervalMonths: 0,
    estimatedCost: 0,
    description: '',
    notes: '',
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await maintenance.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await maintenance.createMaintenanceSchedule({
        vehicleId: formData.vehicleId,
        type: (formData.maintenanceType === 'custom' ? formData.customType : formData.maintenanceType) as MaintenanceType,
        scheduleType: formData.intervalKm ? 'mileage' : 'time',
        intervalKm: formData.intervalKm || undefined,
        intervalDays: formData.intervalMonths ? formData.intervalMonths * 30 : undefined,
        nextDueDate: formData.scheduledDate || undefined,
        status: 'upcoming',
        isActive: true,
        alertDaysBefore: 7,
        alertKmBefore: 500,
      });

      router.push('/maintenance/preventive');
    } catch (error) {
      console.error('Error creating schedule:', error);
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
            <CalendarIcon className="h-8 w-8 text-primary" />
            Nueva Programación de Mantenimiento
          </h1>
          <p className="text-muted-foreground mt-1">
            Programar un nuevo mantenimiento preventivo
          </p>
        </div>
        <Link href="/maintenance/preventive">
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
                  <Label htmlFor="vehicleId">Vehículo *</Label>
                  <Select
                    value={formData.vehicleId}
                    onValueChange={(value) => handleChange('vehicleId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.brand} {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maintenanceType">Tipo de Mantenimiento *</Label>
                  <Select
                    value={formData.maintenanceType}
                    onValueChange={(value) => handleChange('maintenanceType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {maintenanceTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.maintenanceType === 'custom' && (
                  <div className="md:col-span-2">
                    <Label htmlFor="customType">Tipo Personalizado *</Label>
                    <Input
                      id="customType"
                      value={formData.customType}
                      onChange={(e) => handleChange('customType', e.target.value)}
                      placeholder="Especificar tipo de mantenimiento"
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="scheduledDate">Fecha Programada *</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => handleChange('scheduledDate', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedCost">Costo Estimado</Label>
                  <Input
                    id="estimatedCost"
                    type="number"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e) => handleChange('estimatedCost', parseFloat(e.target.value) || 0)}
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Descripción del mantenimiento..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Intervalos de Mantenimiento */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Intervalos de Repetición (Opcional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="intervalKm">Intervalo por Kilómetros</Label>
                  <Input
                    id="intervalKm"
                    type="number"
                    value={formData.intervalKm}
                    onChange={(e) => handleChange('intervalKm', parseInt(e.target.value) || 0)}
                    min="0"
                    placeholder="Ej: 5000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El mantenimiento se repetirá cada X kilómetros
                  </p>
                </div>

                <div>
                  <Label htmlFor="intervalMonths">Intervalo por Meses</Label>
                  <Input
                    id="intervalMonths"
                    type="number"
                    value={formData.intervalMonths}
                    onChange={(e) => handleChange('intervalMonths', parseInt(e.target.value) || 0)}
                    min="0"
                    placeholder="Ej: 6"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El mantenimiento se repetirá cada X meses
                  </p>
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
                placeholder="Información adicional, recomendaciones..."
                rows={3}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/maintenance/preventive">
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
                    Crear Programación
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
        description="Error al crear la programación. Intente nuevamente."
        variant="error"
      />
    </div>
  );
}
