"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type {
  AuthUser,
  PlatformUser,
  UserRole,
  AnyRole,
  UserTier,
  PermissionResource,
  PermissionAction,
} from "@/types/auth";
import {
  hasPermission,
  isInGroup,
  isPlatformRole,
  isMasterUserRole,
  isSubUserRole,
  canCreateUsers,
  canModifyAccountConfig,
  canManageModules,
  canTransferVehicles,
  getAssignableRoles,
  getRoleRestrictions,
  getUserTier,
  ROLE_GROUPS,
} from "@/types/auth";
import type { SystemModuleCode, UserScope } from "@/types/platform";
import {
  getStoredUser,
  setStoredUser,
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  type StoredUser,
} from "@/lib/auth-storage";
import { refreshAccessToken } from "@/lib/api";

// ════════════════════════════════════════════════════════
// TIPOS DEL CONTEXTO
// ════════════════════════════════════════════════════════

interface AuthContextType {
  /** Usuario autenticado (tenant o plataforma) */
  user: AuthUser | null;
  /** Usuario de plataforma (solo si es platform_owner/platform_admin) */
  platformUser: PlatformUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: AuthUser | PlatformUser) => void;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;

  // ── Permisos ──
  /** Verifica si el usuario actual tiene un permiso específico */
  can: (resource: PermissionResource, action: PermissionAction) => boolean;
  /** Verifica si el usuario pertenece a alguno de los roles especificados */
  hasRole: (...roles: AnyRole[]) => boolean;
  /** Verifica si el usuario pertenece a un grupo de roles */
  inGroup: (group: keyof typeof ROLE_GROUPS) => boolean;

  // ── Jerarquía de 3 niveles ──
  /** Tier actual del usuario (platform, tenant_admin, tenant_user) */
  tier: UserTier | null;
  /** Es un usuario de plataforma (Nivel 1: Owner del TMS) */
  isPlatform: boolean;
  /** Es un Usuario Maestro (Nivel 2: Client Admin) */
  isMasterUser: boolean;
  /** Es un Subusuario (Nivel 3: Operador) */
  isSubUser: boolean;

  // ── Capacidades según jerarquía ──
  /** Puede crear usuarios (solo Nivel 1 y 2) */
  canCreateUsers: boolean;
  /** Puede modificar configuración de la cuenta (solo Nivel 1 y 2) */
  canModifyConfig: boolean;
  /** Puede gestionar módulos del tenant (solo Nivel 1) */
  canManageModules: boolean;
  /** Puede transferir vehículos entre tenants (solo platform_owner) */
  canTransferVehicles: boolean;

  // ── Módulos y Scope ──
  /** Verifica si un módulo está habilitado para el tenant del usuario */
  hasModuleEnabled: (module: SystemModuleCode) => boolean;
  /** Módulos habilitados del tenant */
  enabledModules: SystemModuleCode[];
  /** Scope/alcance de visibilidad del usuario */
  scope: UserScope | null;
  /** Restricciones del rol actual */
  restrictions: string[];

  // ── Forzar cambio de contraseña ──
  /** Si el usuario debe cambiar su contraseña antes de continuar */
  requiresPasswordChange: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];
const FORCE_PASSWORD_CHANGE_ROUTE = "/change-password";

// ════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ════════════════════════════════════════════════════════

/**
 * Determina si un usuario es de tipo PlatformUser
 */
function isPlatformUser(user: AuthUser | PlatformUser): user is PlatformUser {
  return user.tier === "platform";
}

/**
 * Pide un nuevo access token al backend usando el refresh token guardado.
 * Lo guarda en memoria (auth-storage).
 *
 * 2026-05-03 (UI bug fix): antes esta función hacía SU PROPIA llamada a
 * `/auth/refresh` con `fetch()` directo. Eso causaba race condition con
 * `apiClient.refreshAccessToken()` (en api.ts) cuando ambos disparaban
 * en paralelo al hacer F5: el primero gastaba el refresh-token (que el
 * backend invalida tras un solo uso) y el segundo recibía 401 → todas las
 * páginas mostraban error de autenticación.
 *
 * Ahora usamos la función exportada `refreshAccessToken` de api.ts que
 * tiene `inflightRefresh` lock — si dos puntos del código llaman al mismo
 * tiempo, ambos reciben la MISMA promesa (1 sola request real al backend).
 */
async function prefetchAccessToken(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;

  try {
    const newAccess = await refreshAccessToken();
    if (!newAccess) {
      // refresh falló (401, 403, o cualquier otro error): limpiar sesión
      clearAuthSession();
    }
    // Si OK, ya está persistido en memoria por persistTokens dentro del helper.
  } catch (err) {
    console.warn("[AuthProvider.prefetchAccessToken] error:", err);
  }
}

