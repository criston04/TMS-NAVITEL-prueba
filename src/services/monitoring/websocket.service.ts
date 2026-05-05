import type {
  WebSocketMessage,
  WebSocketConfig,
} from "@/types/monitoring";
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";

/**
 * Configuración por defecto del WebSocket
 */
const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/monitoring",
  // 3 intentos es suficiente: si el backend no tiene WS implementado, no tiene
  // sentido seguir molestando al usuario con errores. 5 era demasiado ruidoso.
  maxReconnectAttempts: 3,
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
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  // Handlers
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  // Subscripciones
  private subscribedVehicleIds: Set<string> = new Set();

  // Feature flag: el backend todavía no tiene /monitoring/websocket implementado.
  // Mientras tanto mantenemos el WS DESACTIVADO por defecto para evitar:
  //   - logs de error en consola (3 reintentos fallidos cada vez que montas un modulo de monitoreo)
  //   - badge "Desconectado" rojo confuso cuando el HTTP polling en realidad funciona
  // Cuando el backend exponga el endpoint, setear NEXT_PUBLIC_ENABLE_WEBSOCKET=true en .env.
  private readonly websocketEnabled: boolean;
  private hasWarnedDisabled = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.websocketEnabled = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true";
  }

  /**
   * Conecta al servidor WebSocket
   */
  connect(): void {
    if (this.isConnected) {
      console.warn("[WS] Already connected");
      return;
    }

    // Si el feature flag esta desactivado, no intentamos conectar.
    // La torre de control / multiventana funcionan via HTTP polling (GET /monitoring/tracking).
    if (!this.websocketEnabled) {
      if (!this.hasWarnedDisabled) {
        console.info(
          "[WS] WebSocket desactivado (NEXT_PUBLIC_ENABLE_WEBSOCKET != 'true'). " +
          "Usando polling HTTP para tracking. Activar cuando el backend exponga /monitoring/websocket."
        );
        this.hasWarnedDisabled = true;
      }
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
        // Usamos warn (no error) porque el backend puede aún no tener /monitoring/websocket implementado.
        // Esto evita que aparezca como error ruidoso en consola mientras el backend completa el feature.
        console.warn("[WS] Error (backend websocket no disponible?):", event);
        const error = new Error("WebSocket error");
        this.errorHandlers.forEach(handler => handler(error));
      };

      this.socket.onclose = () => {
        console.log("[WS] Disconnected");
        this.handleDisconnect();
      };

    } catch (error) {
      console.warn("[WS] Connection error:", error);
      this.scheduleReconnect();
    }
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
   * Programa reconexión con backoff exponencial.
   *
   * Si alcanzamos el máximo, dejamos de intentar (no es un error fatal —
   * significa que el backend probablemente no tiene el endpoint websocket
   * implementado todavía). La UI puede seguir funcionando en modo "polling"
   * usando GET /monitoring/tracking.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn(
        `[WS] Max reconnect attempts reached (${this.config.maxReconnectAttempts}). ` +
        `El backend probablemente aún no expone /monitoring/websocket. ` +
        `La torre de control seguirá funcionando por polling.`
      );
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
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Envía mensaje de suscripción al servidor
   */
  private sendSubscription(vehicleIds: string[]): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
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

    if (this.socket?.readyState === WebSocket.OPEN) {
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
   * Indica si el WebSocket esta habilitado por feature flag.
   * Si es false, la torre/multiventana funcionan solo con HTTP polling
   * y el UI deberia mostrar "Polling" en vez de "Desconectado" (rojo).
   */
  isWebSocketEnabled(): boolean {
    return this.websocketEnabled;
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
