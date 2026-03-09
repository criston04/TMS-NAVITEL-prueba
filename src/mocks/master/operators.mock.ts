import type { Operator, OperatorStats } from "@/types/models/operator";

/**
 * Datos mock de operadores logísticos
 */
export const operatorsMock: Operator[] = [
  {
    id: "op-001",
    code: "OPL-001",
    ruc: "20512345678",
    businessName: "TRANSPORTES RAPIDOS SAC",
    tradeName: "TransRapid",
    type: "tercero",
    email: "contacto@transrapid.com.pe",
    phone: "+51 1 234-5678",
    fiscalAddress: "Av. Industrial 456, Ate, Lima",
    contacts: [
      {
        id: "cont-001",
        name: "Carlos Mendoza",
        position: "Gerente de Operaciones",
        email: "cmendoza@transrapid.com.pe",
        phone: "+51 999-888-777",
        isPrimary: true,
      },
      {
        id: "cont-002",
        name: "Maria Flores",
        position: "Coordinadora de Flota",
        email: "mflores@transrapid.com.pe",
        phone: "+51 999-777-666",
        isPrimary: false,
      },
    ],
    checklist: {
      items: [
        { id: "chk-1", label: "RUC vigente", checked: true, date: "2025-01-15" },
        { id: "chk-2", label: "Licencia de funcionamiento", checked: true, date: "2025-01-15" },
        { id: "chk-3", label: "Póliza de seguro", checked: true, date: "2025-01-10" },
        { id: "chk-4", label: "Certificado de inscripción MTC", checked: true, date: "2025-01-12" },
        { id: "chk-5", label: "Contrato firmado", checked: true, date: "2025-01-20" },
      ],
      isComplete: true,
      lastUpdated: "2025-01-20",
    },
    documents: [
      {
        id: "doc-1",
        name: "Ficha RUC",
        required: true,
        uploaded: true,
        fileName: "ficha_ruc_transrapid.pdf",
        uploadedAt: "2025-01-15",
        expiresAt: undefined,
      },
      {
        id: "doc-2",
        name: "Póliza de Seguro",
        required: true,
        uploaded: true,
        fileName: "poliza_2025.pdf",
        uploadedAt: "2025-01-10",
        expiresAt: "2026-01-10",
      },
    ],
    driversCount: 15,
    vehiclesCount: 12,
    contractStartDate: "2025-01-01",
    contractEndDate: "2025-12-31",
    notes: "Operador con amplia experiencia en transporte de carga general.",
    status: "enabled",
    createdAt: "2025-01-01T10:00:00Z",
    updatedAt: "2025-01-20T15:30:00Z",
  },
  {
    id: "op-002",
    code: "OPL-002",
    ruc: "20587654321",
    businessName: "LOGISTICA INTEGRAL DEL SUR EIRL",
    tradeName: "LogiSur",
    type: "tercero",
    email: "info@logisur.com.pe",
    phone: "+51 54 234-567",
    fiscalAddress: "Calle Comercio 789, Arequipa",
    contacts: [
      {
        id: "cont-003",
        name: "Pedro Ramos",
        position: "Gerente General",
        email: "pramos@logisur.com.pe",
        phone: "+51 958-123-456",
        isPrimary: true,
      },
    ],
    checklist: {
      items: [
        { id: "chk-1", label: "RUC vigente", checked: true, date: "2025-01-10" },
        { id: "chk-2", label: "Licencia de funcionamiento", checked: true, date: "2025-01-10" },
        { id: "chk-3", label: "Póliza de seguro", checked: false },
        { id: "chk-4", label: "Certificado de inscripción MTC", checked: true, date: "2025-01-10" },
        { id: "chk-5", label: "Contrato firmado", checked: false },
      ],
      isComplete: false,
      lastUpdated: "2025-01-10",
    },
    documents: [
      {
        id: "doc-3",
        name: "Ficha RUC",
        required: true,
        uploaded: true,
        fileName: "ficha_ruc_logisur.pdf",
        uploadedAt: "2025-01-10",
      },
      {
        id: "doc-4",
        name: "Póliza de Seguro",
        required: true,
        uploaded: false,
      },
    ],
    driversCount: 8,
    vehiclesCount: 6,
    contractStartDate: undefined,
    contractEndDate: undefined,
    notes: "Pendiente de completar documentación.",
    status: "pending",
    createdAt: "2025-01-10T09:00:00Z",
    updatedAt: "2025-01-10T09:00:00Z",
  },
  {
    id: "op-003",
    code: "OPL-003",
    ruc: "20123456789",
    businessName: "FLOTA NAVITEL SAC",
    tradeName: "Navitel Propio",
    type: "propio",
    email: "flota@navitel.com.pe",
    phone: "+51 1 456-7890",
    fiscalAddress: "Av. Principal 123, San Isidro, Lima",
    contacts: [
      {
        id: "cont-004",
        name: "Ana García",
        position: "Jefa de Flota",
        email: "agarcia@navitel.com.pe",
        phone: "+51 987-654-321",
        isPrimary: true,
      },
    ],
    checklist: {
      items: [
        { id: "chk-1", label: "RUC vigente", checked: true, date: "2025-01-01" },
        { id: "chk-2", label: "Licencia de funcionamiento", checked: true, date: "2025-01-01" },
        { id: "chk-3", label: "Póliza de seguro", checked: true, date: "2025-01-01" },
        { id: "chk-4", label: "Certificado de inscripción MTC", checked: true, date: "2025-01-01" },
        { id: "chk-5", label: "Contrato firmado", checked: true, date: "2025-01-01" },
      ],
      isComplete: true,
      lastUpdated: "2025-01-01",
    },
    documents: [
      {
        id: "doc-5",
        name: "Ficha RUC",
        required: true,
        uploaded: true,
        fileName: "ficha_ruc_navitel.pdf",
        uploadedAt: "2025-01-01",
      },
      {
        id: "doc-6",
        name: "Póliza de Seguro",
        required: true,
        uploaded: true,
        fileName: "poliza_navitel_2025.pdf",
        uploadedAt: "2025-01-01",
        expiresAt: "2026-01-01",
      },
    ],
    driversCount: 25,
    vehiclesCount: 20,
    contractStartDate: "2020-01-01",
    contractEndDate: undefined,
    notes: "Flota propia de la empresa.",
    status: "enabled",
    createdAt: "2020-01-01T08:00:00Z",
    updatedAt: "2025-01-01T10:00:00Z",
  },
  {
    id: "op-004",
    code: "OPL-004",
    ruc: "20999888777",
    businessName: "CARGO EXPRESS PERU SAC",
    tradeName: "CargoEx",
    type: "asociado",
    email: "ventas@cargoex.pe",
    phone: "+51 1 555-4444",
    fiscalAddress: "Jr. Comercial 567, Callao",
    contacts: [
      {
        id: "cont-005",
        name: "Luis Torres",
        position: "Director Comercial",
        email: "ltorres@cargoex.pe",
        phone: "+51 945-678-901",
        isPrimary: true,
      },
    ],
    checklist: {
      items: [
        { id: "chk-1", label: "RUC vigente", checked: true, date: "2024-12-01" },
        { id: "chk-2", label: "Licencia de funcionamiento", checked: true, date: "2024-12-01" },
        { id: "chk-3", label: "Póliza de seguro", checked: true, date: "2024-12-15" },
        { id: "chk-4", label: "Certificado de inscripción MTC", checked: true, date: "2024-12-01" },
        { id: "chk-5", label: "Contrato firmado", checked: true, date: "2024-12-20" },
      ],
      isComplete: true,
      lastUpdated: "2024-12-20",
    },
    documents: [
      {
        id: "doc-7",
        name: "Ficha RUC",
        required: true,
        uploaded: true,
        fileName: "ficha_ruc_cargoex.pdf",
        uploadedAt: "2024-12-01",
      },
      {
        id: "doc-8",
        name: "Póliza de Seguro",
        required: true,
        uploaded: true,
        fileName: "poliza_cargoex.pdf",
        uploadedAt: "2024-12-15",
        expiresAt: "2025-12-15",
      },
    ],
    driversCount: 10,
    vehiclesCount: 8,
    contractStartDate: "2024-12-01",
    contractEndDate: "2025-11-30",
    status: "enabled",
    createdAt: "2024-12-01T09:00:00Z",
    updatedAt: "2024-12-20T14:00:00Z",
  },
  {
    id: "op-005",
    code: "OPL-005",
    ruc: "20111222333",
    businessName: "TRANSPORTE VELOZ DEL NORTE SAC",
    tradeName: "VelozNorte",
    type: "tercero",
    email: "operaciones@veloznorte.com",
    phone: "+51 44 567-890",
    fiscalAddress: "Av. España 890, Trujillo",
    contacts: [
      {
        id: "cont-006",
        name: "Roberto Díaz",
        position: "Gerente de Operaciones",
        email: "rdiaz@veloznorte.com",
        phone: "+51 976-543-210",
        isPrimary: true,
      },
    ],
    checklist: {
      items: [
        { id: "chk-1", label: "RUC vigente", checked: true, date: "2024-06-01" },
        { id: "chk-2", label: "Licencia de funcionamiento", checked: true, date: "2024-06-01" },
        { id: "chk-3", label: "Póliza de seguro", checked: false },
        { id: "chk-4", label: "Certificado de inscripción MTC", checked: true, date: "2024-06-01" },
        { id: "chk-5", label: "Contrato firmado", checked: true, date: "2024-06-15" },
      ],
      isComplete: false,
      lastUpdated: "2024-06-15",
    },
    documents: [],
    driversCount: 5,
    vehiclesCount: 4,
    contractStartDate: "2024-06-01",
    contractEndDate: "2025-05-31",
    notes: "Operador bloqueado por póliza de seguro vencida.",
    status: "blocked",
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2025-01-05T08:00:00Z",
  },
];

