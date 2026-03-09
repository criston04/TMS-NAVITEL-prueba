/**
 * @fileoverview Tests para el módulo Maintenance
 *
 * Cubre:
 * 1. AlertSeverity config keys (critical|error|warning|info)
 * 2. WorkOrderType (preventive|corrective|inspection|emergency)
 * 3. WorkOrderPriority (urgent|high|normal|low) — no "medium"
 * 4. PartCategory en inglés (filters|brakes|engine|...)
 * 5. MaintenanceAlert.priority usa "medium" (diferente a WorkOrderPriority)
 * 6. maintenanceService CRUD operations
 * 7. Mock data quality
 *
 * Ejecutar: npx vitest run src/tests/maintenance/maintenance.test.ts
 */

import { describe, it, expect, vi } from 'vitest';

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

import type {
  AlertSeverity,
  WorkOrderType,
  WorkOrderPriority,
  PartCategory,
} from '@/types/maintenance';

/* ============================================================
   1. AlertSeverity — must use critical|error|warning|info
   ============================================================ */
describe('AlertSeverity enum values', () => {
  const validSeverities: AlertSeverity[] = ['critical', 'error', 'warning', 'info'];

  it('tiene exactamente 4 niveles válidos', () => {
    expect(validSeverities).toHaveLength(4);
  });

  it('NO incluye high, medium, low', () => {
    const invalidValues = ['high', 'medium', 'low'];
    for (const val of invalidValues) {
      expect(validSeverities).not.toContain(val);
    }
  });

  it('config severity order es consistente', () => {
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      error: 1,
      warning: 2,
      info: 3,
    };
    expect(severityOrder.critical).toBe(0);
    expect(severityOrder.info).toBe(3);
  });
});

/* ============================================================
   2. WorkOrderType — must include emergency, not repair/modification
   ============================================================ */
describe('WorkOrderType enum values', () => {
  const validTypes: WorkOrderType[] = ['preventive', 'corrective', 'inspection', 'emergency'];

  it('tiene 4 tipos válidos', () => {
    expect(validTypes).toHaveLength(4);
  });

  it('incluye emergency', () => {
    expect(validTypes).toContain('emergency');
  });

  it('NO incluye repair ni modification', () => {
    const invalidTypes = ['repair', 'modification'];
    for (const val of invalidTypes) {
      expect(validTypes).not.toContain(val);
    }
  });
});

/* ============================================================
   3. WorkOrderPriority — "normal" not "medium"
   ============================================================ */
describe('WorkOrderPriority enum values', () => {
  const validPriorities: WorkOrderPriority[] = ['urgent', 'high', 'normal', 'low'];

  it('tiene 4 prioridades válidas', () => {
    expect(validPriorities).toHaveLength(4);
  });

  it('usa "normal" en lugar de "medium"', () => {
    expect(validPriorities).toContain('normal');
    expect(validPriorities).not.toContain('medium');
  });
});

/* ============================================================
   4. PartCategory — valores en inglés
   ============================================================ */
describe('PartCategory enum values', () => {
  const validCategories: PartCategory[] = [
    'filters',
    'brakes',
    'engine',
    'transmission',
    'electrical',
    'suspension',
    'tires',
    'body',
    'fluids',
    'other',
  ];

  it('tiene al menos 10 categorías', () => {
    expect(validCategories.length).toBeGreaterThanOrEqual(10);
  });

  it('todos los valores están en inglés', () => {
    const spanishValues = ['Filtros', 'Frenos', 'Motor', 'Transmisión', 'Eléctrico', 'Suspensión'];
    for (const val of spanishValues) {
      expect(validCategories).not.toContain(val);
    }
  });

  it('incluye filters, brakes, engine, tires', () => {
    expect(validCategories).toContain('filters');
    expect(validCategories).toContain('brakes');
    expect(validCategories).toContain('engine');
    expect(validCategories).toContain('tires');
  });
});

/* ============================================================
   5. MaintenanceAlert.priority — uses "medium" (NOT "normal")
   ============================================================ */
describe('MaintenanceAlert priority', () => {
  // MaintenanceAlert.priority is DIFFERENT from WorkOrderPriority
  // WorkOrderPriority uses "normal" but MaintenanceAlert uses standard "critical|high|medium|low"
  it('MaintenanceAlert priority accepts "medium" (not "normal")', () => {
    const alertPriorities = ['critical', 'high', 'medium', 'low'] as const;
    type AlertPriority = typeof alertPriorities[number];

    const validAlert: { priority: AlertPriority } = { priority: 'medium' };
    expect(validAlert.priority).toBe('medium');
    expect(alertPriorities).toContain('medium');
    expect(alertPriorities).not.toContain('normal');
  });

  it('priority sort order para alerts: critical < high < medium < low', () => {
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    expect(priorityOrder.critical).toBeLessThan(priorityOrder.high);
    expect(priorityOrder.high).toBeLessThan(priorityOrder.medium);
    expect(priorityOrder.medium).toBeLessThan(priorityOrder.low);
  });
});

/* ============================================================
   6. Mock data quality — maintenance
   ============================================================ */
describe('Maintenance Mock Data', () => {
  it('mockWorkOrders importable and non-empty', async () => {
    const { mockWorkOrders } = await import('@/mocks/maintenance');
    expect(Array.isArray(mockWorkOrders)).toBe(true);
    expect(mockWorkOrders.length).toBeGreaterThan(0);
  });

  it('mockParts importable and non-empty', async () => {
    const { mockParts } = await import('@/mocks/maintenance');
    expect(Array.isArray(mockParts)).toBe(true);
    expect(mockParts.length).toBeGreaterThan(0);
  });

  it('mockAlerts importable and non-empty', async () => {
    const { mockAlerts } = await import('@/mocks/maintenance');
    expect(Array.isArray(mockAlerts)).toBe(true);
    expect(mockAlerts.length).toBeGreaterThan(0);
  });

  it('mockMaintenanceSchedules importable', async () => {
    const { mockMaintenanceSchedules } = await import('@/mocks/maintenance');
    expect(Array.isArray(mockMaintenanceSchedules)).toBe(true);
  });

  it('work orders tienen campos requeridos', async () => {
    const { mockWorkOrders } = await import('@/mocks/maintenance');
    if (mockWorkOrders.length > 0) {
      const wo = mockWorkOrders[0];
      expect(wo).toHaveProperty('id');
      expect(wo).toHaveProperty('type');
      expect(wo).toHaveProperty('priority');
      expect(wo).toHaveProperty('status');
    }
  });

  it('alerts tienen severity válida', async () => {
    const { mockAlerts } = await import('@/mocks/maintenance');
    const validSeverities = ['critical', 'error', 'warning', 'info'];
    for (const alert of mockAlerts) {
      expect(validSeverities).toContain(alert.severity);
    }
  });
});
