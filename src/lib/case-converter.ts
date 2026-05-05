/**
 * Convierte recursivamente todas las keys de un objeto/array de snake_case
 * a camelCase. Útil cuando el backend devuelve respuestas en snake_case y
 * el frontend tipa los modelos en camelCase, evitando bugs runtime del tipo
 * `Cannot read properties of undefined (reading 'split')` cuando se intenta
 * acceder a `obj.someField` que en realidad llega como `obj.some_field`.
 *
 * Uso:
 *   const camel = snakeToCamel(backendResponse);
 *
 * Reglas:
 *   - Arrays se mapean elemento a elemento.
 *   - Primitivos (string, number, boolean, null, undefined) pasan tal cual.
 *   - `Date` y `Buffer`-like (con propiedad `_bsontype` o similar) NO se transforman.
 *   - Keys que ya están en camelCase pasan tal cual.
 *   - Conversión: `foo_bar` → `fooBar`, `created_at` → `createdAt`,
 *     `tenant_id` → `tenantId`, `_private` → `_private` (preserva guion bajo inicial).
 *
 * Limitaciones conocidas:
 *   - Si el backend usa snake_case Y camelCase mezclados, los keys camelCase
 *     se preservan sin tocar.
 *   - NO transforma valores string que parezcan keys snake_case (solo keys de objeto).
 */

const isPlainObject = (val: unknown): val is Record<string, unknown> => {
  if (val === null || typeof val !== "object") return false;
  if (Array.isArray(val)) return false;
  if (val instanceof Date) return false;
  // Detectar instancias de clases (no son plain objects)
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
};

const snakeKeyToCamel = (key: string): string => {
  // Preservar guiones bajos iniciales (_private, __dirname, etc.)
  const leadingUnderscores = key.match(/^_+/)?.[0] ?? "";
  const rest = key.slice(leadingUnderscores.length);
  const camel = rest.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
  return leadingUnderscores + camel;
};

export function snakeToCamel<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => snakeToCamel(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[snakeKeyToCamel(key)] = snakeToCamel(val);
    }
    return result as T;
  }
  return value as T;
}

/**
 * Inversa: convierte camelCase a snake_case (para enviar al backend).
 * Útil en POST/PUT cuando el frontend tiene el objeto en camelCase pero
 * el backend espera snake_case.
 */
const camelKeyToSnake = (key: string): string => {
  const leadingUnderscores = key.match(/^_+/)?.[0] ?? "";
  const rest = key.slice(leadingUnderscores.length);
  const snake = rest.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  return leadingUnderscores + snake;
};

export function camelToSnake<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelToSnake(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[camelKeyToSnake(key)] = camelToSnake(val);
    }
    return result as T;
  }
  return value as T;
}