/**
 * Calcula estadísticas de operadores
 */
export function getOperatorStats(): OperatorStats {
  const total = operatorsMock.length;
  const enabled = operatorsMock.filter(o => o.status === "enabled").length;
  const blocked = operatorsMock.filter(o => o.status === "blocked").length;
  const pendingValidation = operatorsMock.filter(o => o.status === "pending" || !o.checklist.isComplete).length;
  const propios = operatorsMock.filter(o => o.type === "propio").length;
  const terceros = operatorsMock.filter(o => o.type === "tercero").length;

  return {
    total,
    enabled,
    blocked,
    pendingValidation,
    propios,
    terceros,
  };
}

/**
 * Filtra operadores según criterios
 */
export function filterOperators(
  operators: Operator[],
  filters: {
    search?: string;
    type?: string;
    status?: string;
  }
): Operator[] {
  let result = [...operators];

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      op =>
        op.businessName.toLowerCase().includes(searchLower) ||
        op.tradeName?.toLowerCase().includes(searchLower) ||
        op.ruc.includes(filters.search!) ||
        op.code.toLowerCase().includes(searchLower)
    );
  }

  if (filters.type && filters.type !== "all") {
    result = result.filter(op => op.type === filters.type);
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter(op => op.status === filters.status);
  }

  return result;
}
