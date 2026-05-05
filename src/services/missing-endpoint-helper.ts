/**
 * Helper compartido para módulos cuyos endpoints NO están implementados en
 * el backend (los "módulos fantasma"). Proporciona dos utilidades:
 *
 *   1. `withMissingEndpointDetection(operation, fn)` — envuelve una llamada
 *      al backend; si devuelve 404 (endpoint no implementado), lanza un Error
 *      explicativo con flag `backendNotImplemented: true` para que la UI lo
 *      muestre amigablemente en lugar de un crash.
 *
 *   2. `safeCall(operation, fn, fallback)` — variante que NO lanza el error,
 *      sino que retorna un valor `fallback` (típico: lista vacía, null, etc.)
 *      cuando el backend no implementa el endpoint. Útil en services donde
 *      preferimos que la UI muestre "sin datos" en vez de un banner de error.
 *
 * Contexto: 2026-05-03. Investigación profunda confirmó que NGINX NO está
 * bloqueando endpoints del backend. El "Not Found" plain text 9 bytes que
 * antes atribuíamos a NGINX es en realidad el handler 404 default del
 * framework backend cuando una ruta no está registrada en su router.
 *
 * El verdadero diagnóstico de los 404 es: backend NO implementó la ruta.
 * La solución NO es tocar NGINX, es que el backend implemente las rutas.
 */

export type MissingEndpointError = Error & {
  status?: number;
  backendNotImplemented?: boolean;
  operation?: string;
};

/**
 * Envuelve una llamada y, si el backend devuelve 404, lanza un Error
 * explicativo con el flag `backendNotImplemented: true`.
 *
 * Uso:
 * ```typescript
 * return this.withMissingEndpointDetection(
 *   "Detalle conductor (GET /master/drivers/:id)",
 *   async () => apiClient.get(...)
 * );
 * ```
 */
export async function withMissingEndpointDetection<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) {
      const explanatory: MissingEndpointError = new Error(
        `${operation} no está disponible: el backend devuelve 404 porque ` +
        `esta ruta NO está implementada en producción. El equipo backend ` +
        `debe implementar el handler correspondiente (ver Excel oficial / ` +
        `documento HANDOFF para detalles).`
      );
      explanatory.status = 404;
      explanatory.backendNotImplemented = true;
      explanatory.operation = operation;
      throw explanatory;
    }
    throw err;
  }
}

/**
 * Variante que NO lanza el error; retorna `fallback` cuando el backend no
 * implementa el endpoint. Útil en services donde preferimos que la UI
 * muestre "sin datos" en vez de un banner de error.
 *
 * Solo silencia el 404 (endpoint no existe). Otros errores (500, 401, etc.)
 * sí se lanzan para que el llamador los maneje.
 *
 * Uso:
 * ```typescript
 * const audits = await safeCall(
 *   "GET /master/audit",
 *   () => apiClient.get<AuditEntry[]>("/master/audit"),
 *   []  // fallback
 * );
 * ```
 */
export async function safeCall<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) {
      // Solo log, no error visible al usuario
      console.warn(
        `[safeCall] ${operation} no implementado en backend. ` +
        `Devolviendo valor fallback.`
      );
      return fallback;
    }
    throw err;
  }
}

/**
 * Type guard para reconocer el error de "endpoint no implementado".
 * Usar en components/hooks para mostrar UI amigable.
 *
 * Uso:
 * ```typescript
 * try {
 *   await driversService.enable(id);
 * } catch (err) {
 *   if (isBackendNotImplemented(err)) {
 *     toast.warning("Funcionalidad pendiente del backend");
 *     return;
 *   }
 *   toast.error("Error inesperado");
 * }
 * ```
 */
export function isBackendNotImplemented(err: unknown): err is MissingEndpointError {
  return (
    err instanceof Error &&
    (err as MissingEndpointError).backendNotImplemented === true
  );
}
