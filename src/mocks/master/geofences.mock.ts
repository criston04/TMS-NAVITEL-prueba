import { Geofence, GeofenceCategory } from "@/types/models/geofence";

/**
 * Geocercas mock para desarrollo
 */
export const geofencesMock: Geofence[] = [
  {
    id: "geo-001",
    code: "GEO-ALMACEN-LIMA",
    name: "Almacén Central Lima",
    description: "Centro de distribución principal en Lima",
    type: "polygon",
    category: "warehouse",
    geometry: {
      type: "polygon",
      coordinates: [
        { lat: -12.0464, lng: -77.0428 },
        { lat: -12.0464, lng: -77.0328 },
        { lat: -12.0364, lng: -77.0328 },
        { lat: -12.0364, lng: -77.0428 },
      ],
    },
    color: "#3B82F6",
    opacity: 0.25,
    tags: [
      { id: "tag-lima", name: "Lima", color: "#3B82F6" },
      { id: "tag-principal", name: "Principal", color: "#10B981" },
    ],
    alerts: {
      onEntry: true,
      onExit: true,
      onDwell: false,
    },
    status: "active",
    address: "Av. Argentina 1234, Lima",
    createdAt: "2025-01-15T08:00:00Z",
    updatedAt: "2025-01-20T14:30:00Z",
  },
  {
    id: "geo-002",
    code: "GEO-CLIENTE-MIRAFLORES",
    name: "Cliente Premium - Miraflores",
    description: "Punto de entrega cliente VIP",
    type: "circle",
    category: "customer",
    geometry: {
      type: "circle",
      center: { lat: -12.1191, lng: -77.0290 },
      radius: 200,
    },
    color: "#10B981",
    opacity: 0.2,
    tags: [
      { id: "tag-vip", name: "VIP", color: "#F59E0B" },
      { id: "tag-miraflores", name: "Miraflores", color: "#8B5CF6" },
    ],
    alerts: {
      onEntry: true,
      onExit: false,
      onDwell: true,
      dwellTimeMinutes: 30,
    },
    status: "active",
    customerId: "cust-001",
    address: "Av. Larco 456, Miraflores",
    createdAt: "2025-01-10T10:00:00Z",
    updatedAt: "2025-01-25T09:15:00Z",
  },
  {
    id: "geo-003",
    code: "GEO-PLANTA-CALLAO",
    name: "Planta de Producción Callao",
    description: "Planta industrial de procesamiento",
    type: "polygon",
    category: "plant",
    geometry: {
      type: "polygon",
      coordinates: [
        { lat: -12.0560, lng: -77.1180 },
        { lat: -12.0560, lng: -77.1080 },
        { lat: -12.0480, lng: -77.1080 },
        { lat: -12.0480, lng: -77.1180 },
      ],
    },
    color: "#F59E0B",
    opacity: 0.25,
    tags: [
      { id: "tag-callao", name: "Callao", color: "#EF4444" },
      { id: "tag-produccion", name: "Producción", color: "#F59E0B" },
    ],
    alerts: {
      onEntry: true,
      onExit: true,
      onDwell: true,
      dwellTimeMinutes: 60,
      notifyEmails: ["logistica@empresa.com"],
    },
    status: "active",
    address: "Zona Industrial Callao, Mz. A Lt. 15",
    createdAt: "2025-01-05T07:00:00Z",
    updatedAt: "2025-01-22T16:45:00Z",
  },
  {
    id: "geo-004",
    code: "GEO-PUERTO-CALLAO",
    name: "Puerto del Callao",
    description: "Zona portuaria de carga y descarga",
    type: "polygon",
    category: "port",
    geometry: {
      type: "polygon",
      coordinates: [
        { lat: -12.0450, lng: -77.1450 },
        { lat: -12.0450, lng: -77.1250 },
        { lat: -12.0550, lng: -77.1250 },
        { lat: -12.0550, lng: -77.1350 },
        { lat: -12.0500, lng: -77.1350 },
        { lat: -12.0500, lng: -77.1450 },
      ],
    },
    color: "#06B6D4",
    opacity: 0.2,
    tags: [
      { id: "tag-puerto", name: "Puerto", color: "#06B6D4" },
      { id: "tag-aduanas", name: "Aduanas", color: "#6366F1" },
    ],
    alerts: {
      onEntry: true,
      onExit: true,
      onDwell: true,
      dwellTimeMinutes: 120,
    },
    status: "active",
    address: "Terminal Portuario del Callao",
    createdAt: "2025-01-08T11:00:00Z",
    updatedAt: "2025-01-18T13:20:00Z",
  },
  {
    id: "geo-005",
    code: "GEO-CHECKPOINT-PANAMERICANA",
    name: "Checkpoint Panamericana Norte",
    description: "Punto de control en carretera",
    type: "circle",
    category: "checkpoint",
    geometry: {
      type: "circle",
      center: { lat: -11.9500, lng: -77.0600 },
      radius: 150,
    },
    color: "#8B5CF6",
    opacity: 0.3,
    tags: [
      { id: "tag-control", name: "Control", color: "#8B5CF6" },
    ],
    alerts: {
      onEntry: true,
      onExit: false,
      onDwell: false,
    },
    status: "active",
    createdAt: "2025-01-12T09:30:00Z",
    updatedAt: "2025-01-12T09:30:00Z",
  },
  {
    id: "geo-006",
    code: "GEO-RESTRINGIDO-CENTRO",
    name: "Zona Restringida Centro Histórico",
    description: "Área peatonal sin acceso vehicular",
    type: "polygon",
    category: "restricted",
    geometry: {
      type: "polygon",
      coordinates: [
        { lat: -12.0453, lng: -77.0311 },
        { lat: -12.0453, lng: -77.0275 },
        { lat: -12.0485, lng: -77.0275 },
        { lat: -12.0485, lng: -77.0311 },
      ],
    },
    color: "#EF4444",
    opacity: 0.35,
    tags: [
      { id: "tag-restringido", name: "Restringido", color: "#EF4444" },
      { id: "tag-centro", name: "Centro", color: "#F97316" },
    ],
    alerts: {
      onEntry: true,
      onExit: false,
      onDwell: false,
    },
    status: "active",
    address: "Centro Histórico de Lima",
    createdAt: "2025-01-14T15:00:00Z",
    updatedAt: "2025-01-14T15:00:00Z",
  },
  {
    id: "geo-007",
    code: "GEO-DELIVERY-SURCO",
    name: "Zona de Entrega Surco",
    description: "Área de cobertura de entregas en Surco",
    type: "polygon",
    category: "delivery",
    geometry: {
      type: "polygon",
      coordinates: [
        { lat: -12.1350, lng: -76.9950 },
        { lat: -12.1350, lng: -76.9750 },
        { lat: -12.1150, lng: -76.9750 },
        { lat: -12.1150, lng: -76.9950 },
      ],
    },
    color: "#22C55E",
    opacity: 0.2,
    tags: [
      { id: "tag-surco", name: "Surco", color: "#22C55E" },
      { id: "tag-delivery", name: "Delivery", color: "#14B8A6" },
    ],
    alerts: {
      onEntry: false,
      onExit: false,
      onDwell: false,
    },
    status: "active",
    address: "Santiago de Surco",
    createdAt: "2025-01-16T12:00:00Z",
    updatedAt: "2025-01-24T10:30:00Z",
  },
  {
    id: "geo-008",
    code: "GEO-CLIENTE-SANJUAN",
    name: "Supermercado San Juan",
    description: "Punto de entrega regular",
    type: "circle",
    category: "customer",
    geometry: {
      type: "circle",
      center: { lat: -12.1550, lng: -76.9700 },
      radius: 100,
    },
    color: "#0EA5E9",
    opacity: 0.25,
    tags: [
      { id: "tag-supermercado", name: "Supermercado", color: "#0EA5E9" },
    ],
    alerts: {
      onEntry: true,
      onExit: true,
      onDwell: true,
      dwellTimeMinutes: 45,
    },
    status: "active",
    customerId: "cust-002",
    address: "Av. San Juan 789, San Juan de Miraflores",
    createdAt: "2025-01-17T08:45:00Z",
    updatedAt: "2025-01-23T11:00:00Z",
  },
];

