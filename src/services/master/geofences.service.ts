import { BulkService } from "@/services/base.service";
import { apiClient, rootUrl } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api.config";
import type { CreateDTO, UpdateDTO, PaginatedResponse, SearchParams } from "@/types/common";
import {
  Geofence,
  GeofenceGeometry,
  GeofenceCategory,
  GeofenceAlerts,
  GeofenceStats,
  PolygonGeometry,
  CircleGeometry,
  GeoCoordinate
} from "@/types/models/geofence";

/**
 * Opciones de exportación KML
 */
interface KMLExportOptions {
  geofenceIds?: string[];
  includeStyles?: boolean;
  includeFolders?: boolean;
}

/**
 * Resultado de importación KML
 */
interface KMLImportResult {
  imported: Geofence[];
  errors: Array<{
    name: string;
    reason: string;
  }>;
}

/**
 * Filtros específicos de geocercas
 */
export interface GeofenceFilters {
  category?: GeofenceCategory;
  type?: "polygon" | "circle" | "corridor";
  tags?: string[];
  customerId?: string;
  hasAlerts?: boolean;
}

/**
 * Servicio de Geocercas
 * Extiende BulkService para soporte de importación/exportación
 */
/**
 * Parsea un campo del backend que puede venir como JSON string o null/undefined.
 */
function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value as T) ?? fallback;
}

/**
 * Convierte boolean 0/1 del backend a boolean JS.
 */
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
}

/**
 * Mapea el shape real del backend al tipo Geofence del frontend.
 *
 * Backend shape observado (2026-04-21, confirmado con response real):
 *   geofenceid, tenantid, status (0|1), gname, gshortname, gaddress,
 *   glat, glng, alt, type ("CIRCLE"|"POLYGON"), gpoints (JSON string),
 *   grad, date_created, date_modified, ggroup, category, color, customer_id,
 *   tags (JSON string), alert_on_entry/exit/dwell (0|1), dwell_time_minutes,
 *   notify_emails, deleted_at
 */
function mapBackendGeofence(b: Record<string, unknown>): Geofence {
  const id = String(b.geofenceid ?? b.id ?? "");
  const name = String(b.gname ?? b.name ?? "Sin nombre");
  const backendType = String(b.type ?? "POLYGON").toUpperCase();
  const createdAt = String(b.date_created ?? b.createdAt ?? new Date().toISOString());
  const updatedAt = String(b.date_modified ?? b.updatedAt ?? createdAt);

  // Reconstruir geometry desde campos planos del backend
  let geometry: Geofence["geometry"];
  if (backendType === "CIRCLE") {
    geometry = {
      type: "circle",
      center: {
        lat: typeof b.glat === "number" ? b.glat : 0,
        lng: typeof b.glng === "number" ? b.glng : 0,
      },
      radius: typeof b.grad === "number" ? b.grad : 0,
    };
  } else if (backendType === "POLYGON") {
    const points = parseJsonField<Array<{ lat: number; lng: number }>>(b.gpoints, []);
    geometry = {
      type: "polygon",
      coordinates: points,
    };
  } else {
    geometry = { type: "polygon", coordinates: [] };
  }

  // 2026-05-03 (issue CRITICAL): el backend devuelve tags como JSON string
  // de array de **strings** (e.g., '["lima","warehouse"]'), pero el tipo
  // `Geofence.tags` es `GeofenceTag[]` (objetos `{id, name, color}`). La UI
  // hace `tags.map(t => t.name)` y crashea si llegan strings.
  // Solución: normalizar strings a objetos `{id: name, name, color: default}`.
  // Si llega ya un array de objetos (formato futuro del backend), pasa directo.
  const rawTags = parseJsonField<unknown[]>(b.tags, []);
  const tags: Geofence["tags"] = (rawTags as unknown[]).map((t) => {
    if (typeof t === "string") {
      return { id: t, name: t, color: "#3b82f6" };
    }
    if (t && typeof t === "object") {
      const obj = t as { id?: string; name?: string; color?: string };
      return {
        id: obj.id ?? obj.name ?? "",
        name: obj.name ?? obj.id ?? "",
        color: obj.color ?? "#3b82f6",
      };
    }
    return { id: "", name: String(t), color: "#3b82f6" };
  });

  // status: 1 = active, 0 = inactive (soft-deleted lleva deleted_at)
  const statusNum = typeof b.status === "number" ? b.status : 1;
  const status: Geofence["status"] = b.deleted_at
    ? "inactive"
    : statusNum === 1
    ? "active"
    : "inactive";

  // Normalizar category: el backend puede devolver valores no listados en
  // GeofenceCategory (ej. "delivery_zone" en vez de "delivery"). Si llega uno
  // desconocido, lo mapeamos a "other" para evitar que el icono quede undefined.
  const VALID_CATEGORIES: GeofenceCategory[] = [
    "warehouse", "customer", "plant", "port",
    "checkpoint", "restricted", "delivery", "other",
  ];
  const ALIASES: Record<string, GeofenceCategory> = {
    delivery_zone: "delivery",
    pickup_zone: "warehouse",
    restricted_area: "restricted",
    custom: "other",
  };
  const rawCategory = typeof b.category === "string" ? b.category : "";
  const normalizedCategory: GeofenceCategory =
    VALID_CATEGORIES.includes(rawCategory as GeofenceCategory)
      ? (rawCategory as GeofenceCategory)
      : (ALIASES[rawCategory] ?? "other");

  return {
    id,
    code: String(b.gshortname ?? b.code ?? id),
    name,
    description: typeof b.description === "string" ? b.description : "",
    type: geometry.type,
    category: normalizedCategory,
    geometry,
    tags,
    alerts: {
      onEntry: toBool(b.alert_on_entry),
      onExit: toBool(b.alert_on_exit),
      onDwell: toBool(b.alert_on_dwell),
      dwellTimeMinutes: typeof b.dwell_time_minutes === "number" ? b.dwell_time_minutes : undefined,
      notifyEmails: parseJsonField<string[] | undefined>(b.notify_emails, undefined),
    },
    status,
    color: typeof b.color === "string" ? b.color : "#3b82f6",
    opacity: typeof b.opacity === "number" ? b.opacity : 0.2,
    address: typeof b.gaddress === "string" ? b.gaddress : undefined,
    customerId: typeof b.customer_id === "string" ? b.customer_id : undefined,
    notes: typeof b.notes === "string" ? b.notes : undefined,
    createdAt,
    updatedAt,
  };
}

