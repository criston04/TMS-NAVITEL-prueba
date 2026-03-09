"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  CUSTOMER_CATEGORIES as DEFAULT_CATEGORIES,
  type CustomerCategoryConfig,
} from "@/config/customer-categories.config";

// --- Colores disponibles para categorías ---
export const AVAILABLE_COLORS = [
  { name: "Gris", value: "slate", dot: "bg-slate-500", bg: "bg-slate-50 dark:bg-slate-900/50", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { name: "Azul", value: "blue", dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-900/50", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { name: "Ámbar", value: "amber", dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/50", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { name: "Púrpura", value: "purple", dot: "bg-purple-500", bg: "bg-purple-50 dark:bg-purple-900/50", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { name: "Esmeralda", value: "emerald", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/50", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  { name: "Rosa", value: "rose", dot: "bg-rose-500", bg: "bg-rose-50 dark:bg-rose-900/50", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
  { name: "Cian", value: "cyan", dot: "bg-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/50", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  { name: "Indigo", value: "indigo", dot: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/50", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  { name: "Naranja", value: "orange", dot: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-900/50", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  { name: "Verde", value: "green", dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-900/50", badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { name: "Rojo", value: "red", dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-900/50", badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  { name: "Lima", value: "lime", dot: "bg-lime-500", bg: "bg-lime-50 dark:bg-lime-900/50", badge: "bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-300" },
] as const;

const STORAGE_KEY = "tms-customer-categories";

interface CustomerCategoriesContextValue {
  /** Categorías actuales */
  categories: CustomerCategoryConfig[];
  /** Valores válidos para validación */
  categoryValues: string[];
  /** Mapa value → label */
  labelMap: Record<string, string>;
  /** Mapa value → badge class */
  badgeMap: Record<string, string>;
  /** Mapa value → dot color */
  colorMap: Record<string, string>;
  /** Opciones para filtros (incluye "all") */
  filterOptions: { value: string; label: string; color?: string }[];
  /** Agregar categoría */
  addCategory: (category: CustomerCategoryConfig) => void;
  /** Actualizar categoría existente */
  updateCategory: (value: string, updated: Partial<CustomerCategoryConfig>) => void;
  /** Eliminar categoría */
  removeCategory: (value: string) => void;
  /** Reordenar categorías */
  reorderCategories: (categories: CustomerCategoryConfig[]) => void;
  /** Restaurar categorías por defecto */
  resetToDefaults: () => void;
}

const CustomerCategoriesContext = createContext<CustomerCategoriesContextValue | null>(null);

function buildDerivedMaps(cats: CustomerCategoryConfig[]) {
  return {
    categoryValues: cats.map((c) => c.value),
    labelMap: Object.fromEntries(cats.map((c) => [c.value, c.label])),
    badgeMap: Object.fromEntries(cats.map((c) => [c.value, c.badgeClass])),
    colorMap: Object.fromEntries(cats.map((c) => [c.value, c.color])),
    filterOptions: [
      { value: "all", label: "Todas las categorías" },
      ...cats.map((c) => ({ value: c.value, label: c.label, color: c.color })),
    ],
  };
}

export function CustomerCategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CustomerCategoryConfig[]>(DEFAULT_CATEGORIES);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hidratar desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
        }
      }
    } catch {
      // Ignorar errores de parsing
    }
    setIsHydrated(true);
  }, []);

  // Persistir cambios
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    }
  }, [categories, isHydrated]);

  const addCategory = useCallback((category: CustomerCategoryConfig) => {
    setCategories((prev) => [...prev, category]);
  }, []);

  const updateCategory = useCallback((value: string, updated: Partial<CustomerCategoryConfig>) => {
    setCategories((prev) =>
      prev.map((c) => (c.value === value ? { ...c, ...updated } : c))
    );
  }, []);

  const removeCategory = useCallback((value: string) => {
    // No permitir eliminar "standard" (es el fallback por defecto)
    if (value === "standard") return;
    setCategories((prev) => prev.filter((c) => c.value !== value));
  }, []);

  const reorderCategories = useCallback((newOrder: CustomerCategoryConfig[]) => {
    setCategories(newOrder);
  }, []);

  const resetToDefaults = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const derived = buildDerivedMaps(categories);

  return (
    <CustomerCategoriesContext.Provider
      value={{
        categories,
        ...derived,
        addCategory,
        updateCategory,
        removeCategory,
        reorderCategories,
        resetToDefaults,
      }}
    >
      {children}
    </CustomerCategoriesContext.Provider>
  );
}

/**
 * Hook para acceder a las categorías dinámicas de clientes.
 * Reemplaza las importaciones estáticas de customer-categories.config.
 */
export function useCustomerCategories() {
  const context = useContext(CustomerCategoriesContext);
  if (!context) {
    // Fallback: retornar valores estáticos si no hay provider (compatibilidad)
    const derived = buildDerivedMaps(DEFAULT_CATEGORIES);
    return {
      categories: DEFAULT_CATEGORIES,
      ...derived,
      addCategory: () => {},
      updateCategory: () => {},
      removeCategory: () => {},
      reorderCategories: () => {},
      resetToDefaults: () => {},
    } as CustomerCategoriesContextValue;
  }
  return context;
}
