import { useState, useEffect, useCallback, useMemo } from "react";
import { settingsService } from "@/services/settings.service";
import type {
  SystemSettings,
  SettingCategory,
  Role,
  Integration,
  AuditLogEntry,
  SettingsOverview,
  IntegrationHealthStatus,
  UpdateSettingsDTO,
  CreateRoleDTO,
  CreateIntegrationDTO,
  AuditLogFilters,
} from "@/types/settings";


interface UseSettingsReturn {
  settings: SystemSettings | null;
  roles: Role[];
  integrations: Integration[];
  overview: SettingsOverview | null;

  loading: boolean;
  saving: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  getSettingsByCategory: <T extends keyof SystemSettings>(category: T) => Promise<SystemSettings[T] | null>;
  updateSettings: (data: UpdateSettingsDTO) => Promise<boolean>;
  resetSettings: (category: SettingCategory) => Promise<boolean>;
  exportSettings: () => Promise<string | null>;
  importSettings: (json: string) => Promise<boolean>;

  // Roles
  fetchRoles: () => Promise<void>;
  createRole: (data: CreateRoleDTO) => Promise<Role | null>;
  updateRole: (id: string, data: Partial<CreateRoleDTO>) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>;

  // Integraciones
  fetchIntegrations: () => Promise<void>;
  createIntegration: (data: CreateIntegrationDTO) => Promise<Integration | null>;
  updateIntegration: (id: string, data: Partial<CreateIntegrationDTO>) => Promise<boolean>;
  toggleIntegration: (id: string) => Promise<boolean>;
  testIntegration: (id: string) => Promise<{ success: boolean; message: string } | null>;
  syncIntegration: (id: string) => Promise<{ recordsSynced: number } | null>;

  refresh: () => Promise<void>;
}

interface UseSettingsOptions {
  autoFetch?: boolean;
}

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const { autoFetch = true } = options;

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.getAllSettings();
      setSettings(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar configuración";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSettingsByCategory = useCallback(
    async <T extends keyof SystemSettings>(category: T): Promise<SystemSettings[T] | null> => {
      try {
        return await settingsService.getSettingsByCategory(category);
      } catch (err) {
        console.error("[useSettings] Error:", err);
        return null;
      }
    },
    []
  );

  const updateSettings = useCallback(
    async (data: UpdateSettingsDTO): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await settingsService.updateSettings(data);
        
        // Actualizar estado local
        if (settings) {
          setSettings({
            ...settings,
            [data.category]: {
              ...settings[data.category as keyof SystemSettings],
              ...data.settings,
            },
          });
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al guardar configuración";
        setError(message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings]
  );

  const resetSettings = useCallback(
    async (category: SettingCategory): Promise<boolean> => {
      setSaving(true);

      try {
        const defaults = await settingsService.resetSettings(category);
        
        if (settings) {
          setSettings({
            ...settings,
            [category]: defaults,
          });
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al restablecer configuración";
        setError(message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings]
  );

  const exportSettings = useCallback(async (): Promise<string | null> => {
    try {
      return await settingsService.exportSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al exportar configuración";
      setError(message);
      return null;
    }
  }, []);

  const importSettings = useCallback(async (json: string): Promise<boolean> => {
    setSaving(true);

    try {
      await settingsService.importSettings(json);
      await fetchSettings(); // Recargar configuración
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al importar configuración";
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchSettings]);

  // Roles
  const fetchRoles = useCallback(async () => {
    try {
      const result = await settingsService.getRoles();
      setRoles(result);
    } catch (err) {
      console.error("[useSettings] Error al cargar roles:", err);
    }
  }, []);

  const createRole = useCallback(
    async (data: CreateRoleDTO): Promise<Role | null> => {
      try {
        const role = await settingsService.createRole(data);
        setRoles(prev => [...prev, role]);
        return role;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear rol";
        setError(message);
        return null;
      }
    },
    []
  );

  const updateRole = useCallback(
    async (id: string, data: Partial<CreateRoleDTO>): Promise<boolean> => {
      try {
        const updated = await settingsService.updateRole(id, data);
        setRoles(prev => prev.map(r => (r.id === id ? updated : r)));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar rol";
        setError(message);
        return false;
      }
    },
    []
  );

  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    try {
      await settingsService.deleteRole(id);
      setRoles(prev => prev.filter(r => r.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar rol";
      setError(message);
      return false;
    }
  }, []);

  // Integraciones
  const fetchIntegrations = useCallback(async () => {
    try {
      const result = await settingsService.getIntegrations();
      setIntegrations(result);
    } catch (err) {
      console.error("[useSettings] Error al cargar integraciones:", err);
    }
  }, []);

  const createIntegration = useCallback(
    async (data: CreateIntegrationDTO): Promise<Integration | null> => {
      try {
        const integration = await settingsService.createIntegration(data);
        setIntegrations(prev => [...prev, integration]);
        return integration;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear integración";
        setError(message);
        return null;
      }
    },
    []
  );

  const updateIntegration = useCallback(
    async (id: string, data: Partial<CreateIntegrationDTO>): Promise<boolean> => {
      try {
        const updated = await settingsService.updateIntegration(id, data);
        setIntegrations(prev => prev.map(i => (i.id === id ? updated : i)));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar integración";
        setError(message);
        return false;
      }
    },
    []
  );

  const toggleIntegration = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await settingsService.toggleIntegration(id);
      setIntegrations(prev => prev.map(i => (i.id === id ? updated : i)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cambiar estado";
      setError(message);
      return false;
    }
  }, []);

  const testIntegration = useCallback(
    async (id: string): Promise<{ success: boolean; message: string } | null> => {
      try {
        return await settingsService.testIntegration(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al probar integración";
        setError(message);
        return null;
      }
    },
    []
  );

  const syncIntegration = useCallback(
    async (id: string): Promise<{ recordsSynced: number } | null> => {
      try {
        return await settingsService.syncIntegration(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al sincronizar";
        setError(message);
        return null;
      }
    },
    []
  );

  // Overview
  const fetchOverview = useCallback(async () => {
    try {
      const result = await settingsService.getSettingsOverview();
      setOverview(result);
    } catch (err) {
      console.error("[useSettings] Error al cargar resumen:", err);
    }
  }, []);

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchSettings(),
      fetchRoles(),
      fetchIntegrations(),
      fetchOverview(),
    ]);
  }, [fetchSettings, fetchRoles, fetchIntegrations, fetchOverview]);

  // Auto-fetch
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    settings,
    roles,
    integrations,
    overview,
    loading,
    saving,
    error,
    fetchSettings,
    getSettingsByCategory,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    fetchIntegrations,
    createIntegration,
    updateIntegration,
    toggleIntegration,
    testIntegration,
    syncIntegration,
    refresh,
  };
}