/**
 * Mapea el tipo Geofence del frontend al shape que espera el backend para
 * POST / PUT. Invierte mapBackendGeofence: convierte camelCase a snake_case,
 * type a UPPERCASE, booleans a 0/1, arrays a JSON strings.
 */
/**
 * Mapper Geofence (frontend) → body backend v3 Rev3.
 *
 * Shape estándar plano del backend nuevo (recomendado):
 *   {
 *     code, name, shortName, description, address,
 *     type: "circle"|"polygon", lat, lng, radius, gpoints,
 *     category, color, opacity, alt, group,
 *     alerts: { onEntry, onExit, onDwell, dwellTimeMinutes, notifyEmails },
 *     tags, status
 *   }
 *
 * El backend ahora también acepta `alert_on_*` planos como alternativa, pero
 * priorizamos `alerts{}` anidado (más legible).
 *
 * Notas importantes:
 *  - NO enviar `customer_id`: el backend lo resuelve server-side desde el JWT.
 *  - `status` acepta `"active"|"inactive"` o `1|0`.
 *  - `code` es el identificador para upsert (si existe → UPDATE, si no → INSERT).
 *  - El POST acepta tanto un objeto único como un array.
 */
function mapGeofenceToBackend(g: Partial<Geofence>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  // ── Identificación y metadata ───────────────────────────────────────
  if (g.code !== undefined) payload.code = g.code;
  if (g.name !== undefined) payload.name = g.name;
  if (g.code !== undefined) payload.shortName = g.code; // alias para etiqueta
  if (g.description !== undefined) payload.description = g.description;
  if (g.address !== undefined) payload.address = g.address;
  if (g.category !== undefined) payload.category = g.category;
  if (g.color !== undefined) payload.color = g.color;
  if (g.opacity !== undefined) payload.opacity = g.opacity;
  payload.alt = 0; // altitud por defecto, no tracked en frontend

  // ── Geometría ───────────────────────────────────────────────────────
  // Backend exige `type` en UPPERCASE: "CIRCLE" o "POLYGON". Si se envía
  // "circle"/"polygon" o "circular" responde 400 con "Type must be CIRCLE or POLYGON".
  // (Verificado por sniff 2026-04-29 contra producción).
  if (g.geometry) {
    if (g.geometry.type === "circle") {
      payload.type = "CIRCLE";
      payload.lat = g.geometry.center.lat;
      payload.lng = g.geometry.center.lng;
      payload.radius = g.geometry.radius;
      payload.gpoints = null;
    } else if (g.geometry.type === "polygon") {
      payload.type = "POLYGON";
      // Centroide aproximado (promedio de los puntos)
      const points = g.geometry.coordinates ?? [];
      if (points.length > 0) {
        const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
        const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
        payload.lat = avgLat;
        payload.lng = avgLng;
      }
      payload.gpoints = points; // array de {lat, lng}, >= 3 puntos
      payload.radius = null;
    }
  }

  // ── Alertas: shape v3 Rev3 con alerts{} anidado ─────────────────────
  if (g.alerts) {
    payload.alerts = {
      onEntry: !!g.alerts.onEntry,
      onExit: !!g.alerts.onExit,
      onDwell: !!g.alerts.onDwell,
      dwellTimeMinutes: g.alerts.dwellTimeMinutes ?? null,
      notifyEmails: g.alerts.notifyEmails ?? [],
    };
  }

  // ── Tags ────────────────────────────────────────────────────────────
  if (g.tags !== undefined) {
    // El backend acepta array de strings. Si vienen objetos {id, name, color},
    // mapeamos a sus nombres (string libre). Si vienen strings, pasan tal cual.
    const tagArray = Array.isArray(g.tags)
      ? g.tags.map((t) => (typeof t === "string" ? t : (t as { name?: string }).name ?? ""))
      : [];
    payload.tags = tagArray.filter((t) => t && t.length > 0);
  }

  // ── Estado: backend acepta "active"|"inactive" o 1|0 ────────────────
  // Mandamos string (más legible) que es lo que recomienda la doc nueva.
  if (g.status !== undefined) {
    payload.status = g.status === "active" ? "active" : "inactive";
  }

  // ── customer_id ──
  // CAMBIO 2026-05-02: el backend en realidad SÍ exige customer_id (antes
  // creíamos que lo resolvía del JWT). Si el form trae uno explícito lo
  // enviamos. Si no, el service lo agregará usando el tenantId del usuario.
  if (g.customerId) {
    payload.customer_id = g.customerId;
  }

  return payload;
}

