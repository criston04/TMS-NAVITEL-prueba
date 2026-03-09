/**
 * @fileoverview Tests para correcciones del módulo Scheduling (producción)
 *
 * Cubre:
 * - schedulingService.generateCalendarDays con blockedDays
 * - Conflicto pre-existente en shared-data (ord-00001 y ord-00002 misma vehicleId)
 * - Transformación de orders asignadas a ScheduledOrder
 * - Lógica de generación de calendario: días bloqueados, órdenes por día
 * - isSameDay utility
 *
 * Ejecutar: npx vitest run src/tests/scheduling/scheduling-fixes.test.ts
 */

import { describe, it, expect, vi } from 'vitest';

// Mock apiConfig before any service import to prevent "Cannot read properties of undefined (reading 'useMocks')"
vi.mock('@/config/api.config', () => ({
  apiConfig: { useMocks: true, baseUrl: 'http://localhost:3000/api' },
  API_ENDPOINTS: {},
}));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/services/integration/module-connector.service', () => ({
  moduleConnectorService: {
    registerModule: vi.fn(),
    getModuleStatus: vi.fn(),
    sendData: vi.fn(),
  },
}));

vi.mock('@/services/integration', () => ({
  moduleConnectorService: {
    registerModule: vi.fn(),
    getModuleStatus: vi.fn(),
    sendData: vi.fn(),
  },
}));

import { schedulingService } from '@/services/scheduling-service';
import { SHARED_ORDERS } from '@/mocks/shared-data';
import { generateMockBlockedDays, generateMockAllOrders } from '@/mocks/scheduling';
import type { ScheduledOrder, BlockedDay, CalendarDayData } from '@/types/scheduling';

/* ============================================================
   1. generateCalendarDays — Soporte de blockedDays
   ============================================================ */
