/**
 * @fileoverview Tests para el módulo Reports
 *
 * Cubre:
 * 1. reportService — CRUD definitions, schedules, generation
 * 2. getUsageStats, getReportCategories
 * 3. getOperationalData, getFinancialData
 *
 * Ejecutar: npx vitest run src/tests/reports/reports.test.ts
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config/api.config', () => ({
  apiConfig: { useMocks: true, baseUrl: 'http://localhost:3000/api' },
  API_ENDPOINTS: {
    reports: {
      definitions: '/api/reports/definitions',
      templates: '/api/reports/templates',
      generated: '/api/reports/generated',
      schedules: '/api/reports/schedules',
    },
  },
}));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

import { reportService } from '@/services/report.service';

/* ============================================================
   1. Report Service — Definitions
   ============================================================ */
describe('ReportService — Definitions', () => {
  it('getDefinitions devuelve array de definiciones', async () => {
    const result = await reportService.getDefinitions();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('createDefinition crea una definición', async () => {
    const definition = await reportService.createDefinition({
      code: 'RPT-TEST',
      name: 'Test Report',
      type: 'operational',
      category: 'testing',
      dataSource: 'orders',
      columns: [{ field: 'id', header: 'ID', type: 'text', width: 100 }],
    });
    expect(definition).toBeDefined();
    expect(definition.id).toBeDefined();
    expect(definition.name).toBe('Test Report');
  });

  it('cada definición tiene campos requeridos', async () => {
    const result = await reportService.getDefinitions();
    const def = result[0];
    expect(def).toHaveProperty('id');
    expect(def).toHaveProperty('name');
    expect(def).toHaveProperty('type');
    expect(def).toHaveProperty('category');
    expect(def).toHaveProperty('usageCount');
  });
});

/* ============================================================
   2. Report Service — Generation
   ============================================================ */
describe('ReportService — Generation', () => {
  it('generateReport genera un reporte', async () => {
    const defs = await reportService.getDefinitions();
    if (defs.length > 0) {
      const report = await reportService.generateReport({
        definitionId: defs[0].id,
        format: 'pdf',
      });
      expect(report).toBeDefined();
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('status');
    }
  });

  it('getGeneratedReports devuelve { data, total }', async () => {
    const result = await reportService.getGeneratedReports();
    expect(result).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.total).toBe('number');
  });

  it('reporte generado tiene campos requeridos', async () => {
    const result = await reportService.getGeneratedReports();
    if (result.data.length > 0) {
      const report = result.data[0];
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('format');
    }
  });
});

/* ============================================================
   3. Report Service — Schedules
   ============================================================ */
describe('ReportService — Schedules', () => {
  it('getSchedules devuelve array de schedules', async () => {
    const result = await reportService.getSchedules();
    expect(Array.isArray(result)).toBe(true);
  });

  it('createSchedule crea un schedule', async () => {
    const schedule = await reportService.createSchedule({
      definitionId: 'def-001',
      name: 'Weekly Report',
      frequency: 'weekly',
      timeOfDay: '08:00',
      recipients: ['test@test.com'],
      format: 'pdf',
    });
    expect(schedule).toBeDefined();
    expect(schedule.id).toBeDefined();
    expect(schedule.frequency).toBe('weekly');
    expect(schedule.isActive).toBe(true);
  });

  it('toggleSchedule cambia isActive', async () => {
    const schedules = await reportService.getSchedules();
    if (schedules.length > 0) {
      const schedule = schedules[0];
      const toggled = await reportService.toggleSchedule(schedule.id);
      expect(toggled).toBeDefined();
      expect(toggled.isActive).toBe(!schedule.isActive);
    }
  });

  it('deleteSchedule elimina un schedule', async () => {
    const schedules = await reportService.getSchedules();
    if (schedules.length > 0) {
      await expect(
        reportService.deleteSchedule(schedules[0].id)
      ).resolves.not.toThrow();
    }
  });
});

/* ============================================================
   4. Report Stats & Categories
   ============================================================ */
describe('ReportService — Stats & Categories', () => {
  it('getUsageStats devuelve estadísticas', async () => {
    const stats = await reportService.getUsageStats();
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('totalGenerated');
    expect(stats).toHaveProperty('byType');
    expect(stats).toHaveProperty('avgGenerationTime');
  });

  it('getReportCategories devuelve categorías', async () => {
    const categories = await reportService.getReportCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  it('getOperationalData devuelve datos operacionales', async () => {
    const data = await reportService.getOperationalData('2024-01-01', '2024-12-31');
    expect(data).toHaveProperty('totalOrders');
    expect(data).toHaveProperty('completionRate');
    expect(data).toHaveProperty('onTimeRate');
  });

  it('getFinancialData devuelve datos financieros', async () => {
    const data = await reportService.getFinancialData('2024-01-01', '2024-12-31');
    expect(data).toHaveProperty('totalRevenue');
    expect(data).toHaveProperty('grossProfit');
    expect(data).toHaveProperty('netMargin');
  });
});
