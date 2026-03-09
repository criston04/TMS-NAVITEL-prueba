/**
 * @fileoverview Formulario para crear nueva orden de trabajo
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ClipboardList, ArrowLeft, Save, Truck } from 'lucide-react';
import { AlertModal } from '@/components/ui/alert-modal';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { WorkOrder, Vehicle, Workshop } from '@/types/maintenance';
import Link from 'next/link';

export default function NewWorkOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const maintenance = useMaintenance();
  const scheduleId = searchParams.get('scheduleId');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [vehicleAlert, setVehicleAlert] = useState(false);
  const [errorAlert, setErrorAlert] = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: '',
    type: 'preventive' as WorkOrder['type'],
    description: '',
    priority: 'normal' as WorkOrder['priority'],
    scheduledStartDate: '',
    scheduledEndDate: '',
    assignedWorkshopId: '',
    assignedTechnicianId: '',
    estimatedCost: 0,
    estimatedHours: 0,
    notes: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [vehiclesData, workshopsData] = await Promise.all([
        maintenance.getVehicles(),
        maintenance.getWorkshops(),
      ]);
      setVehicles(vehiclesData.filter((v) => v.status === 'active' || v.status === 'maintenance'));
      setWorkshops(workshopsData.filter((w) => w.isActive));

      // Si viene de una programación, pre-llenar datos
      if (scheduleId) {
        const schedules = await maintenance.getMaintenanceSchedules();
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (schedule) {
          setFormData((prev) => ({
            ...prev,
            vehicleId: schedule.vehicleId,
            type: 'preventive' as const,
            description: `Mantenimiento programado: ${schedule.type}`,
            priority: 'normal' as const,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleId) {
      setVehicleAlert(true);
      return;
    }

    setLoading(true);

    try {
      const newWorkOrder: Omit<WorkOrder, 'id' | 'updatedAt' | 'orderNumber' | 'createdDate'> = {
        vehicleId: formData.vehicleId,
        type: formData.type,
        title: formData.description.substring(0, 100), // Use first 100 chars of description as title
        description: formData.description,
        priority: formData.priority,
        status: 'pending' as const,
        scheduledDate: formData.scheduledStartDate || undefined,
        workshopId: formData.assignedWorkshopId || undefined,
        technicianId: formData.assignedTechnicianId || undefined,
        estimatedCost: formData.estimatedCost || undefined,
        estimatedLaborHours: formData.estimatedHours || undefined,
        notes: formData.notes || undefined,
        partsUsed: [],
        createdBy: 'system',
      };

      // En producción, esto llamaría a la API
      await maintenance.createWorkOrder(newWorkOrder);

      // Redirigir a la lista de órdenes
      router.push('/maintenance/work-orders');
    } catch (error) {
      console.error('Error creating work order:', error);
      setErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Nueva Orden de Trabajo
          </h1>
          <p className="text-muted-foreground mt-1">
            Crear una nueva orden de mantenimiento o reparación
          </p>
        </div>
        <Link href="/maintenance/work-orders">
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
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo">
                        {formData.vehicleId ? (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            {vehicles.find((v) => v.id === formData.vehicleId)?.plate}
                          </div>
                        ) : (
                          'Seleccionar vehículo'
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{vehicle.plate}</span>
                            <span className="text-muted-foreground text-sm">
                              {vehicle.brand} {vehicle.model}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Orden *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Mantenimiento Preventivo</SelectItem>
                      <SelectItem value="corrective">Mantenimiento Correctivo</SelectItem>
                      <SelectItem value="inspection">Inspección</SelectItem>
                      <SelectItem value="emergency">Emergencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignedWorkshopId">Taller Asignado</Label>
                  <Select
                    value={formData.assignedWorkshopId}
                    onValueChange={(value) => handleChange('assignedWorkshopId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar taller (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {workshops.map((workshop) => (
                        <SelectItem key={workshop.id} value={workshop.id}>
                          {workshop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description">Descripción del Trabajo *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describa el trabajo a realizar..."
                rows={4}
                required
              />
            </div>

            {/* Programación */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Programación</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledStartDate">Fecha de Inicio Programada</Label>
                  <Input
                    id="scheduledStartDate"
                    type="datetime-local"
                    value={formData.scheduledStartDate}
                    onChange={(e) => handleChange('scheduledStartDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledEndDate">Fecha de Fin Programada</Label>
                  <Input
                    id="scheduledEndDate"
                    type="datetime-local"
                    value={formData.scheduledEndDate}
                    onChange={(e) => handleChange('scheduledEndDate', e.target.value)}
                    min={formData.scheduledStartDate}
                  />
                </div>
              </div>
            </div>

            {/* Estimaciones */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Estimaciones</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedCost">Costo Estimado (S/)</Label>
                  <Input
                    id="estimatedCost"
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => handleChange('estimatedCost', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedHours">Horas Estimadas</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => handleChange('estimatedHours', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.5"
                    placeholder="0.0"
                  />
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
                placeholder="Información adicional, instrucciones especiales..."
                rows={3}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/maintenance/work-orders">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Crear Orden
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
      <AlertModal
        open={vehicleAlert}
        onOpenChange={setVehicleAlert}
        title="Campo requerido"
        description="Debe seleccionar un vehículo para crear la orden de trabajo."
        variant="warning"
      />
      <AlertModal
        open={errorAlert}
        onOpenChange={setErrorAlert}
        title="Error"
        description="Error al crear la orden de trabajo. Intente nuevamente."
        variant="error"
      />
    </div>
  );
}
