'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Workflow, CreateWorkflowDTO } from '@/types/workflow';
import { unifiedWorkflowService } from '@/services/workflow.service';

/**
 * Estado del hook useWorkflowManagement
 */
interface UseWorkflowManagementState {
  workflows: Workflow[];
  availableCustomers: Array<{ id: string; name: string }>;
  availableGeofences: Array<{ id: string; name: string; type: string; color: string }>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Resultado del hook useWorkflowManagement
 */
interface UseWorkflowManagementReturn extends UseWorkflowManagementState {
  /** Crear nuevo workflow */
  createWorkflow: (data: CreateWorkflowDTO) => Promise<Workflow>;
  /** Actualizar workflow existente */
  updateWorkflow: (id: string, data: CreateWorkflowDTO) => Promise<Workflow>;
  /** Eliminar workflow */
  deleteWorkflow: (id: string) => Promise<void>;
  /** Duplicar workflow */
  duplicateWorkflow: (id: string, newName: string) => Promise<Workflow>;
  /** Cambiar estado activo/inactivo */
  changeStatus: (id: string, status: 'active' | 'inactive') => Promise<Workflow>;
  /** Recargar datos */
  refresh: () => Promise<void>;
}

/**
 * Hook para gestión administrativa de workflows (CRUD completo).
 * Separa la lógica de administración (WorkflowLayout) de la lectura/selección (useWorkflows).
 * Sigue SRP: useWorkflows = lectura, useWorkflowManagement = escritura/admin.
 */
export function useWorkflowManagement(): UseWorkflowManagementReturn {
  const [state, setState] = useState<UseWorkflowManagementState>({
    workflows: [],
    availableCustomers: [],
    availableGeofences: [],
    isLoading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [allWorkflows, customers, geofences] = await Promise.all([
        unifiedWorkflowService.getAll(),
        unifiedWorkflowService.getAvailableCustomers(),
        unifiedWorkflowService.getAvailableGeofences(),
      ]);

      setState({
        workflows: allWorkflows,
        availableCustomers: customers,
        availableGeofences: geofences.map(g => ({
          id: g.id,
          name: g.name,
          type: g.category,
          color: g.color || '#3b82f6',
        })),
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error al cargar datos',
      }));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createWorkflow = useCallback(async (data: CreateWorkflowDTO): Promise<Workflow> => {
    const created = await unifiedWorkflowService.create(data);
    setState(prev => ({ ...prev, workflows: [created, ...prev.workflows] }));
    return created;
  }, []);

  const updateWorkflow = useCallback(async (id: string, data: CreateWorkflowDTO): Promise<Workflow> => {
    const updated = await unifiedWorkflowService.update(id, data);
    setState(prev => ({
      ...prev,
      workflows: prev.workflows.map(w => w.id === updated.id ? updated : w),
    }));
    return updated;
  }, []);

  const deleteWorkflow = useCallback(async (id: string): Promise<void> => {
    await unifiedWorkflowService.delete(id);
    setState(prev => ({
      ...prev,
      workflows: prev.workflows.filter(w => w.id !== id),
    }));
  }, []);

  const duplicateWorkflow = useCallback(async (id: string, newName: string): Promise<Workflow> => {
    const copy = await unifiedWorkflowService.duplicate(id, newName);
    setState(prev => ({ ...prev, workflows: [copy, ...prev.workflows] }));
    return copy;
  }, []);

  const changeStatus = useCallback(async (id: string, status: 'active' | 'inactive'): Promise<Workflow> => {
    const updated = await unifiedWorkflowService.changeStatus(id, status);
    setState(prev => ({
      ...prev,
      workflows: prev.workflows.map(w => w.id === updated.id ? updated : w),
    }));
    return updated;
  }, []);

  return {
    ...state,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    changeStatus,
    refresh: loadData,
  };
}
