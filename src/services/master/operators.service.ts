import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import type { 
  Operator, 
  OperatorStats, 
  OperatorContact,
  OperatorValidationChecklist,
  OperatorDocument 
} from "@/types/models/operator";
import { operatorsMock, filterOperators } from "@/mocks/master/operators.mock";

// Simulación de delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let operatorsState = [...operatorsMock];

/**
 * Filtros para operadores
 */
export interface OperatorFilters {
  search?: string;
  type?: "propio" | "tercero" | "asociado" | "all";
  status?: "enabled" | "blocked" | "pending" | "all";
  checklistComplete?: boolean;
}

/**
 * DTO para crear operador
 */
export interface CreateOperatorDTO {
  code?: string;
  ruc: string;
  businessName: string;
  tradeName?: string;
  type: "propio" | "tercero" | "asociado";
  email: string;
  phone: string;
  fiscalAddress: string;
  contacts?: OperatorContact[];
  contractStartDate?: string;
  contractEndDate?: string;
  notes?: string;
}

/**
 * DTO para actualizar operador
 */
export interface UpdateOperatorDTO extends Partial<CreateOperatorDTO> {
  status?: "enabled" | "blocked" | "pending";
  checklist?: OperatorValidationChecklist;
  documents?: OperatorDocument[];
}

/**
 * Respuesta paginada de operadores
 */
