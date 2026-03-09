import type { Product, ProductStats, ProductCategory } from "@/types/models/product";

/**
 * Datos mock de productos
 */
export const productsMock: Product[] = [
  {
    id: "prod-001",
    sku: "SKU-GEN-001",
    name: "Carga General Standard",
    description: "Carga general sin requerimientos especiales de transporte",
    category: "general",
    unitOfMeasure: "kg",
    dimensions: {
      weight: 1000,
      volume: 2,
    },
    transportConditions: {
      requiresRefrigeration: false,
      requiresSpecialHandling: false,
      stackable: true,
      maxStackHeight: 3,
    },
    status: "active",
    barcode: "7501234567890",
    createdAt: "2025-01-01T08:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "prod-002",
    sku: "SKU-REF-001",
    name: "Productos Lácteos",
    description: "Productos lácteos que requieren cadena de frío",
    category: "refrigerado",
    unitOfMeasure: "kg",
    dimensions: {
      weight: 500,
      volume: 0.8,
    },
    transportConditions: {
      requiresRefrigeration: true,
      minTemperature: 2,
      maxTemperature: 8,
      requiresSpecialHandling: true,
      handlingInstructions: "Mantener en cadena de frío. No exponer al sol.",
      stackable: true,
      maxStackHeight: 2,
    },
    status: "active",
    barcode: "7501234567891",
    unitPrice: 15.50,
    createdAt: "2025-01-02T09:00:00Z",
    updatedAt: "2025-01-20T11:00:00Z",
  },
  {
    id: "prod-003",
    sku: "SKU-CON-001",
    name: "Alimentos Congelados",
    description: "Productos congelados para transporte especializado",
    category: "congelado",
    unitOfMeasure: "kg",
    dimensions: {
      weight: 800,
      volume: 1.2,
    },
    transportConditions: {
      requiresRefrigeration: true,
      minTemperature: -25,
      maxTemperature: -18,
      requiresSpecialHandling: true,
      handlingInstructions: "Mantener congelado a -18°C mínimo. Verificar temperatura al cargar.",
      stackable: true,
      maxStackHeight: 2,
    },
    status: "active",
    barcode: "7501234567892",
    unitPrice: 25.00,
    createdAt: "2025-01-03T10:00:00Z",
    updatedAt: "2025-01-18T14:00:00Z",
  },
  {
    id: "prod-004",
    sku: "SKU-PEL-001",
    name: "Materiales Inflamables",
    description: "Materiales peligrosos clase 3 - Líquidos inflamables",
    category: "peligroso",
    unitOfMeasure: "lt",
    dimensions: {
      weight: 200,
      volume: 0.2,
    },
    transportConditions: {
      requiresRefrigeration: false,
      requiresSpecialHandling: true,
      handlingInstructions: "PELIGRO: Material inflamable. Mantener alejado de fuentes de calor. Requiere documentación HAZMAT.",
      stackable: false,
    },
    status: "active",
    barcode: "7501234567893",
    notes: "Requiere vehículo autorizado para transporte de materiales peligrosos",
    createdAt: "2025-01-04T11:00:00Z",
    updatedAt: "2025-01-22T09:00:00Z",
  },
  {
    id: "prod-005",
    sku: "SKU-FRG-001",
    name: "Equipos Electrónicos",
    description: "Equipos electrónicos sensibles a golpes y vibraciones",
    category: "fragil",
    unitOfMeasure: "unit",
    dimensions: {
      length: 60,
      width: 40,
      height: 30,
      weight: 15,
      volume: 0.072,
    },
    transportConditions: {
      requiresRefrigeration: false,
      requiresSpecialHandling: true,
      handlingInstructions: "FRÁGIL: Manipular con cuidado. No apilar. Mantener vertical.",
      stackable: false,
    },
    status: "active",
    barcode: "7501234567894",
    unitPrice: 500.00,
    createdAt: "2025-01-05T08:00:00Z",
    updatedAt: "2025-01-19T16:00:00Z",
  },
  {
    id: "prod-006",
    sku: "SKU-PER-001",
    name: "Frutas Frescas",
    description: "Frutas frescas con vida útil limitada",
    category: "perecible",
    unitOfMeasure: "kg",
    dimensions: {
      weight: 20,
      volume: 0.05,
    },
    transportConditions: {
      requiresRefrigeration: true,
      minTemperature: 8,
      maxTemperature: 12,
      requiresSpecialHandling: true,
      handlingInstructions: "Producto perecible. Entregar en máximo 24 horas. Ventilación adecuada.",
      stackable: true,
      maxStackHeight: 4,
    },
    status: "active",
    barcode: "7501234567895",
    unitPrice: 3.50,
    createdAt: "2025-01-06T07:00:00Z",
    updatedAt: "2025-01-21T10:00:00Z",
  },
  {
    id: "prod-007",
    sku: "SKU-GRN-001",
    name: "Cemento a Granel",
    description: "Cemento Portland para transporte a granel",
    category: "granel",
    unitOfMeasure: "ton",
    dimensions: {
      weight: 1000,
      volume: 0.7,
    },
    transportConditions: {
      requiresRefrigeration: false,
      requiresSpecialHandling: true,
      handlingInstructions: "Proteger de la humedad. Usar tolva cerrada.",
      stackable: false,
    },
    status: "active",
    barcode: "7501234567896",
    unitPrice: 180.00,
    createdAt: "2025-01-07T06:00:00Z",
    updatedAt: "2025-01-17T12:00:00Z",
  },
  {
    id: "prod-008",
    sku: "SKU-GEN-002",
    name: "Textiles Empacados",
    description: "Productos textiles en cajas selladas",
    category: "general",
    unitOfMeasure: "pallet",
    dimensions: {
      length: 120,
      width: 100,
      height: 150,
      weight: 400,
      volume: 1.8,
    },
    transportConditions: {
      requiresRefrigeration: false,
      requiresSpecialHandling: false,
      handlingInstructions: "Mantener seco. Proteger de polvo.",
      stackable: true,
      maxStackHeight: 3,
    },
    status: "active",
    barcode: "7501234567897",
    createdAt: "2025-01-08T09:00:00Z",
    updatedAt: "2025-01-16T11:00:00Z",
  },
  {
    id: "prod-009",
    sku: "SKU-REF-002",
    name: "Medicamentos Refrigerados",
    description: "Medicamentos que requieren control estricto de temperatura",
    category: "refrigerado",
    unitOfMeasure: "unit",
    dimensions: {
      length: 30,
      width: 20,
      height: 15,
      weight: 5,
      volume: 0.009,
    },
    transportConditions: {
      requiresRefrigeration: true,
      minTemperature: 2,
      maxTemperature: 8,
      requiresSpecialHandling: true,
      handlingInstructions: "CRÍTICO: Mantener cadena de frío 2-8°C. Registrar temperatura cada hora.",
      stackable: true,
      maxStackHeight: 5,
    },
    status: "active",
    barcode: "7501234567898",
    unitPrice: 1200.00,
    customerId: "cust-001",
    notes: "Producto exclusivo para cliente farmacéutico",
    createdAt: "2025-01-09T10:00:00Z",
    updatedAt: "2025-01-23T15:00:00Z",
  },
  {
    id: "prod-010",
    sku: "SKU-GEN-003",
    name: "Producto Descontinuado",
    description: "Producto ya no disponible",
    category: "general",
    unitOfMeasure: "kg",
    dimensions: {
      weight: 100,
    },
    transportConditions: {
      requiresRefrigeration: false,
      requiresSpecialHandling: false,
      stackable: true,
    },
    status: "inactive",
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2025-01-10T09:00:00Z",
  },
];

/**
 * Calcula estadísticas de productos
 */
export function getProductStats(): ProductStats {
  const total = productsMock.length;
  const active = productsMock.filter(p => p.status === "active").length;
  const inactive = productsMock.filter(p => p.status === "inactive").length;

  const byCategory: Record<ProductCategory, number> = {
    general: 0,
    perecible: 0,
    peligroso: 0,
    fragil: 0,
    refrigerado: 0,
    congelado: 0,
    granel: 0,
  };

  productsMock.forEach(p => {
    byCategory[p.category]++;
  });

  return {
    total,
    active,
    inactive,
    byCategory,
  };
}

/**
 * Filtra productos según criterios
 */
export function filterProducts(
  products: Product[],
  filters: {
    search?: string;
    category?: string;
    status?: string;
  }
): Product[] {
  let result = [...products];

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.barcode?.includes(filters.search!)
    );
  }

  if (filters.category && filters.category !== "all") {
    result = result.filter(p => p.category === filters.category);
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter(p => p.status === filters.status);
  }

  return result;
}
