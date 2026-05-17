"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, User, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getUserTier, type AuthUser, type UserRole } from "@/types/auth";
import { setAccessToken, setRefreshToken } from "@/lib/auth-storage";

// Módulos a habilitar por defecto cuando se loguea contra backend real
const ALL_MODULES: AuthUser["enabledModules"] = [
  "orders", "scheduling", "monitoring", "invoicing", "payments",
  "costs", "rates", "settlements", "maintenance", "customers",
  "drivers", "vehicles", "geofences", "reports", "notifications",
  "workflows", "bitacora", "route_planner",
];

/**
 * Decodifica el payload de un JWT sin verificar firma.
 * Solo para leer datos del usuario (username, tenantId, role, exp).
 */
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Padding
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * URL de login del backend.
 * Importante: el endpoint de login NO usa el prefijo /api/v1.
 * El resto de endpoints sí lo usan (NEXT_PUBLIC_API_URL ya lo incluye).
 */
function getLoginUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  // Si NEXT_PUBLIC_API_URL = https://.../api/v1, removemos /api/v1 para login
  const base = apiUrl.replace(/\/api\/v\d+\/?$/, "").replace(/\/$/, "");
  return `${base || "https://api-service.gruponavitel.com"}/auth/login`;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // 2026-05-08: el login del backend acepta `username` (no email).
  // Verificado empiricamente con `admin / Admin1432!` → 200 OK.
  // El campo del form se llama `username` para reflejar la realidad.
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.username || !formData.password) {
      setError(t("validation.fillAllFields"));
      setIsLoading(false);
      return;
    }

    try {
      const loginUrl = getLoginUrl();

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        let msg = "Credenciales inválidas";
        try {
          const errData = await response.json();
          // El backend a veces anida el mensaje doblemente: {message: "{\"code\":429,...}"}
          let raw = errData?.message ?? "";
          if (typeof raw === "string" && raw.startsWith("{")) {
            try {
              const inner = JSON.parse(raw);
              raw = inner?.message ?? raw;
            } catch {
              /* mantener raw */
            }
          }
          msg = raw || msg;
        } catch {
          // noop
        }
        // Mensajes amigables por status code
        if (response.status === 429) {
          setError(msg || "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.");
        } else if (response.status === 401) {
          setError(msg || "Usuario o contraseña no válidos.");
        } else if (response.status === 403) {
          setError(msg || "Cuenta suspendida o sin acceso.");
        } else {
          setError(msg);
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // El backend (v3 Rev3) responde:
      //   { success: true, data: { user: {...}, accessToken, refreshToken } }
      // Para retrocompat soportamos también el shape antiguo: { token, user }.
      const isWrapped = data && typeof data === "object" && data.data && typeof data.data === "object";
      const payload = isWrapped ? data.data : data;
      const token: string | undefined = payload.accessToken || payload.token;
      const refreshToken: string | undefined = payload.refreshToken;
      const userObj = (typeof payload.user === "object" && payload.user) || null;

      if (!token) {
        setError("Respuesta de login inválida (no se recibió accessToken)");
        setIsLoading(false);
        return;
      }

      // Decodificar JWT como fallback para metadata si el response no la trae completa
      const jwtPayload = decodeJWT(token) as
        | { username?: string; tenantId?: string; role?: UserRole; exp?: number; jti?: string }
        | null;

      // Preferir datos del response (más confiable que decodear el JWT del cliente).
      // BUG del backend (verificado 2026-05-02): el `role` viene en UPPERCASE
      // ("OWNER", "ADMIN", "OPERATOR", etc.) pero DEFAULT_ROLES en el frontend
      // los registra en lowercase ("owner", "admin", ...). Sin esta normalización,
      // hasPermission() no encuentra el rol y devuelve permisos vacíos → solo
      // aparece "Dashboard" en el sidebar.
      const rawRole = (userObj?.role as string) || (jwtPayload?.role as string) || "owner";
      let role: UserRole = rawRole.toLowerCase() as UserRole;

      const tenantId = userObj?.tenantId || jwtPayload?.tenantId || "tenant-default";
      const userId = userObj?.id || jwtPayload?.jti || formData.username;
      const userName =
        userObj?.name ||
        userObj?.email ||
        (typeof payload.user === "string" ? payload.user : "") ||
        formData.username;
      // El backend NO valida formato email — guarda el username tal cual.
      // Si el response trae `email` lo usamos; sino el username vale como identificador.
      const userEmail = userObj?.email || formData.username;
      const tenantName = userObj?.tenantName || "Grupo Navitel";

      // ──────────────────────────────────────────────────────────────────────
      // 2026-05-07: DETECCION DE PLATFORM OWNER (FIX SIDEBAR)
      // El backend HOY no expone `tier` ni distingue `platform_owner` vs `owner`.
      // Para el tenant raiz (donde vive el admin del TMS), promovemos a
      // `platform_owner`/`platform_admin` (Nivel 1 — duenio de la plataforma).
      // Cuando el backend exponga `tier: "platform"` en el JWT, esta deteccion
      // queda como fallback inofensivo (el tier explicito gana).
      // ──────────────────────────────────────────────────────────────────────
      const ROOT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
      const explicitTier =
        (userObj?.tier as string | undefined) ||
        ((jwtPayload as { tier?: string } | null)?.tier);

      let isPlatformLogin = false;
      if (explicitTier === "platform") {
        isPlatformLogin = true;
      } else if (
        (role === "owner" || role === "master" || role === "admin") &&
        tenantId === ROOT_TENANT_ID
      ) {
        isPlatformLogin = true;
        role = role === "admin" ? ("platform_admin" as UserRole) : ("platform_owner" as UserRole);
      }

      // 2026-05-08: si NO es platform y el rol es legacy "owner", promover a "master"
      // (el rol canonico de Patrick para el Maestro del cliente).
      if (!isPlatformLogin && role === "owner") {
        role = "master" as UserRole;
      }

      // BUG del backend: hoy devuelve `enabledModules: []` (vacío) incluso para
      // OWNER. Si está vacío usamos ALL_MODULES como fallback para no bloquear UI.
      const enabledModules = (Array.isArray(userObj?.enabledModules) && userObj.enabledModules.length > 0)
        ? (userObj.enabledModules as AuthUser["enabledModules"])
        : ALL_MODULES;

      // BUG del backend: hoy devuelve `permissions: []`. Cuando llegue vacío,
      // dejamos `permissions: undefined` para que hasPermission() haga fallback a
      // los permisos por defecto del rol en DEFAULT_ROLES (auth.ts).
      const backendPermissions = Array.isArray(userObj?.permissions) && userObj.permissions.length > 0
        ? (userObj.permissions as AuthUser["permissions"])
        : undefined;

      const isActive = userObj?.isActive ?? true;

      // Construir AuthUser. Guardamos el token embebido para que api.ts lo lea.
      const authUser: AuthUser & { token?: string } = {
        id: userId,
        name: userName,
        email: userEmail,
        role,
        tier: isPlatformLogin ? "platform" : getUserTier(role),
        tenantId,
        tenantName,
        isActive,
        enabledModules,
        token,
      };
      if (backendPermissions) {
        authUser.permissions = backendPermissions;
      }

      login(authUser);

      // Guardar tokens via auth-storage:
      //  - access token → memoria (no persiste en disco; XSS-safer)
      //  - refresh token → sessionStorage (sobrevive F5, no cross-tab)
      setAccessToken(token);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }

      if (authUser.tier === "platform") {
        router.push("/platform");
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Error de conexión con el backend. Verifica tu red o el backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("auth.welcomeBack")}
        </h1>
        <p className="text-muted-foreground">
          {t("auth.welcomeBackDesc")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              Usuario
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={isLoading}
                className="pl-10 h-11 bg-background border-input transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t("auth.password")}
              </label>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isLoading}
                className="pl-10 pr-12 h-11 bg-background border-input transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                required
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <label htmlFor="remember" className="text-sm text-muted-foreground select-none cursor-pointer">
            {t("auth.rememberMe")}
          </label>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t("auth.loggingIn")}
            </>
          ) : (
            <>
              {t("auth.loginButton")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
