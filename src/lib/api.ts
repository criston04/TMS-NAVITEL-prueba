import { apiConfig } from "@/config/api.config";


type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

interface ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
}


/**
 * Construye URL con query params
 */
function buildUrl(endpoint: string, params?: RequestOptions["params"]): string {
  // Si el endpoint ya es una URL absoluta (http/https), no prependamos baseUrl.
  // Esto permite consumir endpoints que viven fuera de /api/v1 (ej: geofences).
  const isAbsolute = /^https?:\/\//.test(endpoint);
  const url = new URL(isAbsolute ? endpoint : `${apiConfig.baseUrl}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Construye una URL al ROOT del backend (sin `/api/v1`), util para endpoints
 * que el backend expone fuera del namespace versionado (ej: `/geofences`, `/auth`).
 * Devuelve la URL absoluta lista para pasar a apiClient.
 */
export function rootUrl(endpoint: string): string {
  // Saca /api/v1 (o /api/v2, etc.) del baseUrl
  const rootBase = apiConfig.baseUrl.replace(/\/api\/v\d+\/?$/, "");
  return `${rootBase}${endpoint}`;
}

import {
  getAccessToken as readAccessToken,
  setAccessToken,
  getRefreshToken as readRefreshToken,
  setRefreshToken,
} from "@/lib/auth-storage";

/**
 * Obtiene el access token (memoria).
 */
function getAuthToken(): string | null {
  return readAccessToken();
}

/**
 * Obtiene el refresh token (sessionStorage).
 */
function getRefreshToken(): string | null {
  return readRefreshToken();
}

/**
 * Persiste tokens tras un refresh: access en memoria, refresh en sessionStorage.
 */
function persistTokens(accessToken: string, refreshToken?: string): void {
  setAccessToken(accessToken);
  if (refreshToken) {
    setRefreshToken(refreshToken);
  }
}

/**
 * Promise compartida cuando hay un refresh en vuelo.
 * Si múltiples requests reciben 401 al mismo tiempo, solo se dispara UN refresh
 * y todas esperan a que termine para reintentar con el token nuevo.
 */
let inflightRefresh: Promise<string | null> | null = null;

/**
 * Llama a POST /auth/refresh con el refresh token guardado.
 * Devuelve el nuevo accessToken o null si el refresh falla.
 */
/**
 * 2026-05-03 (UI bug fix): exportada porque `auth-context.tsx` antes hacía
 * SU PROPIA llamada a `/auth/refresh` (función `prefetchAccessToken`) sin
 * usar el lock `inflightRefresh`, causando race condition: dos requests al
 * mismo refresh-token endpoint en paralelo. Si el backend invalida el
 * refresh-token al primer uso (one-time use), el segundo falla → cascada
 * de 401 en todas las requests.
 *
 * Solución: ambos puntos (auth-context al F5 y api.ts al 401) usan esta
 * misma función con el lock compartido.
 */
export async function refreshAccessToken(): Promise<string | null> {
  return _refreshAccessToken();
}

async function _refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  // /auth/refresh está fuera del namespace /api/v1 (igual que /auth/login)
  const url = rootUrl("/auth/refresh");

  inflightRefresh = (async () => {
    try {
      // 2026-05-02: El backend rate-limita TAMBIÉN /auth/refresh (devuelve 429
      // en la primera llamada al cargar la app). Hacemos retry con backoff
      // largo: 2s, 5s, 12s. Total ~19s en peor caso.
      const refreshDelays = [2000, 5000, 12000];
      for (let attempt = 0; attempt <= refreshDelays.length; attempt++) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        // 429: backoff y reintentar
        if (response.status === 429 && attempt < refreshDelays.length) {
          const delay = refreshDelays[attempt];
          console.warn(`[apiClient.refresh] 429. Reintentando en ${delay}ms (intento ${attempt + 1}/${refreshDelays.length}).`);
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          // 401 = refresh token caducado/inválido. Hay que re-loguear.
          if (response.status === 401) {
            console.warn("[apiClient.refresh] 401: refresh token inválido o caducado. Hay que re-loguear.");
          }
          return null;
        }

        const data = await response.json();
        const payload = data?.data ?? data;
        const newAccessToken: string | undefined = payload?.accessToken || payload?.token;
        const newRefreshToken: string | undefined = payload?.refreshToken;
        if (!newAccessToken) return null;
        persistTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      }
      return null;
    } catch (err) {
      console.warn("[apiClient.refreshAccessToken] error:", err);
      return null;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/**
 * Headers por defecto
 */
function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Crea un error tipado de API
 */
function createApiError(status: number, message: string, details?: unknown): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.details = details;
  return error;
}

/**
 * Desenvuelve el body del response segun los distintos envelope que usa el backend.
 *
 * Convencion observada en el backend:
 * - Endpoints que retornan array o objeto plano usan envelope `{ data }` (con o sin `meta`).
 *   El frontend espera el contenido de `data` directamente.
 * - Endpoints paginados tipo `PaginatedResponse<T>` usan envelope `{ items, meta }`.
 *   El frontend espera `{ items, pagination }`.
 * - Formato heredado `{ success, data }` (compatibilidad).
 * - Responses sin envelope (ej. dashboard stats, login `{user, token}`) se devuelven tal cual.
 */
function unwrapResponseBody<T>(body: Record<string, unknown>): T {
  // {success, data} formato clasico
  if ("success" in body && "data" in body) {
    return body.data as T;
  }

  // {items, meta} - lista paginada estandar de BaseService.getAll()
  // Renombrar `meta` a `pagination` para que coincida con PaginatedResponse<T>
  if ("items" in body && "meta" in body) {
    return {
      items: body.items,
      pagination: body.meta,
    } as T;
  }

  // {data, ...meta-campos-de-paginacion} - envelope flat.
  // Si el body trae `data` (array) junto con campos de paginacion, el caller
  // espera el objeto COMPLETO (ej: OrdersResponse). NO desempacar.
  // Para responses de un solo recurso (data = objeto), siempre desempacamos `data`.
  if ("data" in body) {
    const meta = (body as { meta?: unknown }).meta;
    const metaIsPagination =
      meta !== null &&
      typeof meta === "object" &&
      ("total" in meta ||
        "page" in meta ||
        "pageSize" in meta ||
        "totalPages" in meta);

    const hasPaginationMeta =
      "total" in body ||
      "page" in body ||
      "pageSize" in body ||
      "totalPages" in body ||
      "statusCounts" in body ||
      metaIsPagination;

    // Solo preservar envelope cuando data es un array Y hay meta de paginacion.
    // Para data=objeto (create/update/getById), siempre desempacar.
    if (hasPaginationMeta && Array.isArray(body.data)) {
      return body as T;
    }
    // {data} puro (envelope simple) - desempacar al contenido de data
    return body.data as T;
  }

  // Sin envelope reconocible: retornar tal cual
  return body as T;
}

// ════════════════════════════════════════════════════════
// LOGGING
// ════════════════════════════════════════════════════════

const IS_BROWSER = typeof globalThis.window !== "undefined";

// Solo loggear en desarrollo. En producción cualquier console.log de body
// (a) fuga PII (datos cliente, JWT incidental, etc.) y
// (b) ralentiza el browser al serializar objetos grandes en cada request.
const IS_DEV = process.env.NODE_ENV !== "production";

function logRequest(method: HttpMethod, url: string, data?: unknown): number {
  if (!IS_BROWSER || !IS_DEV) return 0;
  const id = Date.now() + Math.random();

  console.groupCollapsed(
    `%c[API] %c${method}%c ${url}`,
    `color: #2196f3; font-weight: bold`,
    `color: #4caf50; font-weight: bold`,
    `color: inherit`,
  );
  if (data) {
    console.log("Request body:", data);
  }
  console.time(`⏱ ${method} ${url}`);
  console.groupEnd();

  return id;
}

