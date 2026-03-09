'use client';

import { useState, useEffect, useCallback } from 'react';
import { customersService } from '@/services/master';
import type { Customer, UpdateCustomerDTO } from '@/types/models';

/**
 * Estado del hook useCustomerDetail
 */
interface UseCustomerDetailState {
  customer: Customer | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Resultado del hook useCustomerDetail
 */
interface UseCustomerDetailReturn extends UseCustomerDetailState {
  /** Actualizar datos del cliente */
  updateCustomer: (data: UpdateCustomerDTO) => Promise<Customer | null>;
  /** Cambiar estado activo/inactivo */
  toggleStatus: () => Promise<Customer | null>;
  /** Eliminar cliente */
  deleteCustomer: () => Promise<boolean>;
  /** Recargar datos del cliente */
  refresh: () => Promise<void>;
}

/**
 * Hook para gestión de un cliente individual.
 * Separa la lógica de detalle/edición de la lista (useCustomers).
 * Sigue el principio de responsabilidad única.
 */
export function useCustomerDetail(customerId: string): UseCustomerDetailReturn {
  const [state, setState] = useState<UseCustomerDetailState>({
    customer: null,
    isLoading: true,
    error: null,
  });

  const loadCustomer = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await customersService.getById(customerId);
      setState({ customer: data, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar el cliente';
      setState({ customer: null, isLoading: false, error: message });
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId, loadCustomer]);

  const updateCustomer = useCallback(async (data: UpdateCustomerDTO): Promise<Customer | null> => {
    if (!state.customer) return null;
    try {
      const updated = await customersService.updateCustomer(state.customer.id, data);
      setState(prev => ({ ...prev, customer: updated }));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar';
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, [state.customer]);

  const toggleStatus = useCallback(async (): Promise<Customer | null> => {
    if (!state.customer) return null;
    try {
      const updated = await customersService.toggleStatus(state.customer.id);
      setState(prev => ({ ...prev, customer: updated }));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado';
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, [state.customer]);

  const deleteCustomer = useCallback(async (): Promise<boolean> => {
    if (!state.customer) return false;
    try {
      await customersService.deleteCustomer(state.customer.id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      setState(prev => ({ ...prev, error: message }));
      return false;
    }
  }, [state.customer]);

  return {
    ...state,
    updateCustomer,
    toggleStatus,
    deleteCustomer,
    refresh: loadCustomer,
  };
}