/**
 * Lee el tenantId del usuario actualmente logueado desde localStorage.
 * Devuelve null si no hay sesión activa o el usuario no tiene tenantId.
 */
function getCurrentTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("tms_user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return typeof parsed?.tenantId === "string" ? parsed.tenantId : null;
  } catch {
    return null;
  }
}

class GeofencesService extends BulkService<Geofence> {
  /**
   * Path activo del backend para geofences. Se descubre dinámicamente en el
   * primer call probando los candidatos. Una vez descubierto se cachea aquí.
   */
  private resolvedPath: string | null = null;

  constructor() {
    // CORREGIDO 2026-05-02 según Excel oficial del backend:
    //   Geofences vive en el ROOT del host, SIN prefix /api/v1.
    //   URL canónica: https://api-service.gruponavitel.com/geofences
    //
    //   Usamos rootUrl() para construir la URL absoluta sin /api/v1.
    super(rootUrl("/geofences"), []);
  }

  /** Path efectivo a usar — el resuelto dinámicamente o el del constructor */
  private get activePath(): string {
    return this.resolvedPath ?? this.endpoint;
  }

  /**
   * Helper: prueba la operación HTTP en los paths candidatos. Si el path
   * canónico (root sin /api/v1) responde, lo usa. Si no, fallback a otros.
   */
  private async tryEndpoints<T>(operation: (basePath: string) => Promise<T>): Promise<T> {
    // 2026-05-02: Reordenado. Probar /api/v1/geofences PRIMERO porque el
    // backend devolvió 404 en el root (canónico Excel). Si /api/v1/geofences
    // tampoco existe, probar /master/geofences como último recurso.
    const candidates = this.resolvedPath
      ? [this.resolvedPath]
      : [
          "/geofences",                           // /api/v1/geofences (Rev3 markdown) ← primero
          "/master/geofences",                    // legacy /api/v1/master/geofences
          this.endpoint,                          // root sin /api/v1 (Excel, parece roto)
        ];

    let lastError: unknown = null;
    for (const path of candidates) {
      try {
        const result = await operation(path);
        if (this.resolvedPath !== path) {
          console.info(`[GeofencesService] Path resuelto: ${path}`);
          this.resolvedPath = path;
        }
        return result;
      } catch (err) {
        const status = (err as { status?: number })?.status;
        // 404 o 429: ambos significan "este path no es el correcto". Probar el
        // siguiente candidato. (429 lo tratamos como "no existe" porque algunos
        // backends devuelven 429 en endpoints inexistentes en vez de 404.)
        if (status === 404 || status === 429) {
          console.warn(`[GeofencesService] ${status} en ${path}, probando siguiente...`);
          lastError = err;
          continue;
        }
        // Otro error (400, 422, 500, etc.): el path es correcto pero hay un
        // problema distinto. Cacheamos y re-lanzamos para no perder ese path.
        this.resolvedPath = path;
        throw err;
      }
    }
    throw lastError ?? new Error("Ningún endpoint candidato funcionó para geofences");
  }

