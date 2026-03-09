/**
 * @fileoverview Servicio de Recordatorios
 * Sistema de recordatorios programados para mantenimientos preventivos
 */

import { notificationService } from './notification.service';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  scheduledDate: Date;
  type: 'maintenance' | 'document' | 'inspection' | 'custom';
  vehicleId?: string;
  vehiclePlate?: string;
  status: 'pending' | 'sent' | 'dismissed';
  recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  metadata?: any;
}

class ReminderService {
  private storageKey = 'tms_reminders';
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Crea un nuevo recordatorio
   */
  create(reminder: Omit<Reminder, 'id' | 'status'>): Reminder {
    const newReminder: Reminder = {
      ...reminder,
      id: this.generateId(),
      status: 'pending',
    };

    const reminders = this.getAll();
    reminders.push(newReminder);
    this.saveAll(reminders);

    return newReminder;
  }

  /**
   * Crea recordatorio para mantenimiento preventivo
   */
  createMaintenanceReminder(
    vehiclePlate: string,
    maintenanceType: string,
    scheduledDate: Date,
    recurring?: 'monthly' | 'yearly'
  ): Reminder {
    return this.create({
      title: `Mantenimiento Preventivo - ${vehiclePlate}`,
      description: `${maintenanceType} programado`,
      scheduledDate,
      type: 'maintenance',
      vehiclePlate,
      recurring,
    });
  }

  /**
   * Crea recordatorio para renovación de documento
   */
  createDocumentReminder(
    vehiclePlate: string,
    documentType: string,
    expirationDate: Date,
    daysBeforeExpiration: number = 30
  ): Reminder {
    const reminderDate = new Date(expirationDate);
    reminderDate.setDate(reminderDate.getDate() - daysBeforeExpiration);

    return this.create({
      title: `Renovar ${documentType} - ${vehiclePlate}`,
      description: `El documento vence el ${expirationDate.toLocaleDateString('es-PE')}`,
      scheduledDate: reminderDate,
      type: 'document',
      vehiclePlate,
    });
  }

  /**
   * Crea recordatorio para inspección
   */
  createInspectionReminder(
    vehiclePlate: string,
    inspectionType: string,
    scheduledDate: Date
  ): Reminder {
    return this.create({
      title: `Inspección ${inspectionType} - ${vehiclePlate}`,
      description: `Inspección programada`,
      scheduledDate,
      type: 'inspection',
      vehiclePlate,
    });
  }

  /**
   * Obtiene todos los recordatorios
   */
  getAll(): Reminder[] {
    if (typeof window === 'undefined') return [];
    
    const data = localStorage.getItem(this.storageKey);
    if (!data) return [];

    try {
      const reminders = JSON.parse(data);
      // Convertir fechas de string a Date
      return reminders.map((r: any) => ({
        ...r,
        scheduledDate: new Date(r.scheduledDate),
      }));
    } catch (error) {
      console.error('Error parsing reminders:', error);
      return [];
    }
  }

  /**
   * Obtiene recordatorios pendientes
   */
  getPending(): Reminder[] {
    return this.getAll().filter((r) => r.status === 'pending');
  }

  /**
   * Obtiene recordatorios por vehículo
   */
  getByVehicle(vehiclePlate: string): Reminder[] {
    return this.getAll().filter((r) => r.vehiclePlate === vehiclePlate);
  }

  /**
   * Actualiza un recordatorio
   */
  update(id: string, updates: Partial<Reminder>): boolean {
    const reminders = this.getAll();
    const index = reminders.findIndex((r) => r.id === id);

    if (index === -1) return false;

    reminders[index] = { ...reminders[index], ...updates };
    this.saveAll(reminders);
    return true;
  }

  /**
   * Elimina un recordatorio
   */
  delete(id: string): boolean {
    const reminders = this.getAll().filter((r) => r.id !== id);
    this.saveAll(reminders);
    return true;
  }

  /**
   * Marca un recordatorio como enviado
   */
  markAsSent(id: string): boolean {
    return this.update(id, { status: 'sent' });
  }

  /**
   * Marca un recordatorio como descartado
   */
  dismiss(id: string): boolean {
    return this.update(id, { status: 'dismissed' });
  }

  /**
   * Inicia el monitoreo de recordatorios
   */
  private startMonitoring(): void {
    // Verificar cada minuto
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000); // 60 segundos

    // Verificar inmediatamente
    this.checkReminders();
  }

  /**
   * Detiene el monitoreo
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Verifica y envía recordatorios vencidos
   */
  private async checkReminders(): Promise<void> {
    const now = new Date();
    const pendingReminders = this.getPending();

    for (const reminder of pendingReminders) {
      if (reminder.scheduledDate <= now) {
        await this.sendReminder(reminder);
        
        // Si es recurrente, crear el siguiente
        if (reminder.recurring) {
          this.createRecurringReminder(reminder);
        }
        
        this.markAsSent(reminder.id);
      }
    }
  }

  /**
   * Envía una notificación de recordatorio
   */
  private async sendReminder(reminder: Reminder): Promise<void> {
    const typeEmojis = {
      maintenance: '🔧',
      document: '📄',
      inspection: '✅',
      custom: '🔔',
    };

    await notificationService.createNotification({
      title: `${typeEmojis[reminder.type]} ${reminder.title}`,
      message: reminder.description,
      category: 'maintenance',
      priority: 'high',
    });
  }

  /**
   * Crea el siguiente recordatorio recurrente
   */
  private createRecurringReminder(reminder: Reminder): void {
    if (!reminder.recurring) return;

    const nextDate = new Date(reminder.scheduledDate);

    switch (reminder.recurring) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    this.create({
      title: reminder.title,
      description: reminder.description,
      scheduledDate: nextDate,
      type: reminder.type,
      vehicleId: reminder.vehicleId,
      vehiclePlate: reminder.vehiclePlate,
      recurring: reminder.recurring,
      metadata: reminder.metadata,
    });
  }

  /**
   * Guarda todos los recordatorios
   */
  private saveAll(reminders: Reminder[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(reminders));
  }

  /**
   * Genera un ID único
   */
  private generateId(): string {
    return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Exportar instancia singleton
export const reminderService = new ReminderService();
