/**
 * Configuración centralizada de categorías de cliente.
 * 
 * Este archivo es el único punto donde se definen las categorías/tipos comerciales
 * de clientes. Modificar este archivo actualiza automáticamente todo el sistema:
 * formularios, filtros, tablas, drawers, etc.
 * 
 * Para agregar una nueva categoría:
 * 1. Añadir una entrada en CUSTOMER_CATEGORIES
 * 2. (Opcional) Actualizar CustomerCategory type si se usa validación estricta
 */

export interface CustomerCategoryConfig {
  /** Identificador único (slug) */
  value: string;
  /** Nombre visible en la UI */
  label: string;
  /** Color del indicador (clase Tailwind para el dot) */
  color: string;
  /** Fondo suave para cards/selects */
  bgColor: string;
  /** Color para badges en tablas */
  badgeClass: string;
  /** Descripción opcional */
  description?: string;
}

/**
 * Categorías de cliente configurables.
 * Agregar, quitar o modificar según el modelo operativo y comercial de la organización.
 */
export const CUSTOMER_CATEGORIES: CustomerCategoryConfig[] = [
  {
    value: "standard",
    label: "Estándar",
    color: "bg-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    description: "Cliente con condiciones comerciales regulares",
  },
  {
    value: "premium",
    label: "Premium",
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/50",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    description: "Cliente con beneficios y tarifas preferenciales",
  },
  {
    value: "vip",
    label: "VIP",
    color: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/50",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    description: "Cliente de alto valor estratégico",
  },
  {
    value: "wholesale",
    label: "Mayorista",
    color: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/50",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    description: "Cliente con volúmenes de operación masivos",
  },
  {
    value: "corporate",
    label: "Corporativo",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/50",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    description: "Cuenta corporativa con múltiples sucursales",
  },
  {
    value: "government",
    label: "Gobierno",
    color: "bg-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-900/50",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    description: "Entidad gubernamental o del sector público",
  },
];

// --- Utilidades derivadas (se generan automáticamente a partir de CUSTOMER_CATEGORIES) ---

/** Mapa de value → label para búsqueda rápida */
export const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CUSTOMER_CATEGORIES.map((c) => [c.value, c.label])
);

/** Mapa de value → color para badges de tabla */
export const CATEGORY_BADGE_MAP: Record<string, string> = Object.fromEntries(
  CUSTOMER_CATEGORIES.map((c) => [c.value, c.badgeClass])
);

/** Mapa de value → color del indicador dot */
export const CATEGORY_COLOR_MAP: Record<string, string> = Object.fromEntries(
  CUSTOMER_CATEGORIES.map((c) => [c.value, c.color])
);

/** Obtener la config de una categoría por su value; fallback a la primera */
export function getCategoryConfig(value: string): CustomerCategoryConfig {
  return CUSTOMER_CATEGORIES.find((c) => c.value === value) ?? CUSTOMER_CATEGORIES[0];
}

/** Opciones para filtros (incluye "all") */
export const CATEGORY_FILTER_OPTIONS: { value: string; label: string; color?: string }[] = [
  { value: "all", label: "Todas las categorías" },
  ...CUSTOMER_CATEGORIES.map((c) => ({ value: c.value, label: c.label, color: c.color })),
];

/** Valores válidos como array de strings (para validación dinámica) */
export const CATEGORY_VALUES = CUSTOMER_CATEGORIES.map((c) => c.value);
