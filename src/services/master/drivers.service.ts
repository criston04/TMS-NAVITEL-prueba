import { BulkService } from "@/services/base.service";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api.config";
import { Driver, DriverStats } from "@/types/models";
import type { ValidationChecklist, CreateDTO, UpdateDTO, SearchParams, PaginatedResponse } from "@/types/common";
import {
  mapDriverFromBackend,
  mapDriverToBackend,
  type BackendDriver,
} from "@/lib/transformers/driver.transformer";

/**
 * Genera código único de conductor.
 * 2026-05-14: backend exige `code` al crear (422 sin él), igual que customers.
 */
function generateDriverCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CON-${timestamp}-${random}`;
}

/**
 * Servicio para gestión de Conductores.
 *
 * 2026-05-03: Diagnóstico actualizado. El backend NO tiene implementadas la
 * mayoría de rutas con `:id` aunque el Excel oficial las documente. Antes
 * pensábamos que era un bug NGINX — confirmado que NO es NGINX (NGINX proxea
 * todo al backend; sin auth las URLs devuelven 401 JSON, lo que prueba que la
 * petición llega al backend). El "Not Found" plain text 9 bytes es el handler
 * 404 default del framework cuando una ruta no existe.
 *
 * Rutas que el Excel oficial documenta para Drivers (9 endpoints):
 *   GET    /master/drivers
 *   GET    /master/drivers/:id            ← documentada pero no implementada
 *   POST   /master/drivers
 *   PUT    /master/drivers/:id            ← documentada pero no implementada
 *   PATCH  /master/drivers/:id/status     ← documentada pero no implementada
 *   DELETE /master/drivers/:id            ← documentada pero no implementada
 *   POST   /master/drivers/bulk-delete
 *   GET    /master/drivers/stats
 *   GET    /master/drivers/expiring-licenses
 *
 * Rutas que el frontend usa pero NO están en el Excel oficial:
 *   GET   /master/drivers/by-document/:doc       ← funciona en producción
 *   POST  /master/drivers/:id/enable             ← reemplazado por PATCH /:id/status
 *   POST  /master/drivers/:id/block              ← reemplazado por PATCH /:id/status
 *   GET   /master/drivers/:id/checklist          ← no existe; cálculo client-side
 *   POST  /master/drivers/:id/assign-vehicle     ← debería ir por /master/assignments
 *   POST  /master/drivers/:id/unassign-vehicle   ← debería ir por /master/assignments
 */
class DriversService extends BulkService<Driver> {
  constructor() {
    super(API_ENDPOINTS.master.drivers, []);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  OVERRIDES CRUD con transformer backend (snake_case) ↔ frontend (camelCase)
  // ═════════════════════════════════════════════════════════════════════════

  async getAll(params?: SearchParams): Promise<PaginatedResponse<Driver>> {
    const queryParams = params ? {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
    } : undefined;

    const response = await apiClient.get<Record<string, unknown>>(this.endpoint, { params: queryParams });
    const rawList = ((response.items ?? response.data ?? []) as unknown[])
      .filter((x): x is BackendDriver => typeof x === "object" && x !== null);
    const items = rawList.map(mapDriverFromBackend);

    const meta = (response.meta ?? response.pagination ?? {}) as Record<string, number>;
    const page = meta.page ?? params?.page ?? 1;
    const pageSize = meta.pageSize ?? params?.pageSize ?? items.length;
    const totalItems = meta.total ?? meta.totalItems ?? items.length;
    const totalPages = meta.totalPages ?? 1;

    return {
      items,
      pagination: {
        page, pageSize, totalItems, totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async getById(id: string): Promise<Driver> {
    return this.withMissingEndpointDetection(
      "Detalle conductor (GET /master/drivers/:id)",
      async () => {
        const response = await apiClient.get<Record<string, unknown>>(`${this.endpoint}/${id}`);
        const raw = (response.data ?? response) as BackendDriver;
        return mapDriverFromBackend(raw);
      }
    );
  }

  /**
   * Crear — convierte payload a snake_case, response a camelCase.
   *
   * IMPORTANTE (2026-05-14): el backend EXIGE `code` como campo obligatorio
   * al crear — sin él responde 422 "Unprocessable Content" con mensaje
   * genérico "Ups, tuvimos un problema". El formulario UI no captura código
   * manualmente, así que lo generamos aquí si no viene provisto.
   * Mismo patrón aplicado en customers.service.ts.
   */
  async create(data: CreateDTO<Driver>): Promise<Driver> {
    const dataWithCode = data as Partial<Driver>;
    if (!dataWithCode.code) {
      dataWithCode.code = generateDriverCode();
    }
    const payload = mapDriverToBackend(dataWithCode);
    const response = await apiClient.post<Record<string, unknown>>(this.endpoint, payload);
    const raw = (response.data ?? response) as BackendDriver;
    return mapDriverFromBackend(raw);
  }

  async update(id: string, data: UpdateDTO<Driver>): Promise<Driver> {
    const payload = mapDriverToBackend(data as Partial<Driver>);
    return this.withMissingEndpointDetection(
      "Actualizar conductor (PUT /master/drivers/:id)",
      async () => {
        const response = await apiClient.put<Record<string, unknown>>(`${this.endpoint}/${id}`, payload);
        const raw = (response.data ?? response) as BackendDriver;
        return mapDriverFromBackend(raw);
      }
    );
  }

  /**
   * Eliminar conductor (soft delete).
   *
   * 2026-05-03 (issue CRITICAL #3): override agregado para envolver con el
   * helper `withMissingEndpointDetection`. Antes el `delete()` heredado de
   * BaseService lanzaba un error técnico crudo cuando el backend daba 404.
   * Ahora la UI puede detectar `error.backendNotImplemented` y mostrar un
   * toast amigable.
   */
  async delete(id: string): Promise<void> {
    return this.withMissingEndpointDetection(
      "Eliminar conductor (DELETE /master/drivers/:id)",
      () => apiClient.delete(`${this.endpoint}/${id}`)
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  METODOS ESPECIFICOS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene estadísticas de conductores.
   *
   * 2026-05-03: Test E2E confirmó que /stats SÍ funciona (status 200).
   * Mantenemos fallback `computeStatsFromList()` por defensive programming.
   */
  async getStats(): Promise<DriverStats> {
    try {
      return await this.request<DriverStats>("GET", `${this.endpoint}/stats`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404 || status === 500) {
        console.warn(`[driversService.getStats] backend ${status}. Fallback client-side.`);
        return this.computeStatsFromList();
      }
      throw err;
    }
  }

  /**
   * Calcula stats a partir del listado real (fallback cuando backend /stats falla)
   */
  private async computeStatsFromList(): Promise<DriverStats> {
    try {
      const list = await this.getAll({ page: 1, pageSize: 200 });
      const items = list.items;
      const enabled = items.filter(d => d.isEnabled).length;
      const blocked = items.length - enabled;
      const available = items.filter(d => d.availability === "available").length;
      const onRoute = items.filter(d => d.availability === "on-route").length;
      const resting = items.filter(d => d.availability === "resting").length;
      const onVacation = items.filter(d => d.availability === "vacation").length;
      return {
        total: items.length,
        enabled,
        blocked,
        expiringSoon: 0,
        expired: 0,
        available,
        onRoute,
        resting,
        onVacation,
        withOpenIncidents: 0,
      };
    } catch {
      return {
        total: 0, enabled: 0, blocked: 0,
        expiringSoon: 0, expired: 0,
        available: 0, onRoute: 0,
        resting: 0, onVacation: 0,
        withOpenIncidents: 0,
      };
    }
  }

  // 2026-05-03 (issue HIGH #6): `computeChecklistFromDriver` ELIMINADO.
  // Era un método público duplicado del checklist que el transformer
  // (`computeChecklistFromBackendDriver` en driver.transformer.ts) ya calcula
  // automáticamente al hidratar el Driver. Tener dos fuentes con reglas
  // distintas era riesgo de inconsistencia (el del transformer NO tenía
  // acceso a license/emergency_contact porque el listado backend no los
  // devuelve, mientras este los exigía). Como nadie lo invocaba en la UI,
  // se elimina para tener fuente única de verdad en el transformer.

  /**
   * Habilita un conductor.
   *
   * 2026-05-03: Cambiado de POST `/:id/enable` (no existe en Excel) a
   * PATCH `/:id/status` con `{status: "active"}` (path canónico del Excel).
   * El endpoint del Excel está documentado pero el backend aún no lo implementa
   * (devuelve 404 en producción). Cuando lo implemente, este código funcionará.
   */
  async enable(driverId: string): Promise<Driver> {
    return this.withMissingEndpointDetection(
      "Habilitar conductor (PATCH /master/drivers/:id/status con status=active)",
      async () => {
        const response = await apiClient.patch<Record<string, unknown>>(
          `${this.endpoint}/${driverId}/status`,
          { status: "active" }
        );
        const raw = (response.data ?? response) as BackendDriver;
        return mapDriverFromBackend(raw);
      }
    );
  }

  /**
   * Bloquea un conductor con motivo.
   *
   * 2026-05-03: Cambiado de POST `/:id/block` (no existe en Excel) a
   * PATCH `/:id/status` con `{status: "blocked", reason}` (path canónico del Excel).
   * El endpoint del Excel está documentado pero el backend aún no lo implementa.
   */
  async block(driverId: string, reason: string): Promise<Driver> {
    return this.withMissingEndpointDetection(
      "Bloquear conductor (PATCH /master/drivers/:id/status con status=blocked)",
      async () => {
        const response = await apiClient.patch<Record<string, unknown>>(
          `${this.endpoint}/${driverId}/status`,
          { status: "blocked", reason }
        );
        const raw = (response.data ?? response) as BackendDriver;
        return mapDriverFromBackend(raw);
      }
    );
  }

  /**
   * Cambio explícito de status (vacaciones, licencia médica, terminated, etc.)
   * Usa la misma ruta que enable/block.
   */
  async changeStatus(driverId: string, status: string, reason?: string): Promise<Driver> {
    return this.withMissingEndpointDetection(
      "Cambiar status conductor (PATCH /master/drivers/:id/status)",
      async () => {
        const body: Record<string, unknown> = { status };
        if (reason) body.reason = reason;
        const response = await apiClient.patch<Record<string, unknown>>(
          `${this.endpoint}/${driverId}/status`,
          body
        );
        const raw = (response.data ?? response) as BackendDriver;
        return mapDriverFromBackend(raw);
      }
    );
  }

  /**
   * Busca por número de documento. Path param NO es UUID, funciona OK.
   *
   * NOTA: este endpoint NO está en el Excel oficial pero el backend SÍ lo tiene
   * implementado y devuelve 200 en producción. Es un caso de "endpoint
   * implementado pero no documentado" — gap del Excel oficial.
   */
  async findByDocument(documentNumber: string): Promise<Driver | null> {
    return this.request<Driver | null>("GET", `${this.endpoint}/by-document/${documentNumber}`);
  }

  /**
   * Asigna un vehículo a un conductor.
   *
   * 2026-05-03: El endpoint POST `/master/drivers/:id/assign-vehicle` NO existe
   * en el Excel oficial. El backend tiene un módulo `/master/assignments`
   * (GET funciona, POST da 500) que probablemente sea el correcto, pero el
   * shape del body es desconocido.
   *
   * Mantenemos la llamada al path original con detección clara de "no existe"
   * hasta que el backend defina el endpoint correcto.
   */
  async assignVehicle(driverId: string, vehicleId: string): Promise<Driver> {
    return this.withMissingEndpointDetection(
      "Asignar vehículo (POST /master/drivers/:id/assign-vehicle)",
      () => this.request<Driver>("POST", `${this.endpoint}/${driverId}/assign-vehicle`, { vehicle_id: vehicleId })
    );
  }

  /**
   * Desasigna un vehículo de un conductor.
   * Misma situación que assignVehicle: endpoint no existe en Excel.
   */
  async unassignVehicle(driverId: string, _vehicleId: string): Promise<Driver> {
    return this.withMissingEndpointDetection(
      "Desasignar vehículo (POST /master/drivers/:id/unassign-vehicle)",
      () => this.request<Driver>("POST", `${this.endpoint}/${driverId}/unassign-vehicle`)
    );
  }

  /**
   * 2026-05-03: Helper privado para detectar endpoints no implementados.
   *
   * IMPORTANTE: cambio de diagnóstico. Antes este helper se llamaba
   * `withIdBugDetection` y atribuía los 404 al "bug NGINX". Investigación
   * profunda confirmó que NGINX NO está bloqueando nada (proxea todo al
   * backend). El "Not Found" plain text 9 bytes es el handler 404 default
   * del framework backend cuando la ruta NO está implementada.
   *
   * El verdadero diagnóstico es: el backend no implementó esa ruta. La
   * solución NO es tocar NGINX, es que el backend implemente las rutas.
   */
  private async withMissingEndpointDetection<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        const explanatory = new Error(
          `${operation} no está disponible: el backend devuelve 404 porque ` +
          `esta ruta NO está implementada en producción. El equipo backend ` +
          `debe implementar el handler correspondiente (ver Excel oficial / ` +
          `documento HANDOFF para detalles).`
        ) as Error & { status?: number; backendNotImplemented?: boolean };
        explanatory.status = 404;
        explanatory.backendNotImplemented = true;
        throw explanatory;
      }
      throw err;
    }
  }

  /**
   * Request helper
   */
  private async request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
    const { apiClient } = await import("@/lib/api");

    switch (method) {
      case "GET":
        return apiClient.get<T>(endpoint);
      case "POST":
        return apiClient.post<T>(endpoint, data);
      default:
        return apiClient.get<T>(endpoint);
    }
  }
}

/** Instancia singleton del servicio */
export const driversService = new DriversService();
