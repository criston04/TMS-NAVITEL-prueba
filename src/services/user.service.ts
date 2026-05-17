/**
 * User Service — Gestion de usuarios DENTRO del tenant logueado.
 *
 * Para los Tenant Admins (Niveles 2 y 3 de la jerarquia multi-tenant).
 *
 * 2026-05-06: creado para reemplazar el mock de UserManagement.
 * 2026-05-14: CORREGIDO — el backend unificó todos los usuarios bajo
 *   /platform/users (misma tabla, mismo endpoint). Los paths cambiaron
 *   de /users → /platform/users. El maestro filtra por tenant_id.
 *
 * Backend handoff: `otros/docs-backend/17-plataforma/PLATAFORMA-BACKEND-HANDOFF.md`
 *
 * Endpoints del backend (doc sección 10 + 16.6 — bajo /platform/users):
 *  - GET    /platform/users?tenant_id=X     → listar usuarios del tenant
 *  - GET    /platform/users/:id             → detalle
 *  - POST   /platform/users                 → crear subusuario (con tenant_id en body)
 *  - PUT    /platform/users/:id             → actualizar datos basicos
 *  - DELETE /platform/users/:id             → soft-delete
 *  - PATCH  /platform/users/:id/permissions → set custom_permissions
 *  - PATCH  /platform/users/:id/scope       → set scope
 *  - PATCH  /platform/users/:id/status      → activar/desactivar
 *  - POST   /platform/users/:id/reset-password → reset password
 *  - GET    /me/license                     → estado de licencia del tenant
 */

import { apiClient } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api.config";
import { snakeToCamel } from "@/lib/case-converter";
import { getStoredUser } from "@/lib/auth-storage";
import type {
  AuthUser,
  CreateUserDTO,
  UpdateUserDTO,
  Permission,
} from "@/types/auth";
import type { UserScope } from "@/types/platform";

/**
 * Obtiene el tenantId del usuario logueado desde sessionStorage.
 * Necesario porque /platform/users es un endpoint compartido —
 * el maestro debe filtrar/crear usuarios de SU tenant.
 */
