/**
 * Cache persistente de detalles de conductor.
 *
 * Razón (2026-05-16):
 *   El backend GET /master/drivers/:id (cuando funciona) y GET /master/drivers
 *   (listado) NO devuelven los sub-objetos `license` ni `emergencyContact`,
 *   aunque sí los persisten en BD cuando se mandan en POST/PUT.
 *
 *   Como workaround mientras el backend completa el GET, cacheamos los
 *   datos completos del driver localmente tras un create/update exitoso.
 *   Al abrir el form de edición, mergeamos lo del backend con el caché
 *   para mostrar los datos completos.
 *
 *   Cuando el backend devuelva los sub-objetos correctamente, este caché
 *   simplemente queda en desuso (la merge prioriza backend si trae data).
 *
 * Almacenamiento: localStorage con prefijo `tms-driver-cache-{driverId}`.
 *   - Sobrevive F5, cierre de pestaña, cierre de navegador y reinicio de PC.
 *   - Se limpia automáticamente al cerrar sesión (auth-storage.ts barre
 *     todas las claves con prefijo `tms-` en clearAuthSession).
 *   - TTL de 30 días: entradas más viejas se descartan al leerlas
 *     (autopruning silencioso).
 */

import type { Driver, DriverLicense, EmergencyContact } from "@/types/models/driver";

const PREFIX = "tms-driver-cache-";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

interface CachedDriverDetails {
  license?: DriverLicense;
  emergencyContact?: EmergencyContact;
  address?: string;
  district?: string;
  province?: string;
  department?: string;
  bloodType?: string;
  hireDate?: string;
  notes?: string;
  alternativePhone?: string;
  photoUrl?: string;
  signatureUrl?: string;
  cachedAt: string;
  /** Timestamp UTC en ms cuando expira y debe descartarse */
  expiresAt: number;
}

const hasWindow = (): boolean => typeof globalThis.window !== "undefined";

/**
 * Guarda los datos completos del driver en cache local.
 * Llamar después de un create/update exitoso.
 */
export function saveDriverCache(driverId: string, driver: Partial<Driver>): void {
  if (!hasWindow() || !driverId) return;
  try {
    const now = Date.now();
    const data: CachedDriverDetails = {
      license: driver.license,
      emergencyContact: driver.emergencyContact,
      address: driver.address,
      district: driver.district,
      province: driver.province,
      department: driver.department,
      bloodType: driver.bloodType,
      hireDate: driver.hireDate,
      notes: driver.notes,
      alternativePhone: driver.alternativePhone,
      photoUrl: driver.photoUrl,
      signatureUrl: driver.signatureUrl,
      cachedAt: new Date(now).toISOString(),
      expiresAt: now + TTL_MS,
    };
    localStorage.setItem(`${PREFIX}${driverId}`, JSON.stringify(data));
  } catch {
    // localStorage lleno o no disponible — ignorar silenciosamente
  }
}

/**
 * Carga los datos cacheados de un driver (o null si no hay / expirado).
 * Si la entrada está expirada, la elimina y retorna null (autopruning).
 */
export function loadDriverCache(driverId: string): CachedDriverDetails | null {
  if (!hasWindow() || !driverId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${driverId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedDriverDetails;

    // Auto-pruning: si expiró, eliminar y devolver null
    if (typeof data.expiresAt === "number" && Date.now() > data.expiresAt) {
      localStorage.removeItem(`${PREFIX}${driverId}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Mergea los datos del backend con el cache local.
 * Prioriza datos del backend si están presentes y no están vacíos;
 * solo usa el cache para llenar campos que vienen vacíos del backend.
 */
export function mergeDriverWithCache(backendDriver: Driver): Driver {
  const cache = loadDriverCache(backendDriver.id);
  if (!cache) return backendDriver;

  // Determinar si el license del backend está vacío (sin number = no se guardó)
  const backendLicenseEmpty =
    !backendDriver.license || !backendDriver.license.number;
  const backendContactEmpty =
    !backendDriver.emergencyContact || !backendDriver.emergencyContact.name;

  return {
    ...backendDriver,
    license:
      backendLicenseEmpty && cache.license ? cache.license : backendDriver.license,
    emergencyContact:
      backendContactEmpty && cache.emergencyContact
        ? cache.emergencyContact
        : backendDriver.emergencyContact,
    address: backendDriver.address || cache.address || "",
    district: backendDriver.district || cache.district,
    province: backendDriver.province || cache.province,
    department: backendDriver.department || cache.department,
    bloodType: backendDriver.bloodType || (cache.bloodType as Driver["bloodType"]),
    hireDate: backendDriver.hireDate || cache.hireDate || "",
    notes: backendDriver.notes || cache.notes,
    alternativePhone: backendDriver.alternativePhone || cache.alternativePhone,
    photoUrl: backendDriver.photoUrl || cache.photoUrl,
    signatureUrl: backendDriver.signatureUrl || cache.signatureUrl,
  };
}

/**
 * Limpia el cache de un driver específico (opcional, ej. al eliminar).
 */
export function clearDriverCache(driverId: string): void {
  if (!hasWindow() || !driverId) return;
  try {
    localStorage.removeItem(`${PREFIX}${driverId}`);
  } catch {
    // ignore
  }
}

/**
 * Limpia TODAS las entradas de cache de driver expiradas (autopruning manual).
 * Útil llamar esto al cargar la página de drivers para mantener limpio
 * el localStorage. No es estrictamente necesario porque `loadDriverCache`
 * ya hace autopruning por entrada, pero esto barre las que nunca se leen.
 */
export function pruneExpiredDriverCaches(): void {
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
        const data = JSON.parse(raw) as CachedDriverDetails;
        if (typeof data.expiresAt === "number" && now > data.expiresAt) {
          toRemove.push(key);
        }
      } catch {
        // Entry corrupta — la marcamos para borrar
        toRemove.push(key);
      }
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
