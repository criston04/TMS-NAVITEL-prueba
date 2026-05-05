'use client';

/**
 * useRoutePlannerFleet
 *
 * Carga vehículos y conductores del backend real y los mapea al shape que
 * usa el Route Planner (RoutePlannerVehicle / RoutePlannerDriver).
 *
 * Esto reemplaza los antiguos `mockVehicles` / `mockDrivers` de
 * `@/lib/mock-data/route-planner` que poblaban el selector con datos ficticios.
 */

import { useEffect, useState, useCallback } from 'react';
import { vehiclesService, driversService } from '@/services/master';
import type { Vehicle as CanonicalVehicle } from '@/types/models/vehicle';
import type { Driver as CanonicalDriver } from '@/types/models/driver';
import type {
  RoutePlannerVehicle,
  RoutePlannerDriver,
} from '@/types/route-planner';

/**
 * Mapea Vehicle canónico del backend → RoutePlannerVehicle.
 * Campos no disponibles en backend caen a defaults razonables.
 */
function mapCanonicalVehicleToPlanner(v: CanonicalVehicle): RoutePlannerVehicle {
  const opStatus = v.operationalStatus;
  let plannerStatus: RoutePlannerVehicle['status'] = 'available';
  if (opStatus === 'on-route') plannerStatus = 'in_route';
  else if (opStatus === 'maintenance' || opStatus === 'repair') plannerStatus = 'maintenance';
  else if (opStatus === 'available') plannerStatus = 'available';
  else plannerStatus = 'unavailable';

  // Backend FuelType canónico: 'diesel' | 'gasoline' | 'gas_glp' | 'gas_gnv' | 'electric' | 'hybrid'
  // RoutePlanner FuelType: 'diesel' | 'gasoline' | 'electric' | 'hybrid'
  // Los GLP/GNV caen a 'diesel' para el planner hasta que el tipo del planner se actualice.
  const fuelType = v.specs?.fuelType;
  const plannerFuel: RoutePlannerVehicle['fuelType'] =
    fuelType === 'gasoline' ? 'gasoline'
    : fuelType === 'electric' ? 'electric'
    : fuelType === 'hybrid' ? 'hybrid'
    : 'diesel';

  return {
    id: v.id,
    plate: v.plate,
    operationalStatus: v.operationalStatus,
    brand: v.specs?.brand ?? '',
    model: v.specs?.model ?? '',
    year: v.specs?.year ?? new Date().getFullYear(),
    capacity: {
      weight: v.capacity?.maxPayload ?? 0,
      volume: 0, // backend no expone volumen — default
    },
    fuelType: plannerFuel,
    fuelConsumption: 0, // backend no expone consumo — default
    status: plannerStatus,
    features: [],
  };
}

/**
 * Mapea Driver canónico del backend → RoutePlannerDriver.
 */
function mapCanonicalDriverToPlanner(d: CanonicalDriver): RoutePlannerDriver {
  let plannerStatus: RoutePlannerDriver['status'] = 'available';
  if (d.availability === 'on-route') plannerStatus = 'on_route';
  else if (d.availability === 'available') plannerStatus = 'available';
  else plannerStatus = 'off_duty';

  return {
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone,
    email: d.email,
    licenseNumber: d.license?.number ?? d.licenseNumber ?? '',
    licenseExpiry: d.license?.expiryDate ?? d.licenseExpiry ?? '',
    status: plannerStatus,
    rating: 0,
    experience: 0,
    specializations: [],
  };
}

interface UseRoutePlannerFleetResult {
  vehicles: RoutePlannerVehicle[];
  drivers: RoutePlannerDriver[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRoutePlannerFleet(): UseRoutePlannerFleetResult {
  const [vehicles, setVehicles] = useState<RoutePlannerVehicle[]>([]);
  const [drivers, setDrivers] = useState<RoutePlannerDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehResp, drvResp] = await Promise.all([
        vehiclesService.getAll({ pageSize: 200 }),
        driversService.getAll({ pageSize: 200 }),
      ]);
      setVehicles((vehResp.items ?? []).map(mapCanonicalVehicleToPlanner));
      setDrivers((drvResp.items ?? []).map(mapCanonicalDriverToPlanner));
    } catch (err) {
      console.warn('[useRoutePlannerFleet] Error cargando flota:', err);
      setError(err instanceof Error ? err.message : 'Error cargando flota');
      setVehicles([]);
      setDrivers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { vehicles, drivers, isLoading, error, refresh: load };
}
