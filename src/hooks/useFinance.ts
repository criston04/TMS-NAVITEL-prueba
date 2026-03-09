import { useState, useEffect, useCallback, useMemo } from "react";
import { financeService } from "@/services/finance.service";
import type {
  Invoice,
  Payment,
  TransportCost,
  ServiceRate,
  InvoiceFilters,
  PaymentFilters,
  CostFilters,
  FinanceStats,
  AccountsReceivableAging,
  CustomerFinancialSummary,
  ProfitabilityAnalysis,
  CashFlowSummary,
  CreateInvoiceDTO,
  CreatePaymentDTO,
  CreateTransportCostDTO,
  InvoiceStatus,
} from "@/types/finance";


interface UseFinanceReturn {
  invoices: Invoice[];
  payments: Payment[];
  costs: TransportCost[];
  rates: ServiceRate[];
  stats: FinanceStats | null;
  aging: AccountsReceivableAging | null;

  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;

  fetchInvoices: (filters?: InvoiceFilters, page?: number) => Promise<void>;
  createInvoice: (data: CreateInvoiceDTO) => Promise<Invoice | null>;
  sendInvoice: (id: string) => Promise<boolean>;
  cancelInvoice: (id: string) => Promise<boolean>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<boolean>;

  fetchPayments: (filters?: PaymentFilters, page?: number) => Promise<void>;
  recordPayment: (data: CreatePaymentDTO) => Promise<Payment | null>;
  getPaymentsByInvoice: (invoiceId: string) => Promise<Payment[]>;

  fetchCosts: (filters?: CostFilters, page?: number) => Promise<void>;
  recordCost: (data: CreateTransportCostDTO) => Promise<TransportCost | null>;
  approveCost: (id: string) => Promise<boolean>;

  fetchRates: (filters?: { category?: string; isActive?: boolean }) => Promise<void>;
  calculateRate: (
    originZone: string,
    destinationZone: string,
    weight?: number,
    volume?: number
  ) => Promise<{ rate: ServiceRate | null; amount: number }>;

  // Análisis
  fetchStats: (startDate?: string, endDate?: string) => Promise<void>;
  fetchAging: () => Promise<void>;

  // Paginación
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => Promise<void>;
}

interface UseFinanceOptions {
  autoFetch?: boolean;
  initialPageSize?: number;
  initialFilters?: InvoiceFilters;
}