export function useSettingsCategory<T extends keyof SystemSettings>(category: T) {
  const [settings, setSettings] = useState<SystemSettings[T] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.getSettingsByCategory(category);
      setSettings(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar configuración";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  const save = useCallback(
    async (data: Partial<SystemSettings[T]>): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await settingsService.updateSettings({
          category: category as SettingCategory,
          settings: data as Record<string, unknown>,
        });
        setSettings(prev => (prev ? { ...prev, ...data } : null));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al guardar";
        setError(message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [category]
  );

  const reset = useCallback(async (): Promise<boolean> => {
    setSaving(true);

    try {
      const defaults = await settingsService.resetSettings(category as SettingCategory);
      setSettings(defaults as SystemSettings[T]);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al restablecer";
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [category]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { settings, loading, saving, error, save, reset, refresh: fetch };
}


export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await settingsService.getRoles();
      setRoles(result);
    } catch (err) {
      console.error("[useRoles] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const stats = useMemo(() => ({
    total: roles.length,
    active: roles.filter(r => r.isActive).length,
    system: roles.filter(r => r.isSystem).length,
    custom: roles.filter(r => !r.isSystem).length,
    totalUsers: roles.reduce((sum, r) => sum + r.userCount, 0),
  }), [roles]);

  return { roles, loading, stats, refresh: fetch };
}


export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [health, setHealth] = useState<IntegrationHealthStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [integrationsResult, healthResult] = await Promise.all([
        settingsService.getIntegrations(),
        settingsService.getIntegrationHealth(),
      ]);
      setIntegrations(integrationsResult);
      setHealth(healthResult);
    } catch (err) {
      console.error("[useIntegrations] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const stats = useMemo(() => ({
    total: integrations.length,
    active: integrations.filter(i => i.isActive && i.status === "active").length,
    inactive: integrations.filter(i => !i.isActive).length,
    withErrors: integrations.filter(i => i.status === "error").length,
    avgUptime: health.length > 0
      ? Math.round(health.reduce((sum, h) => sum + (h.uptime || 0), 0) / health.length)
      : 100,
  }), [integrations, health]);

  return { integrations, health, loading, stats, refresh: fetch };
}


export function useAuditLog(initialFilters: AuditLogFilters = {}) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters);

  const fetch = useCallback(
    async (newFilters?: AuditLogFilters, newPage?: number) => {
      setLoading(true);

      try {
        const appliedFilters = newFilters || filters;
        const appliedPage = newPage || page;

        const result = await settingsService.getAuditLog(appliedFilters, appliedPage, 50);
        setEntries(result.data);
        setTotal(result.total);

        if (newFilters) setFilters(newFilters);
        if (newPage) setPage(newPage);
      } catch (err) {
        console.error("[useAuditLog] Error:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters, page]
  );

  useEffect(() => {
    fetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportLog = useCallback(async (): Promise<string | null> => {
    try {
      return await settingsService.exportAuditLog(filters);
    } catch (err) {
      console.error("[useAuditLog] Error al exportar:", err);
      return null;
    }
  }, [filters]);

  const stats = useMemo(() => {
    const actions = new Map<string, number>();
    const resources = new Map<string, number>();

    for (const entry of entries) {
      actions.set(entry.action, (actions.get(entry.action) || 0) + 1);
      resources.set(entry.resource, (resources.get(entry.resource) || 0) + 1);
    }

    return {
      totalEntries: total,
      topActions: Array.from(actions.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topResources: Array.from(resources.entries())
        .map(([resource, count]) => ({ resource, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }, [entries, total]);

  return {
    entries,
    loading,
    total,
    page,
    filters,
    stats,
    fetch,
    setPage,
    setFilters,
    exportLog,
  };
}


export function useAppearance() {
  const { settings, loading, saving, error, save } = useSettingsCategory("appearance");

  const setTheme = useCallback(
    async (theme: "light" | "dark" | "system") => {
      return save({ theme });
    },
    [save]
  );

  const setPrimaryColor = useCallback(
    async (color: string) => {
      return save({ primaryColor: color });
    },
    [save]
  );

  const toggleCompactMode = useCallback(async () => {
    if (settings) {
      return save({ compactMode: !settings.compactMode });
    }
    return false;
  }, [settings, save]);

  return {
    appearance: settings,
    loading,
    saving,
    error,
    setTheme,
    setPrimaryColor,
    toggleCompactMode,
    save,
  };
}

export default useSettings;
