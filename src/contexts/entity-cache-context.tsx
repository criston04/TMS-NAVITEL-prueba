"use client";

/**
 * EntityCacheContext
 *
 * Caché en memoria de las entidades maestras (customers, drivers, vehicles,
 * operators, geofences) del backend. Se carga una sola vez al montar el
 * dashboard y permite a cualquier componente:
 *
 *  - Resolver un ID a su nombre legible sin hacer un fetch adicional
 *    (ej: `getCustomerName(order.customerId)` en vez de mostrar el UUID).
 *
 *  - Consumir los arreglos completos para poblar <Select> y otros pickers
 *    sin duplicar fetches (reemplaza useEffect + useState en cada form).
 *
 * Diseño:
 *  - Fetch paralelo con `Promise.allSettled`: si el backend tira 404/500 en
 *    una entidad (ej: operators por BUG #4), las demás siguen funcionando.
 *  - Maps internos para lookup O(1) por ID. Los arrays también están
 *    memoizados para evitar re-renders innecesarios en los consumidores.
 *  - Refresh granular: `refreshCustomers()` solo invalida customers, no toca
 *    las otras tablas. Útil tras crear/editar/eliminar una entidad.
 *  - Fallbacks de nombre:
 *      • id vacío → "Sin cliente" / "Sin conductor" / etc.
 *      • id no encontrado en cache → primeros 8 chars del UUID + "..."
 *        (indica al dev que el cache puede estar desactualizado).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  customersService,
  driversService,
  vehiclesService,
  operatorsService,
  geofencesService,
} from "@/services/master";
import type { Customer } from "@/types/models/customer";
import type { Driver } from "@/types/models/driver";
import type { Vehicle } from "@/types/models/vehicle";
import type { Operator } from "@/types/models/operator";
import type { Geofence } from "@/types/models/geofence";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface EntityCacheValue {
  /* Arreglos para dropdowns y listados */
  customers: Customer[];
  drivers: Driver[];
  vehicles: Vehicle[];
  operators: Operator[];
  geofences: Geofence[];

  /* Lookups O(1) con fallback legible */
  getCustomerName: (id?: string | null) => string;
  getCustomer: (id?: string | null) => Customer | undefined;
  getVehiclePlate: (id?: string | null) => string;
  getVehicle: (id?: string | null) => Vehicle | undefined;
  getDriverName: (id?: string | null) => string;
  getDriver: (id?: string | null) => Driver | undefined;
  getOperatorName: (id?: string | null) => string;
  getOperator: (id?: string | null) => Operator | undefined;
  getGeofenceName: (id?: string | null) => string;
  getGeofence: (id?: string | null) => Geofence | undefined;

  /* Estado */
  isLoading: boolean;
  errors: Record<EntityKey, string | null>;

  /* Acciones */
  refreshAll: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshDrivers: () => Promise<void>;
  refreshVehicles: () => Promise<void>;
  refreshOperators: () => Promise<void>;
  refreshGeofences: () => Promise<void>;
}

type EntityKey = "customers" | "drivers" | "vehicles" | "operators" | "geofences";

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/** Formatea un fallback cuando el id existe pero no está cacheado. */
function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function customerName(c: Customer): string {
  return c.tradeName || c.name || truncateId(c.id);
}

function driverName(d: Driver): string {
  const full = [d.firstName, d.lastName].filter(Boolean).join(" ").trim();
  return full || d.fullName || truncateId(d.id);
}