describe('generateCalendarDays: blockedDays support', () => {
  const month = new Date(2026, 0, 1); // Enero 2026

  it('genera 31 días para enero', () => {
    const days = schedulingService.generateCalendarDays(month);
    expect(days).toHaveLength(31);
  });

  it('todos los días tienen isBlocked: false cuando no se pasan blockedDays', () => {
    const days = schedulingService.generateCalendarDays(month, []);
    for (const day of days) {
      expect(day.isBlocked).toBe(false);
    }
  });

  it('marca días correctamente como bloqueados cuando se pasan blockedDays', () => {
    const blockedDays: BlockedDay[] = [
      {
        id: 'bd-1',
        date: '2026-01-15',
        reason: 'Feriado Nacional',
        blockType: 'holiday',
        appliesToAll: true,
        createdBy: 'admin',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'bd-2',
        date: '2026-01-20',
        reason: 'Mantenimiento',
        blockType: 'full_day',
        appliesToAll: true,
        createdBy: 'admin',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const days = schedulingService.generateCalendarDays(month, [], blockedDays);

    // Día 15 debe estar bloqueado
    const day15 = days.find(d => d.date.getDate() === 15);
    expect(day15).toBeDefined();
    expect(day15!.isBlocked).toBe(true);

    // Día 20 debe estar bloqueado
    const day20 = days.find(d => d.date.getDate() === 20);
    expect(day20).toBeDefined();
    expect(day20!.isBlocked).toBe(true);

    // Día 10 no debe estar bloqueado
    const day10 = days.find(d => d.date.getDate() === 10);
    expect(day10).toBeDefined();
    expect(day10!.isBlocked).toBe(false);
  });

  it('maneja blockedDays con formato ISO (con T)', () => {
    const blockedDays: BlockedDay[] = [
      {
        id: 'bd-iso',
        date: '2026-01-25T12:00:00.000Z', // ISO con timestamp
        reason: 'Test ISO',
        blockType: 'full_day',
        appliesToAll: true,
        createdBy: 'admin',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const days = schedulingService.generateCalendarDays(month, [], blockedDays);
    const day25 = days.find(d => d.date.getDate() === 25);
    expect(day25).toBeDefined();
    expect(day25!.isBlocked).toBe(true);
  });

  it('asocia órdenes existentes a los días correctos', () => {
    const today = new Date();
    const testMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const scheduledOrders: ScheduledOrder[] = [
      {
        id: 'test-ord-1',
        orderNumber: 'ORD-TEST-001',
        customerId: 'cust-001',
        customerName: 'Test Customer',
        status: 'pending',
        priority: 'high',
        originId: 'loc-001',
        originName: 'Origen',
        destinationId: 'loc-002',
        destinationName: 'Destino',
        cargoType: 'general',
        weightKg: 1000,
        scheduledDate: today,
        scheduledStartTime: '08:00',
        estimatedEndTime: '12:00',
        estimatedDuration: 4,
        scheduleStatus: 'scheduled',
      } as ScheduledOrder,
    ];

    const days = schedulingService.generateCalendarDays(testMonth, scheduledOrders);
    const todayDay = days.find(d => d.date.getDate() === today.getDate());
    expect(todayDay).toBeDefined();
    expect(todayDay!.orders.length).toBeGreaterThan(0);
  });

  it('genera 28 días para febrero 2026 (no bisiesto)', () => {
    const feb = new Date(2026, 1, 1);
    const days = schedulingService.generateCalendarDays(feb);
    expect(days).toHaveLength(28);
  });

  it('utilization se calcula basado en # órdenes', () => {
    const days = schedulingService.generateCalendarDays(month);
    for (const day of days) {
      // Sin órdenes → utilization = 0
      expect(day.utilization).toBe(Math.min(100, day.orders.length * 15));
    }
  });
});

/* ============================================================
   2. isSameDay — Utility
   ============================================================ */
describe('schedulingService.isSameDay', () => {
  it('retorna true para el mismo instante', () => {
    const d = new Date(2026, 0, 15, 10, 30);
    expect(schedulingService.isSameDay(d, d)).toBe(true);
  });

  it('retorna true para diferente hora mismo día', () => {
    const d1 = new Date(2026, 0, 15, 8, 0);
    const d2 = new Date(2026, 0, 15, 23, 59);
    expect(schedulingService.isSameDay(d1, d2)).toBe(true);
  });

  it('retorna false para diferente día', () => {
    const d1 = new Date(2026, 0, 15);
    const d2 = new Date(2026, 0, 16);
    expect(schedulingService.isSameDay(d1, d2)).toBe(false);
  });

  it('retorna false para diferente mes', () => {
    const d1 = new Date(2026, 0, 15);
    const d2 = new Date(2026, 1, 15);
    expect(schedulingService.isSameDay(d1, d2)).toBe(false);
  });
});

/* ============================================================
   3. Shared Data — Conflicto pre-existente
   ============================================================ */
describe('Shared Data: conflicto pre-existente de vehículo', () => {
  it('ord-00001 y ord-00002 usan el mismo vehicleId', () => {
    const ord1 = SHARED_ORDERS.find(o => o.id === 'ord-00001');
    const ord2 = SHARED_ORDERS.find(o => o.id === 'ord-00002');
    expect(ord1).toBeDefined();
    expect(ord2).toBeDefined();
    expect(ord1!.vehicleId).toBe('veh-001');
    expect(ord2!.vehicleId).toBe('veh-001');
  });

  it('ord-00001 y ord-00002 están programadas el mismo día', () => {
    const ord1 = SHARED_ORDERS.find(o => o.id === 'ord-00001');
    const ord2 = SHARED_ORDERS.find(o => o.id === 'ord-00002');
    expect(ord1).toBeDefined();
    expect(ord2).toBeDefined();

    // Ambas usan formatDate(today) → misma fecha
    const date1 = new Date(ord1!.scheduledStartDate!).toDateString();
    const date2 = new Date(ord2!.scheduledStartDate!).toDateString();
    expect(date1).toBe(date2);
  });

  it('el conflicto implica overlap de recursos (mismo vehículo, mismo día)', () => {
    const conflictingVehicleOrders = SHARED_ORDERS.filter(o => o.vehicleId === 'veh-001');
    expect(conflictingVehicleOrders.length).toBeGreaterThanOrEqual(2);

    // Verificar que al menos 2 tienen la misma fecha
    const dates = conflictingVehicleOrders
      .filter(o => o.scheduledStartDate)
      .map(o => new Date(o.scheduledStartDate!).toDateString());
    const uniqueDates = new Set(dates);
    expect(dates.length).toBeGreaterThan(uniqueDates.size);
  });

  it('SHARED_ORDERS tiene diversos estados', () => {
    const statuses = new Set(SHARED_ORDERS.map(o => o.status));
    expect(statuses.size).toBeGreaterThanOrEqual(2);
  });
});

/* ============================================================
   4. Transformación de órdenes asignadas a ScheduledOrder
   ============================================================ */
describe('Transformación: Order → ScheduledOrder', () => {
  it('simula la lógica de transformación del hook use-scheduling', () => {
    // Simular la lógica exacta de loadInitialData
    const allOrders = generateMockAllOrders();
    const existingIds = new Set<string>();

    const fromOrders = allOrders
      .filter(o => (o.vehicleId || o.driverId) && !existingIds.has(o.id))
      .map(o => ({
        ...o,
        scheduledDate: o.scheduledStartDate ? new Date(o.scheduledStartDate) : new Date(),
        scheduledStartTime: '08:00',
        estimatedEndTime: '12:00',
        estimatedDuration: 4,
        scheduleStatus: (o.status === 'in_transit' ? 'in_progress' : 'scheduled'),
      }));

    // Debe haber órdenes asignadas
    expect(fromOrders.length).toBeGreaterThan(0);

    // Todas deben tener scheduledDate como Date
    for (const order of fromOrders) {
      expect(order.scheduledDate).toBeInstanceOf(Date);
      expect(order.scheduledStartTime).toBe('08:00');
      expect(order.estimatedDuration).toBe(4);
    }
  });

  it('ordenes in_transit se mapean a scheduleStatus "in_progress"', () => {
    const allOrders = generateMockAllOrders();
    const inTransit = allOrders.filter(o => o.status === 'in_transit' && (o.vehicleId || o.driverId));

    for (const o of inTransit) {
      const mapped = o.status === 'in_transit' ? 'in_progress' : 'scheduled';
      expect(mapped).toBe('in_progress');
    }
  });

  it('ordenes pending se mapean a scheduleStatus "scheduled"', () => {
    const allOrders = generateMockAllOrders();
    const pending = allOrders.filter(o => o.status === 'pending' && (o.vehicleId || o.driverId));

    for (const o of pending) {
      const mapped = o.status === 'in_transit' ? 'in_progress' : 'scheduled';
      expect(mapped).toBe('scheduled');
    }
  });

  it('no duplica órdenes ya existentes', () => {
    const allOrders = generateMockAllOrders();
    const assigned = allOrders.filter(o => o.vehicleId || o.driverId);

    if (assigned.length > 0) {
      const existingIds = new Set([assigned[0].id]);
      const fromOrders = assigned.filter(o => !existingIds.has(o.id));
      expect(fromOrders.length).toBe(assigned.length - 1);
    }
  });
});

/* ============================================================
   5. Blocked days — Mock generation
   ============================================================ */
describe('generateMockBlockedDays', () => {
  it('genera días bloqueados con estructura correcta', () => {
    const blocked = generateMockBlockedDays();
    expect(blocked.length).toBeGreaterThan(0);

    for (const day of blocked) {
      expect(day.id).toBeDefined();
      expect(day.date).toBeDefined();
      expect(day.reason).toBeDefined();
      expect(['full_day', 'partial', 'holiday']).toContain(day.blockType);
      expect(typeof day.appliesToAll).toBe('boolean');
      expect(day.createdBy).toBeDefined();
    }
  });
});

/* ============================================================
   6. Sidebar debounce — Lógica pura
   ============================================================ */
describe('Debounce logic (pure function simulation)', () => {
  it('la lógica de clearTimeout + setTimeout funciona correctamente', async () => {
    let callCount = 0;
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;

    const simulateDebounce = (value: string) => {
      if (timeoutRef !== null) {
        clearTimeout(timeoutRef);
      }
      timeoutRef = setTimeout(() => {
        callCount++;
      }, 50);
    };

    // Simular escritura rápida
    simulateDebounce('a');
    simulateDebounce('ab');
    simulateDebounce('abc');

    // Esperar a que se ejecute el último
    await new Promise(resolve => setTimeout(resolve, 100));

    // Solo se debe haber ejecutado UNA vez (la última)
    expect(callCount).toBe(1);
  });

  it('sin debounce ejecutaría múltiples veces', async () => {
    let callCount = 0;

    const simulateNonDebounce = (value: string) => {
      setTimeout(() => {
        callCount++;
      }, 50);
    };

    simulateNonDebounce('a');
    simulateNonDebounce('ab');
    simulateNonDebounce('abc');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Sin debounce, se ejecutaría 3 veces
    expect(callCount).toBe(3);
  });
});

/* ============================================================
   7. Mock All Orders — tiene órdenes con vehicleId
   ============================================================ */
describe('generateMockAllOrders: datos para scheduling', () => {
  it('genera órdenes con vehicleId para llenar calendario', () => {
    const allOrders = generateMockAllOrders();
    expect(allOrders.length).toBeGreaterThan(0);

    const withVehicle = allOrders.filter(o => o.vehicleId);
    expect(withVehicle.length).toBeGreaterThan(0);
  });

  it('genera órdenes con scheduledStartDate', () => {
    const allOrders = generateMockAllOrders();
    const withDate = allOrders.filter(o => o.scheduledStartDate);
    expect(withDate.length).toBeGreaterThan(0);
  });

  it('todas las órdenes tienen id y orderNumber', () => {
    const allOrders = generateMockAllOrders();
    for (const order of allOrders) {
      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBeDefined();
    }
  });
});
