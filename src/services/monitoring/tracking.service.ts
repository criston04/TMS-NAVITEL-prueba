import type { 
  TrackedVehicle, 
  VehiclePosition, 
  TrackedOrder,
  TrackedMilestone,
  ControlTowerFilters
} from "@/types/monitoring";
import { 
  vehiclePositionsMock, 
  getTrackedVehicleById,
  getVehiclesWithActiveOrders
} from "@/mocks/monitoring/vehicle-positions.mock";
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * Genera hitos de ejemplo para una orden rastreada
 */
function generateMockMilestones(orderId: string): TrackedMilestone[] {
  const milestones: TrackedMilestone[] = [
    {
      id: `${orderId}-ms-001`,
      name: "Origen - Almacén Central",
      type: "origin",
      sequence: 1,
      coordinates: { lat: -12.0464, lng: -77.0428 },
      trackingStatus: "completed",
      estimatedArrival: "2024-01-15T08:00:00Z",
      actualArrival: "2024-01-15T08:05:00Z",
      actualDeparture: "2024-01-15T08:30:00Z",
      delayMinutes: 5,
      address: "Av. Argentina 1234, Lima",
    },
    {
      id: `${orderId}-ms-002`,
      name: "Parada - Cliente A",
      type: "waypoint",
      sequence: 2,
      coordinates: { lat: -12.0864, lng: -77.0200 },
      trackingStatus: "completed",
      estimatedArrival: "2024-01-15T09:30:00Z",
      actualArrival: "2024-01-15T09:35:00Z",
      actualDeparture: "2024-01-15T10:00:00Z",
      delayMinutes: 5,
      address: "Calle Los Olivos 456, Miraflores",
    },
    {
      id: `${orderId}-ms-003`,
      name: "Parada - Cliente B",
      type: "waypoint",
      sequence: 3,
      coordinates: { lat: -12.1100, lng: -76.9800 },
      trackingStatus: "in_progress",
      estimatedArrival: "2024-01-15T11:00:00Z",
      address: "Av. La Molina 789, La Molina",
    },
    {
      id: `${orderId}-ms-004`,
      name: "Destino - Terminal Sur",
      type: "destination",
      sequence: 4,
      coordinates: { lat: -12.1500, lng: -77.0100 },
      trackingStatus: "pending",
      estimatedArrival: "2024-01-15T12:30:00Z",
      address: "Terminal Terrestre Sur, Chorrillos",
    },
  ];
  
  return milestones;
}

/**
 * Servicio de Tracking en Tiempo Real
 */
