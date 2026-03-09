import { BulkService } from "@/services/base.service";
import { API_ENDPOINTS } from "@/config/api.config";
import { 
  Customer, 
  CustomerStats, 
  CustomerFilters,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerCategory,
  CustomerOperationalStats
} from "@/types/models";
import { PaginatedResponse } from "@/types/common";
import { customersMock } from "@/mocks/master";

/**
 * Genera código único de cliente
 */
function generateCustomerCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CLI-${timestamp}-${random}`;
}

/**
 * Servicio para gestión de Clientes
 * 
 */
class CustomersService extends BulkService<Customer> {
  constructor() {
    super(API_ENDPOINTS.master.customers, customersMock);
  }

  /**
   * Obtiene clientes con filtros avanzados
   */
  async getFiltered(filters: CustomerFilters, page = 1, pageSize = 10): Promise<PaginatedResponse<Customer>> {
    if (this.useMocks) {
      await this.simulateDelay(400);

      let filtered = [...this.mockData];

      // Filtro por búsqueda
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(search) ||
          c.tradeName?.toLowerCase().includes(search) ||
          c.documentNumber.includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.code?.toLowerCase().includes(search)
        );
      }

      // Filtro por estado
      if (filters.status && filters.status !== "all") {
        filtered = filtered.filter(c => c.status === filters.status);
      }

      // Filtro por tipo
      if (filters.type && filters.type !== "all") {
        filtered = filtered.filter(c => c.type === filters.type);
      }

      // Filtro por categoría
      if (filters.category && filters.category !== "all") {
        filtered = filtered.filter(c => c.category === filters.category);
      }

      // Filtro por ciudad
      if (filters.city) {
        filtered = filtered.filter(c => 
          c.addresses.some(a => a.city.toLowerCase().includes(filters.city!.toLowerCase()))
        );
      }

      // Ordenamiento
      if (filters.sortBy) {
        filtered.sort((a, b) => {
          let aVal: string | number = "";
          let bVal: string | number = "";

          switch (filters.sortBy) {
            case "name":
              aVal = a.name;
              bVal = b.name;
              break;
            case "createdAt":
              aVal = new Date(a.createdAt).getTime();
              bVal = new Date(b.createdAt).getTime();
              break;
            case "code":
              aVal = a.code || "";
              bVal = b.code || "";
              break;
            default:
              aVal = a.name;
              bVal = b.name;
          }

          if (filters.sortOrder === "desc") {
            return aVal < bVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }

      // Paginación
      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (page - 1) * pageSize;
      const items = filtered.slice(startIndex, startIndex + pageSize);

      return {
        items,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    }

    // API real
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "all") {
        queryParams.append(key, String(value));
      }
    });
    queryParams.append("page", String(page));
    queryParams.append("pageSize", String(pageSize));

    return this.request<PaginatedResponse<Customer>>("GET", `${this.endpoint}?${queryParams}`);
  }

  /**
   * Obtiene estadísticas de clientes
   */
  async getStats(): Promise<CustomerStats> {
    if (this.useMocks) {
      await this.simulateDelay(300);

      const active = this.mockData.filter((c) => c.status === "active").length;
      const inactive = this.mockData.filter((c) => c.status === "inactive").length;

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const newThisMonth = this.mockData.filter(
        (c) => new Date(c.createdAt) >= thisMonth
      ).length;

      // Por categoría
      const byCategory: Record<CustomerCategory, number> = {
        standard: 0,
        premium: 0,
        vip: 0,
        wholesale: 0,
        corporate: 0,
        government: 0,
      };
      this.mockData.forEach(c => {
        const cat = c.category || "standard";
        byCategory[cat]++;
      });

      // Totales de crédito
      const totalCreditLimit = this.mockData.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
      const totalCreditUsed = this.mockData.reduce((sum, c) => sum + (c.creditUsed || 0), 0);

      return {
        total: this.mockData.length,
        active,
        inactive,
        newThisMonth,
        byCategory,
        totalCreditLimit,
        totalCreditUsed,
      };
    }

    return this.request<CustomerStats>("GET", `${this.endpoint}/stats`);
  }

  /**
   * Crea un nuevo cliente
   */
  async createCustomer(data: CreateCustomerDTO): Promise<Customer> {
    if (this.useMocks) {
      await this.simulateDelay(500);

      // Validar documento único
      const existingDoc = this.mockData.find(c => c.documentNumber === data.documentNumber);
      if (existingDoc) {
        throw new Error(`Ya existe un cliente con el documento ${data.documentNumber}`);
      }

      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        code: generateCustomerCode(),
        ...data,
        status: "active",
        addresses: data.addresses.map((a, i) => ({ ...a, id: `addr-${Date.now()}-${i}` })),
        contacts: data.contacts.map((c, i) => ({ ...c, id: `cont-${Date.now()}-${i}` })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Customer;

      this.mockData.push(newCustomer);
      return newCustomer;
    }

    return this.request<Customer>("POST", this.endpoint, data);
  }

  /**
   * Actualiza un cliente existente
   */
  async updateCustomer(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    if (this.useMocks) {
      await this.simulateDelay(400);

      const index = this.mockData.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Cliente con ID ${id} no encontrado`);
      }

      // Validar documento único si cambia
      if (data.documentNumber && data.documentNumber !== this.mockData[index].documentNumber) {
        const existingDoc = this.mockData.find(c => c.documentNumber === data.documentNumber);
        if (existingDoc) {
          throw new Error(`Ya existe un cliente con el documento ${data.documentNumber}`);
        }
      }

      const updated: Customer = {
        ...this.mockData[index],
        ...data,
        addresses: data.addresses 
          ? data.addresses.map((a, i) => ({ ...a, id: (a as { id?: string }).id || `addr-${Date.now()}-${i}` })) as Customer["addresses"]
          : this.mockData[index].addresses,
        contacts: data.contacts 
          ? data.contacts.map((c, i) => ({ ...c, id: (c as { id?: string }).id || `cont-${Date.now()}-${i}` })) as Customer["contacts"]
          : this.mockData[index].contacts,
        updatedAt: new Date().toISOString(),
      } as Customer;

      this.mockData[index] = updated;
      return updated;
    }

    return this.request<Customer>("PUT", `${this.endpoint}/${id}`, data);
  }

  /**
   * Elimina un cliente
   */
  async deleteCustomer(id: string): Promise<void> {
    if (this.useMocks) {
      await this.simulateDelay(300);

      const index = this.mockData.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Cliente con ID ${id} no encontrado`);
      }

      this.mockData.splice(index, 1);
      return;
    }

    return this.request<void>("DELETE", `${this.endpoint}/${id}`);
  }

  /**
   * Elimina múltiples clientes
   * 
   * @param ids - Array de IDs de clientes a eliminar
   * @returns Resultado con éxitos y errores
   */
  async bulkDeleteCustomers(ids: string[]): Promise<{
    success: string[];
    failed: { id: string; reason: string }[];
  }> {
    if (this.useMocks) {
      await this.simulateDelay(500);

      const success: string[] = [];
      const failed: { id: string; reason: string }[] = [];

      for (const id of ids) {
        const index = this.mockData.findIndex(c => c.id === id);
        if (index === -1) {
          failed.push({ id, reason: "Cliente no encontrado" });
        } else {
          // Verificar si tiene órdenes activas (simulado)
          const customer = this.mockData[index];
          if (customer.operationalStats?.totalOrders && customer.operationalStats.totalOrders > 0) {
            // Permitir eliminar pero registrar advertencia
            // En producción podríamos bloquear esto
          }
          this.mockData.splice(index, 1);
          success.push(id);
        }
      }

      return { success, failed };
    }

    return this.request<{ success: string[]; failed: { id: string; reason: string }[] }>(
      "DELETE", 
      `${this.endpoint}/bulk`, 
      { ids }
    );
  }

  /**
   * Cambia el estado de un cliente
   */
  async toggleStatus(id: string): Promise<Customer> {
    if (this.useMocks) {
      await this.simulateDelay(300);

      const index = this.mockData.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error(`Cliente con ID ${id} no encontrado`);
      }

      this.mockData[index] = {
        ...this.mockData[index],
        status: this.mockData[index].status === "active" ? "inactive" : "active",
        updatedAt: new Date().toISOString(),
      };

      return this.mockData[index];
    }

    return this.request<Customer>("PATCH", `${this.endpoint}/${id}/toggle-status`);
  }

  /**
   * Busca clientes por documento
   */
  async findByDocument(documentNumber: string): Promise<Customer | null> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      return this.mockData.find((c) => c.documentNumber === documentNumber) || null;
    }

    return this.request<Customer | null>("GET", `${this.endpoint}/by-document/${documentNumber}`);
  }

  /**
   * Obtiene ciudades únicas de los clientes
   */
  async getCities(): Promise<string[]> {
    if (this.useMocks) {
      await this.simulateDelay(200);
      const cities = new Set<string>();
      this.mockData.forEach(c => {
        c.addresses.forEach(a => cities.add(a.city));
      });
      return Array.from(cities).sort();
    }

    return this.request<string[]>("GET", `${this.endpoint}/cities`);
  }

  /**
   * Importa múltiples clientes desde CSV/Excel
   */
  async importCustomers(customers: CreateCustomerDTO[]): Promise<{
    success: string[];
    failed: { row: number; message: string }[];
  }> {
    if (this.useMocks) {
      await this.simulateDelay(1000);

      const success: string[] = [];
      const failed: { row: number; message: string }[] = [];

      for (let i = 0; i < customers.length; i++) {
        const customerData = customers[i];
        
        // Simular validación y posibles errores
        // 10% de probabilidad de fallo para testing
        if (Math.random() < 0.1) {
          failed.push({ row: i + 2, message: "Error simulado de importación" });
          continue;
        }

        // Verificar duplicado por documento
        const existingByDoc = this.mockData.find(
          c => c.documentNumber === customerData.documentNumber
        );
        if (existingByDoc) {
          failed.push({ row: i + 2, message: `Documento ${customerData.documentNumber} ya existe` });
          continue;
        }

        // Crear nuevo cliente
        const newCustomer: Customer = {
          id: `cust-import-${Date.now()}-${i}`,
          code: generateCustomerCode(),
          type: customerData.type,
          documentType: customerData.documentType,
          documentNumber: customerData.documentNumber,
          name: customerData.name,
          tradeName: customerData.tradeName,
          email: customerData.email,
          phone: customerData.phone,
          phone2: customerData.phone2,
          website: customerData.website,
          category: customerData.category || "standard",
          notes: customerData.notes,
          industry: customerData.industry,
          tags: customerData.tags,
          status: "active",
          addresses: customerData.addresses,
          contacts: customerData.contacts?.map((contact, idx) => ({
            ...contact,
            id: `contact-${Date.now()}-${idx}`,
          })) || [],
          operationalStats: {
            totalOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            onTimeDeliveryRate: 0,
            totalVolumeKg: 0,
            lastOrderDate: undefined,
            totalBilledAmount: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.mockData.push(newCustomer);
        success.push(newCustomer.id);
      }

      return { success, failed };
    }

    // Producción: llamada al API
    return this.request("POST", `${this.endpoint}/import`, customers);
  }

  /**
   * Exporta clientes a CSV
   */
  async exportToCSV(filters?: CustomerFilters): Promise<Blob> {
    if (this.useMocks) {
      await this.simulateDelay(500);

      let data = [...this.mockData];

      // Aplicar filtros si existen
      if (filters?.status && filters.status !== "all") {
        data = data.filter(c => c.status === filters.status);
      }

      // Generar CSV
      const headers = ["Código", "Tipo", "Documento", "Nombre", "Email", "Teléfono", "Estado", "Categoría", "Ciudad"];
      const rows = data.map(c => [
        c.code || "",
        c.type,
        `${c.documentType}: ${c.documentNumber}`,
        c.name,
        c.email,
        c.phone,
        c.status,
        c.category || "standard",
        c.addresses[0]?.city || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    }

    const response = await fetch(`${this.endpoint}/export`, { method: "GET" });
    return response.blob();
  }

  /**
   * Request helper para métodos adicionales
   */
  private async request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
    const { apiClient } = await import("@/lib/api");

    switch (method) {
      case "GET":
        return apiClient.get<T>(endpoint);
      case "POST":
        return apiClient.post<T>(endpoint, data);
      case "PUT":
        return apiClient.put<T>(endpoint, data);
      case "PATCH":
        return apiClient.patch<T>(endpoint, data);
      case "DELETE":
        return apiClient.delete(endpoint) as T;
      default:
        return apiClient.get<T>(endpoint);
    }
  }

  /**
   * Obtiene estadísticas operativas de un cliente basadas en órdenes reales
   * Conecta con el módulo de órdenes para calcular estadísticas en tiempo real
   */
  async getOperationalStats(customerId: string): Promise<CustomerOperationalStats> {
    if (this.useMocks) {
      await this.simulateDelay(300);

      const { orderService } = await import("@/services/orders");
      
      // Obtener órdenes del cliente
      const response = await orderService.getOrders({ 
        customerId,
        pageSize: 1000 // Obtener todas las órdenes del cliente
      });
      
      const orders = response.data;
      
      // Calcular estadísticas
      const completedOrders = orders.filter(o => 
        o.status === "completed" || o.status === "closed"
      ).length;
      
      const cancelledOrders = orders.filter(o => o.status === "cancelled").length;
      
      // Calcular entregas a tiempo
      const ordersWithDeliveryInfo = orders.filter(o => 
        (o.status === "completed" || o.status === "closed") && 
        o.actualEndDate && o.scheduledEndDate
      );
      
      const onTimeDeliveries = ordersWithDeliveryInfo.filter(o => 
        new Date(o.actualEndDate!) <= new Date(o.scheduledEndDate!)
      ).length;
      
      const onTimeDeliveryRate = ordersWithDeliveryInfo.length > 0
        ? (onTimeDeliveries / ordersWithDeliveryInfo.length) * 100
        : 100;
      
      // Calcular volumen total
      const totalVolumeKg = orders.reduce((sum, o) => 
        sum + (o.cargo?.weightKg || 0), 0
      );
      
      // Última orden
      const sortedOrders = [...orders].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastOrderDate = sortedOrders[0]?.createdAt;
      
      // Valor total facturado (simulado basado en peso)
      const completedOrdersList = orders.filter(o => 
        o.status === "completed" || o.status === "closed"
      );
      const totalBilledAmount = completedOrdersList.reduce((sum, o) => 
        sum + (o.cargo?.weightKg || 0) * 0.5, 0 // Mock: S/.0.50 por kg
      );

      return {
        totalOrders: orders.length,
        completedOrders,
        cancelledOrders,
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
        totalVolumeKg: Math.round(totalVolumeKg),
        lastOrderDate,
        totalBilledAmount: Math.round(totalBilledAmount * 100) / 100,
      };
    }

    return this.request<CustomerOperationalStats>(
      "GET", 
      `${this.endpoint}/${customerId}/operational-stats`
    );
  }

  /**
   * Obtiene historial de órdenes de un cliente
   */
  async getOrderHistory(
    customerId: string, 
    options: { 
      limit?: number; 
      status?: string[];
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      createdAt: string;
      completedAt?: string;
      totalWeight?: number;
    }>;
    summary: {
      total: number;
      completed: number;
      inProgress: number;
      cancelled: number;
    };
  }> {
    if (this.useMocks) {
      await this.simulateDelay(300);

      const { orderService } = await import("@/services/orders");
      
      const response = await orderService.getOrders({ 
        customerId,
        pageSize: options.limit || 100
      });
      
      let orders = response.data;
      
      // Filtrar por estado
      if (options.status && options.status.length > 0) {
        orders = orders.filter(o => options.status!.includes(o.status));
      }
      
      // Filtrar por fechas
      if (options.startDate) {
        orders = orders.filter(o => new Date(o.createdAt) >= new Date(options.startDate!));
      }
      if (options.endDate) {
        orders = orders.filter(o => new Date(o.createdAt) <= new Date(options.endDate!));
      }
      
      // Limitar resultados
      if (options.limit) {
        orders = orders.slice(0, options.limit);
      }
      
      // Mapear a estructura simplificada
      const mappedOrders = orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: o.createdAt,
        completedAt: o.actualEndDate,
        totalWeight: o.cargo?.weightKg,
      }));
      
      // Calcular resumen
      const allOrders = response.data;
      const summary = {
        total: allOrders.length,
        completed: allOrders.filter(o => o.status === "completed" || o.status === "closed").length,
        inProgress: allOrders.filter(o => 
          o.status === "in_transit" || o.status === "at_milestone" || o.status === "assigned"
        ).length,
        cancelled: allOrders.filter(o => o.status === "cancelled").length,
      };

      return { orders: mappedOrders, summary };
    }

    const params = new URLSearchParams();
    if (options.limit) params.append("limit", String(options.limit));
    if (options.status) options.status.forEach(s => params.append("status", s));
    if (options.startDate) params.append("startDate", options.startDate);
    if (options.endDate) params.append("endDate", options.endDate);

    return this.request(
      "GET", 
      `${this.endpoint}/${customerId}/orders?${params}`
    );
  }

  /**
   * Actualiza las estadísticas operativas de un cliente
   * (recalcula basándose en las órdenes actuales)
   */
  async refreshOperationalStats(customerId: string): Promise<Customer> {
    if (this.useMocks) {
      await this.simulateDelay(400);

      const index = this.mockData.findIndex(c => c.id === customerId);
      if (index === -1) {
        throw new Error(`Cliente con ID ${customerId} no encontrado`);
      }

      const stats = await this.getOperationalStats(customerId);
      
      this.mockData[index] = {
        ...this.mockData[index],
        operationalStats: stats,
        updatedAt: new Date().toISOString(),
      };

      return this.mockData[index];
    }

    return this.request<Customer>(
      "POST", 
      `${this.endpoint}/${customerId}/refresh-stats`
    );
  }
}

/** Instancia singleton del servicio */
export const customersService = new CustomersService();
