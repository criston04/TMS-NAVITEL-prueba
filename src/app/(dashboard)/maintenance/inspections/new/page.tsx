/**
 * @fileoverview Formulario para crear nueva inspección de vehículo
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
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardCheck, ArrowLeft, Save } from 'lucide-react';
import { AlertModal } from '@/components/ui/alert-modal';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Vehicle, InspectionType } from '@/types/maintenance';
import Link from 'next/link';

const inspectionTypeOptions = [
  { value: 'pre_trip', label: 'Pre-Operacional' },
  { value: 'post_trip', label: 'Post-Operacional' },
  { value: 'periodic', label: 'Periódica' },
  { value: 'annual', label: 'Anual' },
  { value: 'technical_review', label: 'Revisión Técnica' },
  { value: 'custom', label: 'Personalizada' },
];

const checklistItems = [
  { id: 'tires', label: 'Neumáticos', category: 'Exterior' },
  { id: 'lights', label: 'Luces y Señalización', category: 'Exterior' },
  { id: 'mirrors', label: 'Espejos', category: 'Exterior' },
  { id: 'windshield', label: 'Parabrisas', category: 'Exterior' },
  { id: 'wipers', label: 'Limpiaparabrisas', category: 'Exterior' },
  { id: 'body', label: 'Carrocería', category: 'Exterior' },
  { id: 'engine', label: 'Motor', category: 'Mecánico' },
  { id: 'brakes', label: 'Frenos', category: 'Mecánico' },
  { id: 'steering', label: 'Dirección', category: 'Mecánico' },
  { id: 'suspension', label: 'Suspensión', category: 'Mecánico' },
  { id: 'fluids', label: 'Niveles de Fluidos', category: 'Mecánico' },
  { id: 'battery', label: 'Batería', category: 'Eléctrico' },
  { id: 'horn', label: 'Bocina', category: 'Eléctrico' },
  { id: 'dashboard', label: 'Instrumentos del Tablero', category: 'Interior' },
  { id: 'seatbelts', label: 'Cinturones de Seguridad', category: 'Interior' },
  { id: 'seats', label: 'Asientos', category: 'Interior' },
  { id: 'fire_extinguisher', label: 'Extintor', category: 'Seguridad' },
  { id: 'first_aid', label: 'Botiquín', category: 'Seguridad' },
  { id: 'warning_triangle', label: 'Triángulos de Seguridad', category: 'Seguridad' },
  { id: 'documents', label: 'Documentación', category: 'Seguridad' },
];

export default function NewInspectionPage() {
  const router = useRouter();
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [errorAlert, setErrorAlert] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    inspectionType: '',
    inspectorName: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    mileage: 0,
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
      const checkedCount = Object.values(checkedItems).filter(Boolean).length;
      const totalItems = checklistItems.length;
      const passedItems = checkedCount;
      const failedItems = totalItems - checkedCount;

      let status: 'completed' | 'failed' | 'pending' = 'pending';
      if (checkedCount === totalItems) {
        status = 'completed';
      } else if (failedItems > totalItems * 0.3) {
        status = 'failed';
      } else {
        status = 'completed'; // Si no falla muchos, se considera completada
      }

      await maintenance.createInspection({
        vehicleId: formData.vehicleId,
        type: formData.inspectionType as InspectionType,
        performedByName: formData.inspectorName,
        performedBy: 'system', // User ID
        performedDate: formData.inspectionDate,
        mileage: formData.mileage || 0, // Default to 0 if not provided
        status,
        passed: status === 'completed',
        checklistId: 'default',
        items: checklistItems.map(item => ({
          id: item.id,
          category: item.category,
          item: item.label,
          status: checkedItems[item.id] ? 'ok' : 'fail',
          notes: '',
        })),
        findings: [],
        requiresImmediateAction: status === 'failed',
        notes: formData.notes || undefined,
      });

      router.push('/maintenance/inspections');
    } catch (error) {
      console.error('Error creating inspection:', error);
      setErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckItem = (itemId: string, checked: boolean) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: checked }));
  };

  const groupedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof checklistItems>);

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalItems = checklistItems.length;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            Nueva Inspección
          </h1>
          <p className="text-muted-foreground mt-1">
            Realizar inspección de vehículo
          </p>
        </div>
        <Link href="/maintenance/inspections">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Información Básica */}
          <Card className="p-6">
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
                <Label htmlFor="inspectionType">Tipo de Inspección *</Label>
                <Select
                  value={formData.inspectionType}
                  onValueChange={(value) => handleChange('inspectionType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="inspectorName">Inspector *</Label>
                <Input
                  id="inspectorName"
                  value={formData.inspectorName}
                  onChange={(e) => handleChange('inspectorName', e.target.value)}
                  placeholder="Nombre del inspector"
                  required
                />
              </div>

              <div>
                <Label htmlFor="inspectionDate">Fecha de Inspección *</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => handleChange('inspectionDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="mileage">Kilometraje</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => handleChange('mileage', parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="Kilometraje actual"
                />
              </div>
            </div>
          </Card>

          {/* Checklist */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Lista de Verificación</h2>
              <div className="text-sm text-muted-foreground">
                {checkedCount} / {totalItems} items verificados
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-medium text-sm text-primary mb-3">{category}</h3>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={item.id}
                          checked={checkedItems[item.id] || false}
                          onCheckedChange={(checked) => 
                            handleCheckItem(item.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={item.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notas */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Observaciones</h2>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Observaciones generales, problemas encontrados, recomendaciones..."
              rows={4}
            />
          </Card>

          {/* Botones */}
          <Card className="p-4">
            <div className="flex justify-end gap-3">
              <Link href="/maintenance/inspections">
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
                    Guardar Inspección
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </form>
      <AlertModal
        open={errorAlert}
        onOpenChange={setErrorAlert}
        title="Error"
        description="Error al crear la inspección. Intente nuevamente."
        variant="error"
      />
    </div>
  );
}
