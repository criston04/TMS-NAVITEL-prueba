import { BulkService } from "@/services/base.service";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api.config";
import { Vehicle, VehicleStats } from "@/types/models";
import type { ValidationChecklist, CreateDTO, UpdateDTO, SearchParams, PaginatedResponse } from "@/types/common";
import { masterEvents } from "@/services/integration/master-events";
import {
  mapVehicleFromBackend,
  mapVehicleToBackend,
  type BackendVehicle,
} from "@/lib/transformers/vehicle.transformer";

/**
 * Servicio para gestión de Vehículos.
 *
 * 2026-05-03: Diagnóstico actualizado (v2). El backend NO tiene implementadas
 * la mayoría de rutas con `:id` aunque el Excel oficial las documente. Antes
 * pensábamos que era un bug NGINX — confirmado que NO es NGINX. El "Not Found"
 * plain text 9 bytes es el handler 404 default del framework backend cuando
 * una ruta no existe.
 *
 * Rutas que el Excel oficial documenta para Vehicles:
 *   GET    /master/vehicles
 *   GET    /master/vehicles/:id              ← documentada pero NO implementada
 *   POST   /master/vehicles
 *   PUT    /master/vehicles/:id              ← documentada pero NO implementada
 *   PATCH  /master/vehicles/:id/status       ← documentada pero NO implementada
 *   POST   /master/vehicles/:id/breakdowns   ← documentada pero NO implementada
 *   DELETE /master/vehicles/:id              ← documentada pero NO implementada
 *   POST   /master/vehicles/bulk-delete
 *   GET    /master/vehicles/stats
 *   GET    /master/vehicles/expiring-documents
 *   GET    /master/vehicles/needing-maintenance ← Excel SI / Backend devuelve 500
 *
 * Rutas que el frontend usa pero NO están en el Excel oficial:
 *   GET   /master/vehicles/by-plate/:plate       ← funciona en producción (NO documentado)
 *   POST  /master/vehicles/:id/enable            ← reemplazado por PATCH /:id/status
 *   POST  /master/vehicles/:id/block             ← reemplazado por PATCH /:id/status
 *   GET   /master/vehicles/:id/checklist         ← no existe; cálculo client-side
 *   POST  /master/vehicles/:id/assign-driver     ← debería ir por /master/assignments
 *   POST  /master/vehicles/:id/unassign-driver   ← debería ir por /master/assignments
 */
