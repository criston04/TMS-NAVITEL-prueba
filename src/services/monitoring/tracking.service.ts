import type {
  TrackedVehicle,
  VehiclePosition,
  TrackedOrder,
  TrackedMilestone,
  ControlTowerFilters,
} from "@/types/monitoring";
import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { vehiclesService } from "@/services/master/vehicles.service";
import { driversService } from "@/services/master/drivers.service";
import { operatorsService } from "@/services/master/operators.service";

/**
 * 2026-05-03: Helper para desempacar respuestas envueltas en `{data: ...}`.
 * Verificado empiricamente: el backend del modulo monitoreo casi siempre
 * devuelve los responses dentro de un envelope `{data: ...}`. La excepcion es
 * el listado de tracking que usa `{vehicles, kpis}` (manejado en getActiveVehicles).
 */
function unwrap<T>(response: unknown): T {
  if (Array.isArray(response)) return response as T;
  if (response && typeof response === "object") {
    const r = response as { data?: unknown; items?: unknown };
    if (r.data !== undefined) return r.data as T;
    if (r.items !== undefined) return r.items as T;
  }
  return response as T;
}

/**
 * Servicio de Tracking en Tiempo Real
 */
export class TrackingService {
  /**
   * Obtiene todos los vehículos activos con tracking
   */
  async getActiveVehicles(filters?: ControlTowerFilters): Promise<TrackedVehicle[]> {
    const params: Record<string, string> = {};
    if (filters?.unitSearch) params.unitSearch = filters.unitSearch;
    if (filters?.carrierId) params.carrierId = filters.carrierId;
    if (filters?.orderNumber) params.orderNumber = filters.orderNumber;
    if (filters?.customerId) params.customerId = filters.customerId;
    if (filters?.activeOrdersOnly) params.activeOrdersOnly = "true";
    if (filters?.connectionStatus) params.connectionStatus = filters.connectionStatus;

    // Backend devuelve envelope `{vehicles: [...]}` y cada vehiculo trae los
    // campos GPS aplanados (lat/lng/speed/heading/lastUpdate) al nivel raiz.
    // El frontend espera todo anidado en `position: {...}`, asi que normalizamos.
    const response = await apiClient.get<unknown>(API_ENDPOINTS.monitoring.tracking, { params });
    let rawList: unknown[] = [];
    if (Array.isArray(response)) {
      rawList = response;
    } else if (response && typeof response === "object") {
      const r = response as { vehicles?: unknown; items?: unknown; data?: unknown };
      const list = r.vehicles ?? r.items ?? r.data;
      if (Array.isArray(list)) rawList = list;
    }

    const mapped = rawList.map((raw): TrackedVehicle & { _operatorId?: string } => {
      const v = raw as Record<string, unknown>;
      const hasGps =
        v.lat !== null && v.lat !== undefined &&
        v.lng !== null && v.lng !== undefined;

      // Sintetizar `position` desde los campos flat si no viene anidada
      const position: VehiclePosition = (v.position && typeof v.position === "object")
        ? (v.position as VehiclePosition)
        : {
            lat: typeof v.lat === "number" ? v.lat : 0,
            lng: typeof v.lng === "number" ? v.lng : 0,
            speed: typeof v.speed === "number" ? v.speed : 0,
            heading: typeof v.heading === "number" ? v.heading : 0,
            timestamp:
              (typeof v.lastUpdate === "string" ? v.lastUpdate : null) ??
              new Date().toISOString(),
          };

      const movementStatus: TrackedVehicle["movementStatus"] =
        (v.movementStatus as TrackedVehicle["movementStatus"]) ??
        (position.speed > 0 ? "moving" : "stopped");

      const connectionStatus: TrackedVehicle["connectionStatus"] =
        (v.connectionStatus as TrackedVehicle["connectionStatus"]) ??
        (hasGps ? "online" : "disconnected");

      return {
        id: String(v.id ?? ""),
        plate: String(v.plate ?? ""),
        economicNumber: (v.economicNumber as string | undefined) ?? undefined,
        type: String(v.vehicleType ?? v.type ?? "camion"),
        position,
        movementStatus,
        connectionStatus,
        driverId:
          (v.driver_id as string | undefined) ??
          (v.driverId as string | undefined) ??
          undefined,
        driverName:
          (v.driverName as string | undefined) ??
          (v.driver_name as string | undefined) ??
          undefined,
        driverPhone:
          (v.driverPhone as string | undefined) ??
          (v.driver_phone as string | undefined) ??
          undefined,
        activeOrderId: (v.activeOrderId as string | undefined) ?? undefined,
        activeOrderNumber: (v.activeOrderNumber as string | undefined) ?? undefined,
        companyName:
          (v.companyName as string | undefined) ??
          (v.company_name as string | undefined) ??
          undefined,
        stoppedSince: (v.stoppedSince as string | undefined) ?? undefined,
        // Capturamos operatorId del payload del backend para enriquecer despues
        _operatorId:
          (v.operator_id as string | undefined) ??
          (v.operatorId as string | undefined) ??
          undefined,
      } as TrackedVehicle & { _operatorId?: string };
    });

    // ── ENRIQUECIMIENTO CLIENT-SIDE ────────────────────────────────────────
    // 2026-05-16: el backend de tracking a veces NO devuelve driverName ni
    // companyName (solo IDs). Para que el panel del vehiculo muestre el
    // conductor y operador correctos incluso sin GPS, completamos los
    // nombres desde los maestros. Tolerante a fallos: si algun fetch falla,
    // la lista se devuelve con los nombres faltantes en `undefined`.
    const needsDriverNames = mapped.some((v) => v.driverId && !v.driverName);
    const needsCompanyNames = mapped.some((v) => !v.companyName);
    const needsOperatorIdsFromMaster = mapped.some(
      (v) => !v.companyName && !v._operatorId,
    );

    if (needsDriverNames || needsCompanyNames) {
      const [driversList, operatorsList, masterVehiclesList] = await Promise.all([
        needsDriverNames
          ? driversService.getAll({ pageSize: 200 }).catch(() => null)
          : Promise.resolve(null),
        needsCompanyNames
          ? operatorsService.getAll({ status: "all" }).catch(() => null)
          : Promise.resolve(null),
        needsOperatorIdsFromMaster
          ? vehiclesService.getAll({ pageSize: 200 }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const driverById = new Map<string, { name: string; phone?: string }>();
      if (driversList && Array.isArray(driversList.items)) {
        for (const d of driversList.items as unknown as Array<Record<string, unknown>>) {
          const id = String(d.id ?? "");
          if (!id) continue;
          const name =
            (d.fullName as string | undefined) ??
            [d.firstName as string | undefined, d.lastName as string | undefined]
              .filter(Boolean)
              .join(" ");
          driverById.set(id, {
            name: name || String(d.documentNumber ?? id),
            phone: (d.phone as string | undefined) ?? undefined,
          });
        }
      }

      const operatorById = new Map<string, string>();
      if (operatorsList && Array.isArray(operatorsList)) {
        for (const op of operatorsList as unknown as Array<Record<string, unknown>>) {
          const id = String(op.id ?? "");
          if (!id) continue;
          const name =
            (op.tradeName as string | undefined) ??
            (op.businessName as string | undefined) ??
            "";
          if (name) operatorById.set(id, name);
        }
      }

      const operatorIdByVehicleId = new Map<string, string>();
      if (masterVehiclesList && Array.isArray(masterVehiclesList.items)) {
        for (const mv of masterVehiclesList.items as unknown as Array<Record<string, unknown>>) {
          const id = String(mv.id ?? "");
          const opId =
            (mv.operatorId as string | undefined) ??
            (mv.operator_id as string | undefined) ??
            undefined;
          if (id && opId) operatorIdByVehicleId.set(id, opId);
        }
      }

      for (const v of mapped) {
        if (v.driverId && !v.driverName) {
          const d = driverById.get(v.driverId);
          if (d) {
            v.driverName = d.name;
            if (!v.driverPhone) v.driverPhone = d.phone;
          }
        }
        if (!v.companyName) {
          const opId = v._operatorId ?? operatorIdByVehicleId.get(v.id);
          if (opId) {
            const cname = operatorById.get(opId);
            if (cname) v.companyName = cname;
          }
        }
      }
    }

    // Limpiar campos internos antes de devolver
    return mapped.map((v) => {
      const { _operatorId: _ignored, ...clean } = v;
      void _ignored;
      return clean as TrackedVehicle;
    });
  }

  /**
   * Obtiene la posicion actual de un vehiculo.
   * 2026-05-03: agregado unwrap.
   */
  async getVehiclePosition(vehicleId: string): Promise<VehiclePosition | null> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.tracking}/${vehicleId}/position`);
    return unwrap<VehiclePosition | null>(raw);
  }

  /**
   * Obtiene informacion de un vehiculo rastreado.
   * 2026-05-03: agregado unwrap.
   */
  async getTrackedVehicle(vehicleId: string): Promise<TrackedVehicle | null> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.tracking}/${vehicleId}`);
    return unwrap<TrackedVehicle | null>(raw);
  }