function getCurrentTenantId(): string | null {
  const user = getStoredUser<{ tenantId?: string }>();
  return user?.tenantId ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
//  Tipos auxiliares
// ════════════════════════════════════════════════════════════════════════════

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedUsers {
  items: AuthUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Estado de la licencia del tenant logueado.
 * Lo expone GET /me/license — frontend hace poll cada 5 minutos.
 */
export interface TenantLicenseStatus {
  tenantId: string;
  tenantStatus: "active" | "trial" | "suspended" | "cancelled" | "pending";
  plan: "starter" | "professional" | "enterprise" | "custom";
  subscriptionStartDate: string;
  subscriptionEndDate: string | null;
  isTrialActive: boolean;
  trialEndDate: string | null;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // true si daysRemaining > 0 && <= 14
  limits: {
    maxUsers: number;
    maxVehicles: number;
    currentUsersCount: number;
    currentVehiclesCount: number;
    usersPercentage: number;
    vehiclesPercentage: number;
  };
  enabledModules: Array<{
    moduleCode: string;
    isEnabled: boolean;
  }>;
}

export interface ResetPasswordPayload {
  temporaryPassword?: string;
  sendByEmail?: boolean;
  forceChangeOnLogin?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
//  Helper: aplicar snakeToCamel manteniendo unwrap del envelope {data|items}
// ════════════════════════════════════════════════════════════════════════════

/**
 * Unwrap del envelope {data|items} + snakeToCamel.
 *
 * 2026-05-14: también normaliza first_name/last_name → name para que el
 * AuthUser del frontend reciba el campo `name` que espera, aunque el backend
 * devuelva `first_name` + `last_name` por separado.
 */
function unwrap<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object") return raw as T;
  const r = raw as { data?: unknown; items?: unknown };
  const inner = r.data ?? r.items ?? raw;
  const camel = snakeToCamel<Record<string, unknown>>(inner);

  // Normalizar first_name/last_name → name (si el backend no devuelve `name`)
  if (camel && typeof camel === "object" && !Array.isArray(camel)) {
    if (!camel.name && (camel.firstName || camel.lastName)) {
      camel.name = [camel.firstName, camel.lastName].filter(Boolean).join(" ");
    }
    // Normalizar status → isActive (el backend usa "active"/"inactive", frontend usa boolean)
    if (camel.status && camel.isActive === undefined) {
      camel.isActive = camel.status === "active";
    }
    // Normalizar username → email fallback
    if (!camel.email && camel.username) {
      camel.email = camel.username;
    }
  }

  return camel as T;
}

// ════════════════════════════════════════════════════════════════════════════
//  USERSERVICE
// ════════════════════════════════════════════════════════════════════════════

class UserService {
  private readonly endpoint = API_ENDPOINTS.users.base;

  /**
   * Lista paginada de usuarios DEL tenant logueado.
   *
   * 2026-05-14: el backend unificó todos los usuarios bajo /platform/users.
   * Para que el maestro solo vea los de SU tenant, pasamos `tenant_id` como
   * query param. Si el backend filtra por JWT automáticamente, el param extra
   * es ignorado (defensivo).
   */
  async getAll(filters: UserFilters = {}): Promise<PaginatedUsers> {
    const params: Record<string, string> = {};
    const tenantId = getCurrentTenantId();
    if (tenantId) params.tenant_id = tenantId;
    if (filters.page) params.page = String(filters.page);
    if (filters.pageSize) params.pageSize = String(filters.pageSize);
    if (filters.search) params.search = filters.search;
    if (filters.role && filters.role !== "all") params.role = filters.role;
    if (typeof filters.isActive === "boolean") params.isActive = String(filters.isActive);

    const response = await apiClient.get<Record<string, unknown>>(this.endpoint, { params });
    const camel = snakeToCamel<{
      items?: unknown[];
      data?: unknown[];
      meta?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
      pagination?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
    }>(response);

    const rawItems = (camel.items ?? camel.data ?? []) as Record<string, unknown>[];
    // Normalizar cada item: first_name/last_name → name, status → isActive
    const items = rawItems.map((item) => {
      const u = item as Record<string, unknown>;
      if (!u.name && (u.firstName || u.lastName)) {
        u.name = [u.firstName, u.lastName].filter(Boolean).join(" ");
      }
      if (u.status && u.isActive === undefined) {
        u.isActive = u.status === "active";
      }
      if (!u.email && u.username) {
        u.email = u.username;
      }
      return u as unknown as AuthUser;
    });
    const meta = camel.meta ?? camel.pagination ?? {};
    const total = meta.total ?? items.length;
    const page = meta.page ?? filters.page ?? 1;
    const pageSize = meta.pageSize ?? filters.pageSize ?? items.length;
    const totalPages = meta.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

    return { items, total, page, pageSize, totalPages };
  }

  /** Detalle de un usuario del tenant. */
  async getById(id: string): Promise<AuthUser> {
    const raw = await apiClient.get<Record<string, unknown>>(`${this.endpoint}/${id}`);
    return unwrap<AuthUser>(raw);
  }

  /**
   * Crear subusuario dentro del tenant.
   *
   * 2026-05-14: el backend usa /platform/users para TODOS los usuarios.
   * Inyectamos `tenant_id` del JWT para que el backend sepa a qué tenant
   * pertenece el nuevo usuario. Convertimos los campos del CreateUserDTO
   * al shape que el backend espera (snake_case + campos compatibles).
   *
   * El backend:
   *  - Valida que el rol pedido sea uno permitido para crear
   *  - Valida limite de usuarios del plan (max_users)
   *  - Valida que cada modulo en customPermissions este activado para el tenant
   */
  async create(data: CreateUserDTO): Promise<AuthUser> {
    const tenantId = getCurrentTenantId();
    const payload: Record<string, unknown> = {
      ...data,
      tenant_id: tenantId,
    };
    // El backend puede esperar first_name/last_name en vez de name.
    // Enviamos ambos formatos para máxima compatibilidad.
    if (data.name && !payload.first_name) {
      const parts = data.name.trim().split(/\s+/);
      payload.first_name = parts[0] ?? data.name;
      payload.last_name = parts.slice(1).join(" ") || null;
      // También enviamos username = email (el backend lo requiere para login)
      if (!payload.username) {
        payload.username = data.email;
      }
    }
    // Convertir customPermissions [{resource, actions[]}] → permissions ["resource.action"]
    if (data.customPermissions && data.customPermissions.length > 0) {
      payload.permissions = data.customPermissions.flatMap((p) =>
        p.actions.map((action) => `${p.resource}.${action}`),
      );
      delete payload.customPermissions;
    }
    const raw = await apiClient.post<Record<string, unknown>>(this.endpoint, payload);
    return unwrap<AuthUser>(raw);
  }

  /**
   * Actualizar campos del subusuario.
   * 2026-05-14: convierte al shape snake_case que /platform/users espera.
   */
  async update(id: string, data: UpdateUserDTO): Promise<AuthUser> {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) {
      const parts = data.name.trim().split(/\s+/);
      payload.first_name = parts[0] ?? data.name;
      payload.last_name = parts.slice(1).join(" ") || null;
    }
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.role !== undefined) payload.role = data.role;
    if (data.isActive !== undefined) payload.status = data.isActive ? "active" : "inactive";
    if (data.customPermissions !== undefined) {
      payload.permissions = data.customPermissions
        ? data.customPermissions.flatMap((p) =>
            p.actions.map((action) => `${p.resource}.${action}`),
          )
        : [];
    }
    if (data.scope !== undefined) payload.scope = data.scope;
    if (data.forcePasswordChange !== undefined) payload.force_password_change = data.forcePasswordChange;
    const raw = await apiClient.put<Record<string, unknown>>(`${this.endpoint}/${id}`, payload);
    return unwrap<AuthUser>(raw);
  }

  /** Soft-delete del subusuario. NO permitido sobre el master_user_id del tenant. */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Override de permisos custom. Si `permissions` es `null`, vuelve al default del rol.
   * Si tiene valor, son los unicos permisos efectivos del usuario.
   *
   * Endpoint: PATCH /platform/users/:id/permissions (doc sección 10, endpoint 6)
   *
   * Doc sección 17.1.A dice:
   *   Body: { customPermissions: Permission[] | null }
   *   Permission = { resource: string, actions: string[] }
   *
   * Como /platform/users usa snake_case, enviamos `custom_permissions`.
   */
  async updatePermissions(id: string, permissions: Permission[] | null): Promise<AuthUser> {
    // Backend acepta "permissions" o "customPermissions" (mensaje de error 400).
    // Doc sección 13.5 usa formato estructurado: [{resource, actions[]}].
    const raw = await apiClient.patch<Record<string, unknown>>(
      `${this.endpoint}/${id}/permissions`,
      { customPermissions: permissions && permissions.length > 0 ? permissions : null },
    );
    return unwrap<AuthUser>(raw);
  }

  /**
   * Actualizar scope (alcance: por vehiculo / fleet group / geocerca / customer).
   *
   * Endpoint: PATCH /platform/users/:id/scope (doc sección 10, endpoint 7)
   */
  async updateScope(id: string, scope: UserScope): Promise<AuthUser> {
    const raw = await apiClient.patch<Record<string, unknown>>(
      `${this.endpoint}/${id}/scope`,
      { scope },
    );
    return unwrap<AuthUser>(raw);
  }

  /**
   * Reset de password. Si `temporaryPassword` no viene, el backend genera uno
   * aleatorio y lo devuelve en `response.temporaryPassword` (solo en esta llamada).
   */
  async resetPassword(
    id: string,
    payload: ResetPasswordPayload = {},
  ): Promise<{ temporaryPassword?: string }> {
    const raw = await apiClient.post<{ temporaryPassword?: string; data?: { temporaryPassword?: string } }>(
      `${this.endpoint}/${id}/reset-password`,
      {
        temporaryPassword: payload.temporaryPassword,
        sendByEmail: payload.sendByEmail ?? true,
        forceChangeOnLogin: payload.forceChangeOnLogin ?? true,
      },
    );
    return raw.data ?? raw ?? {};
  }

  /**
   * Activar / desactivar un usuario sin eliminarlo.
   *
   * Endpoint: PATCH /platform/users/:id/status (doc sección 10, endpoint 9)
   * El backend usa `status: "active"|"inactive"` en vez de `isActive: boolean`.
   */
  async setStatus(id: string, isActive: boolean, reason?: string): Promise<AuthUser> {
    const raw = await apiClient.patch<Record<string, unknown>>(
      `${this.endpoint}/${id}/status`,
      { status: isActive ? "active" : "inactive", isActive, reason },
    );
    return unwrap<AuthUser>(raw);
  }

  /**
   * Estado de la licencia del tenant logueado.
   * Lo invoca el LicenseBanner cada 5 minutos para mostrar:
   *  - Banner amarillo si vencimiento ≤ 14 dias.
   *  - Banner rojo si vencido.
   *  - Bloqueo total si tenantStatus = suspended/cancelled.
   *
   * Tolera 404 (endpoint no implementado) devolviendo `null`.
   */
  async getLicense(): Promise<TenantLicenseStatus | null> {
    try {
      const raw = await apiClient.get<Record<string, unknown>>(API_ENDPOINTS.users.license);
      return unwrap<TenantLicenseStatus>(raw);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        // Endpoint pendiente — el frontend muestra UI sin enforcement hasta que el backend lo implemente.
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[userService.getLicense] GET /me/license devuelve 404. " +
              "El backend aun no implementa el endpoint — license banner desactivado.",
          );
        }
        return null;
      }
      throw err;
    }
  }
}

/** Singleton. */
export const userService = new UserService();
