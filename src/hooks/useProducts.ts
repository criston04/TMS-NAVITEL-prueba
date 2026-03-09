"use client";

import { useState, useCallback, useMemo } from "react";
import { useService } from "./use-service";
import { productsService } from "@/services/master";
import type { ProductFilters, CreateProductDTO, UpdateProductDTO } from "@/services/master";
import type { Product, ProductStats, ProductCategory } from "@/types/models/product";
import type { EntityStatus } from "@/types/common";

/**
 * Hook para gestión completa de productos
 */
export function useProducts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<EntityStatus | "all">("all");

  // Cargar lista de productos
  const {
    data: productsRaw,
    loading: productsLoading,
    execute: refreshProducts,
  } = useService<Product[]>(
    () => productsService.getAll({ search }),
    { immediate: true }
  );

  // Cargar estadísticas
  const {
    data: stats,
    loading: statsLoading,
    execute: refreshStats,
  } = useService<ProductStats>(
    () => productsService.getStats(),
    { immediate: true }
  );

  // Filtrar localmente
  const filteredProducts = useMemo(() => {
    return productsRaw?.filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
      if (statusFilter !== "all" && product.status !== statusFilter) return false;
      return true;
    }) ?? [];
  }, [productsRaw, categoryFilter, statusFilter]);

  // CRUD handlers
  const createProduct = useCallback(async (data: CreateProductDTO): Promise<Product> => {
    const product = await productsService.create(data);
    refreshProducts();
    refreshStats();
    return product;
  }, [refreshProducts, refreshStats]);

  const updateProduct = useCallback(async (id: string, data: UpdateProductDTO): Promise<Product> => {
    const product = await productsService.update(id, data);
    refreshProducts();
    refreshStats();
    return product;
  }, [refreshProducts, refreshStats]);

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    await productsService.delete(id);
    refreshProducts();
    refreshStats();
  }, [refreshProducts, refreshStats]);

  const changeStatus = useCallback(async (id: string, status: EntityStatus): Promise<void> => {
    await productsService.changeStatus(id, status);
    refreshProducts();
    refreshStats();
  }, [refreshProducts, refreshStats]);

  const duplicateProduct = useCallback(async (id: string): Promise<Product> => {
    const product = await productsService.duplicate(id);
    refreshProducts();
    refreshStats();
    return product;
  }, [refreshProducts, refreshStats]);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  }, []);

  const hasActiveFilters = categoryFilter !== "all" || statusFilter !== "all";

  // Refresh all
  const refresh = useCallback(() => {
    refreshProducts();
    refreshStats();
  }, [refreshProducts, refreshStats]);

  return {
    // Data
    products: filteredProducts,
    stats,
    // Loading
    loading: productsLoading,
    statsLoading,
    // Filters
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    clearFilters,
    // CRUD
    createProduct,
    updateProduct,
    deleteProduct,
    changeStatus,
    duplicateProduct,
    // Refresh
    refresh,
    refreshProducts,
  };
}
