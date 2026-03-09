"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";

/**
 * Estado de la operación async
 */
export interface ServiceState<T> {
  /** Datos retornados por el servicio */
  data: T | null;
  /** Indica si está cargando */
  loading: boolean;
  /** Error si ocurrió alguno */
  error: Error | null;
  /** Indica si la operación fue exitosa */
  isSuccess: boolean;
}

/**
 * Opciones de configuración del hook
 */
export interface UseServiceOptions<T = unknown> {
  /** Ejecutar automáticamente al montar */
  immediate?: boolean;
  /** Callback cuando la operación es exitosa */
  onSuccess?: (data: T) => void;
  /** Callback cuando ocurre un error */
  onError?: (error: Error) => void;
  /** Dependencias que disparan re-fetch automático */
  deps?: unknown[];
}

/**
 * Retorno del hook useService
 */
export interface UseServiceReturn<T> extends ServiceState<T> {
  /** Ejecuta la operación */
  execute: () => Promise<T | null>;
  /** Resetea el estado */
  reset: () => void;
  /** Actualiza los datos manualmente */
  setData: (data: T | null) => void;
  /** Indica si se ejecutó al menos una vez */
  hasExecuted: boolean;
}

/**
 * Hook genérico para consumir servicios (CORREGIDO)
 * 
 * @param serviceFn - Función que retorna una promesa
 * @param options - Opciones de configuración
 * @returns Estado y métodos para controlar la operación
 * 
 */
export function useService<T>(
  serviceFn: () => Promise<T>,
  options: UseServiceOptions<T> = {}
): UseServiceReturn<T> {
  const { immediate = false, onSuccess, onError, deps = [] } = options;

  const [state, setState] = useState<ServiceState<T>>({
    data: null,
    loading: false,
    error: null,
    isSuccess: false,
  });
  const [hasExecuted, setHasExecuted] = useState(false);

  // Refs para evitar actualizaciones en componentes desmontados
  const mountedRef = useRef(true);
  const serviceFnRef = useRef(serviceFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Actualizar refs en cada render
  useEffect(() => {
    serviceFnRef.current = serviceFn;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  /**
   * Ejecuta la operación del servicio
   */
  const execute = useCallback(async (): Promise<T | null> => {
    if (!mountedRef.current) return null;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await serviceFnRef.current();

      if (mountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null,
          isSuccess: true,
        });
        setHasExecuted(true);
        onSuccessRef.current?.(result);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useService] Error ejecutando servicio:', error);

      if (mountedRef.current) {
        setState({
          data: null,
          loading: false,
          error,
          isSuccess: false,
        });
        setHasExecuted(true);
        onErrorRef.current?.(error);
      }

      return null;
    }
  }, []);

  /**
   * Resetea el estado al inicial
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isSuccess: false,
    });
    setHasExecuted(false);
  }, []);

  /**
   * Actualiza los datos manualmente
   */
  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  // Serializar deps para comparación
  const depsKey = useMemo(() => JSON.stringify(deps), deps);

  // Ejecutar cuando cambian las dependencias o en mount si immediate
  useEffect(() => {
    if (immediate && mountedRef.current) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, depsKey]);

  // Cleanup al desmontar
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useMemo(() => ({
    ...state,
    hasExecuted,
    execute,
    reset,
    setData,
  }), [state, hasExecuted, execute, reset, setData]);
}

/**
 * Hook para operaciones de listado con paginación
 * 
 */
export interface UseServiceListOptions extends UseServiceOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export interface UseServiceListReturn<T> extends UseServiceReturn<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => Promise<T[] | null>;
}

/**
 * Hook especializado para listas paginadas
 */
export function useServiceList<T>(
  serviceFn: (params: { page: number; pageSize: number }) => Promise<{
    data: T[];
    pagination: { total: number; totalPages: number };
  }>,
  options: UseServiceListOptions = {}
): UseServiceListReturn<T> {
  const { initialPage = 1, initialPageSize = 10, ...serviceOptions } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = useCallback(async () => {
    const result = await serviceFn({ page, pageSize });
    setTotalPages(result.pagination.totalPages);
    setTotalItems(result.pagination.total);
    return result.data;
  }, [serviceFn, page, pageSize]);

  const { data, loading, error, isSuccess, execute, reset, setData, hasExecuted } = useService(
    fetchData,
    serviceOptions
  );

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  }, [page]);

  // Re-fetch cuando cambia la página
  useEffect(() => {
    if (serviceOptions.immediate !== false) {
      execute();
    }
  }, [page, pageSize, execute, serviceOptions.immediate]);

  return {
    data: data || [],
    loading,
    error,
    isSuccess,
    hasExecuted,
    execute,
    reset,
    setData,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    refresh: execute,
  };
}

/**
 * Hook para operaciones de mutación (create, update, delete)
 * 
 */
export interface UseMutationReturn<TData, TResult> {
  mutate: (data: TData) => Promise<TResult | null>;
  loading: boolean;
  error: Error | null;
  isSuccess: boolean;
  reset: () => void;
}

export function useMutation<TData, TResult>(
  mutationFn: (data: TData) => Promise<TResult>,
  options: Omit<UseServiceOptions, "immediate"> = {}
): UseMutationReturn<TData, TResult> {
  const { onSuccess, onError } = options;
  
  const [state, setState] = useState({
    loading: false,
    error: null as Error | null,
    isSuccess: false,
  });

  const mountedRef = useRef(true);

  const mutate = useCallback(
    async (data: TData): Promise<TResult | null> => {
      setState({ loading: true, error: null, isSuccess: false });

      try {
        const result = await mutationFn(data);
        
        if (mountedRef.current) {
          setState({ loading: false, error: null, isSuccess: true });
          onSuccess?.(result);
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        if (mountedRef.current) {
          setState({ loading: false, error, isSuccess: false });
          onError?.(error);
        }
        
        return null;
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, isSuccess: false });
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    mutate,
    ...state,
    reset,
  };
}
