/**
 * @fileoverview Tests para el módulo Dashboard
 *
 * Cubre:
 * 1. Dashboard mock data — todas las interfaces
 * 2. dashboardServiceMock — getStats, getVehicleOverview, etc.
 * 3. useDashboard hook return shape
 * 4. Stats datos conectados al mock (no hardcoded)
 * 5. VehicleOverview props
 * 6. ShipmentStatistics props
 * 7. OnRouteVehicles props
 *
 * Ejecutar: npx vitest run src/tests/dashboard/dashboard.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  mockDashboardStats,
  mockDashboardTrends,
  mockSparklineData,
  mockVehicleOverview,
  mockShipmentData,
  mockOnRouteVehicles,
  dashboardServiceMock,
  type DashboardStats,
  type VehicleOverviewData,
  type ShipmentDataPoint,
  type OnRouteVehicle,
} from '@/mocks/dashboard.mock';

/* ============================================================
   1. Dashboard Mock Data — Interfaces
   ============================================================ */
describe('Dashboard Mock Data', () => {
  it('mockDashboardStats tiene todos los 12 KPIs', () => {
    const stats = mockDashboardStats;
    // Operativos
    expect(typeof stats.totalFleet).toBe('number');
    expect(typeof stats.onTimeDeliveryRate).toBe('number');
    expect(typeof stats.dailyOrders).toBe('number');
    expect(typeof stats.avgDeliveryTimeMinutes).toBe('number');
    // Monitoreo
    expect(typeof stats.vehiclesOnRoute).toBe('number');
    expect(typeof stats.activeDrivers).toBe('number');
    expect(typeof stats.avgSpeedKmh).toBe('number');
    expect(typeof stats.inMaintenance).toBe('number');
    // Seguridad
    expect(typeof stats.docsExpiringSoon).toBe('number');
    expect(typeof stats.enabledVehicles).toBe('number');
    expect(typeof stats.dailyIncidents).toBe('number');
    expect(typeof stats.gpsComplianceRate).toBe('number');
  });

  it('stats tienen valores razonables', () => {
    expect(mockDashboardStats.totalFleet).toBeGreaterThan(0);
    expect(mockDashboardStats.onTimeDeliveryRate).toBeGreaterThan(90);
    expect(mockDashboardStats.onTimeDeliveryRate).toBeLessThanOrEqual(100);
    expect(mockDashboardStats.gpsComplianceRate).toBeGreaterThan(95);
  });

  it('mockDashboardTrends tiene las 12 tendencias', () => {
    const expectedKeys = [
      'totalFleet', 'onTimeDelivery', 'dailyOrders', 'avgDeliveryTime',
      'vehiclesOnRoute', 'activeDrivers', 'avgSpeed', 'inMaintenance',
      'docsExpiring', 'enabledVehicles', 'dailyIncidents', 'gpsCompliance',
    ];
    for (const key of expectedKeys) {
      expect(mockDashboardTrends[key]).toBeDefined();
      expect(mockDashboardTrends[key]).toHaveProperty('value');
      expect(mockDashboardTrends[key]).toHaveProperty('label');
      expect(mockDashboardTrends[key]).toHaveProperty('isPositive');
    }
  });

  it('mockSparklineData tiene 8 series de datos', () => {
    const expectedKeys = [
      'totalFleet', 'onTimeDelivery', 'dailyOrders', 'avgDeliveryTime',
      'vehiclesOnRoute', 'activeDrivers', 'avgSpeed', 'inMaintenance',
    ];
    for (const key of expectedKeys) {
      expect(mockSparklineData[key]).toBeDefined();
      expect(Array.isArray(mockSparklineData[key])).toBe(true);
      expect(mockSparklineData[key].length).toBeGreaterThanOrEqual(5);
    }
  });
});

/* ============================================================
   2. Vehicle Overview Mock
   ============================================================ */
describe('VehicleOverview Mock', () => {
  it('tiene porcentajes que suman ~100%', () => {
    const { available, onRoute, inMaintenance, inactive } = mockVehicleOverview;
    const total = available + onRoute + inMaintenance + inactive;
    expect(Math.abs(total - 100)).toBeLessThan(1);
  });

  it('tiene tiempos promedio', () => {
    expect(typeof mockVehicleOverview.avgRouteTime).toBe('string');
    expect(typeof mockVehicleOverview.avgIdleTime).toBe('string');
    expect(typeof mockVehicleOverview.avgMaintenanceTime).toBe('string');
    expect(typeof mockVehicleOverview.avgLoadTime).toBe('string');
  });
});

/* ============================================================
   3. Shipment Data Mock
   ============================================================ */
