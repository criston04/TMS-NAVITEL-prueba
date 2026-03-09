import type { 
  WebSocketMessage, 
  WebSocketConfig,
  PositionUpdateMessage
} from "@/types/monitoring";
import { vehiclePositionsMock, simulateVehicleMovement } from "@/mocks/monitoring/vehicle-positions.mock";
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";

/**
 * Configuración por defecto del WebSocket
 */
const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/monitoring",
  maxReconnectAttempts: 5,
  reconnectBaseDelay: 1000,
  reconnectBackoffFactor: 2,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
};

/**
 * Tipo para handlers de mensajes
 */
type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

/**
 * Servicio de WebSocket para monitoreo
 * Implementa patrón Singleton
 */
export class MonitoringWebSocketService {
  private config: WebSocketConfig;
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private mockInterval: NodeJS.Timeout | null = null;
  
  // Handlers
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  
  // Subscripciones
  private subscribedVehicleIds: Set<string> = new Set();
  
  // Mock mode
  private readonly useMock: boolean;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.useMock = apiConfig.useMocks;
  }

  /**
   * Conecta al servidor WebSocket
   */
  connect(): void {
    if (this.isConnected) {
      console.warn("[WS] Already connected");
      return;
    }

    if (this.useMock) {
      this.connectMock();
      return;
    }

    try {
      const wsUrl = apiConfig.baseUrl.replace(/^http/, 'ws') + API_ENDPOINTS.monitoring.websocket;
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log("[WS] Connected");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.connectHandlers.forEach(handler => handler());
        
        // Re-suscribir a vehículos
        if (this.subscribedVehicleIds.size > 0) {
          this.sendSubscription(Array.from(this.subscribedVehicleIds));
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };
      
      this.socket.onerror = (event) => {
        console.error("[WS] Error:", event);
        const error = new Error("WebSocket error");
        this.errorHandlers.forEach(handler => handler(error));
      };
      
      this.socket.onclose = () => {
        console.log("[WS] Disconnected");
        this.handleDisconnect();
      };
      
    } catch (error) {
      console.error("[WS] Connection error:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Conecta en modo mock (simulación)
   */
  private connectMock(): void {
    console.log("[WS Mock] Connecting...");
    
    // Simular delay de conexión
    setTimeout(() => {
      this.isConnected = true;
      console.log("[WS Mock] Connected");
      this.connectHandlers.forEach(handler => handler());
      
      // Iniciar simulación de posiciones
      this.startMockSimulation();
    }, 500);
  }

  /**
   * Inicia simulación de actualizaciones mock
   */
  private startMockSimulation(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }

    this.mockInterval = setInterval(() => {
      if (!this.isConnected) return;

      // Simular actualizaciones de posición para vehículos suscritos
      this.subscribedVehicleIds.forEach(vehicleId => {
        const vehicleIndex = vehiclePositionsMock.findIndex(v => v.id === vehicleId);
        if (vehicleIndex === -1) return;

        // Simular movimiento
        const updatedVehicle = simulateVehicleMovement(vehiclePositionsMock[vehicleIndex]);
        vehiclePositionsMock[vehicleIndex] = updatedVehicle;

        // Crear mensaje de actualización
        const message: PositionUpdateMessage = {
          type: "position_update",
          vehicleId: updatedVehicle.id,
          position: updatedVehicle.position,
          movementStatus: updatedVehicle.movementStatus,
          connectionStatus: updatedVehicle.connectionStatus,
          timestamp: new Date().toISOString(),
        };

        // Notificar a los handlers
        this.messageHandlers.forEach(handler => handler(message));
      });
    }, 3000); // Actualizar cada 3 segundos
  }

  /**
   * Desconecta del servidor WebSocket
   */
  disconnect(): void {
    console.log("[WS] Disconnecting...");
    
    this.clearTimers();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.subscribedVehicleIds.clear();
    this.disconnectHandlers.forEach(handler => handler());
  }

  /**
   * Maneja la desconexión
   */
  private handleDisconnect(): void {
    this.isConnected = false;
    this.clearTimers();
    this.disconnectHandlers.forEach(handler => handler());
    this.scheduleReconnect();
  }

  /**
   * Programa reconexión con backoff exponencial
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error("[WS] Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(this.config.reconnectBackoffFactor, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Inicia el heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Limpia todos los timers
   */
  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  /**
   * Envía mensaje de suscripción al servidor
   */
  private sendSubscription(vehicleIds: string[]): void {
    if (!this.useMock && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "subscribe",
        vehicleIds,
      }));
    }
  }

  /**
   * Suscribe a actualizaciones de vehículos
   */
  subscribeToVehicles(vehicleIds: string[]): void {
    vehicleIds.forEach(id => this.subscribedVehicleIds.add(id));
    
    if (this.isConnected) {
      this.sendSubscription(vehicleIds);
    }
    
    console.log(`[WS] Subscribed to vehicles: ${vehicleIds.join(", ")}`);
  }

  /**
   * Desuscribe de actualizaciones de vehículos
   */
  unsubscribeFromVehicles(vehicleIds: string[]): void {
    vehicleIds.forEach(id => this.subscribedVehicleIds.delete(id));
    
    if (!this.useMock && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "unsubscribe",
        vehicleIds,
      }));
    }
    
    console.log(`[WS] Unsubscribed from vehicles: ${vehicleIds.join(", ")}`);
  }

  /**
   * Registra handler para mensajes
   * @returns Función para desuscribir
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Registra handler para conexión
   * @returns Función para desuscribir
   */
  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  /**
   * Registra handler para desconexión
   * @returns Función para desuscribir
   */
  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  /**
   * Registra handler para errores
   * @returns Función para desuscribir
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Obtiene el estado de conexión
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Obtiene los IDs de vehículos suscritos
   */
  getSubscribedVehicleIds(): string[] {
    return Array.from(this.subscribedVehicleIds);
  }
}

/**
 * Singleton del servicio WebSocket
 */
export const monitoringWebSocketService = new MonitoringWebSocketService();