  /**
   * Obtiene la orden asociada a un vehiculo.
   * 2026-05-03: agregado unwrap.
   */
  async getOrderByVehicle(vehicleId: string): Promise<TrackedOrder | null> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.tracking}/${vehicleId}/order`);
    return unwrap<TrackedOrder | null>(raw);
  }

  /**
   * Obtiene el estado de los hitos de una orden.
   *
   * 2026-05-03: corregido. El endpoint `GET /orders/:id/milestones` NO existe
   * en el backend (verificado contra producción: devuelve 404). Solo existe
   * `PATCH /orders/:id/milestones/:milestoneId` para modificar UNO individual.
   *
   * Workaround: obtener los milestones desde `GET /orders/:id` que devuelve
   * la orden con `milestones[]` en el detalle. Si ese endpoint también da 404
   * (no implementado todavía), retornamos array vacío para que la UI no rompa.
   */
  async getMilestoneStatus(orderId: string): Promise<TrackedMilestone[]> {
    try {
      const order = await apiClient.get<{ milestones?: TrackedMilestone[] }>(
        `${API_ENDPOINTS.operations.orders}/${orderId}`
      );
      return order?.milestones ?? [];
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn(
          `[TrackingService.getMilestoneStatus] backend no implementa GET /orders/:id ` +
          `o no devuelve milestones[]. Retornando array vacío.`
        );
        return [];
      }
      throw err;
    }
  }

  /**
   * Obtiene vehículos con órdenes activas.
   *
   * 2026-05-03: el endpoint `/monitoring/tracking/with-orders` NO está en el
   * Excel oficial y produccion devuelve 404. Es un endpoint inventado por el
   * frontend. Como workaround, derivamos del listado general filtrando los que
   * tienen `currentOrderId` o equivalente. Si el listado general también falla
   * o el shape no incluye orden, retornamos array vacío.
   */
  async getVehiclesWithOrders(): Promise<TrackedVehicle[]> {
    try {
      const all = await apiClient.get<TrackedVehicle[] | { items?: TrackedVehicle[] }>(
        API_ENDPOINTS.monitoring.tracking
      );
      const list = Array.isArray(all)
        ? all
        : ((all as { items?: TrackedVehicle[] }).items ?? []);
      return list.filter((v) => {
        const withOrder = v as TrackedVehicle & { currentOrderId?: string; orderId?: string };
        return Boolean(withOrder.currentOrderId ?? withOrder.orderId);
      });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn(
          `[TrackingService.getVehiclesWithOrders] backend no implementa el ` +
          `listado base de tracking. Retornando array vacío.`
        );
        return [];
      }
      throw err;
    }
  }

  /**
   * Obtiene lista única de transportistas/operadores
   *
   * BUG backend: /monitoring/tracking/carriers devuelve 404 "Vehicle not found"
   * porque el router captura "carriers" como si fuera un vehicleId (mismo
   * BUG #1 del routing). Cuando eso pasa, devolvemos array vacío como
   * fallback — la UI del filtro de transportistas no rompe.
   */
  async getCarriers(): Promise<string[]> {
    try {
      const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.tracking}/carriers`);
      return unwrap<string[]>(raw);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn("[trackingService.getCarriers] backend 404. Devolviendo [] como fallback.");
        return [];
      }
      throw err;
    }
  }

  /**
   * Centra el mapa en un vehículo específico
   * (Este método retorna las coordenadas para que el componente de mapa las use)
   */
  async getVehicleCoordinates(vehicleId: string): Promise<{ lat: number; lng: number } | null> {
    const position = await this.getVehiclePosition(vehicleId);
    if (!position) return null;
    return { lat: position.lat, lng: position.lng };
  }

  /**
   * Calcula el progreso de una orden basado en los hitos
   */
  calculateOrderProgress(milestones: TrackedMilestone[]): {
    progress: number;
    currentMilestone: TrackedMilestone | null;
    completedCount: number;
    totalCount: number;
  } {
    const totalCount = milestones.length;
    const completedCount = milestones.filter(m => m.trackingStatus === "completed").length;
    const currentMilestone = milestones.find(m => m.trackingStatus === "in_progress") || null;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      progress,
      currentMilestone,
      completedCount,
      totalCount,
    };
  }
}

/**
 * Singleton del servicio de tracking
 */
export const trackingService = new TrackingService();