  /**
   * Listado con paginacion.
   * Backend responde con envelope canonico { items, meta: {total, page, pageSize, totalPages} }.
   * Override solo para aplicar mapper a cada item (field names distintos).
   */
  async getAll(params?: SearchParams): Promise<PaginatedResponse<Geofence>> {
    const queryParams = params ? {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
    } : undefined;

    const response = await this.tryEndpoints((path) =>
      apiClient.get<Record<string, unknown>>(path, { params: queryParams })
    );

    // Backend responde { items, meta } o { data, meta } — aceptamos ambos
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
    const items = rawList.map(mapBackendGeofence);

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const page = meta.page ?? params?.page ?? 1;
    const pageSize = meta.pageSize ?? params?.pageSize ?? items.length;
    const totalItems = meta.total ?? meta.totalItems ?? items.length;
    const totalPages = meta.totalPages ?? 1;

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Obtener por ID.
   * Override para aplicar mapper (backend tiene shape distinto).
   */
  async getById(id: string): Promise<Geofence> {
    const raw = await this.tryEndpoints((path) =>
      apiClient.get<Record<string, unknown>>(`${path}/${id}`)
    );
    return mapBackendGeofence(raw);
  }

  /**
   * Crea una nueva geocerca.
   *
   * NOTA: Segun el Excel del backend, POST /geofences NO esta listado explicitamente
   * pero asumimos que existe para consistencia con el CRUD. Si backend responde 404,
   * lanzamos error claro.
   */
  async create(data: CreateDTO<Geofence>): Promise<Geofence> {
    // Convertimos el DTO al shape que espera el backend (snake_case, type
    // UPPERCASE, booleans como 0/1).
    const payload = mapGeofenceToBackend(data as Partial<Geofence>);

    // Inyectar customer_id desde el tenant del usuario logueado si el form no
    // mandó uno explícito. El backend lo exige obligatorio en POST.
    if (!payload.customer_id) {
      const tenantId = getCurrentTenantId();
      if (tenantId) {
        payload.customer_id = tenantId;
        console.info(`[GeofencesService.create] Inyectando customer_id=${tenantId} (del tenantId del JWT)`);
      } else {
        console.warn(`[GeofencesService.create] No hay tenantId en localStorage. El backend probablemente rechazará el POST.`);
      }
    }

    // El helper tryEndpoints prueba /master/geofences, /geofences y el root
    // hasta encontrar el que el backend acepta. Cachea el path resuelto.
    const raw = await this.tryEndpoints<unknown>((path) =>
      apiClient.post<unknown>(path, payload)
    );

    // El backend responde con un shape distinto al del GET (array, field names
    // legacy como "Geofenceid" / "geofencename", campos incompletos). Extraemos
    // el id y re-consultamos GET /:id para obtener el registro completo.
    const rawObj = Array.isArray(raw) ? raw[0] : raw;
    const obj = (rawObj ?? {}) as Record<string, unknown>;
    const createdId = String(obj.Geofenceid ?? obj.geofenceid ?? obj.id ?? "");

    // Warning: si backend reporta error de sync con proveedor GPS, el record
    // existe localmente pero no se sincronizo. Logueamos para diagnostico.
    if (obj.gpsSyncError) {
      console.warn(`[GeofencesService] Geocerca creada pero no sincronizada con GPS:`, obj.gpsSyncError);
    }

    if (createdId) {
      // Re-fetch del registro completo para tener gpoints, gname, category, etc.
      try {
        return await this.getById(createdId);
      } catch (err) {
        console.warn("[GeofencesService] No se pudo re-fetch del create, usando data local:", err);
      }
    }

    // Fallback: usar los datos que enviamos (payload) + lo poco que trajo el POST.
    // Esto evita que la UI muestre "Sin nombre" cuando el backend no devuelve el gname.
    return {
      ...mapBackendGeofence(obj),
      id: createdId,
      name: data.name ?? "",
      code: data.code ?? createdId,
      type: data.type ?? "polygon",
      category: data.category ?? "other",
      geometry: data.geometry ?? { type: "polygon", coordinates: [] },
      color: data.color ?? "#3b82f6",
      opacity: data.opacity ?? 0.2,
      tags: data.tags ?? [],
      alerts: data.alerts ?? { onEntry: false, onExit: false, onDwell: false },
      status: data.status ?? "active",
      description: data.description ?? "",
      address: data.address,
      customerId: data.customerId,
    };
  }

  /**
   * Actualiza una geocerca.
   * Override para convertir el partial al shape del backend.
   */
  async update(id: string, data: UpdateDTO<Geofence>): Promise<Geofence> {
    if (!id || id.length === 0) {
      throw new Error("No se puede actualizar: la geocerca no tiene id. Posible error del backend en el create.");
    }
    const payload = mapGeofenceToBackend(data as Partial<Geofence>);
    // Inyectar customer_id si el form no lo trae (mismo criterio que create)
    if (!payload.customer_id) {
      const tenantId = getCurrentTenantId();
      if (tenantId) payload.customer_id = tenantId;
    }
    await this.tryEndpoints<unknown>((path) =>
      apiClient.put<unknown>(`${path}/${id}`, payload)
    );
    // El backend puede devolver shape minimal en PUT (mismo issue que POST).
    // Siempre re-fetch para tener la data completa y consistente.
    return this.getById(id);
  }

  /**
   * Elimina una geocerca (soft-delete en backend).
   * Override con guarda por si id viene vacio.
   */
  async delete(id: string): Promise<void> {
    if (!id || id.length === 0) {
      throw new Error("No se puede eliminar: la geocerca no tiene id. Posible error del backend en el create.");
    }
    await this.tryEndpoints<unknown>((path) =>
      apiClient.delete(`${path}/${id}`)
    );
  }

  /**
   * Obtiene geocercas filtradas por categoría
   */
  async getByCategory(category: GeofenceCategory): Promise<Geofence[]> {
    const response = await this.getAll({
      filters: { category }
    });
    return response.items;
  }

  /**
   * Obtiene geocercas por tipo geométrico
   */
  async getByType(type: "polygon" | "circle" | "corridor"): Promise<Geofence[]> {
    const response = await this.getAll({
      filters: { type }
    });
    return response.items;
  }

  /**
   * Obtiene geocercas asociadas a un cliente
   */
  async getByCustomer(customerId: string): Promise<Geofence[]> {
    const response = await this.getAll({
      filters: { customerId }
    });
    return response.items;
  }

  /**
   * Obtiene geocercas que contienen un punto
   */
  async getContainingPoint(point: GeoCoordinate): Promise<Geofence[]> {
    // En producción, esto se haría en el backend con PostGIS
    const response = await this.getAll();
    return response.items.filter((g) => this.isPointInGeofence(point, g));
  }

  /**
   * Verifica si un punto está dentro de una geocerca
   */
  private isPointInGeofence(point: GeoCoordinate, geofence: Geofence): boolean {
    const { geometry } = geofence;
    
    if (geometry.type === "circle") {
      const circleGeom = geometry as CircleGeometry;
      const distance = this.calculateDistance(point, circleGeom.center);
      return distance <= circleGeom.radius;
    }
    
    if (geometry.type === "polygon") {
      const polygonGeom = geometry as PolygonGeometry;
      return this.isPointInPolygon(point, polygonGeom.coordinates);
    }
    
    // Corridor - simplificado
    return false;
  }

  /**
   * Calcula distancia entre dos puntos (Haversine)
   */
  private calculateDistance(p1: GeoCoordinate, p2: GeoCoordinate): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRad(p2.lat - p1.lat);
    const dLng = this.toRad(p2.lng - p1.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(p1.lat)) * Math.cos(this.toRad(p2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Verifica si un punto está dentro de un polígono (Ray Casting)
   */
  private isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
    let inside = false;
    const x = point.lng;
    const y = point.lat;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Calcula el área de una geocerca en metros cuadrados
   */
  calculateArea(geofence: Geofence): number {
    const { geometry } = geofence;
    
    if (geometry.type === "circle") {
      const circleGeom = geometry as CircleGeometry;
      return Math.PI * Math.pow(circleGeom.radius, 2);
    }
    
    if (geometry.type === "polygon") {
      const polygonGeom = geometry as PolygonGeometry;
      return this.calculatePolygonArea(polygonGeom.coordinates);
    }
    
    return 0;
  }

  /**
   * Calcula área de polígono usando fórmula de Shoelace
   */
  private calculatePolygonArea(coordinates: GeoCoordinate[]): number {
    if (coordinates.length < 3) return 0;
    
    let area = 0;
    const n = coordinates.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // Convertir a metros aproximados
      const x1 = coordinates[i].lng * 111320 * Math.cos(coordinates[i].lat * Math.PI / 180);
      const y1 = coordinates[i].lat * 110540;
      const x2 = coordinates[j].lng * 111320 * Math.cos(coordinates[j].lat * Math.PI / 180);
      const y2 = coordinates[j].lat * 110540;
      
      area += x1 * y2 - x2 * y1;
    }
    
    return Math.abs(area / 2);
  }

  /**
   * Calcula el perímetro de una geocerca en metros
   */
  calculatePerimeter(geofence: Geofence): number {
    const { geometry } = geofence;
    
    if (geometry.type === "circle") {
      const circleGeom = geometry as CircleGeometry;
      return 2 * Math.PI * circleGeom.radius;
    }
    
    if (geometry.type === "polygon") {
      const polygonGeom = geometry as PolygonGeometry;
      let perimeter = 0;
      const coords = polygonGeom.coordinates;
      
      for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        perimeter += this.calculateDistance(coords[i], coords[j]);
      }
      
      return perimeter;
    }
    
    return 0;
  }

  /**
   * Obtiene estadísticas de geocercas
   */
  async getStats(): Promise<GeofenceStats> {
    const geofences = (await this.getAll()).items;

    const byCategory = {} as Record<GeofenceCategory, number>;
    const categories: GeofenceCategory[] = [
      "warehouse", "customer", "plant", "port", 
      "checkpoint", "restricted", "delivery", "other"
    ];
    
    categories.forEach((cat) => {
      byCategory[cat] = geofences.filter((g) => g.category === cat).length;
    });
    
    const uniqueTags = new Set(
      geofences.flatMap((g) => g.tags.map((t) => t.id))
    );
    
    return {
      total: geofences.length,
      polygons: geofences.filter((g) => g.type === "polygon").length,
      circles: geofences.filter((g) => g.type === "circle").length,
      byCategory,
      tagsCount: uniqueTags.size,
    };
  }

  /**
   * Exporta geocercas a formato KML
   */
  async exportToKML(options: KMLExportOptions = {}): Promise<string> {
    const { geofenceIds, includeStyles = true } = options;

    let geofences = (await this.getAll()).items;
    if (geofenceIds && geofenceIds.length > 0) {
      geofences = geofences.filter((g) => geofenceIds.includes(g.id));
    }

    const kmlContent = this.generateKML(geofences, includeStyles);
    return kmlContent;
  }

  /**
   * Genera contenido KML
   */
  private generateKML(geofences: Geofence[], includeStyles: boolean): string {
    const styles = includeStyles ? geofences.map((g) => `
    <Style id="style-${g.id}">
      <LineStyle>
        <color>${this.hexToKMLColor(g.color)}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>${this.hexToKMLColor(g.color, g.opacity)}</color>
      </PolyStyle>
    </Style>`).join("") : "";

    const placemarks = geofences.map((g) => {
      let geometryKML = "";
      
      if (g.geometry.type === "polygon") {
        const polygonGeom = g.geometry as PolygonGeometry;
        const coords = polygonGeom.coordinates
          .map((c) => `${c.lng},${c.lat},0`)
          .join(" ");
        geometryKML = `
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coords} ${polygonGeom.coordinates[0].lng},${polygonGeom.coordinates[0].lat},0</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>`;
      } else if (g.geometry.type === "circle") {
        // KML no soporta círculos nativamente, aproximamos con polígono
        const circleGeom = g.geometry as CircleGeometry;
        const circleCoords = this.generateCircleCoordinates(
          circleGeom.center, 
          circleGeom.radius, 
          36
        );
        const coords = circleCoords.map((c) => `${c.lng},${c.lat},0`).join(" ");
        geometryKML = `
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coords}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>`;
      }

      return `
    <Placemark>
      <name>${this.escapeXML(g.name)}</name>
      <description>${this.escapeXML(g.description || "")}</description>
      ${includeStyles ? `<styleUrl>#style-${g.id}</styleUrl>` : ""}
      ${geometryKML}
    </Placemark>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Geocercas TMS Navitel</name>
    <description>Exportación de geocercas</description>
    ${styles}
    ${placemarks}
  </Document>
</kml>`;
  }

  /**
   * Genera coordenadas de círculo aproximado
   */
  private generateCircleCoordinates(
    center: GeoCoordinate, 
    radius: number, 
    points: number
  ): GeoCoordinate[] {
    const coords: GeoCoordinate[] = [];
    const earthRadius = 6371000;
    
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360 / points) * (Math.PI / 180);
      const latOffset = (radius / earthRadius) * (180 / Math.PI);
      const lngOffset = latOffset / Math.cos(center.lat * Math.PI / 180);
      
      coords.push({
        lat: center.lat + latOffset * Math.cos(angle),
        lng: center.lng + lngOffset * Math.sin(angle),
      });
    }
    
    return coords;
  }

  /**
   * Convierte color hex a formato KML (AABBGGRR)
   */
  private hexToKMLColor(hex: string, opacity: number = 1): string {
    const cleanHex = hex.replace("#", "");
    const r = cleanHex.substring(0, 2);
    const g = cleanHex.substring(2, 4);
    const b = cleanHex.substring(4, 6);
    const a = Math.round(opacity * 255).toString(16).padStart(2, "0");
    return `${a}${b}${g}${r}`;
  }

  /**
   * Escapa caracteres especiales para XML
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Importa geocercas desde KML
   */
  async importFromKML(kmlContent: string): Promise<KMLImportResult> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlContent, "text/xml");
    const placemarks = doc.querySelectorAll("Placemark");

    const imported: Geofence[] = [];
    const errors: Array<{ name: string; reason: string }> = [];

    // Procesamos secuencialmente para que cada create pegue al backend.
    for (const placemark of Array.from(placemarks)) {
      const name = placemark.querySelector("name")?.textContent || "Sin nombre";
      const description = placemark.querySelector("description")?.textContent || "";

      try {
        const polygon = placemark.querySelector("Polygon");
        const point = placemark.querySelector("Point");

        if (polygon) {
          const coordsStr = polygon.querySelector("coordinates")?.textContent?.trim();
          if (coordsStr) {
            const coordinates = this.parseKMLCoordinates(coordsStr);
            if (coordinates.length >= 3) {
              const draft = this.createGeofenceFromKML(name, description, {
                type: "polygon",
                coordinates,
              });
              const created = await this.create(draft);
              imported.push(created);
            }
          }
        } else if (point) {
          // Crear círculo con radio default
          const coordsStr = point.querySelector("coordinates")?.textContent?.trim();
          if (coordsStr) {
            const [lng, lat] = coordsStr.split(",").map(Number);
            const draft = this.createGeofenceFromKML(name, description, {
              type: "circle",
              center: { lat, lng },
              radius: 500, // Radio default de 500m
            });
            const created = await this.create(draft);
            imported.push(created);
          }
        } else {
          errors.push({ name, reason: "Geometría no soportada" });
        }
      } catch {
        errors.push({ name, reason: "Error al procesar geometría" });
      }
    }

    return { imported, errors };
  }

  /**
   * Parsea coordenadas KML
   */
  private parseKMLCoordinates(coordsStr: string): GeoCoordinate[] {
    return coordsStr
      .trim()
      .split(/\s+/)
      .filter((c) => c.length > 0)
      .map((coord) => {
        const [lng, lat] = coord.split(",").map(Number);
        return { lat, lng };
      })
      .filter((c) => !isNaN(c.lat) && !isNaN(c.lng));
  }

  /**
   * Crea geocerca desde datos KML
   */
  private createGeofenceFromKML(
    name: string, 
    description: string, 
    geometry: GeofenceGeometry
  ): Geofence {
    const now = new Date().toISOString();
    return {
      id: `geo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: `KML-${Date.now()}`,
      name,
      description,
      type: geometry.type,
      category: "other",
      geometry,
      color: "#00c9ff",
      opacity: 0.2,
      tags: [],
      alerts: {
        onEntry: false,
        onExit: false,
        onDwell: false,
      },
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Valida que un polígono no se auto-intersecte
   */
  validatePolygon(coordinates: GeoCoordinate[]): { valid: boolean; message?: string } {
    if (coordinates.length < 3) {
      return { valid: false, message: "El polígono debe tener al menos 3 puntos" };
    }
    
    // Verificar auto-intersección
    for (let i = 0; i < coordinates.length; i++) {
      const a1 = coordinates[i];
      const a2 = coordinates[(i + 1) % coordinates.length];
      
      for (let j = i + 2; j < coordinates.length; j++) {
        if (j === coordinates.length - 1 && i === 0) continue; // Ignorar último con primero
        
        const b1 = coordinates[j];
        const b2 = coordinates[(j + 1) % coordinates.length];
        
        if (this.linesIntersect(a1, a2, b1, b2)) {
          return { valid: false, message: "El polígono se auto-intersecta" };
        }
      }
    }
    
    return { valid: true };
  }

  /**
   * Verifica si dos líneas se intersectan
   */
  private linesIntersect(
    a1: GeoCoordinate, 
    a2: GeoCoordinate, 
    b1: GeoCoordinate, 
    b2: GeoCoordinate
  ): boolean {
    const det = (a2.lng - a1.lng) * (b2.lat - b1.lat) - (b2.lng - b1.lng) * (a2.lat - a1.lat);
    if (det === 0) return false;
    
    const lambda = ((b2.lat - b1.lat) * (b2.lng - a1.lng) + (b1.lng - b2.lng) * (b2.lat - a1.lat)) / det;
    const gamma = ((a1.lat - a2.lat) * (b2.lng - a1.lng) + (a2.lng - a1.lng) * (b2.lat - a1.lat)) / det;
    
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }

  /**
   * Actualiza configuración de alertas
   */
  async updateAlerts(id: string, alerts: GeofenceAlerts): Promise<Geofence> {
    return this.update(id, { alerts });
  }

  /**
   * Asocia geocerca a un cliente
   */
  async associateCustomer(geofenceId: string, customerId: string): Promise<Geofence> {
    return this.update(geofenceId, { customerId });
  }

  /**
   * Cambia el estado de una geocerca
   */
  async toggleStatus(id: string): Promise<Geofence> {
    const geofence = await this.getById(id);
    const newStatus = geofence.status === "active" ? "inactive" : "active";
    return this.update(id, { status: newStatus });
  }

  /**
   * Cambia el estado de múltiples geocercas en 1 sola request.
   * Backend Excel: POST /geofences/toggle-estatus-batch (sí, con typo "estatus").
   */
  async toggleStatusBatch(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await this.tryEndpoints<unknown>((path) =>
      apiClient.post<unknown>(`${path}/toggle-estatus-batch`, { ids })
    );
  }

  /**
   * Cambia la categoría de múltiples geocercas en 1 sola request.
   * Backend Excel: PATCH /geofences/batch-category
   */
  async updateCategoryBatch(ids: string[], category: GeofenceCategory): Promise<void> {
    if (!ids || ids.length === 0) return;
    await this.tryEndpoints<unknown>((path) =>
      apiClient.patch<unknown>(`${path}/batch-category`, { ids, category })
    );
  }

  /**
   * Duplica una geocerca
   */
  async duplicate(id: string, newName?: string): Promise<Geofence> {
    const original = await this.getById(id);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = original;
    
    return this.create({
      ...rest,
      name: newName || `${original.name} (copia)`,
      code: `GEO-${Date.now()}`,
    });
  }

  /**
   * Elimina múltiples geocercas.
   * Usa el endpoint bulk-delete del backend (1 sola request) en lugar de N DELETEs.
   * Excel: POST /geofences/bulk-delete con body { ids: string[] }
   */
  async deleteMany(ids: string[]): Promise<void> {
    const validIds = ids.filter(id => id && id.length > 0);
    if (validIds.length === 0) {
      console.warn("[GeofencesService] deleteMany llamado sin ids validos, skip");
      return;
    }

    // 2026-05-03 (issue CRITICAL #2nuevo): usar tryEndpoints como los demás
    // métodos. Antes iba directo a `this.endpoint` que es el path canónico
    // del Excel (root sin /api/v1) que está roto. Cuando el discovery decide
    // usar `/api/v1/geofences` para getAll/etc, deleteMany seguía yendo al
    // path roto y siempre fallaba.
    await this.tryEndpoints<unknown>((path) =>
      apiClient.post(`${path}/bulk-delete`, { ids: validIds })
    );
  }

  /**
   * Actualiza color de múltiples geocercas.
   * Excel: PATCH /geofences/batch-color
   */
  async updateColorBatch(ids: string[], color: string): Promise<Geofence[]> {
    const validIds = ids.filter(id => id && id.length > 0);
    if (validIds.length === 0) return [];

    // 2026-05-03 (issue CRITICAL #2nuevo): usar tryEndpoints (mismo motivo).
    const response = await this.tryEndpoints<{ items?: Record<string, unknown>[]; data?: Record<string, unknown>[] }>((path) =>
      apiClient.patch(`${path}/batch-color`, { ids: validIds, color })
    );
    const raw = response.items ?? response.data ?? [];
    return raw.map(mapBackendGeofence);
  }
}

/** Instancia singleton del servicio */
export const geofencesService = new GeofencesService();
