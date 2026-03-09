/* ============================================
   MAPPER: Order → TransportOrder
   Convierte órdenes del módulo Orders al formato
   que consume el Route Planner
   ============================================ */

import type { Order, OrderMilestone, OrderPriority, OrderStatus as OrderModuleStatus } from '@/types/order';
import type { TransportOrder, OrderStatus as PlannerOrderStatus } from '@/types/route-planner';

/**
 * Mapea la prioridad del módulo Orders al formato del Planner
 * Orders: low | normal | high | urgent
 * Planner: low | medium | high
 */
function mapPriority(priority: OrderPriority): 'high' | 'medium' | 'low' {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'high';
    case 'normal':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Mapea el estado del módulo Orders al formato del Planner
 * Orders: draft | pending | assigned | in_transit | at_milestone | delayed | completed | closed | cancelled
 * Planner: pending | assigned | in_transit | delivered
 */
function mapStatus(status: OrderModuleStatus): PlannerOrderStatus {
  switch (status) {
    case 'draft':
    case 'pending':
      return 'pending';
    case 'assigned':
      return 'assigned';
    case 'in_transit':
    case 'at_milestone':
    case 'delayed':
      return 'in_transit';
    case 'completed':
    case 'closed':
      return 'delivered';
    case 'cancelled':
      return 'pending'; // cancelled no existe en Planner, se filtra antes
    default:
      return 'pending';
  }
}

/**
 * Extrae un milestone por tipo (origin/destination)
 * Si no existe, retorna un fallback vacío
 */
function findMilestone(milestones: OrderMilestone[], type: 'origin' | 'destination'): OrderMilestone | null {
  return milestones.find((m) => m.type === type) || null;
}

/**
 * Infiere zona a partir de la ciudad de destino
 */
function inferZone(city: string): string {
  const normalized = city.toLowerCase().trim();

  // Zonas conocidas de Perú (expandible)
  if (normalized.includes('lima') || normalized.includes('callao') || normalized.includes('miraflores') || normalized.includes('surco') || normalized.includes('san isidro')) return 'Lima Centro';
  if (normalized.includes('ate') || normalized.includes('santa anita') || normalized.includes('chaclacayo') || normalized.includes('chosica') || normalized.includes('lurigancho')) return 'Lima Este';
  if (normalized.includes('ventanilla') || normalized.includes('puente piedra') || normalized.includes('comas') || normalized.includes('carabayllo') || normalized.includes('los olivos') || normalized.includes('independencia') || normalized.includes('san martín')) return 'Lima Norte';
  if (normalized.includes('lurín') || normalized.includes('villa el salvador') || normalized.includes('villa maría') || normalized.includes('chorrillos') || normalized.includes('san juan de miraflores') || normalized.includes('pachacámac')) return 'Lima Sur';
  if (normalized.includes('arequipa')) return 'Arequipa';
  if (normalized.includes('trujillo') || normalized.includes('la libertad')) return 'Trujillo';
  if (normalized.includes('cusco') || normalized.includes('cuzco')) return 'Cusco';
  if (normalized.includes('huancayo') || normalized.includes('junín')) return 'Junín';
  if (normalized.includes('piura')) return 'Piura';
  if (normalized.includes('chiclayo') || normalized.includes('lambayeque')) return 'Lambayeque';
  if (normalized.includes('ica')) return 'Ica';

  return 'Otra zona';
}

/**
 * Convierte una Order del módulo Orders en una TransportOrder del Route Planner
 * @param order - Orden del módulo Orders
 * @returns TransportOrder compatible con el Route Planner
 */
export function orderToTransportOrder(order: Order): TransportOrder | null {
  const origin = findMilestone(order.milestones, 'origin');
  const destination = findMilestone(order.milestones, 'destination');

  // Si no tiene origen y destino definidos, no se puede planificar
  if (!origin || !destination) {
    console.warn(
      `[Mapper] Orden ${order.orderNumber} sin milestones origin/destination válidos, omitida del planificador`
    );
    return null;
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,

    // Cliente: Order.customer → TransportOrder.client
    client: {
      name: order.customer?.name || `Cliente ${order.customerId}`,
      phone: order.driver?.phone || order.customer?.email || '',
    },

    // Origen: milestone type=origin → pickup
    pickup: {
      address: origin.address,
      city: origin.geofenceName || origin.address.split(',').pop()?.trim() || '',
      coordinates: [origin.coordinates.lat, origin.coordinates.lng],
      timeWindow: origin.estimatedArrival && origin.estimatedDeparture
        ? { start: origin.estimatedArrival, end: origin.estimatedDeparture }
        : undefined,
    },

    // Destino: milestone type=destination → delivery
    delivery: {
      address: destination.address,
      city: destination.geofenceName || destination.address.split(',').pop()?.trim() || '',
      coordinates: [destination.coordinates.lat, destination.coordinates.lng],
      timeWindow: destination.estimatedArrival && destination.estimatedDeparture
        ? { start: destination.estimatedArrival, end: destination.estimatedDeparture }
        : undefined,
    },

    // Carga: OrderCargo → cargo
    cargo: {
      weight: order.cargo.weightKg,
      volume: order.cargo.volumeM3 || 0,
      description: order.cargo.description,
      requiresRefrigeration: order.cargo.temperatureControlled || order.cargo.type === 'refrigerated',
      fragile: order.cargo.type === 'fragile',
    },

    // Estado y prioridad mapeados
    status: mapStatus(order.status),
    priority: mapPriority(order.priority),

    // Fecha: scheduledStartDate → requestedDate
    requestedDate: order.scheduledStartDate,

    // Zona inferida del destino
    zone: inferZone(destination.geofenceName || destination.address),
  };
}

/**
 * Convierte un array de Orders, filtrando las que no son planificables
 * Solo incluye órdenes en estado draft, pending o assigned (aún no en tránsito)
 * @param orders - Array de órdenes del módulo Orders
 * @returns Array de TransportOrders válidas para planificación
 */
export function ordersToTransportOrders(orders: Order[]): TransportOrder[] {
  // Filtrar solo órdenes que se pueden planificar
  const plannable = orders.filter((o) =>
    ['draft', 'pending', 'assigned'].includes(o.status)
  );

  return plannable
    .map(orderToTransportOrder)
    .filter((o): o is TransportOrder => o !== null);
}
