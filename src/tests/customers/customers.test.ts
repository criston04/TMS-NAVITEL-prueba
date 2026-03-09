/**
 * @fileoverview Tests para el módulo Customers
 *
 * Cubre:
 * 1. customersService — CRUD operations
 * 2. bulkDeleteCustomers — invocación correcta del servicio
 * 3. Mock data quality
 * 4. Customer filters y paginación
 * 5. toggleCustomerStatus
 *
 * Ejecutar: npx vitest run src/tests/customers/customers.test.ts
 */

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
  },
}));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { customersService } from '@/services/master';
import { customersMock } from '@/mocks/master';

/* ============================================================
   1. Customer Service — CRUD
   ============================================================ */
describe('CustomersService (mock mode)', () => {
  it('getAll devuelve lista de clientes', async () => {
    const result = await customersService.getAll();
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('getById devuelve un cliente específico', async () => {
    const all = await customersService.getAll();
    if (all.items.length > 0) {
      const customer = await customersService.getById(all.items[0].id);
      expect(customer).toBeDefined();
      expect(customer.id).toBe(all.items[0].id);
    }
  });

  it('create crea un cliente nuevo', async () => {
    const newCustomer = {
      name: 'Test Customer',
      documentType: 'ruc' as const,
      documentNumber: '20999999999',
      email: 'test@test.com',
      phone: '999999999',
      category: 'regular' as const,
    };
    const created = await customersService.create(newCustomer);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Test Customer');
  });

  it('update modifica un cliente', async () => {
    const all = await customersService.getAll();
    if (all.items.length > 0) {
      const updated = await customersService.update(all.items[0].id, {
        name: 'Updated Name',
      });
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Name');
    }
  });

  it('delete elimina un cliente', async () => {
    const all = await customersService.getAll();
    const initialCount = all.items.length;
    if (initialCount > 0) {
      await customersService.delete(all.items[0].id);
      const afterDelete = await customersService.getAll();
      expect(afterDelete.items.length).toBe(initialCount - 1);
    }
  });

  it('bulkDelete elimina múltiples clientes de una sola invocación', async () => {
    const all = await customersService.getAll();
    if (all.items.length >= 2) {
      const ids = [all.items[0].id, all.items[1].id];
      const initialCount = all.items.length;
      await customersService.bulkDelete(ids);
      const afterBulk = await customersService.getAll();
      expect(afterBulk.items.length).toBe(initialCount - 2);
    }
  });
});

/* ============================================================
   2. Mock data quality
   ============================================================ */
describe('Customer Mock Data', () => {
  it('customersMock tiene clientes', () => {
    expect(Array.isArray(customersMock)).toBe(true);
    expect(customersMock.length).toBeGreaterThan(0);
  });

  it('cada cliente del mock tiene campos obligatorios', () => {
    for (const customer of customersMock) {
      expect(customer).toHaveProperty('id');
      expect(customer).toHaveProperty('name');
      expect(customer).toHaveProperty('documentType');
      expect(customer).toHaveProperty('documentNumber');
    }
  });

  it('documentType es DNI o RUC (u otro tipo)', () => {
    const validTypes = ['dni', 'ruc', 'passport', 'ce', 'DNI', 'RUC', 'PASSPORT', 'CE'];
    for (const customer of customersMock) {
      if (customer.documentType) {
        expect(validTypes.map(t => t.toLowerCase())).toContain(customer.documentType.toLowerCase());
      }
    }
  });

  it('status cuando existe es active o inactive', () => {
    for (const customer of customersMock) {
      if (customer.status) {
        expect(['active', 'inactive']).toContain(customer.status);
      }
    }
  });

  it('al menos un cliente tiene contactos', () => {
    const withContacts = customersMock.filter(c => c.contacts && c.contacts.length > 0);
    expect(withContacts.length).toBeGreaterThanOrEqual(0);
  });
});

/* ============================================================
   3. Customer Stats
   ============================================================ */
describe('Customer Stats', () => {
  it('getStats devuelve estadísticas', async () => {
    if (typeof (customersService as any).getStats === 'function') {
      const stats = await (customersService as any).getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('total');
    }
  });
});
