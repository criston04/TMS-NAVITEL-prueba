/**
 * Auth storage centralizado.
 *
 * Estrategia 2026-05-02:
 *  - El access token vive en MEMORIA (variable módulo) — desaparece al recargar
 *    la pestaña, lo que es el comportamiento más seguro contra XSS.
 *  - El refresh token vive en `sessionStorage` — sobrevive a un F5 pero NO a
 *    cerrar la pestaña, y NO es accesible desde otras pestañas/origenes.
 *  - El user object (sin tokens) también va a `sessionStorage` para que la UI
 *    sepa quién está logueado tras un F5 sin pedir login de nuevo.
 *  - Al hacer F5: usamos el refresh token (sessionStorage) para pedir un access
 *    token nuevo desde memoria, sin exponerlo en storage.
 *
 * Mejora vs. estado anterior:
 *  - Antes: TODO en `localStorage` (vulnerable a XSS persistente y accesible
 *    cross-tab).
 *  - Ahora: solo el refresh token en `sessionStorage` (XSS sigue siendo posible
 *    pero la ventana de ataque es mucho menor; cerrar la pestaña limpia todo).
 *
 * Migración futura a cookies httpOnly:
 *  - Cuando el backend emita Set-Cookie httpOnly+Secure+SameSite, basta con
 *    convertir estas funciones en no-ops y dejar que el browser maneje todo.
 */

const ACCESS_TOKEN_KEY = "tms_access_token";       // legacy, se borra
const REFRESH_TOKEN_KEY = "tms_refresh_token";
const USER_KEY = "tms_user";

// Access token solo en memoria
let inMemoryAccessToken: string | null = null;

const hasWindow = (): boolean => typeof globalThis.window !== "undefined";

/**
 * Limpia tokens legacy de localStorage en cualquier momento.
 * Se invoca al iniciar el módulo para migrar usuarios con sesión vieja.
 */
function purgeLegacyLocalStorage(): void {
  if (!hasWindow()) return;
  try {
    // Si el localStorage tenía tokens (sesión vieja), los movemos a sessionStorage
    const legacyAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    const legacyRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    const legacyUser = localStorage.getItem(USER_KEY);

    if (legacyRefresh) sessionStorage.setItem(REFRESH_TOKEN_KEY, legacyRefresh);
    if (legacyUser) sessionStorage.setItem(USER_KEY, legacyUser);
    if (legacyAccess) inMemoryAccessToken = legacyAccess;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

// Auto-migración al cargar el módulo
purgeLegacyLocalStorage();

// ────────────────────────────────────────────────────────────
//  ACCESS TOKEN — solo en memoria
// ────────────────────────────────────────────────────────────

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

// ────────────────────────────────────────────────────────────
//  REFRESH TOKEN — sessionStorage
// ────────────────────────────────────────────────────────────

export function setRefreshToken(token: string | null): void {
  if (!hasWindow()) return;
  try {
    if (token) sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    else sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getRefreshToken(): string | null {
  if (!hasWindow()) return null;
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────
//  USER OBJECT — sessionStorage (sin tokens dentro)
// ────────────────────────────────────────────────────────────

export interface StoredUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  tier?: string;
  tenantId?: string;
  tenantName?: string;
  isActive?: boolean;
  enabledModules?: unknown[];
  permissions?: unknown[];
  forcePasswordChange?: boolean;
  // El campo `token` queda fuera deliberadamente — el access token vive en memoria.
  [key: string]: unknown;
}

export function setStoredUser(user: StoredUser | null): void {
  if (!hasWindow()) return;
  try {
    if (user) {
      // Sanitizar: nunca persistir el token en el blob del user
      const { token: _t, accessToken: _a, refreshToken: _r, ...sanitized } = user as StoredUser & {
        token?: string;
        accessToken?: string;
        refreshToken?: string;
      };
      sessionStorage.setItem(USER_KEY, JSON.stringify(sanitized));
    } else {
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

export function getStoredUser<T extends StoredUser = StoredUser>(): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────
//  CLEAR ALL — al hacer logout
// ────────────────────────────────────────────────────────────

export function clearAuthSession(): void {
  inMemoryAccessToken = null;
  if (!hasWindow()) return;
  try {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    // Defensivo: por si algún flujo viejo dejó algo en localStorage
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // 2026-05-14 SECURITY: barrer TODAS las claves del dominio TMS para
    // evitar fugas de datos entre usuarios. Cubre:
    //   tms-scheduled-orders, tms-scheduled-orders-{userId}, tms-customer-categories,
    //   tms-navitel-multi-window-panels, tms-generated-orders, tms-auto-costs,
    //   tms-auto-invoices, tms-scheduling-assignments, tms-vehicle-status-updates,
    //   tms-milestone-updates, y cualquier otro futuro bajo este prefijo.
    const lsKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("tms-")) lsKeysToRemove.push(k);
    }
    for (const k of lsKeysToRemove) localStorage.removeItem(k);

    const ssKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("tms-")) ssKeysToRemove.push(k);
    }
    for (const k of ssKeysToRemove) sessionStorage.removeItem(k);
  } catch {
    // ignore
  }
}