/**
 * Colores predefinidos para geocercas
 */
export const geofenceColors = [
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#10B981" },
  { name: "Amarillo", value: "#F59E0B" },
  { name: "Rojo", value: "#EF4444" },
  { name: "Morado", value: "#8B5CF6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Índigo", value: "#6366F1" },
  { name: "Naranja", value: "#F97316" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Lima", value: "#84CC16" },
  { name: "Gris", value: "#6B7280" },
];

/**
 * Categorías de geocercas con iconos y colores
 */
export const geofenceCategories: Array<{
  value: GeofenceCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}> = [
  { 
    value: "warehouse", 
    label: "Almacén", 
    icon: "Warehouse",
    color: "#3B82F6",
    description: "Centro de distribución o almacenamiento" 
  },
  { 
    value: "customer", 
    label: "Cliente", 
    icon: "User",
    color: "#10B981",
    description: "Punto de entrega de cliente" 
  },
  { 
    value: "plant", 
    label: "Planta", 
    icon: "Factory",
    color: "#F59E0B",
    description: "Planta de producción o procesamiento" 
  },
  { 
    value: "port", 
    label: "Puerto", 
    icon: "Anchor",
    color: "#06B6D4",
    description: "Puerto marítimo o terminal" 
  },
  { 
    value: "checkpoint", 
    label: "Punto de Control", 
    icon: "Shield",
    color: "#8B5CF6",
    description: "Punto de control o verificación" 
  },
  { 
    value: "restricted", 
    label: "Zona Restringida", 
    icon: "AlertTriangle",
    color: "#EF4444",
    description: "Área de acceso restringido" 
  },
  { 
    value: "delivery", 
    label: "Zona de Entrega", 
    icon: "Package",
    color: "#22C55E",
    description: "Área de cobertura de entregas" 
  },
  { 
    value: "other", 
    label: "Otro", 
    icon: "MapPin",
    color: "#6B7280",
    description: "Otro tipo de geocerca" 
  },
];
