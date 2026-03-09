/**
 * @fileoverview Hook para gestión de la Plataforma TMS (Nivel 1)
 *
 * Proporciona acceso a todas las operaciones de plataforma:
 *   - CRUD de tenants (cuentas de clientes)
 *   - Gestión de módulos por tenant
 *   - Transferencias de vehículos entre tenants
 *   - Dashboard de plataforma
 *   - Creación de usuarios maestros
 *   - Forzar reset de contraseñas
 *   - Grupos de flota
 */

"use client";

import { useState, useCallback } from "react";
import type { SearchParams } from "@/types/common";
import type {
  Tenant,
  TenantModuleConfig,
  VehicleTransferRequest,
  PlatformDashboard,
  PlatformActivityLog,
  FleetGroup,
  CreateTenantDTO,
  UpdateTenantDTO,
  SuspendTenantDTO,
  CreateMasterUserDTO,
  UpdateTenantModulesDTO,
  CreateVehicleTransferDTO,
  ForcePasswordResetDTO,
  SystemModuleCode,
} from "@/types/platform";
import {
  tenantService,
  tenantModuleService,
  masterUserService,
  vehicleTransferService,
  platformDashboardService,
  fleetGroupService,
} from "@/services/platform.service";

// ════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════

interface UsePlatformState {
  // Tenants
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  tenantModules: TenantModuleConfig[];

  // Transferencias
  transfers: VehicleTransferRequest[];

  // Dashboard
  dashboard: PlatformDashboard | null;
  activityLog: PlatformActivityLog[];

  // Fleet Groups
  fleetGroups: FleetGroup[];

  // UI
  isLoading: boolean;
  error: string | null;
  totalTenants: number;
  totalTransfers: number;
}

// ════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════