// ════════════════════════════════════════════════════════
// PROVIDER
// ════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar sesión al cargar (lee desde sessionStorage via auth-storage).
  //
  // FLUJO CRÍTICO post-F5:
  //  1. El access token vive solo en memoria → tras F5 está null.
  //  2. El refresh token persiste en sessionStorage.
  //  3. Si tenemos refresh sin access, hacemos pre-refresh ANTES de que las
  //     páginas hagan sus primeras queries. Sin esto, todas las queries
  //     iniciales fallan con 401 (aunque luego se reintentan vía interceptor,
  //     duplica latencia y rompe queries que no toleran retry).
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const parsed = getStoredUser() as (AuthUser | PlatformUser) | null;
        if (parsed) {
          // Normalizar role uppercase → lowercase
          const normalized = { ...parsed } as AuthUser | PlatformUser;
          if (typeof (normalized as { role?: string }).role === "string") {
            (normalized as { role: string }).role = (normalized as { role: string }).role.toLowerCase();
          }
          if (isPlatformUser(normalized)) {
            setPlatformUser(normalized);
            setUser(null);
          } else {
            setUser(normalized);
            setPlatformUser(null);
          }

          // Pre-refresh: si hay refresh token pero no access token, pedir uno
          // nuevo ANTES de que las páginas disparen queries.
          if (!getAccessToken() && getRefreshToken()) {
            await prefetchAccessToken();
          }
        }
      } catch {
        clearAuthSession();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Protección de rutas
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
    const currentUser = user || platformUser;

    if (!currentUser && !isPublicRoute) {
      router.push("/login");
    } else if (currentUser && isPublicRoute) {
      router.push("/");
    }

    // Forzar cambio de contraseña
    if (currentUser && !isPublicRoute) {
      const needsChange = "forcePasswordChange" in currentUser && currentUser.forcePasswordChange;
      if (needsChange && pathname !== FORCE_PASSWORD_CHANGE_ROUTE) {
        router.push(FORCE_PASSWORD_CHANGE_ROUTE);
      }
    }
  }, [user, platformUser, isLoading, pathname, router]);

  // Rol actual (unificado)
  const currentRole: AnyRole | null = useMemo(() => {
    if (platformUser) return platformUser.role;
    if (user) return user.role;
    return null;
  }, [user, platformUser]);

  // Tier actual
  const currentTier: UserTier | null = useMemo(() => {
    if (platformUser) return "platform";
    if (user) return user.tier ?? getUserTier(user.role);
    return null;
  }, [user, platformUser]);

  // Módulos habilitados
  const enabledModules: SystemModuleCode[] = useMemo(() => {
    if (user?.enabledModules) return user.enabledModules;
    // Los usuarios de plataforma ven todos los módulos
    if (platformUser) return [];
    return [];
  }, [user, platformUser]);

  // Scope del usuario
  const currentScope: UserScope | null = useMemo(() => {
    return user?.scope ?? null;
  }, [user]);

  // Restricciones del rol
  const restrictions: string[] = useMemo(() => {
    if (!currentRole) return [];
    return getRoleRestrictions(currentRole);
  }, [currentRole]);

  // Flags de jerarquía
  const isPlatformFlag = useMemo(() => !!currentRole && isPlatformRole(currentRole), [currentRole]);
  const isMasterUserFlag = useMemo(() => !!currentRole && isMasterUserRole(currentRole), [currentRole]);
  const isSubUserFlag = useMemo(() => !!currentRole && isSubUserRole(currentRole), [currentRole]);

  // Flags de capacidades
  const canCreateUsersFlag = useMemo(() => !!currentRole && canCreateUsers(currentRole), [currentRole]);
  const canModifyConfigFlag = useMemo(() => !!currentRole && canModifyAccountConfig(currentRole), [currentRole]);
  const canManageModulesFlag = useMemo(() => !!currentRole && canManageModules(currentRole), [currentRole]);
  const canTransferVehiclesFlag = useMemo(() => !!currentRole && canTransferVehicles(currentRole), [currentRole]);

  const login = useCallback((userData: AuthUser | PlatformUser) => {
    // Normalizar role aquí también (no solo al rehidratar). Sin esto, en la
    // sesión recién creada el role queda UPPERCASE y hasPermission falla.
    const normalized = { ...userData } as AuthUser | PlatformUser;
    if (typeof (normalized as { role?: string }).role === "string") {
      (normalized as { role: string }).role = (normalized as { role: string }).role.toLowerCase();
    }

    if (isPlatformUser(normalized)) {
      setPlatformUser(normalized);
      setUser(null);
    } else {
      setUser(normalized);
      setPlatformUser(null);
    }
    setStoredUser(normalized as unknown as StoredUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setPlatformUser(null);
    clearAuthSession();
    router.push("/login");
  }, [router]);

  const updateUser = useCallback((data: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      setStoredUser(updatedUser as unknown as StoredUser);
    }
  }, [user]);

  /** Verifica si el usuario tiene permiso sobre un recurso + acción */
  const can = useCallback((resource: PermissionResource, action: PermissionAction): boolean => {
    if (!currentRole) return false;
    // Los usuarios de plataforma usan sus propios permisos
    if (platformUser) {
      return hasPermission(platformUser.role, resource, action, platformUser.permissions);
    }
    if (user) {
      return hasPermission(user.role, resource, action, user.permissions);
    }
    return false;
  }, [currentRole, platformUser, user]);

  /** Verifica si el usuario tiene alguno de los roles especificados */
  const hasRoleFn = useCallback((...roles: AnyRole[]): boolean => {
    if (!currentRole) return false;
    return roles.includes(currentRole);
  }, [currentRole]);

  /** Verifica si el usuario pertenece a un grupo de roles */
  const inGroupFn = useCallback((group: keyof typeof ROLE_GROUPS): boolean => {
    if (!currentRole) return false;
    return isInGroup(currentRole, group);
  }, [currentRole]);

  /** Verifica si un módulo está habilitado para el tenant */
  const hasModuleEnabledFn = useCallback((module: SystemModuleCode): boolean => {
    // Los usuarios de plataforma siempre ven todo
    if (isPlatformFlag) return true;
    // Si no hay lista de módulos, asumir que todos están habilitados (desarrollo)
    if (enabledModules.length === 0) return true;
    // Check directo primero
    if (enabledModules.includes(module)) return true;
    // Si el module es un código de grupo, verificar si algún módulo hijo está habilitado
    const GROUP_CHILDREN: Partial<Record<SystemModuleCode, SystemModuleCode[]>> = {
      operations: ["orders", "scheduling", "workflows", "bitacora", "route_planner"],
      finance: ["invoicing", "payments", "costs", "rates", "settlements"],
      master_data: ["customers", "drivers", "vehicles", "geofences", "operators", "products"],
    };
    const children = GROUP_CHILDREN[module];
    if (children) return children.some((child) => enabledModules.includes(child));
    return false;
  }, [isPlatformFlag, enabledModules]);

  // forcePasswordChange
  const requiresPasswordChange = useMemo(() => {
    const currentUser = user || platformUser;
    if (!currentUser) return false;
    return "forcePasswordChange" in currentUser && !!currentUser.forcePasswordChange;
  }, [user, platformUser]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    platformUser,
    isLoading,
    isAuthenticated: !!(user || platformUser),
    login,
    logout,
    updateUser,
    // Permisos
    can,
    hasRole: hasRoleFn,
    inGroup: inGroupFn,
    // Jerarquía
    tier: currentTier,
    isPlatform: isPlatformFlag,
    isMasterUser: isMasterUserFlag,
    isSubUser: isSubUserFlag,
    // Capacidades
    canCreateUsers: canCreateUsersFlag,
    canModifyConfig: canModifyConfigFlag,
    canManageModules: canManageModulesFlag,
    canTransferVehicles: canTransferVehiclesFlag,
    // Módulos y Scope
    hasModuleEnabled: hasModuleEnabledFn,
    enabledModules,
    scope: currentScope,
    restrictions,
    // Password
    requiresPasswordChange,
  }), [
    user, platformUser, isLoading, login, logout, updateUser,
    can, hasRoleFn, inGroupFn,
    currentTier, isPlatformFlag, isMasterUserFlag, isSubUserFlag,
    canCreateUsersFlag, canModifyConfigFlag, canManageModulesFlag, canTransferVehiclesFlag,
    hasModuleEnabledFn, enabledModules, currentScope, restrictions, requiresPasswordChange,
  ]);

  // 2026-05-03 (UI bug fix): bloquear children mientras `isLoading=true`
  // EN RUTAS PROTEGIDAS para evitar race condition tras F5.
  //
  // Antes: las páginas se renderizaban en paralelo con `prefetchAccessToken()`
  // y disparaban queries SIN token, recibiendo 401. El interceptor las
  // reintentaba con el nuevo token (que sí funcionaba), pero quedaban N
  // requests rojas en Network y duplicado de latencia.
  //
  // Ahora: durante `isLoading=true` mostramos un spinner. Cuando el AuthProvider
  // termina (token en memoria listo), recién se montan las páginas y sus
  // queries salen YA con el token. Una sola request por endpoint, todas 200.
  //
  // Excepción: rutas públicas (/login, /register, /forgot-password) renderizan
  // sin bloqueo porque no necesitan auth.
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <AuthContext.Provider value={contextValue}>
      {isLoading && !isPublicRoute ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Cargando sesión...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
