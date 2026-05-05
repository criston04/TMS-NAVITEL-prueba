import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { snakeToCamel } from "@/lib/case-converter";
import type {
  Invoice,
  InvoiceStatus,
  Payment,
  TransportCost,
  ServiceRate,
  CustomerFinancialSummary,
  ProfitabilityAnalysis,
  CashFlowSummary,
  FinanceStats,
  AccountsReceivableAging,
  CreateInvoiceDTO,
  CreatePaymentDTO,
  CreateTransportCostDTO,
  InvoiceFilters,
  PaymentFilters,
  CostFilters,
} from "@/types/finance";

/**
 * 2026-05-03 (UI bug fix): el backend de finance devuelve los campos en
 * snake_case (`base_rate`, `min_charge`, `effective_from`, `tax_rate`, etc.).
 * Este helper aplica `snakeToCamel` a cualquier respuesta para que el
 * frontend reciba camelCase como espera.
 */
async function getCamel<T>(url: string, opts?: Parameters<typeof apiClient.get>[1]): Promise<T> {
  const raw = await apiClient.get<unknown>(url, opts);
  return snakeToCamel<T>(raw);
}

class FinanceService {
  // FACTURAS

  async getInvoices(
    filters: InvoiceFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: Invoice[]; total: number; page: number; pageSize: number }> {
    return getCamel<{ data: Invoice[]; total: number; page: number; pageSize: number }>(
      API_ENDPOINTS.finance.invoices,
      {
        params: { ...filters, page, pageSize } as unknown as Record<string, string | number | boolean | undefined>,
      }
    );
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    return getCamel<Invoice | null>(`${API_ENDPOINTS.finance.invoices}/${id}`);
  }

  async createInvoice(data: CreateInvoiceDTO): Promise<Invoice> {
    return apiClient.post<Invoice>(API_ENDPOINTS.finance.invoices, data);
  }

  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    return apiClient.patch<Invoice>(`${API_ENDPOINTS.finance.invoices}/${id}/status`, { status });
  }

  async sendInvoice(id: string): Promise<Invoice> {
    return this.updateInvoiceStatus(id, "sent");
  }

  async cancelInvoice(id: string): Promise<Invoice> {
    return this.updateInvoiceStatus(id, "cancelled");
  }

  // PAGOS

  async getPayments(
    filters: PaymentFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: Payment[]; total: number; page: number; pageSize: number }> {
    return getCamel<{ data: Payment[]; total: number; page: number; pageSize: number }>(
      API_ENDPOINTS.finance.payments,
      {
        params: { ...filters, page, pageSize } as unknown as Record<string, string | number | boolean | undefined>,
      }
    );
  }

  async recordPayment(data: CreatePaymentDTO): Promise<Payment> {
    return apiClient.post<Payment>(API_ENDPOINTS.finance.payments, data);
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return getCamel<Payment[]>(`${API_ENDPOINTS.finance.payments}`, {
      params: { invoiceId },
    });
  }

  // COSTOS

  async getCosts(
    filters: CostFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ data: TransportCost[]; total: number; page: number; pageSize: number }> {
    return getCamel<{ data: TransportCost[]; total: number; page: number; pageSize: number }>(
      API_ENDPOINTS.finance.costs,
      {
        params: { ...filters, page, pageSize } as unknown as Record<string, string | number | boolean | undefined>,
      }
    );
  }

  async recordCost(data: CreateTransportCostDTO): Promise<TransportCost> {
    return apiClient.post<TransportCost>(API_ENDPOINTS.finance.costs, data);
  }

  async approveCost(id: string, _approvedBy: string): Promise<TransportCost> {
    // Backend usa PATCH para aprobar costos (no POST)
    return apiClient.patch<TransportCost>(`${API_ENDPOINTS.finance.costs}/${id}/approve`, {});
  }

  async getCostsByOrder(orderId: string): Promise<TransportCost[]> {
    return getCamel<TransportCost[]>(`${API_ENDPOINTS.finance.costs}/by-order/${orderId}`);
  }

  async getCostsByVehicle(vehicleId: string): Promise<TransportCost[]> {
    return getCamel<TransportCost[]>(`${API_ENDPOINTS.finance.costs}/by-vehicle/${vehicleId}`);
  }

  // TARIFAS

  async getRates(
    filters: { category?: string; originZone?: string; destinationZone?: string; isActive?: boolean } = {}
  ): Promise<ServiceRate[]> {
    return getCamel<ServiceRate[]>(API_ENDPOINTS.finance.rates, {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
  }

  async getRateById(id: string): Promise<ServiceRate | null> {
    return getCamel<ServiceRate | null>(`${API_ENDPOINTS.finance.rates}/${id}`);
  }

  async calculateRate(
    originZone: string,
    destinationZone: string,
    weight?: number,
    volume?: number
  ): Promise<{ rate: ServiceRate | null; amount: number }> {
    return getCamel<{ rate: ServiceRate | null; amount: number }>(
      `${API_ENDPOINTS.finance.rates}/calculate`,
      {
        params: { originZone, destinationZone, weight, volume },
      }
    );
  }

  // ANÁLISIS FINANCIERO

  async getFinanceStats(
    startDate?: string,
    endDate?: string
  ): Promise<FinanceStats> {
    return getCamel<FinanceStats>(API_ENDPOINTS.finance.stats, {
      params: { startDate, endDate },
    });
  }

  async getCustomerFinancialSummary(customerId: string): Promise<CustomerFinancialSummary> {
    return getCamel<CustomerFinancialSummary>(
      `${API_ENDPOINTS.finance.customerSummary}/${customerId}/summary`
    );
  }

  async getAccountsReceivableAging(): Promise<AccountsReceivableAging> {
    return getCamel<AccountsReceivableAging>(API_ENDPOINTS.finance.aging);
  }

  async getProfitabilityAnalysis(
    startDate: string,
    endDate: string
  ): Promise<ProfitabilityAnalysis> {
    return getCamel<ProfitabilityAnalysis>(API_ENDPOINTS.finance.profitability, {
      params: { startDate, endDate },
    });
  }

  async getCashFlowSummary(
    startDate: string,
    endDate: string
  ): Promise<CashFlowSummary> {
    return getCamel<CashFlowSummary>(API_ENDPOINTS.finance.cashFlow, {
      params: { startDate, endDate },
    });
  }
}

export const financeService = new FinanceService();

export default financeService;
