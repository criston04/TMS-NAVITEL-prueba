/**
 * @fileoverview Tipos para Técnicos y Talleres
 */

export interface Technician {
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

export interface Workshop {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  specialties: string[];
  capacity: number;
  currentJobs: number;
  rating: number;
  status: 'open' | 'closed' | 'full';
}

export interface Assignment {
  id: string;
  workOrderId: string;
  technicianId?: string;
  workshopId?: string;
  assignedDate: Date;
  scheduledDate?: Date;
  estimatedHours?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}