class VehiclesService extends BulkService<Vehicle> {
  constructor() {
    super(API_ENDPOINTS.master.vehicles, []);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  OVERRIDES CRUD con transformer backend (snake_case) ↔ frontend (camelCase)
  // ═════════════════════════════════════════════════════════════════════════

  async getAll(params?: SearchParams): Promise<PaginatedResponse<Vehicle>> {
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
      .filter((x): x is BackendVehicle => typeof x === "object" && x !== null);
    const items = rawList.map(mapVehicleFromBackend);

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

  async getById(id: string): Promise<Vehicle> {
    return this.withMissingEndpointDetection(
      "Detalle vehiculo (GET /master/vehicles/:id)",
      async () => {
        const response = await apiClient.get<Record<string, unknown>>(`${this.endpoint}/${id}`);
        const raw = (response.data ?? response) as BackendVehicle;
        return mapVehicleFromBackend(raw);
      }
    );
  }

  /**
   * Crear vehículo.
   *
   * IMPORTANTE (2026-05-14): el backend EXIGE `code` como campo obligatorio
   * al crear — sin él responde 422. El formulario UI no captura código
   * manualmente, así que lo generamos aquí si no viene provisto.
   * Mismo patrón que customers/drivers/operators.
   */
  async create(data: CreateDTO<Vehicle>): Promise<Vehicle> {
    const dataWithCode = data as Partial<Vehicle>;
    if (!dataWithCode.code) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      dataWithCode.code = `VEH-${timestamp}-${random}`;
    }
    const payload = mapVehicleToBackend(dataWithCode);
    const response = await apiClient.post<Record<string, unknown>>(this.endpoint, payload);
    const raw = (response.data ?? response) as BackendVehicle;
    return mapVehicleFromBackend(raw);
  }

  async update(id: string, data: UpdateDTO<Vehicle>): Promise<Vehicle> {
    const payload = mapVehicleToBackend(data as Partial<Vehicle>);
    return this.withMissingEndpointDetection(
      "Actualizar vehiculo (PUT /master/vehicles/:id)",
      async () => {
        const response = await apiClient.put<Record<string, unknown>>(`${this.endpoint}/${id}`, payload);
        const raw = (response.data ?? response) as BackendVehicle;
        return mapVehicleFromBackend(raw);
      }
    );
  }

  /**
   * Eliminar vehiculo (soft delete).
   *
   * 2026-05-03 (issue CRITICAL #3): override agregado para envolver con el
   * helper `withMissingEndpointDetection`. Antes el `delete()` heredado de
   * BaseService lanzaba un error técnico crudo cuando el backend daba 404.
   */
  async delete(id: string): Promise<void> {
    return this.withMissingEndpointDetection(
      "Eliminar vehiculo (DELETE /master/vehicles/:id)",
      () => apiClient.delete(`${this.endpoint}/${id}`)
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  METODOS ESPECIFICOS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene estadísticas de vehículos.
   *
   * Test E2E confirmó que /stats funciona OK.
   * Mantenemos fallback `computeStatsFromList()` por defensive programming.
   */
  async getStats(): Promise<VehicleStats> {
    try {
      return await this.request<VehicleStats>("GET", `${this.endpoint}/stats`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404 || status === 500) {
        console.warn(`[vehiclesService.getStats] backend ${status}. Fallback client-side.`);
        return this.computeStatsFromList();
      }
      throw err;
    }
  }

  /**
   * Calcula stats a partir del listado real (fallback cuando backend /stats falla)
   */
  private async computeStatsFromList(): Promise<VehicleStats> {
    try {
      const list = await this.getAll({ page: 1, pageSize: 200 });
      const items = list.items;
      const enabled = items.filter(v => v.isEnabled).length;
      const blocked = items.length - enabled;
      const available = items.filter(v => v.operationalStatus === "available").length;
      const onRoute = items.filter(v => v.operationalStatus === "on-route").length;
      const inMaintenance = items.filter(v => v.operationalStatus === "maintenance").length;
      const inRepair = items.filter(v => v.operationalStatus === "repair").length;
      const inactive = items.filter(v => v.operationalStatus === "inactive").length;
      return {
        total: items.length,
        enabled, blocked,
        expiringSoon: 0, expired: 0,
        available, onRoute,
        inMaintenance, inRepair, inactive,
        withOpenIncidents: 0,
      };
    } catch {
      return {
        total: 0, enabled: 0, blocked: 0,
        expiringSoon: 0, expired: 0,
        available: 0, onRoute: 0,
        inMaintenance: 0, inRepair: 0,
        inactive: 0, withOpenIncidents: 0,
      };
    }
  }

  // 2026-05-03 (issue HIGH #6): `computeChecklistFromVehicle` ELIMINADO.
  // Era duplicado del checklist que calcula el transformer
  // (`computeChecklistFromBackendVehicle`) al hidratar el Vehicle. Como nadie
  // lo invocaba en la UI, se elimina para tener fuente única de verdad.

  /**
   * Habilita un vehículo.
   *
   * 2026-05-03: Cambiado de POST `/:id/enable` (no existe en Excel) a
   * PATCH `/:id/status` con `{status: "active"}` (path canónico del Excel).
   * El endpoint del Excel está documentado pero el backend aún no lo implementa
   * (devuelve 404 en producción). Cuando lo implemente, este código funcionará.
   */
  async enable(vehicleId: string): Promise<Vehicle> {
    return this.withMissingEndpointDetection(
      "Habilitar vehiculo (PATCH /master/vehicles/:id/status con status=active)",
      async () => {
        const response = await apiClient.patch<Record<string, unknown>>(
          `${this.endpoint}/${vehicleId}/status`,
          { status: "active" }
        );
        const raw = (response.data ?? response) as BackendVehicle;
        const vehicle = mapVehicleFromBackend(raw);
        // 2026-05-05: notificar al bus para que ordenes/monitoring reaccionen
        masterEvents.vehicleEnabled({ vehicleId: vehicle.id, vehiclePlate: vehicle.plate });
        return vehicle;
      }
    );
  }

  /**
   * Bloquea un vehículo con motivo.
   *
   * 2026-05-03: Cambiado de POST `/:id/block` a PATCH `/:id/status` con
   * `{status: "blocked", reason}`. Backend del Excel pero no implementado.
   */
  async block(vehicleId: string, reason: string): Promise<Vehicle> {
    return this.withMissingEndpointDetection(
      "Bloquear vehiculo (PATCH /master/vehicles/:id/status con status=blocked)",
      async () => {
        const response = await apiClient.patch<Record<string, unknown>>(
          `${this.endpoint}/${vehicleId}/status`,
          { status: "blocked", reason }
        );
        const raw = (response.data ?? response) as BackendVehicle;
        const vehicle = mapVehicleFromBackend(raw);
        // 2026-05-05: notificar al bus para que ordenes activas con este
        // vehiculo se enteren y monitoring detenga el tracking.
        masterEvents.vehicleBlocked({
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
          reason,
        });
        return vehicle;
      }
    );
  }

  /**
   * Cambio explícito de status (mantenance, repair, etc.). Usa la misma ruta.
   */
  async changeStatus(vehicleId: string, status: string, reason?: string): Promise<Vehicle> {
    return this.withMissingEndpointDetection(
      "Cambiar status vehiculo (PATCH /master/vehicles/:id/status)",
      async () => {
        const body: Record<string, unknown> = { status };
        if (reason) body.reason = reason;
        const response = await apiClient.patch<Record<string, unknown>>(
          `${this.endpoint}/${vehicleId}/status`,
          body
        );
        const raw = (response.data ?? response) as BackendVehicle;
        return mapVehicleFromBackend(raw);
      }
    );
  }

  /**
   * Reporta una avería de vehículo.
   *
   * Excel oficial: POST /master/vehicles/:id/breakdowns
   * Estado en producción: NO IMPLEMENTADO (404). Queda preparado para cuando
   * el backend implemente.
   */
  async reportBreakdown(vehicleId: string, breakdown: { description: string; severity?: string; date?: string }): Promise<Vehicle> {
    return this.withMissingEndpointDetection(
      "Reportar avería (POST /master/vehicles/:id/breakdowns)",
      async () => {
        const response = await apiClient.post<Record<string, unknown>>(
          `${this.endpoint}/${vehicleId}/breakdowns`,
          breakdown
        );
        const raw = (response.data ?? response) as BackendVehicle;
        return mapVehicleFromBackend(raw);
      }
    );
  }

  /**
   * Busca por placa. Path param NO es UUID, funciona OK.
   *
   * NOTA: este endpoint NO está en el Excel oficial pero el backend SÍ lo tiene
   * implementado y devuelve 200 en producción. Es un caso de "endpoint
   * implementado pero no documentado" — gap del Excel oficial.
   */
  async findByPlate(plate: string): Promise<Vehicle | null> {
    return this.request<Vehicle | null>("GET", `${this.endpoint}/by-plate/${plate}`);
  }

  /**
   * Documentos próximos a vencer.
   *
   * Excel oficial: GET /master/vehicles/expiring-documents (verificado en
   * producción: 200 OK).
   */
  async getExpiringDocuments(days: number = 30): Promise<{ data: Vehicle[]; daysThreshold: number }> {
    return this.request("GET", `${this.endpoint}/expiring-documents?days=${days}`);
  }

  /**
   * Vehículos que necesitan mantenimiento.
   *
   * Excel oficial: GET /master/vehicles/needing-maintenance.
   * 2026-05-03: en producción devuelve 500 Internal Server Error. Bug del
   * backend, queda con fallback que devuelve lista vacía mientras se arregla.
   */
  async getNeedingMaintenance(): Promise<Vehicle[]> {
    try {
      const result = await this.request<Vehicle[] | { data?: Vehicle[] }>(
        "GET",
        `${this.endpoint}/needing-maintenance`
      );
      return Array.isArray(result) ? result : (result?.data ?? []);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 500) {
        console.warn(
          "[vehiclesService.getNeedingMaintenance] backend devuelve 500. Bug en backend; retornando lista vacía."
        );
        return [];
      }
      throw err;
    }
  }

  /**
   * Asigna un conductor a un vehículo.
   *
   * 2026-05-03: El endpoint POST `/master/vehicles/:id/assign-driver` NO existe
   * en el Excel oficial. El backend tiene un módulo `/master/assignments`
   * (GET funciona, POST da 500) que probablemente sea el correcto, pero el
   * shape del body es desconocido.
   *
   * Mantenemos la llamada al path original con detección clara de "no existe"
   * hasta que el backend defina el endpoint correcto.
   */
  async assignDriver(vehicleId: string, driverId: string): Promise<Vehicle> {
    return this.withMissingEndpointDetection(
      "Asignar conductor (POST /master/vehicles/:id/assign-driver)",
      () => this.request<Vehicle>("POST", `${this.endpoint}/${vehicleId}/assign-driver`, { driverId })
    );
  }

  /**
   * Desasigna un conductor de un vehículo.
   * Misma situación que assignDriver: endpoint no existe en Excel.
   */
  async unassignDriver(vehicleId: string, _driverId: string): Promise<Vehicle> {
    return this.withMissingEndpointDetection(
      "Desasignar conductor (POST /master/vehicles/:id/unassign-driver)",
      () => this.request<Vehicle>("POST", `${this.endpoint}/${vehicleId}/unassign-driver`)
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
export const vehiclesService = new VehiclesService();