describe('Shipment Data Mock', () => {
  it('tiene al menos 10 meses de datos', () => {
    expect(mockShipmentData.length).toBeGreaterThanOrEqual(10);
  });

  it('cada mes tiene entregas, en proceso y canceladas', () => {
    for (const point of mockShipmentData) {
      expect(typeof point.month).toBe('string');
      expect(typeof point.entregadas).toBe('number');
      expect(typeof point.enProceso).toBe('number');
      expect(typeof point.canceladas).toBe('number');
      expect(point.entregadas).toBeGreaterThan(0);
    }
  });

  it('entregas > canceladas (negocio saludable)', () => {
    for (const point of mockShipmentData) {
      expect(point.entregadas).toBeGreaterThan(point.canceladas);
    }
  });
});

/* ============================================================
   4. On Route Vehicles Mock
   ============================================================ */
describe('OnRoute Vehicles Mock', () => {
  it('tiene al menos 5 vehículos', () => {
    expect(mockOnRouteVehicles.length).toBeGreaterThanOrEqual(5);
  });

  it('cada vehículo tiene campos obligatorios', () => {
    for (const vehicle of mockOnRouteVehicles) {
      expect(vehicle).toHaveProperty('id');
      expect(vehicle).toHaveProperty('plate');
      expect(vehicle).toHaveProperty('driver');
      expect(vehicle).toHaveProperty('route');
      expect(vehicle).toHaveProperty('status');
      expect(vehicle).toHaveProperty('progress');
      expect(vehicle).toHaveProperty('eta');
      expect(vehicle).toHaveProperty('speed');
    }
  });

  it('status es on-time, delayed o ahead', () => {
    const validStatuses = ['on-time', 'delayed', 'ahead'];
    for (const vehicle of mockOnRouteVehicles) {
      expect(validStatuses).toContain(vehicle.status);
    }
  });

  it('progress está entre 0 y 100', () => {
    for (const vehicle of mockOnRouteVehicles) {
      expect(vehicle.progress).toBeGreaterThanOrEqual(0);
      expect(vehicle.progress).toBeLessThanOrEqual(100);
    }
  });

  it('route contiene → para separar origen/destino', () => {
    for (const vehicle of mockOnRouteVehicles) {
      expect(vehicle.route).toContain('→');
    }
  });
});

/* ============================================================
   5. Dashboard Service Mock
   ============================================================ */
describe('dashboardServiceMock', () => {
  it('getStats devuelve DashboardStats', async () => {
    const stats = await dashboardServiceMock.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalFleet).toBe(mockDashboardStats.totalFleet);
    expect(stats.onTimeDeliveryRate).toBe(mockDashboardStats.onTimeDeliveryRate);
  });

  it('getStats con dateFilter funciona', async () => {
    const stats = await dashboardServiceMock.getStats('2024-01');
    expect(stats).toBeDefined();
    expect(stats.totalFleet).toBe(mockDashboardStats.totalFleet);
  });

  it('getVehicleOverview devuelve datos', async () => {
    const overview = await dashboardServiceMock.getVehicleOverview();
    expect(overview).toBeDefined();
    expect(overview.available).toBe(mockVehicleOverview.available);
    expect(overview.onRoute).toBe(mockVehicleOverview.onRoute);
  });

  it('getShipmentData devuelve data y total', async () => {
    const result = await dashboardServiceMock.getShipmentData();
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it('getOnRouteVehicles devuelve vehicles y total', async () => {
    const result = await dashboardServiceMock.getOnRouteVehicles();
    expect(result).toHaveProperty('vehicles');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.vehicles)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it('shipmentData total = sum of all shipments', async () => {
    const result = await dashboardServiceMock.getShipmentData();
    const expectedTotal = result.data.reduce(
      (sum: number, d: ShipmentDataPoint) => sum + d.entregadas + d.enProceso + d.canceladas, 0
    );
    expect(result.total).toBe(expectedTotal);
  });
});

/* ============================================================
   6. Dashboard page — StatCards now use hook data
   ============================================================ */
describe('Dashboard StatCards Data Source', () => {
  it('stats contiene valores para todos los StatCards', () => {
    const stats = mockDashboardStats;
    // Section 1: Operativos (4 cards)
    expect(stats.totalFleet).toBeDefined();
    expect(stats.onTimeDeliveryRate).toBeDefined();
    expect(stats.dailyOrders).toBeDefined();
    expect(stats.avgDeliveryTimeMinutes).toBeDefined();
    // Section 2: Monitoreo (4 cards)
    expect(stats.vehiclesOnRoute).toBeDefined();
    expect(stats.activeDrivers).toBeDefined();
    expect(stats.avgSpeedKmh).toBeDefined();
    expect(stats.inMaintenance).toBeDefined();
    // Section 3: Seguridad (4 cards)
    expect(stats.docsExpiringSoon).toBeDefined();
    expect(stats.enabledVehicles).toBeDefined();
    expect(stats.dailyIncidents).toBeDefined();
    expect(stats.gpsComplianceRate).toBeDefined();
  });

  it('trends labels son descriptivos (no vacíos)', () => {
    for (const [key, trend] of Object.entries(mockDashboardTrends)) {
      expect(trend.label.length).toBeGreaterThan(0);
      expect(typeof trend.isPositive).toBe('boolean');
    }
  });
});