function operatorName(o: Operator): string {
  return o.tradeName || o.businessName || o.code || truncateId(o.id);
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ════════════════════════════════════════════════════════════════════════════

const EntityCacheContext = createContext<EntityCacheValue | undefined>(undefined);

export function EntityCacheProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<EntityKey, string | null>>({
    customers: null,
    drivers: null,
    vehicles: null,
    operators: null,
    geofences: null,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Fetchers granulares (se usan desde refreshX y desde el refreshAll inicial)
  // ──────────────────────────────────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    try {
      const resp = await customersService.getAll({ pageSize: 200 });
      setCustomers(resp.items ?? []);
      setErrors(e => ({ ...e, customers: null }));
    } catch (err) {
      console.warn("[EntityCache] Error cargando customers:", err);
      setErrors(e => ({ ...e, customers: err instanceof Error ? err.message : "Error" }));
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const resp = await driversService.getAll({ pageSize: 200 });
      setDrivers(resp.items ?? []);
      setErrors(e => ({ ...e, drivers: null }));
    } catch (err) {
      console.warn("[EntityCache] Error cargando drivers:", err);
      setErrors(e => ({ ...e, drivers: err instanceof Error ? err.message : "Error" }));
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const resp = await vehiclesService.getAll({ pageSize: 200 });
      setVehicles(resp.items ?? []);
      setErrors(e => ({ ...e, vehicles: null }));
    } catch (err) {
      console.warn("[EntityCache] Error cargando vehicles:", err);
      setErrors(e => ({ ...e, vehicles: err instanceof Error ? err.message : "Error" }));
    }
  }, []);

  const fetchOperators = useCallback(async () => {
    try {
      const list = await operatorsService.getAll();
      setOperators(Array.isArray(list) ? list : []);
      setErrors(e => ({ ...e, operators: null }));
    } catch (err) {
      console.warn("[EntityCache] Error cargando operators:", err);
      setErrors(e => ({ ...e, operators: err instanceof Error ? err.message : "Error" }));
    }
  }, []);

  const fetchGeofences = useCallback(async () => {
    try {
      const resp = await geofencesService.getAll({ pageSize: 200 });
      setGeofences(resp.items ?? []);
      setErrors(e => ({ ...e, geofences: null }));
    } catch (err) {
      console.warn("[EntityCache] Error cargando geofences:", err);
      setErrors(e => ({ ...e, geofences: err instanceof Error ? err.message : "Error" }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    // allSettled: si una falla, las demás siguen
    // 2026-05-02: Geofences NO se prefetchea para reducir presión sobre el
    // rate-limiter del backend. Solo se carga cuando entras al módulo de
    // geofences (que llama a refreshGeofences explícitamente).
    await Promise.allSettled([
      fetchCustomers(),
      fetchDrivers(),
      fetchVehicles(),
      fetchOperators(),
    ]);
    setIsLoading(false);
  }, [fetchCustomers, fetchDrivers, fetchVehicles, fetchOperators]);

  // Carga inicial al montar el dashboard
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ──────────────────────────────────────────────────────────────────────────
  // Maps memoizados para lookup O(1)
  // ──────────────────────────────────────────────────────────────────────────

  const customersById = useMemo(() => {
    const m = new Map<string, Customer>();
    customers.forEach(c => m.set(c.id, c));
    return m;
  }, [customers]);

  const driversById = useMemo(() => {
    const m = new Map<string, Driver>();
    drivers.forEach(d => m.set(d.id, d));
    return m;
  }, [drivers]);

  const vehiclesById = useMemo(() => {
    const m = new Map<string, Vehicle>();
    vehicles.forEach(v => m.set(v.id, v));
    return m;
  }, [vehicles]);

  const operatorsById = useMemo(() => {
    const m = new Map<string, Operator>();
    operators.forEach(o => m.set(o.id, o));
    return m;
  }, [operators]);

  const geofencesById = useMemo(() => {
    const m = new Map<string, Geofence>();
    geofences.forEach(g => m.set(g.id, g));
    return m;
  }, [geofences]);

  // ──────────────────────────────────────────────────────────────────────────
  // Lookups
  // ──────────────────────────────────────────────────────────────────────────

  const value = useMemo<EntityCacheValue>(() => ({
    customers,
    drivers,
    vehicles,
    operators,
    geofences,

    getCustomer: id => (id ? customersById.get(id) : undefined),
    getCustomerName: id => {
      if (!id) return "Sin cliente";
      const c = customersById.get(id);
      return c ? customerName(c) : truncateId(id);
    },

    getDriver: id => (id ? driversById.get(id) : undefined),
    getDriverName: id => {
      if (!id) return "Sin conductor";
      const d = driversById.get(id);
      return d ? driverName(d) : truncateId(id);
    },

    getVehicle: id => (id ? vehiclesById.get(id) : undefined),
    getVehiclePlate: id => {
      if (!id) return "Sin vehículo";
      const v = vehiclesById.get(id);
      return v ? v.plate || truncateId(v.id) : truncateId(id);
    },

    getOperator: id => (id ? operatorsById.get(id) : undefined),
    getOperatorName: id => {
      if (!id) return "Sin operador";
      const o = operatorsById.get(id);
      return o ? operatorName(o) : truncateId(id);
    },

    getGeofence: id => (id ? geofencesById.get(id) : undefined),
    getGeofenceName: id => {
      if (!id) return "Sin geocerca";
      const g = geofencesById.get(id);
      return g ? g.name || truncateId(g.id) : truncateId(id);
    },

    isLoading,
    errors,

    refreshAll,
    refreshCustomers: fetchCustomers,
    refreshDrivers: fetchDrivers,
    refreshVehicles: fetchVehicles,
    refreshOperators: fetchOperators,
    refreshGeofences: fetchGeofences,
  }), [
    customers, drivers, vehicles, operators, geofences,
    customersById, driversById, vehiclesById, operatorsById, geofencesById,
    isLoading, errors,
    refreshAll, fetchCustomers, fetchDrivers, fetchVehicles, fetchOperators, fetchGeofences,
  ]);

  return (
    <EntityCacheContext.Provider value={value}>
      {children}
    </EntityCacheContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK PÚBLICO
// ════════════════════════════════════════════════════════════════════════════

export function useEntityCache(): EntityCacheValue {
  const ctx = useContext(EntityCacheContext);
  if (!ctx) {
    throw new Error(
      "useEntityCache debe usarse dentro de <EntityCacheProvider>. " +
      "Asegúrate de que el componente está dentro del layout de dashboard."
    );
  }
  return ctx;
}
