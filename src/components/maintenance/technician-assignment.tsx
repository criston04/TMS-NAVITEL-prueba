/**
 * @fileoverview Componente de Asignación de Técnicos
 * Modal para asignar técnicos o talleres a órdenes de trabajo
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Building2,
  Star,
  CheckCircle2,
  Clock,
  Award,
  Phone,
  Mail,
  X,
} from 'lucide-react';

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  certifications: string[];
  status: 'available' | 'busy' | 'off_duty';
  rating: number;
  completedJobs: number;
  photo?: string;
}

interface Workshop {
  id: string;
  name: string;
  address: string;
  phone: string;
  specialties: string[];
  capacity: number;
  currentJobs: number;
  rating: number;
  status: 'open' | 'closed' | 'full';
}

interface TechnicianAssignmentProps {
  workOrderId: string;
  workOrderType: string;
  onClose: () => void;
  onAssign: (assignment: { technicianId?: string; workshopId?: string; scheduledDate?: Date; notes?: string }) => void;
}

export default function TechnicianAssignment({ workOrderId, workOrderType, onClose, onAssign }: TechnicianAssignmentProps) {
  const [assignmentType, setAssignmentType] = useState<'technician' | 'workshop'>('technician');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Mock data - reemplazar con datos reales del servicio
  const [technicians] = useState<Technician[]>([
    {
      id: 't1',
      name: 'Carlos Rodríguez',
      email: 'carlos.r@tms.com',
      phone: '+51 987 654 321',
      specialties: ['Motor', 'Transmisión', 'Sistema Eléctrico'],
      certifications: ['ASE Master', 'Diesel Specialist'],
      status: 'available',
      rating: 4.8,
      completedJobs: 156,
    },
    {
      id: 't2',
      name: 'María González',
      email: 'maria.g@tms.com',
      phone: '+51 987 654 322',
      specialties: ['Frenos', 'Suspensión', 'Dirección'],
      certifications: ['Brake Specialist', 'Suspension Expert'],
      status: 'available',
      rating: 4.9,
      completedJobs: 203,
    },
    {
      id: 't3',
      name: 'Luis Fernández',
      email: 'luis.f@tms.com',
      phone: '+51 987 654 323',
      specialties: ['Sistema Hidráulico', 'Aire Acondicionado'],
      certifications: ['HVAC Certified'],
      status: 'busy',
      rating: 4.7,
      completedJobs: 98,
    },
  ]);

  const [workshops] = useState<Workshop[]>([
    {
      id: 'w1',
      name: 'Taller Central Lima',
      address: 'Av. Industrial 1234, Lima',
      phone: '+51 01 234 5678',
      specialties: ['Mantenimiento General', 'Motor', 'Transmisión'],
      capacity: 10,
      currentJobs: 5,
      rating: 4.6,
      status: 'open',
    },
    {
      id: 'w2',
      name: 'Taller Express Norte',
      address: 'Panamericana Norte Km 15',
      phone: '+51 01 234 5679',
      specialties: ['Mantenimiento Preventivo', 'Inspecciones'],
      capacity: 6,
      currentJobs: 6,
      rating: 4.4,
      status: 'full',
    },
    {
      id: 'w3',
      name: 'Servicio Diesel Callao',
      address: 'Av. Argentina 5678, Callao',
      phone: '+51 01 234 5680',
      specialties: ['Motores Diesel', 'Sistema de Inyección'],
      capacity: 8,
      currentJobs: 3,
      rating: 4.8,
      status: 'open',
    },
  ]);

  const handleSubmit = () => {
    const assignment = {
      technicianId: assignmentType === 'technician' ? selectedTechnician : undefined,
      workshopId: assignmentType === 'workshop' ? selectedWorkshop : undefined,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      notes: notes || undefined,
    };
    onAssign(assignment);
  };

  const availableTechnicians = technicians.filter(t => t.status === 'available');
  const availableWorkshops = workshops.filter(w => w.status === 'open');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <User className="h-6 w-6 text-primary" />
                Asignar Técnico o Taller
              </h2>
              <p className="text-sm text-slate-600 mt-1">Orden de Trabajo: {workOrderId}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Tipo de Asignación */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-3">Tipo de Asignación</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setAssignmentType('technician')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  assignmentType === 'technician'
                    ? 'border-primary bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <User className={`h-6 w-6 mx-auto mb-2 ${assignmentType === 'technician' ? 'text-primary' : 'text-slate-400'}`} />
                <p className="font-semibold">Técnico Interno</p>
                <p className="text-xs text-slate-500 mt-1">{availableTechnicians.length} disponibles</p>
              </button>
              <button
                onClick={() => setAssignmentType('workshop')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  assignmentType === 'workshop'
                    ? 'border-primary bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Building2 className={`h-6 w-6 mx-auto mb-2 ${assignmentType === 'workshop' ? 'text-primary' : 'text-slate-400'}`} />
                <p className="font-semibold">Taller Externo</p>
                <p className="text-xs text-slate-500 mt-1">{availableWorkshops.length} disponibles</p>
              </button>
            </div>
          </div>

          {/* Selección de Técnico */}
          {assignmentType === 'technician' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-3">Seleccionar Técnico</label>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {technicians.map((tech) => (
                  <div
                    key={tech.id}
                    onClick={() => tech.status === 'available' && setSelectedTechnician(tech.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTechnician === tech.id
                        ? 'border-primary bg-blue-50 shadow-md'
                        : tech.status === 'available'
                        ? 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {tech.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-slate-900">{tech.name}</h3>
                          <div className="flex items-center gap-2">
                            {tech.status === 'available' && (
                              <Badge className="bg-green-100 text-green-700">Disponible</Badge>
                            )}
                            {tech.status === 'busy' && (
                              <Badge className="bg-yellow-100 text-yellow-700">Ocupado</Badge>
                            )}
                            {tech.status === 'off_duty' && (
                              <Badge className="bg-gray-100 text-gray-700">Fuera de servicio</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {tech.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tech.phone}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">{tech.rating}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{tech.completedJobs} trabajos</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tech.specialties.map((spec, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selección de Taller */}
          {assignmentType === 'workshop' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-3">Seleccionar Taller</label>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {workshops.map((workshop) => (
                  <div
                    key={workshop.id}
                    onClick={() => workshop.status === 'open' && setSelectedWorkshop(workshop.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedWorkshop === workshop.id
                        ? 'border-primary bg-blue-50 shadow-md'
                        : workshop.status === 'open'
                        ? 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-slate-900">{workshop.name}</h3>
                          <div className="flex items-center gap-2">
                            {workshop.status === 'open' && (
                              <Badge className="bg-green-100 text-green-700">Abierto</Badge>
                            )}
                            {workshop.status === 'full' && (
                              <Badge className="bg-red-100 text-red-700">Lleno</Badge>
                            )}
                            {workshop.status === 'closed' && (
                              <Badge className="bg-gray-100 text-gray-700">Cerrado</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{workshop.address}</p>
                        <div className="flex items-center gap-1 text-sm text-slate-600 mb-2">
                          <Phone className="h-3 w-3" />
                          {workshop.phone}
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">{workshop.rating}</span>
                          </div>
                          <div className="text-slate-600">
                            Capacidad: {workshop.currentJobs}/{workshop.capacity}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {workshop.specialties.map((spec, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fecha Programada */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Fecha Programada (Opcional)</label>
            <Input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Notas Adicionales (Opcional)</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm min-h-[100px]"
              placeholder="Instrucciones especiales, prioridades, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedTechnician && !selectedWorkshop}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Asignar
          </Button>
        </div>
      </div>
    </div>
  );
}