export function usePlatform() {
  const [state, setState] = useState<UsePlatformState>({
    tenants: [],
    selectedTenant: null,
    tenantModules: [],
    transfers: [],
    dashboard: null,
    activityLog: [],
    fleetGroups: [],
    isLoading: false,
    error: null,
    totalTenants: 0,
    totalTransfers: 0,
  });

  const setLoading = (isLoading: boolean) => setState((s) => ({ ...s, isLoading, error: null }));
  const setError = (error: string) => setState((s) => ({ ...s, isLoading: false, error }));

  // ── TENANTS ────────────────────────────────────

  const fetchTenants = useCallback(async (params?: SearchParams) => {
    setLoading(true);
    try {
      const result = await tenantService.getAll(params);
      setState((s) => ({
        ...s,
        tenants: result.items,
        totalTenants: result.pagination.totalItems,
        isLoading: false,
      }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tenants");
      throw err;
    }
  }, []);

  const fetchTenantById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const tenant = await tenantService.getById(id);
      setState((s) => ({ ...s, selectedTenant: tenant, isLoading: false }));
      return tenant;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tenant");
      throw err;
    }
  }, []);

  const createTenant = useCallback(async (data: CreateTenantDTO) => {
    setLoading(true);
    try {
      const tenant = await tenantService.create(data);
      setState((s) => ({
        ...s,
        tenants: [...s.tenants, tenant],
        totalTenants: s.totalTenants + 1,
        isLoading: false,
      }));
      return tenant;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear tenant");
      throw err;
    }
  }, []);

  const updateTenant = useCallback(async (id: string, data: UpdateTenantDTO) => {
    setLoading(true);
    try {
      const updated = await tenantService.update(id, data);
      setState((s) => ({
        ...s,
        tenants: s.tenants.map((t) => (t.id === id ? updated : t)),
        selectedTenant: s.selectedTenant?.id === id ? updated : s.selectedTenant,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar tenant");
      throw err;
    }
  }, []);

  const suspendTenant = useCallback(async (id: string, data: SuspendTenantDTO) => {
    setLoading(true);
    try {
      const suspended = await tenantService.suspend(id, data);
      setState((s) => ({
        ...s,
        tenants: s.tenants.map((t) => (t.id === id ? suspended : t)),
        selectedTenant: s.selectedTenant?.id === id ? suspended : s.selectedTenant,
        isLoading: false,
      }));
      return suspended;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al suspender tenant");
      throw err;
    }
  }, []);

  const reactivateTenant = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const reactivated = await tenantService.reactivate(id);
      setState((s) => ({
        ...s,
        tenants: s.tenants.map((t) => (t.id === id ? reactivated : t)),
        selectedTenant: s.selectedTenant?.id === id ? reactivated : s.selectedTenant,
        isLoading: false,
      }));
      return reactivated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reactivar tenant");
      throw err;
    }
  }, []);

  const deleteTenant = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await tenantService.delete(id);
      setState((s) => ({
        ...s,
        tenants: s.tenants.filter((t) => t.id !== id),
        totalTenants: s.totalTenants - 1,
        selectedTenant: s.selectedTenant?.id === id ? null : s.selectedTenant,
        isLoading: false,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar tenant");
      throw err;
    }
  }, []);

  // ── MÓDULOS ────────────────────────────────────

  const fetchTenantModules = useCallback(async (tenantId: string) => {
    setLoading(true);
    try {
      const modules = await tenantModuleService.getByTenant(tenantId);
      setState((s) => ({ ...s, tenantModules: modules, isLoading: false }));
      return modules;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar módulos");
      throw err;
    }
  }, []);

  const updateTenantModules = useCallback(async (tenantId: string, data: UpdateTenantModulesDTO) => {
    setLoading(true);
    try {
      const modules = await tenantModuleService.updateModules(tenantId, data);
      setState((s) => ({ ...s, tenantModules: modules, isLoading: false }));
      return modules;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar módulos");
      throw err;
    }
  }, []);

  const isModuleEnabled = useCallback(async (tenantId: string, moduleCode: SystemModuleCode) => {
    return tenantModuleService.isModuleEnabled(tenantId, moduleCode);
  }, []);

  // ── USUARIOS MAESTROS ──────────────────────────

  const createMasterUser = useCallback(async (data: CreateMasterUserDTO) => {
    setLoading(true);
    try {
      const user = await masterUserService.createMasterUser(data);
      setState((s) => ({ ...s, isLoading: false }));
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario maestro");
      throw err;
    }
  }, []);

  const forcePasswordReset = useCallback(async (data: ForcePasswordResetDTO) => {
    setLoading(true);
    try {
      const result = await masterUserService.forcePasswordReset(data);
      setState((s) => ({ ...s, isLoading: false }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al forzar reset de contraseña");
      throw err;
    }
  }, []);

  // ── TRANSFERENCIAS ─────────────────────────────

  const fetchTransfers = useCallback(async (params?: SearchParams) => {
    setLoading(true);
    try {
      const result = await vehicleTransferService.getAll(params);
      setState((s) => ({
        ...s,
        transfers: result.items,
        totalTransfers: result.pagination.totalItems,
        isLoading: false,
      }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar transferencias");
      throw err;
    }
  }, []);

  const createTransfer = useCallback(async (data: CreateVehicleTransferDTO) => {
    setLoading(true);
    try {
      const transfer = await vehicleTransferService.create(data);
      setState((s) => ({
        ...s,
        transfers: [...s.transfers, transfer],
        totalTransfers: s.totalTransfers + 1,
        isLoading: false,
      }));
      return transfer;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear transferencia");
      throw err;
    }
  }, []);

  const approveTransfer = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const updated = await vehicleTransferService.approve(id);
      setState((s) => ({
        ...s,
        transfers: s.transfers.map((t) => (t.id === id ? updated : t)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aprobar transferencia");
      throw err;
    }
  }, []);

  const executeTransfer = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const updated = await vehicleTransferService.execute(id);
      setState((s) => ({
        ...s,
        transfers: s.transfers.map((t) => (t.id === id ? updated : t)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ejecutar transferencia");
      throw err;
    }
  }, []);

  const rejectTransfer = useCallback(async (id: string, reason: string) => {
    setLoading(true);
    try {
      const updated = await vehicleTransferService.reject(id, reason);
      setState((s) => ({
        ...s,
        transfers: s.transfers.map((t) => (t.id === id ? updated : t)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar transferencia");
      throw err;
    }
  }, []);

  // ── DASHBOARD ──────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const dashboard = await platformDashboardService.getDashboard();
      setState((s) => ({ ...s, dashboard, isLoading: false }));
      return dashboard;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar dashboard");
      throw err;
    }
  }, []);

  const fetchActivityLog = useCallback(async (params?: SearchParams) => {
    setLoading(true);
    try {
      const result = await platformDashboardService.getActivityLog(params);
      setState((s) => ({
        ...s,
        activityLog: result.items,
        isLoading: false,
      }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar actividad");
      throw err;
    }
  }, []);

  // ── FLEET GROUPS ───────────────────────────────

  const fetchFleetGroups = useCallback(async (tenantId: string) => {
    setLoading(true);
    try {
      const groups = await fleetGroupService.getByTenant(tenantId);
      setState((s) => ({ ...s, fleetGroups: groups, isLoading: false }));
      return groups;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar grupos de flota");
      throw err;
    }
  }, []);

  const createFleetGroup = useCallback(
    async (tenantId: string, data: Omit<FleetGroup, "id" | "tenantId" | "createdAt" | "updatedAt">) => {
      setLoading(true);
      try {
        const group = await fleetGroupService.create(tenantId, data);
        setState((s) => ({
          ...s,
          fleetGroups: [...s.fleetGroups, group],
          isLoading: false,
        }));
        return group;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear grupo de flota");
        throw err;
      }
    },
    []
  );

  const updateFleetGroup = useCallback(
    async (tenantId: string, groupId: string, data: Partial<FleetGroup>) => {
      setLoading(true);
      try {
        const updated = await fleetGroupService.update(tenantId, groupId, data);
        setState((s) => ({
          ...s,
          fleetGroups: s.fleetGroups.map((g) => (g.id === groupId ? updated : g)),
          isLoading: false,
        }));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al actualizar grupo de flota");
        throw err;
      }
    },
    []
  );

  const deleteFleetGroup = useCallback(async (tenantId: string, groupId: string) => {
    setLoading(true);
    try {
      await fleetGroupService.delete(tenantId, groupId);
      setState((s) => ({
        ...s,
        fleetGroups: s.fleetGroups.filter((g) => g.id !== groupId),
        isLoading: false,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar grupo de flota");
      throw err;
    }
  }, []);

  // ── CLEAR ──────────────────────────────────────

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const clearSelectedTenant = useCallback(() => {
    setState((s) => ({ ...s, selectedTenant: null, tenantModules: [] }));
  }, []);

  return {
    // State
    ...state,

    // Tenant operations
    fetchTenants,
    fetchTenantById,
    createTenant,
    updateTenant,
    suspendTenant,
    reactivateTenant,
    deleteTenant,

    // Module operations
    fetchTenantModules,
    updateTenantModules,
    isModuleEnabled,

    // Master user operations
    createMasterUser,
    forcePasswordReset,

    // Transfer operations
    fetchTransfers,
    createTransfer,
    approveTransfer,
    executeTransfer,
    rejectTransfer,

    // Dashboard operations
    fetchDashboard,
    fetchActivityLog,

    // Fleet group operations
    fetchFleetGroups,
    createFleetGroup,
    updateFleetGroup,
    deleteFleetGroup,

    // Utilities
    clearError,
    clearSelectedTenant,
  };
}