export function useFinance(options: UseFinanceOptions = {}): UseFinanceReturn {
  const { autoFetch = true, initialPageSize = 20, initialFilters = {} } = options;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [costs, setCosts] = useState<TransportCost[]>([]);
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [aging, setAging] = useState<AccountsReceivableAging | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentFilters, setCurrentFilters] = useState<InvoiceFilters>(initialFilters);

  // Facturas
  const fetchInvoices = useCallback(
    async (filters?: InvoiceFilters, newPage?: number) => {
      setLoading(true);
      setError(null);

      try {
        const appliedFilters = filters || currentFilters;
        const appliedPage = newPage || page;

        const result = await financeService.getInvoices(appliedFilters, appliedPage, pageSize);
        setInvoices(result.data);
        setTotal(result.total);

        if (filters) setCurrentFilters(filters);
        if (newPage) setPage(newPage);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar facturas";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [currentFilters, page, pageSize]
  );

  const createInvoice = useCallback(
    async (data: CreateInvoiceDTO): Promise<Invoice | null> => {
      try {
        const invoice = await financeService.createInvoice(data);
        setInvoices(prev => [invoice, ...prev]);
        setTotal(prev => prev + 1);
        return invoice;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear factura";
        setError(message);
        return null;
      }
    },
    []
  );

  const sendInvoice = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await financeService.sendInvoice(id);
      setInvoices(prev => prev.map(i => (i.id === id ? updated : i)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al enviar factura";
      setError(message);
      return false;
    }
  }, []);

  const cancelInvoice = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await financeService.cancelInvoice(id);
      setInvoices(prev => prev.map(i => (i.id === id ? updated : i)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cancelar factura";
      setError(message);
      return false;
    }
  }, []);

  const updateInvoiceStatus = useCallback(
    async (id: string, status: InvoiceStatus): Promise<boolean> => {
      try {
        const updated = await financeService.updateInvoiceStatus(id, status);
        setInvoices(prev => prev.map(i => (i.id === id ? updated : i)));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar estado";
        setError(message);
        return false;
      }
    },
    []
  );

  // Pagos
  const fetchPayments = useCallback(
    async (filters?: PaymentFilters, newPage?: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = await financeService.getPayments(filters, newPage || 1, pageSize);
        setPayments(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar pagos";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  const recordPayment = useCallback(
    async (data: CreatePaymentDTO): Promise<Payment | null> => {
      try {
        const payment = await financeService.recordPayment(data);
        setPayments(prev => [payment, ...prev]);
        // Refrescar facturas para actualizar el estado
        await fetchInvoices();
        return payment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al registrar pago";
        setError(message);
        return null;
      }
    },
    [fetchInvoices]
  );

  const getPaymentsByInvoice = useCallback(async (invoiceId: string): Promise<Payment[]> => {
    return financeService.getPaymentsByInvoice(invoiceId);
  }, []);

  // Costos
  const fetchCosts = useCallback(
    async (filters?: CostFilters, newPage?: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = await financeService.getCosts(filters, newPage || 1, pageSize);
        setCosts(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar costos";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  const recordCost = useCallback(
    async (data: CreateTransportCostDTO): Promise<TransportCost | null> => {
      try {
        const cost = await financeService.recordCost(data);
        setCosts(prev => [cost, ...prev]);
        return cost;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al registrar costo";
        setError(message);
        return null;
      }
    },
    []
  );

  const approveCost = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await financeService.approveCost(id, "current-user");
      setCosts(prev => prev.map(c => (c.id === id ? updated : c)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al aprobar costo";
      setError(message);
      return false;
    }
  }, []);

  // Tarifas
  const fetchRates = useCallback(
    async (filters?: { category?: string; isActive?: boolean }) => {
      try {
        const result = await financeService.getRates(filters);
        setRates(result);
      } catch (err) {
        console.error("[useFinance] Error al cargar tarifas:", err);
      }
    },
    []
  );

  const calculateRate = useCallback(
    async (
      originZone: string,
      destinationZone: string,
      weight?: number,
      volume?: number
    ) => {
      return financeService.calculateRate(originZone, destinationZone, weight, volume);
    },
    []
  );

  // Análisis
  const fetchStats = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      const result = await financeService.getFinanceStats(startDate, endDate);
      setStats(result);
    } catch (err) {
      console.error("[useFinance] Error al cargar estadísticas:", err);
    }
  }, []);

  const fetchAging = useCallback(async () => {
    try {
      const result = await financeService.getAccountsReceivableAging();
      setAging(result);
    } catch (err) {
      console.error("[useFinance] Error al cargar aging:", err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchInvoices(), fetchPayments(), fetchCosts(), fetchStats(), fetchAging(), fetchRates({ isActive: true })]);
  }, [fetchInvoices, fetchPayments, fetchCosts, fetchStats, fetchAging, fetchRates]);

  // Auto-fetch
  useEffect(() => {
    if (autoFetch) {
      fetchInvoices();
      fetchPayments();
      fetchCosts();
      fetchStats();
      fetchAging();
      fetchRates({ isActive: true });
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    invoices,
    payments,
    costs,
    rates,
    stats,
    aging,
    loading,
    error,
    total,
    page,
    pageSize,
    fetchInvoices,
    createInvoice,
    sendInvoice,
    cancelInvoice,
    updateInvoiceStatus,
    fetchPayments,
    recordPayment,
    getPaymentsByInvoice,
    fetchCosts,
    recordCost,
    approveCost,
    fetchRates,
    calculateRate,
    fetchStats,
    fetchAging,
    setPage,
    setPageSize,
    refresh,
  };
}


export function useInvoices(filters?: InvoiceFilters) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetch = useCallback(
    async (newFilters?: InvoiceFilters, newPage?: number) => {
      setLoading(true);
      setError(null);

      try {
        const result = await financeService.getInvoices(
          newFilters || filters,
          newPage || page,
          pageSize
        );
        setInvoices(result.data);
        setTotal(result.total);
        if (newPage) setPage(newPage);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar facturas";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, pageSize]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Totales calculados
  const totals = useMemo(() => {
    const totalAmount = invoices.reduce((sum, i) => sum + i.total, 0);
    const totalPaid = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const totalDue = invoices.reduce((sum, i) => sum + i.amountDue, 0);
    const overdueCount = invoices.filter(i => i.status === "overdue").length;

    return { totalAmount, totalPaid, totalDue, overdueCount };
  }, [invoices]);

  return {
    invoices,
    loading,
    error,
    total,
    page,
    pageSize,
    totals,
    fetch,
    setPage,
    setPageSize,
  };
}


export function useProfitability(startDate: string, endDate: string) {
  const [analysis, setAnalysis] = useState<ProfitabilityAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await financeService.getProfitabilityAnalysis(startDate, endDate);
      setAnalysis(result);
    } catch (err) {
      console.error("[useProfitability] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetch();
    }
  }, [fetch, startDate, endDate]);

  return { analysis, loading, refresh: fetch };
}


export function useCashFlow(startDate: string, endDate: string) {
  const [cashFlow, setCashFlow] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await financeService.getCashFlowSummary(startDate, endDate);
      setCashFlow(result);
    } catch (err) {
      console.error("[useCashFlow] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetch();
    }
  }, [fetch, startDate, endDate]);

  return { cashFlow, loading, refresh: fetch };
}