function logResponse(method: HttpMethod, url: string, status: number, responseBody: unknown) {
  if (!IS_BROWSER || !IS_DEV) return;
  const isOk = status >= 200 && status < 300;
  const isAuthErr = status === 401 || status === 403;
  const isNotFound = status === 404;
  const isServerErr = status >= 500;

  let emoji = "✓";
  let statusColor = "#4caf50";
  if (isAuthErr) { emoji = "🔒"; statusColor = "#ff9800"; }
  else if (isNotFound) { emoji = "🚫"; statusColor = "#f44336"; }
  else if (isServerErr) { emoji = "💥"; statusColor = "#e91e63"; }
  else if (!isOk) { emoji = "⚠"; statusColor = "#ff9800"; }

  console.groupCollapsed(
    `%c${emoji} [${status}] %c${method}%c ${url}`,
    `color: ${statusColor}; font-weight: bold`,
    `color: #4caf50; font-weight: bold`,
    `color: inherit`,
  );
  console.log("Response:", responseBody);
  console.timeEnd(`⏱ ${method} ${url}`);
  console.groupEnd();
}

function logError(method: HttpMethod, url: string, error: unknown) {
  // En errores SÍ loggeamos siempre porque ayudan al usuario a reportar bugs,
  // pero usamos console.error (no console.group) y omitimos el cuerpo.
  if (!IS_BROWSER) return;
  if (IS_DEV) {
    console.group(
      `%c❌ ERROR %c${method}%c ${url}`,
      `color: #f44336; font-weight: bold`,
      `color: #4caf50; font-weight: bold`,
      `color: inherit`,
    );
    console.error(error);
    console.groupEnd();
  } else {
    // Producción: solo el mensaje, sin payload completo
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[API] ${method} ${url} failed: ${msg}`);
  }
}


// ════════════════════════════════════════════════════════
// REQUEST DEDUPLICATION + MICRO-CACHE
// ════════════════════════════════════════════════════════
//
// Problema: React 19 + StrictMode dispara cada `useEffect` 2 veces en dev.
// Si dos componentes piden el mismo endpoint en paralelo, hace 2 requests.
// El backend tiene rate-limit agresivo (~2 req/s) y devuelve 429.
//
// Solución (solo aplica a GET):
//  1. **Dedupe in-flight**: si ya hay un GET idéntico en vuelo, las llamadas
//     adicionales reciben la MISMA promesa (1 sola request real).
//  2. **Mini-cache 3s**: tras una respuesta exitosa, las siguientes GET al
//     mismo endpoint dentro de 3 segundos devuelven el resultado cacheado.
//
// POST/PUT/PATCH/DELETE NO se deduplican ni cachean (cada llamada es intencional).
// El cache se invalida automáticamente con cualquier mutation al mismo endpoint base.

// 2026-05-02: Subido de 3s → 30s. El rate-limit del backend es muy agresivo
// (~1 req/s) y al navegar entre módulos se vuelven a pedir customers/operators
// que ya teníamos. 30s es seguro: master entities cambian raramente y
// cualquier mutation los invalida automáticamente.
const REQUEST_CACHE_TTL_MS = 30_000;
type GetCacheEntry = { result: unknown; expiresAt: number };
const inflightGets = new Map<string, Promise<unknown>>();
const getResponseCache = new Map<string, GetCacheEntry>();

function getCacheKey(url: string): string {
  return url;
}

function getCachedResponse<T>(url: string): T | null {
  const entry = getResponseCache.get(getCacheKey(url));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    getResponseCache.delete(getCacheKey(url));
    return null;
  }
  return entry.result as T;
}

function setCachedResponse<T>(url: string, result: T): void {
  getResponseCache.set(getCacheKey(url), {
    result,
    expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
  });
}

/**
 * Invalida el cache de GET para una URL base. Se llama tras mutations.
 * Si `urlPrefix` es undefined, limpia TODO el cache.
 */
function invalidateGetCache(urlPrefix?: string): void {
  if (!urlPrefix) {
    getResponseCache.clear();
    return;
  }
  for (const key of getResponseCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      getResponseCache.delete(key);
    }
  }
}

// ════════════════════════════════════════════════════════
// CONCURRENCY THROTTLE + RETRY ON 429
// ════════════════════════════════════════════════════════
//
// El backend tiene rate-limit muy agresivo (~2 req/s). Si el frontend dispara
// 8 requests al cargar el dashboard, las últimas 6 reciben 429.
//
// Solución:
//  1. **Throttle**: máximo MAX_CONCURRENT requests simultáneas. Las demás esperan
//     en una cola FIFO.
//  2. **Retry con backoff exponencial**: si igual recibimos 429, esperamos
//     1s, 2s, 4s y reintentamos. Solo para GET (mutations no se reintentan
//     automáticamente porque no son idempotentes en general).

// 2026-05-02: Bajado de 2 → 1. Aún con throttle=2 el backend devolvía 429,
// indicando que su rate-limit real es ~1 req/s. Mejor serializar requests
// (cola FIFO) que pelearse con retries infinitos.
const MAX_CONCURRENT_REQUESTS = 1;
// Backoff más espaciado: 2s, 5s, 12s. Total ~19s en peor caso.
const RETRY_DELAYS_MS = [2000, 5000, 12000];

// 2026-05-02: Gap mínimo de 800ms entre requests consecutivos. Aunque la
// concurrencia sea 1, las requests salen back-to-back sin pausa, y el rate
// limit del backend (~1 req/s) las castiga. Forzar un breathing room.
const MIN_GAP_BETWEEN_REQUESTS_MS = 800;
let lastRequestStartTime = 0;

let activeRequests = 0;
const requestQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++;
      resolve();
    } else {
      requestQueue.push(() => {
        activeRequests++;
        resolve();
      });
    }
  });

  // Aplicar gap mínimo: si pasó <800ms desde la última request, esperar.
  const elapsed = Date.now() - lastRequestStartTime;
  if (elapsed < MIN_GAP_BETWEEN_REQUESTS_MS) {
    await sleep(MIN_GAP_BETWEEN_REQUESTS_MS - elapsed);
  }
  lastRequestStartTime = Date.now();
}

function releaseSlot(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) next();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ════════════════════════════════════════════════════════
// CIRCUIT BREAKER por endpoint
// ════════════════════════════════════════════════════════
// 2026-05-02: Si un endpoint da 429 sostenido a pesar de los retries del
// apiClient, lo marcamos "saturado" durante 30s y rechazamos requests sin
// tocar el backend. Evita que componentes que re-mount en bucle (StrictMode,
// navegación) saturen aún más el rate-limiter.

const CIRCUIT_BREAKER_TTL_MS = 30_000;
const circuitBreakerUntil = new Map<string, number>();

function getCircuitKey(url: string): string {
  // Usar solo path + query base, sin host. Igual que cache key.
  return url;
}

function isCircuitOpen(url: string): boolean {
  const until = circuitBreakerUntil.get(getCircuitKey(url));
  if (!until) return false;
  if (Date.now() > until) {
    circuitBreakerUntil.delete(getCircuitKey(url));
    return false;
  }
  return true;
}

function tripCircuitBreaker(url: string): void {
  const key = getCircuitKey(url);
  circuitBreakerUntil.set(key, Date.now() + CIRCUIT_BREAKER_TTL_MS);
  console.warn(`[apiClient] Circuit breaker abierto para ${key} por ${CIRCUIT_BREAKER_TTL_MS}ms`);
}

/**
 * Cliente HTTP para comunicación con la API
 *
 */
export const apiClient = {
  /**
   * Realiza una petición HTTP
   */
  async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
    _retried = false
  ): Promise<T> {
    const url = buildUrl(endpoint, options.params);
    logRequest(method, url, data);

    const config: RequestInit = {
      method,
      headers: {
        ...getDefaultHeaders(),
        ...options.headers,
      },
      signal: options.signal,
    };

    if (data && method !== "GET") {
      config.body = JSON.stringify(data);
    }

    // Throttle: esperar slot disponible (max 2 concurrentes globales)
    await acquireSlot();

    try {
      const response = await fetch(url, config);

      // Handle no content
      if (response.status === 204) {
        logResponse(method, url, 204, null);
        return undefined as T;
      }

      // Leer como texto primero, luego intentar parsear JSON.
      // Asi evitamos crashes cuando el backend retorna texto plano en errores
      // (ej: "Not Found" en 404, "Internal Server Error" en 500)
      const rawText = await response.text();
      let body: unknown = rawText;
      let parsedAsJson = false;

      if (rawText) {
        try {
          body = JSON.parse(rawText);
          parsedAsJson = true;
        } catch {
          // No es JSON valido, mantener como texto
          body = rawText;
        }
      } else {
        body = null;
      }

      // ── 401: intentar refresh automático y reintentar UNA vez ──────────
      // Refrescamos si: (a) no es la propia llamada de refresh, (b) no es login,
      // (c) no es un retry previo, (d) hay refresh token guardado.
      //
      // IMPORTANTE 2026-05-02: NO requerimos que la request original tuviera
      // Authorization. Después de un F5, el access token (que vive solo en
      // memoria) se pierde, así que la primera request va SIN auth → 401 →
      // tenemos que poder refrescar desde el refresh token de sessionStorage.
      const isRefreshEndpoint = url.endsWith("/auth/refresh");
      const isLoginEndpoint = url.endsWith("/auth/login");
      if (
        response.status === 401 &&
        !_retried &&
        !isRefreshEndpoint &&
        !isLoginEndpoint &&
        getRefreshToken()
      ) {
        logResponse(method, url, 401, body);
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Retry con el token fresco. _retried=true evita loop si vuelve 401.
          return this.request<T>(method, endpoint, data, options, true);
        }
        // Refresh falló: caemos al manejo normal del error 401
      }

      if (!response.ok) {
        logResponse(method, url, response.status, body);
        const message =
          (parsedAsJson && body && typeof body === "object" && "message" in body
            ? String((body as { message: unknown }).message)
            : null) ||
          (typeof body === "string" && body ? body : null) ||
          "Error en la solicitud";
        const details =
          parsedAsJson && body && typeof body === "object" && "details" in body
            ? (body as { details: unknown }).details
            : undefined;
        throw createApiError(response.status, message, details);
      }

      logResponse(method, url, response.status, body);

      if (!parsedAsJson || !body || typeof body !== "object") {
        return body as T;
      }

      return unwrapResponseBody<T>(body as Record<string, unknown>);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw createApiError(0, "Solicitud cancelada");
      }

      if ((error as ApiError).status) {
        throw error;
      }

      logError(method, url, error);
      throw createApiError(500, "Error de conexión con el servidor");
    } finally {
      releaseSlot();
    }
  },

  /**
   * GET request con dedupe in-flight + micro-cache 3s.
   *
   * Si la misma URL ya tiene un GET en vuelo, las llamadas adicionales
   * reciben la MISMA promesa (1 sola request real al backend). Si hay un
   * resultado cacheado de los últimos 3 segundos, lo devuelve sin tocar red.
   *
   * Para forzar una request fresca, usar `apiClient.request("GET", ...)` directo.
   */
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);

    // 1. Cache hit?
    const cached = getCachedResponse<T>(url);
    if (cached !== null) return Promise.resolve(cached);

    // 2. Circuit breaker: si este endpoint está saturado, fallar rápido sin red
    if (isCircuitOpen(url)) {
      const err = createApiError(429, "Rate limit cooldown (circuit breaker abierto)");
      return Promise.reject(err);
    }

    // 3. ¿Hay un GET in-flight idéntico?
    const inflight = inflightGets.get(url);
    if (inflight) return inflight as Promise<T>;

    // 4. Disparar nueva request con retry-on-429 (backoff exponencial)
    const requestWithRetry = async (): Promise<T> => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          return await this.request<T>("GET", endpoint, undefined, options);
        } catch (err) {
          const status = (err as { status?: number })?.status;
          if (status === 429 && attempt < RETRY_DELAYS_MS.length) {
            // Rate-limit: esperar y reintentar
            const delay = RETRY_DELAYS_MS[attempt];
            console.warn(`[apiClient] 429 en ${url}. Reintentando en ${delay}ms (intento ${attempt + 1}/${RETRY_DELAYS_MS.length}).`);
            await sleep(delay);
            lastError = err;
            continue;
          }
          // Si agotamos los retries en 429, abrimos circuit breaker
          if (status === 429) tripCircuitBreaker(url);
          throw err;
        }
      }
      // Si salimos del loop sin éxito, también abrimos circuit breaker
      tripCircuitBreaker(url);
      throw lastError ?? new Error("GET retries exhausted");
    };

    const promise = requestWithRetry()
      .then((result) => {
        setCachedResponse(url, result);
        return result;
      })
      .finally(() => {
        inflightGets.delete(url);
      });

    inflightGets.set(url, promise);
    return promise;
  },

  /**
   * GET request que trata 404 como "no existe" y devuelve null en lugar de lanzar.
   * Util para endpoints opcionales o que aun no estan implementados en el backend.
   */
  async getOptional<T>(endpoint: string, options?: RequestOptions): Promise<T | null> {
    try {
      return await this.request<T>("GET", endpoint, undefined, options);
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  },

  /** POST request — invalida cache GET del prefix base */
  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", endpoint, data, options).then((res) => {
      invalidateGetCache(buildUrl(endpoint).split("?")[0]);
      return res;
    });
  },

  /** PUT request — invalida cache GET del prefix base */
  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, data, options).then((res) => {
      invalidateGetCache(buildUrl(endpoint).split("?")[0]);
      return res;
    });
  },

  /** PATCH request — invalida cache GET del prefix base */
  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", endpoint, data, options).then((res) => {
      invalidateGetCache(buildUrl(endpoint).split("?")[0]);
      return res;
    });
  },

  /** DELETE request — invalida cache GET del prefix base */
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, undefined, options).then((res) => {
      invalidateGetCache(buildUrl(endpoint).split("?")[0]);
      return res;
    });
  },

  /**
   * Invalida manualmente el cache de GET. Útil cuando un mutation toca
   * recursos que no comparten prefix con el endpoint mutado.
   * Sin argumento, limpia TODO el cache.
   */
  invalidateCache(urlPrefix?: string): void {
    invalidateGetCache(urlPrefix);
  },
};

export default apiClient;
