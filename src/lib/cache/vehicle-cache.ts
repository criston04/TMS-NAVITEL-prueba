/**
 * Cache persistente de detalles de vehículo.
 *
 * Razón (2026-05-16):
 *   Según `vehicle.transformer.ts` (línea 16-18), el backend IGNORA
 *   silenciosamente los siguientes campos en POST:
 *     - specs (engineNumber, axles, wheels, fuelTankCapacity, transmission)
 *     - capacity (maxWeight, maxVolume, pallets, gross/tare)
 *     - registration (cardNumber, issueDate, expiryDate, soat)
 *     - insurancePolicies[]
 *     - inspectionHistory[]
 *     - documents[]
 *
 *   Estos campos están en el form (el usuario los llena) pero el backend
 *   no los persiste. Resultado: al editar, el form aparece vacío en esos
 *   campos aunque el usuario los haya llenado antes.
 *
 *   Workaround: cachear estos sub-objetos localmente tras un create/update
 *   exitoso. Al abrir el form de edición, mergear lo del backend con el cache.
 *
 *   Cuando el backend persista estos campos, este cache simplemente queda
 *   en desuso (la merge prioriza backend si trae data no-vacía).
 *
 * Almacenamiento: localStorage con prefijo `tms-vehicle-cache-{vehicleId}`.
 *   - Sobrevive cierre de pestaña, navegador y reinicio de PC.
 *   - Se limpia automáticamente al cerrar sesión (auth-storage barre `tms-*`).
 *   - TTL de 30 días con autopruning.
 */

import type {
  Vehicle,
  VehicleSpecs,
  VehicleCapacity,
  VehicleRegistration,
  InsurancePolicy,
  TechnicalInspection,
} from "@/types/models/vehicle";
import type { RequiredDocument } from "@/types/common";

const PREFIX = "tms-vehicle-cache-";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

interface CachedVehicleDetails {
  specs?: VehicleSpecs;
  capacity?: VehicleCapacity;
  registration?: VehicleRegistration;
  insurancePolicies?: InsurancePolicy[];
  inspectionHistory?: TechnicalInspection[];
  documents?: RequiredDocument[];
  notes?: string;
  cachedAt: string;
  expiresAt: number;
}

const hasWindow = (): boolean => typeof globalThis.window !== "undefined";

export function saveVehicleCache(vehicleId: string, vehicle: Partial<Vehicle>): void {
  if (!hasWindow() || !vehicleId) return;
  try {
    const now = Date.now();
    const data: CachedVehicleDetails = {
      specs: vehicle.specs,
      capacity: vehicle.capacity,
      registration: vehicle.registration,
      insurancePolicies: vehicle.insurancePolicies,
      inspectionHistory: vehicle.inspectionHistory,
      documents: vehicle.documents,
      notes: vehicle.notes,
      cachedAt: new Date(now).toISOString(),
      expiresAt: now + TTL_MS,
    };
    localStorage.setItem(`${PREFIX}${vehicleId}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadVehicleCache(vehicleId: string): CachedVehicleDetails | null {
  if (!hasWindow() || !vehicleId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${vehicleId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedVehicleDetails;
    if (typeof data.expiresAt === "number" && Date.now() > data.expiresAt) {
      localStorage.removeItem(`${PREFIX}${vehicleId}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Mergea los datos del backend con el cache local.
 * El cache solo rellena lo que el backend NO trae con datos significativos.
 */
export function mergeVehicleWithCache(backendVehicle: Vehicle): Vehicle {
  const cache = loadVehicleCache(backendVehicle.id);
  if (!cache) return backendVehicle;

  // Detectar si specs vino vacío del backend (axles=0, transmission="manual"
  // por default → indica que backend no lo persiste).
  const specsEmpty =
    !backendVehicle.specs ||
    (backendVehicle.specs.axles === 0 &&
      backendVehicle.specs.wheels === 0 &&
      !backendVehicle.specs.engineNumber);

  const capacityEmpty =
    !backendVehicle.capacity ||
    (!backendVehicle.capacity.maxPayload && !backendVehicle.capacity.maxVolume);

  const insuranceEmpty =
    !Array.isArray(backendVehicle.insurancePolicies) ||
    backendVehicle.insurancePolicies.length === 0;
  const inspectionEmpty =
    !Array.isArray(backendVehicle.inspectionHistory) ||
    backendVehicle.inspectionHistory.length === 0;
  const documentsEmpty =
    !Array.isArray(backendVehicle.documents) || backendVehicle.documents.length === 0;

  return {
    ...backendVehicle,
    specs: specsEmpty && cache.specs ? cache.specs : backendVehicle.specs,
    capacity: capacityEmpty && cache.capacity ? cache.capacity : backendVehicle.capacity,
    registration: cache.registration ?? backendVehicle.registration,
    insurancePolicies:
      insuranceEmpty && cache.insurancePolicies
        ? cache.insurancePolicies
        : backendVehicle.insurancePolicies,
    inspectionHistory:
      inspectionEmpty && cache.inspectionHistory
        ? cache.inspectionHistory
        : backendVehicle.inspectionHistory,
    documents:
      documentsEmpty && cache.documents ? cache.documents : backendVehicle.documents,
    notes: backendVehicle.notes || cache.notes || undefined,
  };
}

export function clearVehicleCache(vehicleId: string): void {
  if (!hasWindow() || !vehicleId) return;
  try {
    localStorage.removeItem(`${PREFIX}${vehicleId}`);
  } catch {
    // ignore
  }
}

export function pruneExpiredVehicleCaches(): void {
  if (!hasWindow()) return;
  try {
    const now = Date.now();
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw) as CachedVehicleDetails;
        if (typeof data.expiresAt === "number" && now > data.expiresAt) {
          toRemove.push(key);
        }
      } catch {
        toRemove.push(key);
      }
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