export function useCustomerFinancials(customerId: string) {
  const [summary, setSummary] = useState<CustomerFinancialSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const [summaryResult, invoicesResult, paymentsResult] = await Promise.all([
        financeService.getCustomerFinancialSummary(customerId),
        financeService.getInvoices({ customerId }, 1, 100),
        financeService.getPayments({ customerId }, 1, 100),
      ]);

      setSummary(summaryResult);
      setInvoices(invoicesResult.data);
      setPayments(paymentsResult.data);
    } catch (err) {
      console.error("[useCustomerFinancials] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const stats = useMemo(() => {
    if (!summary) return null;

    return {
      paymentRatio: summary.totalInvoiced > 0
        ? (summary.totalPaid / summary.totalInvoiced) * 100
        : 100,
      overdueRatio: summary.invoiceCount > 0
        ? (summary.overdueInvoiceCount / summary.invoiceCount) * 100
        : 0,
      isGoodStanding: summary.overdueAmount === 0 && summary.avgPaymentDays <= 30,
    };
  }, [summary]);

  return {
    summary,
    invoices,
    payments,
    stats,
    loading,
    refresh: fetch,
  };
}


export function useVehicleCosts(vehicleId: string) {
  const [costs, setCosts] = useState<TransportCost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!vehicleId) return;

    setLoading(true);
    try {
      const result = await financeService.getCostsByVehicle(vehicleId);
      setCosts(result);
    } catch (err) {
      console.error("[useVehicleCosts] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Totales por tipo
  const totals = useMemo(() => {
    const byType = new Map<string, number>();
    let total = 0;

    for (const cost of costs) {
      const current = byType.get(cost.type) || 0;
      byType.set(cost.type, current + cost.amount);
      total += cost.amount;
    }

    return {
      total,
      byType: Array.from(byType.entries()).map(([type, amount]) => ({ type, amount })),
      fuel: byType.get("fuel") || 0,
      toll: byType.get("toll") || 0,
      maintenance: byType.get("maintenance") || 0,
    };
  }, [costs]);

  return { costs, totals, loading, refresh: fetch };
}


export function useOrderCosts(orderId: string) {
  const [costs, setCosts] = useState<TransportCost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const result = await financeService.getCostsByOrder(orderId);
      setCosts(result);
    } catch (err) {
      console.error("[useOrderCosts] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const total = useMemo(
    () => costs.reduce((sum, c) => sum + c.amount, 0),
    [costs]
  );

  return { costs, total, loading, refresh: fetch };
}

export default useFinance;
