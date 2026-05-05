import type {
  RetransmissionRecord,
  RetransmissionStats,
  RetransmissionFilters,
  GpsCompany,
} from "@/types/monitoring";
import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * 2026-05-03: Helper para desempacar respuestas envueltas en `{data: ...}`.
 * Verificado empiricamente que el modulo monitoreo del backend devuelve casi
 * todo con envelope `{data: ...}`. Sin desempacar, los componentes reciben el
 * objeto envoltorio en lugar del array/objeto real (stats con `total` undefined,
 * dropdowns vacios, etc.).
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
 * Stats vacios usados como fallback cuando el backend no implementa /stats todavia.
 */
function emptyStats(): RetransmissionStats {
  return {
    total: 0,
    online: 0,
    temporaryLoss: 0,
    disconnected: 0,
    onlinePercentage: 0,
    temporaryLossPercentage: 0,
    disconnectedPercentage: 0,
  };
}

/**
 * Servicio de Retransmisión
 * Maneja consultas y actualizaciones de estado de retransmisión GPS
 */
export class RetransmissionService {
  /**
   * Obtiene todos los registros de retransmisión con filtros opcionales
   */
  async getAll(filters?: RetransmissionFilters): Promise<RetransmissionRecord[]> {
    // Backend devuelve {data: []} (no array directo). Desempacamos por robustez.
    const response = await apiClient.get<unknown>(API_ENDPOINTS.monitoring.retransmission, {
      params: filters as unknown as Record<string, string>,
    });
    if (Array.isArray(response)) return response as RetransmissionRecord[];
    if (response && typeof response === "object") {
      const r = response as { data?: unknown; items?: unknown };
      const list = r.data ?? r.items;
      if (Array.isArray(list)) return list as RetransmissionRecord[];
    }
    return [];
  }

  /**
   * Obtiene un registro por ID.
   * 2026-05-03: agregado unwrap para envelope `{data: ...}`.
   */
  async getById(id: string): Promise<RetransmissionRecord | null> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.retransmission}/${id}`);
    return unwrap<RetransmissionRecord | null>(raw);
  }

  /**
   * Actualiza el comentario de un registro.
   * 2026-05-03: agregado unwrap.
   */
  async updateComment(recordId: string, comment: string): Promise<RetransmissionRecord> {
    const raw = await apiClient.patch<unknown>(`${API_ENDPOINTS.monitoring.retransmission}/${recordId}/comment`, { comment });
    return unwrap<RetransmissionRecord>(raw);
  }

  /**
   * Obtiene estadisticas de retransmision.
   * 2026-05-03 (bug fix CRITICO): el backend devuelve `{data: {total, online, ...}}`
   * y antes el frontend retornaba el envelope completo, asi que la UI accedia
   * a `stats.total` que era undefined (en realidad estaba en `stats.data.total`).
   * Resultado: cards mostraban "0" cuando en realidad habia datos. Ahora
   * desempacamos con `unwrap()`.
   */
  async getStats(filters?: RetransmissionFilters): Promise<RetransmissionStats> {
    try {
      const raw = await apiClient.get<unknown>(
        `${API_ENDPOINTS.monitoring.retransmission}/stats`,
        { params: filters as unknown as Record<string, string> }
      );
      return unwrap<RetransmissionStats>(raw);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn("[retransmissionService.getStats] backend 404. Devolviendo stats vacios.");
        return emptyStats();
      }
      throw err;
    }
  }

  /**
   * Obtiene lista de empresas GPS.
   * 2026-05-03 (bug fix): agregado unwrap. El backend responde con `{data: []}`.
   */
  async getGpsCompanies(): Promise<GpsCompany[]> {
    try {
      const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.retransmission}/gps-companies`);
      return unwrap<GpsCompany[]>(raw);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn("[retransmissionService.getGpsCompanies] backend 404. Devolviendo [].");
        return [];
      }
      throw err;
    }
  }

  /**
   * Obtiene solo empresas GPS activas.
   * 2026-05-03 (bug fix): agregado unwrap.
   */
  async getActiveGpsCompanies(): Promise<GpsCompany[]> {
    try {
      const raw = await apiClient.get<unknown>(
        `${API_ENDPOINTS.monitoring.retransmission}/gps-companies`,
        { params: { active: "true" } }
      );
      return unwrap<GpsCompany[]>(raw);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn("[retransmissionService.getActiveGpsCompanies] backend 404. Devolviendo [].");
        return [];
      }
      throw err;
    }
  }

  /**
   * Obtiene lista unica de empresas/operadores en los registros.
   * 2026-05-03 (bug fix): agregado unwrap. El backend responde `{data: []}`.
   * Antes el dropdown "Empresa" en filtros aparecia vacio aunque hubiera datos.
   */
  async getCompanies(): Promise<string[]> {
    try {
      const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.monitoring.retransmission}/companies`);
      return unwrap<string[]>(raw);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        console.warn("[retransmissionService.getCompanies] backend 404. Devolviendo [].");
        return [];
      }
      throw err;
    }
  }

  /**
   * Exporta registros de retransmisión a CSV
   */
  async exportToCSV(filters?: RetransmissionFilters): Promise<Blob> {
    const records = await this.getAll(filters);

    const headers = [
      "ID",
      "Placa",
      "Empresa",
      "GPS Provider",
      "Última Conexión",
      "Estado Movimiento",
      "Estado Retransmisión",
      "Duración Sin Conexión (seg)",
      "Comentarios"
    ].join(",");

    const rows = records.map(record => [
      record.id,
      record.vehiclePlate,
      `"${record.companyName}"`,
      record.gpsCompanyName,
      record.lastConnection,
      record.movementStatus,
      record.retransmissionStatus,
      record.disconnectedDuration,
      `"${record.comments || ""}"`,
    ].join(","));

    const csv = [headers, ...rows].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8;" });
  }

  /**
   * Marca multiples registros con el mismo comentario.
   * 2026-05-03: agregado unwrap.
   */
  async bulkUpdateComments(recordIds: string[], comment: string): Promise<RetransmissionRecord[]> {
    const raw = await apiClient.patch<unknown>(`${API_ENDPOINTS.monitoring.retransmission}/bulk-comments`, {
      recordIds,
      comment,
    });
    return unwrap<RetransmissionRecord[]>(raw);
  }
}

/**
 * Singleton del servicio de retransmisión
 */
export const retransmissionService = new RetransmissionService();
