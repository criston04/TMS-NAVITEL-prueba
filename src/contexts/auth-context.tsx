"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
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

// ════════════════════════════════════════════════════════
// PROVIDER
// ════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem("tms_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (isPlatformUser(parsed)) {
            setPlatformUser(parsed);
            setUser(null);
          } else {
            setUser(parsed);
            setPlatformUser(null);
          }
        }
      } catch {
        localStorage.removeItem("tms_user");
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

  const login = (userData: AuthUser | PlatformUser) => {
    if (isPlatformUser(userData)) {
      setPlatformUser(userData);
      setUser(null);
    } else {
      setUser(userData);
      setPlatformUser(null);
    }
    localStorage.setItem("tms_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setPlatformUser(null);
    localStorage.removeItem("tms_user");
    localStorage.removeItem("tms_access_token");
    localStorage.removeItem("tms_refresh_token");
    router.push("/login");
  };

  const updateUser = (data: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem("tms_user", JSON.stringify(updatedUser));
    }
  };

  /** Verifica si el usuario tiene permiso sobre un recurso + acción */
  const can = (resource: PermissionResource, action: PermissionAction): boolean => {
    if (!currentRole) return false;
    // Los usuarios de plataforma usan sus propios permisos
    if (platformUser) {
      return hasPermission(platformUser.role, resource, action, platformUser.permissions);
    }
    if (user) {
      return hasPermission(user.role, resource, action, user.permissions);
    }
    return false;
  };

  /** Verifica si el usuario tiene alguno de los roles especificados */
  const hasRoleFn = (...roles: AnyRole[]): boolean => {
    if (!currentRole) return false;
    return roles.includes(currentRole);
  };

  /** Verifica si el usuario pertenece a un grupo de roles */
  const inGroupFn = (group: keyof typeof ROLE_GROUPS): boolean => {
    if (!currentRole) return false;
    return isInGroup(currentRole, group);
  };

  /** Verifica si un módulo está habilitado para el tenant */
  const hasModuleEnabledFn = (module: SystemModuleCode): boolean => {
    // Los usuarios de plataforma siempre ven todo
    if (isPlatformFlag) return true;
    // Si no hay lista de módulos, asumir que todos están habilitados (desarrollo)
    if (enabledModules.length === 0) return true;
    return enabledModules.includes(module);
  };

  // forcePasswordChange
  const requiresPasswordChange = useMemo(() => {
    const currentUser = user || platformUser;
    if (!currentUser) return false;
    return "forcePasswordChange" in currentUser && !!currentUser.forcePasswordChange;
  }, [user, platformUser]);

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
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
