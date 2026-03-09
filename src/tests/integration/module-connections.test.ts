import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config/api.config', () => ({
  apiConfig: { useMocks: true, baseUrl: 'http://localhost:3000/api' },
  API_ENDPOINTS: {
    master: {
      customers: '/api/master/customers',
      vehicles: '/api/master/vehicles',
      drivers: '/api/master/drivers',
      geofences: '/api/master/geofences',
      operators: '/api/master/operators',
      products: '/api/master/products',
    },
    orders: { list: '/api/orders', statusHistory: '/api/orders/status-history' },
    reports: { definitions: '/api/reports/definitions', templates: '/api/reports/templates', generated: '/api/reports/generated', schedules: '/api/reports/schedules' },
  },
}));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

import { moduleConnectorService } from '@/services/integration';
import { unifiedWorkflowService } from '@/services/workflow.service';

describe('Module Connections — Integration', () => {
  it('autoAssignWorkflow asigna un workflow por cliente', async () => {
    const result = await moduleConnectorService.autoAssignWorkflow({
      customerId: 'cust-001',
      cargo: {
        type: 'general',
        description: 'Test',
        weightKg: 1000,
        quantity: 1,
      },
    });
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('reason');
  });

  it('autoAssignWorkflow por tipo de carga refrigerada', async () => {
    const result = await moduleConnectorService.autoAssignWorkflow({
      customerId: 'unknown-customer',
      cargo: {
        type: 'refrigerated',
        description: 'Carga refrigerada',
        weightKg: 500,
        quantity: 10,
      },
    });
    expect(result).toHaveProperty('success');
  });

  it('getAll devuelve workflows activos', async () => {
    const workflows = await unifiedWorkflowService.getAll();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
  });

  it('validateWorkflowGeofences valida geocercas', async () => {
    const workflows = await unifiedWorkflowService.getAll();
    const wf = workflows.find(w => w.steps.length > 0);
    if (wf) {
      const validation = await moduleConnectorService.validateWorkflowGeofences(wf.id);
      expect(validation).toHaveProperty('valid');
    }
  });

  it('getSuggestedDuration devuelve duración', async () => {
    const workflows = await unifiedWorkflowService.getAll();
    const wf = workflows.find(w => w.status === 'active' && w.steps.length > 0);
    if (wf) {
      const duration = await moduleConnectorService.getSuggestedDuration(wf.id);
      expect(typeof duration === 'number' || duration === null).toBe(true);
    }
  });

  it('prepareOrderWithConnections prepara orden completa', async () => {
    const orderData = {
      customerId: 'cust-001',
      priority: 'normal' as const,
      cargo: {
        type: 'general' as const,
        description: 'Carga de prueba',
        weightKg: 1500,
        quantity: 5,
      },
      milestones: [],
      scheduledStartDate: new Date().toISOString(),
      scheduledEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const result = await moduleConnectorService.prepareOrderWithConnections(orderData);
    expect(result).toHaveProperty('workflowAssignment');
    expect(result).toHaveProperty('enrichedData');
  });
});