export class TrackingService {
  private readonly useMocks: boolean;
  private readonly endpoint = "/monitoring/tracking";

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red para mocks
   */
  private async simulateDelay(ms: number = 300): Promise<void> {
    if (this.useMocks) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Obtiene todos los vehículos activos con tracking
   */
  async getActiveVehicles(filters?: ControlTowerFilters): Promise<TrackedVehicle[]> {
    if (this.useMocks) {
      await this.simulateDelay();
      
      let vehicles = [...vehiclePositionsMock];
      
      if (filters) {
        // Filtro por búsqueda de unidad
        if (filters.unitSearch) {
          const search = filters.unitSearch.toLowerCase();
          vehicles = vehicles.filter(v => 
            v.plate.toLowerCase().includes(search) ||
            v.economicNumber?.toLowerCase().includes(search)
          );
        }
        
        // Filtro por transportista
        if (filters.carrierId) {
          vehicles = vehicles.filter(v => v.companyName === filters.carrierId);
        }
        
        // Filtro por número de orden
        if (filters.orderNumber) {
          vehicles = vehicles.filter(v => 
            v.activeOrderNumber?.includes(filters.orderNumber!)
          );
        }

        // Filtro por referencia (booking, guía, viaje)
        if (filters.reference) {
          const refSearch = filters.reference.toLowerCase();
          vehicles = vehicles.filter(v =>
            v.reference?.toLowerCase().includes(refSearch)
          );
        }
        
        // Filtro por cliente
        if (filters.customerId) {
          // TODO: Conectar con órdenes para filtrar por cliente
        }
        
        // Filtro solo órdenes activas
        if (filters.activeOrdersOnly) {
          vehicles = vehicles.filter(v => v.activeOrderId !== undefined);
        }
        
        // Filtro por estado de conexión
        if (filters.connectionStatus && filters.connectionStatus !== "all") {
          vehicles = vehicles.filter(v => 
            v.connectionStatus === filters.connectionStatus
          );
        }
      }
      
      return vehicles;
    }

    const params: Record<string, string> = {};
    if (filters?.unitSearch) params.unitSearch = filters.unitSearch;
    if (filters?.carrierId) params.carrierId = filters.carrierId;
    if (filters?.orderNumber) params.orderNumber = filters.orderNumber;
    if (filters?.customerId) params.customerId = filters.customerId;
    if (filters?.activeOrdersOnly) params.activeOrdersOnly = "true";
    if (filters?.connectionStatus) params.connectionStatus = filters.connectionStatus;
    return apiClient.get<TrackedVehicle[]>(API_ENDPOINTS.monitoring.tracking, { params });
  }

  /**
   * Obtiene la posición actual de un vehículo
   */
  async getVehiclePosition(vehicleId: string): Promise<VehiclePosition | null> {
    if (this.useMocks) {
      await this.simulateDelay(200);
      const vehicle = getTrackedVehicleById(vehicleId);
      return vehicle?.position || null;
    }

    return apiClient.get<VehiclePosition | null>(`${API_ENDPOINTS.monitoring.tracking}/${vehicleId}/position`);
  }

  /**
   * Obtiene información de un vehículo rastreado
   */
  async getTrackedVehicle(vehicleId: string): Promise<TrackedVehicle | null> {
    if (this.useMocks) {
      await this.simulateDelay(200);
      return getTrackedVehicleById(vehicleId) || null;
    }

    return apiClient.get<TrackedVehicle | null>(`${API_ENDPOINTS.monitoring.tracking}/${vehicleId}`);
  }

  /**
   * Obtiene la orden asociada a un vehículo
   */
  async getOrderByVehicle(vehicleId: string): Promise<TrackedOrder | null> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      
      const vehicle = getTrackedVehicleById(vehicleId);
      
      if (!vehicle?.activeOrderId) {
        return null;
      }
      
      const milestones = generateMockMilestones(vehicle.activeOrderId);
      const completedMilestones = milestones.filter(m => m.trackingStatus === "completed").length;
      const currentMilestoneIndex = milestones.findIndex(m => m.trackingStatus === "in_progress");
      const progress = Math.round((completedMilestones / milestones.length) * 100);
      
      return {
        id: vehicle.activeOrderId,
        orderNumber: vehicle.activeOrderNumber!,
        reference: vehicle.reference,
        serviceType: vehicle.serviceType,
        customerId: "cust-001",
        customerName: "Empresa Demo SAC",
        status: "in_transit",
        milestones,
        currentMilestoneIndex: currentMilestoneIndex !== -1 ? currentMilestoneIndex : completedMilestones,
        progress,
        createdAt: "2024-01-15T07:00:00Z",
      };
    }

    return apiClient.get<TrackedOrder | null>(`${API_ENDPOINTS.monitoring.tracking}/${vehicleId}/order`);
  }

  /**
   * Obtiene el estado de los hitos de una orden
   */
  async getMilestoneStatus(orderId: string): Promise<TrackedMilestone[]> {
    if (this.useMocks) {
      await this.simulateDelay(200);
      return generateMockMilestones(orderId);
    }

    return apiClient.get<TrackedMilestone[]>(`${API_ENDPOINTS.operations.orders}/${orderId}/milestones`);
  }

  /**
   * Obtiene vehículos con órdenes activas
   */
  async getVehiclesWithOrders(): Promise<TrackedVehicle[]> {
    if (this.useMocks) {
      await this.simulateDelay();
      return getVehiclesWithActiveOrders();
    }

    return apiClient.get<TrackedVehicle[]>(`${API_ENDPOINTS.monitoring.tracking}/with-orders`);
  }

  /**
   * Obtiene lista única de transportistas/operadores
   */
  async getCarriers(): Promise<string[]> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      const carriers = new Set(vehiclePositionsMock
        .map(v => v.companyName)
        .filter((name): name is string => name !== undefined));
      return Array.from(carriers).sort();
    }

    return apiClient.get<string[]>(`${API_ENDPOINTS.monitoring.tracking}/carriers`);
  }

  /**
   * Centra el mapa en un vehículo específico
   * (Este método retorna las coordenadas para que el componente de mapa las use)
   */
  async getVehicleCoordinates(vehicleId: string): Promise<{ lat: number; lng: number } | null> {
    const position = await this.getVehiclePosition(vehicleId);
    if (!position) return null;
    return { lat: position.lat, lng: position.lng };
  }

  /**
   * Calcula el progreso de una orden basado en los hitos
   */
  calculateOrderProgress(milestones: TrackedMilestone[]): {
    progress: number;
    currentMilestone: TrackedMilestone | null;
    completedCount: number;
    totalCount: number;
  } {
    const totalCount = milestones.length;
    const completedCount = milestones.filter(m => m.trackingStatus === "completed").length;
    const currentMilestone = milestones.find(m => m.trackingStatus === "in_progress") || null;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return {
      progress,
      currentMilestone,
      completedCount,
      totalCount,
    };
  }
}

/**
 * Singleton del servicio de tracking
 */
export const trackingService = new TrackingService();