export interface OperatorsResponse {
  data: Operator[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Servicio de Operadores Logísticos
 */
class OperatorsService {
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Obtiene todos los operadores con filtros opcionales
   */
  async getAll(filters?: OperatorFilters): Promise<Operator[]> {
    if (this.useMocks) {
      await delay(300);

      let result = [...operatorsState];

      if (filters) {
        result = filterOperators(result, {
          search: filters.search,
          type: filters.type,
          status: filters.status,
        });

        if (filters.checklistComplete !== undefined) {
          result = result.filter(op => op.checklist.isComplete === filters.checklistComplete);
        }
      }

      return result;
    }

    return apiClient.get(API_ENDPOINTS.master.operators, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene operadores paginados
   */
  async getPaginated(
    filters?: OperatorFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<OperatorsResponse> {
    if (this.useMocks) {
      await delay(300);

      const all = await this.getAll(filters);
      const total = all.length;
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const data = all.slice(start, start + pageSize);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages,
      };
    }

    return apiClient.get(API_ENDPOINTS.master.operators, { params: { ...filters, page, pageSize } as unknown as Record<string, string> });
  }

  /**
   * Obtiene un operador por ID
   */
  async getById(id: string): Promise<Operator | null> {
    if (this.useMocks) {
      await delay(200);
      return operatorsState.find(op => op.id === id) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.master.operators}/${id}`);
  }

  /**
   * Obtiene un operador por código
   */
  async getByCode(code: string): Promise<Operator | null> {
    if (this.useMocks) {
      await delay(200);
      return operatorsState.find(op => op.code === code) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.master.operators}/by-code/${code}`);
  }

  /**
   * Obtiene un operador por RUC
   */
  async getByRuc(ruc: string): Promise<Operator | null> {
    if (this.useMocks) {
      await delay(200);
      return operatorsState.find(op => op.ruc === ruc) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.master.operators}/by-ruc/${ruc}`);
  }

  /**
   * Crea un nuevo operador
   */
  async create(data: CreateOperatorDTO): Promise<Operator> {
    if (this.useMocks) {
      await delay(400);

      // Validar RUC único
      const existing = operatorsState.find(op => op.ruc === data.ruc);
      if (existing) {
        throw new Error("Ya existe un operador con ese RUC");
      }

      const now = new Date().toISOString();
      const newId = `op-${String(operatorsState.length + 1).padStart(3, "0")}`;
      const code = data.code || `OPL-${String(operatorsState.length + 1).padStart(3, "0")}`;

      const newOperator: Operator = {
        id: newId,
        code,
        ruc: data.ruc,
        businessName: data.businessName,
        tradeName: data.tradeName,
        type: data.type,
        email: data.email,
        phone: data.phone,
        fiscalAddress: data.fiscalAddress,
        contacts: data.contacts || [],
        checklist: {
          items: [
            { id: "chk-1", label: "RUC vigente", checked: false },
            { id: "chk-2", label: "Licencia de funcionamiento", checked: false },
            { id: "chk-3", label: "Póliza de seguro", checked: false },
            { id: "chk-4", label: "Certificado de inscripción MTC", checked: false },
            { id: "chk-5", label: "Contrato firmado", checked: false },
          ],
          isComplete: false,
          lastUpdated: now,
        },
        documents: [
          { id: "doc-1", name: "Ficha RUC", required: true, uploaded: false },
          { id: "doc-2", name: "Póliza de Seguro", required: true, uploaded: false },
          { id: "doc-3", name: "Licencia de Funcionamiento", required: true, uploaded: false },
          { id: "doc-4", name: "Certificado MTC", required: true, uploaded: false },
        ],
        driversCount: 0,
        vehiclesCount: 0,
        contractStartDate: data.contractStartDate,
        contractEndDate: data.contractEndDate,
        notes: data.notes,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };

      operatorsState = [...operatorsState, newOperator];
      return newOperator;
    }

    return apiClient.post(API_ENDPOINTS.master.operators, data);
  }

  /**
   * Actualiza un operador existente
   */
  async update(id: string, data: UpdateOperatorDTO): Promise<Operator> {
    if (this.useMocks) {
      await delay(400);

      const index = operatorsState.findIndex(op => op.id === id);
      if (index === -1) {
        throw new Error("Operador no encontrado");
      }

      // Validar RUC único si se está cambiando
      if (data.ruc && data.ruc !== operatorsState[index].ruc) {
        const existing = operatorsState.find(op => op.ruc === data.ruc);
        if (existing) {
          throw new Error("Ya existe un operador con ese RUC");
        }
      }

      const now = new Date().toISOString();
      const updated: Operator = {
        ...operatorsState[index],
        ...data,
        updatedAt: now,
      };

      // Verificar si checklist está completo
      if (data.checklist) {
        updated.checklist.isComplete = data.checklist.items.every(item => item.checked);
        updated.checklist.lastUpdated = now;
      }

      operatorsState = [
        ...operatorsState.slice(0, index),
        updated,
        ...operatorsState.slice(index + 1),
      ];

      return updated;
    }

    return apiClient.put(`${API_ENDPOINTS.master.operators}/${id}`, data);
  }

  /**
   * Elimina un operador
   */
  async delete(id: string): Promise<boolean> {
    if (this.useMocks) {
      await delay(300);

      const index = operatorsState.findIndex(op => op.id === id);
      if (index === -1) {
        throw new Error("Operador no encontrado");
      }

      // Validar que no tenga vehículos o conductores asignados
      const operator = operatorsState[index];
      if (operator.driversCount > 0 || operator.vehiclesCount > 0) {
        throw new Error("No se puede eliminar un operador con conductores o vehículos asignados");
      }

      operatorsState = [
        ...operatorsState.slice(0, index),
        ...operatorsState.slice(index + 1),
      ];

      return true;
    }

    return apiClient.delete(`${API_ENDPOINTS.master.operators}/${id}`);
  }

  /**
   * Cambia el estado de un operador
   */
  async changeStatus(id: string, status: "enabled" | "blocked" | "pending"): Promise<Operator> {
    if (this.useMocks) {
      return this.update(id, { status });
    }

    return apiClient.patch(`${API_ENDPOINTS.master.operators}/${id}/status`, { status });
  }

  /**
   * Actualiza el checklist de un operador
   */
  async updateChecklist(id: string, checklist: OperatorValidationChecklist): Promise<Operator> {
    if (this.useMocks) {
      return this.update(id, { checklist });
    }

    return apiClient.put(`${API_ENDPOINTS.master.operators}/${id}/checklist`, { checklist });
  }

  /**
   * Marca un ítem del checklist
   */
  async checkItem(id: string, itemId: string, checked: boolean): Promise<Operator> {
    if (this.useMocks) {
      await delay(200);

      const operator = await this.getById(id);
      if (!operator) {
        throw new Error("Operador no encontrado");
      }

      const now = new Date().toISOString();
      const updatedItems = operator.checklist.items.map(item =>
        item.id === itemId ? { ...item, checked, date: checked ? now.split("T")[0] : undefined } : item
      );

      const isComplete = updatedItems.every(item => item.checked);

      return this.update(id, {
        checklist: {
          items: updatedItems,
          isComplete,
          lastUpdated: now,
        },
      });
    }

    return apiClient.patch(`${API_ENDPOINTS.master.operators}/${id}/checklist/${itemId}`, { checked });
  }

  /**
   * Agrega un documento a un operador
   */
  async addDocument(id: string, document: OperatorDocument): Promise<Operator> {
    if (this.useMocks) {
      await delay(300);

      const operator = await this.getById(id);
      if (!operator) {
        throw new Error("Operador no encontrado");
      }

      const documents = [...operator.documents, document];
      return this.update(id, { documents });
    }

    return apiClient.post(`${API_ENDPOINTS.master.operators}/${id}/documents`, document);
  }

  /**
   * Agrega un contacto a un operador
   */
  async addContact(id: string, contact: OperatorContact): Promise<Operator> {
    if (this.useMocks) {
      await delay(300);

      const operator = await this.getById(id);
      if (!operator) {
        throw new Error("Operador no encontrado");
      }

      const contacts = [...operator.contacts, contact];
      return this.update(id, { contacts } as UpdateOperatorDTO);
    }

    return apiClient.post(`${API_ENDPOINTS.master.operators}/${id}/contacts`, contact);
  }

  /**
   * Obtiene estadísticas de operadores
   */
  async getStats(): Promise<OperatorStats> {
    if (this.useMocks) {
      await delay(200);
    
      const total = operatorsState.length;
      const enabled = operatorsState.filter(o => o.status === "enabled").length;
      const blocked = operatorsState.filter(o => o.status === "blocked").length;
      const pendingValidation = operatorsState.filter(
        o => o.status === "pending" || !o.checklist.isComplete
      ).length;
      const propios = operatorsState.filter(o => o.type === "propio").length;
      const terceros = operatorsState.filter(o => o.type === "tercero").length;

      return {
        total,
        enabled,
        blocked,
        pendingValidation,
        propios,
        terceros,
      };
    }

    return apiClient.get(`${API_ENDPOINTS.master.operators}/stats`);
  }

  /**
   * Obtiene operadores habilitados (para selects)
   */
  async getEnabled(): Promise<Operator[]> {
    if (this.useMocks) {
      await delay(200);
      return operatorsState.filter(op => op.status === "enabled");
    }

    return apiClient.get(API_ENDPOINTS.master.operators, { params: { status: "active" } });
  }

  /**
   * Busca operadores por texto
   */
  async search(query: string): Promise<Operator[]> {
    if (this.useMocks) {
      await delay(200);

      if (!query || query.length < 2) return [];

      const queryLower = query.toLowerCase();
      return operatorsState.filter(
        op =>
          op.businessName.toLowerCase().includes(queryLower) ||
          op.tradeName?.toLowerCase().includes(queryLower) ||
          op.ruc.includes(query) ||
          op.code.toLowerCase().includes(queryLower)
      );
    }

    return apiClient.get(`${API_ENDPOINTS.master.operators}/search`, { params: { q: query } });
  }
}

export const operatorsService = new OperatorsService();
export { OperatorsService };
