/**
 * Transformer bidireccional para Driver.
 *
 * Backend schema observado (2026-04-21):
 *   id, tenant_id, code, document_type, document_number,
 *   first_name, last_name, birth_date, email, phone,
 *   status, availability, operator_id, assigned_vehicle_id,
 *   created_at, updated_at, deleted_at
 *
 * Campos del frontend Driver type que el backend NO soporta (quedan con defaults):
 *   address, hireDate, phone2, bloodType, photoUrl, notes, motherLastName,
 *   nationality, district, province, department, license (sub-objeto),
 *   emergencyContact, medicalExams, certifications, etc.
 */

import type { Driver, DriverDocumentType, DriverAvailability, DriverStatus } from "@/types/models/driver";
import type { DriverLicense, EmergencyContact, DrivingLimits, LicenseRestrictions } from "@/types/models/driver";
import type { ValidationChecklist, EntityStatus } from "@/types/common";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DEL BACKEND
// ════════════════════════════════════════════════════════════════════════════

export interface BackendDriver {
  id: string;
  tenant_id?: string;
  code?: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  email: string;
  phone: string;
  status: string;
  availability: string;
  operator_id?: string | null;
  assigned_vehicle_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface BackendLicensePayload {
  number?: string;
  category?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  issuing_country?: string;
  points?: number;
  max_points?: number;
  restrictions?: {
    requires_glasses?: boolean;
    requires_hearing_aid?: boolean;
    automatic_only?: boolean;
    other_restrictions?: string[];
  };
  verification_status?: string;
}

export interface BackendEmergencyContactPayload {
  name?: string;
  relationship?: string;
  relationship_detail?: string;
  phone?: string;
  alternative_phone?: string;
  email?: string;
  address?: string;
}

export interface BackendDriverDocumentPayload {
  id?: string;
  name?: string;
  is_required?: boolean;
  status?: string;
  expiration_date?: string;
  file_url?: string;
}

export interface BackendDriverPayload {
  code?: string;
  document_type?: string;
  document_number?: string;
  first_name?: string;
  last_name?: string;
  mother_last_name?: string;
  birth_date?: string;
  blood_type?: string;
  email?: string;
  phone?: string;
  alternative_phone?: string;
  status?: string;
  availability?: string;
  operator_id?: string;
  assigned_vehicle_id?: string;
  // Datos personales/laborales
  address?: string;
  district?: string;
  province?: string;
  department?: string;
  hire_date?: string;
  termination_date?: string;
  nationality?: string;
  photo_url?: string;
  signature_url?: string;
  notes?: string;
  tags?: string[];
  // Sub-objetos
  license?: BackendLicensePayload;
  emergency_contact?: BackendEmergencyContactPayload;
  documents?: BackendDriverDocumentPayload[];
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULTS para sub-objetos que el backend no devuelve
// ════════════════════════════════════════════════════════════════════════════

function defaultLicenseRestrictions(): LicenseRestrictions {
  return {
    requiresGlasses: false,
    requiresHearingAid: false,
    automaticOnly: false,
  };
}

function defaultLicense(): DriverLicense {
  return {
    number: "",
    category: "A-IIa",
    issueDate: "",
    expiryDate: "",
    issuingAuthority: "",
    issuingCountry: "PE",
    points: 0,
    maxPoints: 100,
    restrictions: defaultLicenseRestrictions(),
    verificationStatus: "pending",
  };
}

function defaultEmergencyContact(): EmergencyContact {
  return {
    name: "",
    relationship: "other",
    phone: "",
  };
}

function defaultDrivingLimits(): DrivingLimits {
  return {
    maxHoursPerDay: 10,
    maxHoursPerWeek: 60,
    restRequiredAfterHours: 4,
    minRestDuration: 30,
    nightDrivingAllowed: true,
  };
}

// 2026-05-03: `defaultChecklist` removida. Reemplazada por
// `computeChecklistFromBackendDriver` que calcula desde los datos reales.

/**
 * Calcula el checklist de validacion documentaria CLIENT-SIDE.
 *
 * 2026-05-03: El backend NO tiene endpoint `/master/drivers/:id/checklist`
 * (no esta en el Excel oficial). Tampoco devuelve un campo `checklist` en el
 * listado. Calculamos a partir de los campos del Driver ya cargado para que
 * la UI muestre el % real en lugar de un default 0%.
 *
 * Items requeridos (decision de frontend):
 *   - Documento de identidad (documentNumber presente)
 *   - Licencia con expiry_date no vencida
 *   - Datos de contacto (email + phone)
 *   - Contacto de emergencia (cuando el backend devuelva ese sub-objeto)
 *
 * Como actualmente el backend NO devuelve license ni emergency_contact en el
 * listado, este checklist solo refleja los campos planos. Cuando GET /:id se
 * implemente y devuelva los sub-objetos, el checklist sera mas preciso.
 */
function computeChecklistFromBackendDriver(b: BackendDriver): ValidationChecklist {
  const documents: ValidationChecklist["documents"] = [
    {
      id: "doc-id",
      name: "Documento de identidad",
      isRequired: true,
      status: b.document_number ? "valid" : "missing",
    },
    {
      id: "doc-contact",
      name: "Datos de contacto (email + telefono)",
      isRequired: true,
      status: (b.email && b.phone) ? "valid" : "missing",
    },
    {
      id: "doc-status",
      name: "Estado activo del conductor",
      isRequired: true,
      status: b.status === "active" ? "valid" : "missing",
    },
  ];
  const total = documents.filter(d => d.isRequired).length;
  const valid = documents.filter(d => d.status === "valid").length;
  return {
    entityId: b.id,
    entityType: "driver",
    documents,
    isComplete: valid === total,
    completionPercentage: total === 0 ? 0 : Math.round((valid / total) * 100),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND → FRONTEND
// ════════════════════════════════════════════════════════════════════════════

export function mapDriverFromBackend(b: BackendDriver): Driver {
  const firstName = b.first_name ?? "";
  const lastName = b.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  // 2026-05-03 (issue CRITICAL #2): mapeo correcto del status del backend al
  // DriverStatus del frontend. Antes asignábamos `entityStatus` ("active"|"inactive")
  // al campo `status` que está tipado como `DriverStatus`, lo que causaba que los
  // filtros del listado ("blocked", "suspended") nunca matchearan ningún driver.
  //
  // Tabla de mapeo:
  //   backend       → frontend (DriverStatus)
  //   "active"      → "active"
  //   "inactive"    → "inactive"
  //   "blocked"     → "suspended"   (en frontend "suspended" cubre ambos casos)
  //   "suspended"   → "suspended"
  //   "on_leave"    → "on_leave"
  //   "terminated"  → "terminated"
  const driverStatusMap: Record<string, DriverStatus> = {
    active: "active",
    inactive: "inactive",
    blocked: "suspended",
    suspended: "suspended",
    on_leave: "on_leave",
    terminated: "terminated",
  };
  const driverStatus: DriverStatus = driverStatusMap[b.status] ?? "inactive";
  // Status simplificado para `ActivatableEntity` (solo active/inactive)
  const entityStatus: EntityStatus = b.status === "active" ? "active" : "inactive";

  return {
    id: b.id,
    code: b.code ?? "",
    documentType: (b.document_type as DriverDocumentType) ?? "DNI",
    documentNumber: b.document_number ?? "",
    firstName,
    lastName,
    fullName,
    name: fullName,
    email: b.email ?? "",
    phone: b.phone ?? "",
    birthDate: b.birth_date ?? "",
    nationality: "PE",
    address: "",
    availability: (b.availability as DriverAvailability) ?? "available",

    // 2026-05-03: el campo `status` en `Driver` está tipado como `DriverStatus`
    // (no como `EntityStatus`). Usamos el mapeo correcto. `isEnabled` se
    // calcula independientemente para `ActivatableEntity`.
    status: driverStatus,
    isEnabled: b.status === "active",

    // Relaciones
    operatorId: b.operator_id ?? undefined,
    assignedVehicleId: b.assigned_vehicle_id ?? undefined,

    // Laboral
    hireDate: "",

    // Sub-objetos requeridos que el backend no devuelve — defaults
    license: defaultLicense(),
    emergencyContact: defaultEmergencyContact(),
    drivingLimits: defaultDrivingLimits(),
    // Checklist calculado client-side (el backend NO tiene /:id/checklist
    // implementado y tampoco devuelve checklist en el listado).
    checklist: computeChecklistFromBackendDriver(b),

    // Arrays vacios para historiales que el backend no envia en este endpoint
    medicalExamHistory: [],
    psychologicalExamHistory: [],
    certifications: [],
    documents: [],
    incidents: [],

    // Auditoria
    createdAt: b.created_at,
    updatedAt: b.updated_at,

    // El cast es necesario porque `entityStatus` se usa para alguna prop
    // implícita (ActivatableEntity); `status` ya está tipado correctamente
    // como DriverStatus.
    _entityStatus: entityStatus,
  } as unknown as Driver;
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND → BACKEND
// ════════════════════════════════════════════════════════════════════════════

export function mapDriverToBackend(d: Partial<Driver>): BackendDriverPayload {
  const payload: BackendDriverPayload = {};

  // ── Identificación ──────────────────────────────────────────────────
  if (d.code !== undefined) payload.code = d.code;
  if (d.documentType !== undefined) payload.document_type = d.documentType;
  if (d.documentNumber !== undefined) payload.document_number = d.documentNumber;
  if (d.firstName !== undefined) payload.first_name = d.firstName;
  if (d.lastName !== undefined) payload.last_name = d.lastName;
  if (d.motherLastName !== undefined) payload.mother_last_name = d.motherLastName;
  if (d.birthDate !== undefined) payload.birth_date = d.birthDate;
  if (d.bloodType !== undefined) payload.blood_type = d.bloodType;
  if (d.nationality !== undefined) payload.nationality = d.nationality;

  // ── Contacto ────────────────────────────────────────────────────────
  if (d.email !== undefined) payload.email = d.email;
  if (d.phone !== undefined) payload.phone = d.phone;
  if (d.alternativePhone !== undefined) payload.alternative_phone = d.alternativePhone;
  if (d.address !== undefined) payload.address = d.address;
  if (d.district !== undefined) payload.district = d.district;
  if (d.province !== undefined) payload.province = d.province;
  if (d.department !== undefined) payload.department = d.department;

  // ── Laboral ─────────────────────────────────────────────────────────
  if (d.hireDate !== undefined) payload.hire_date = d.hireDate;
  if (d.terminationDate !== undefined) payload.termination_date = d.terminationDate;
  if (d.availability !== undefined) payload.availability = d.availability;
  if (d.operatorId !== undefined) payload.operator_id = d.operatorId;
  if (d.assignedVehicleId !== undefined) payload.assigned_vehicle_id = d.assignedVehicleId;

  // ── Multimedia / metadata ───────────────────────────────────────────
  if (d.photoUrl !== undefined) payload.photo_url = d.photoUrl;
  if (d.signatureUrl !== undefined) payload.signature_url = d.signatureUrl;
  if (d.notes !== undefined) payload.notes = d.notes;
  if (d.tags !== undefined) payload.tags = d.tags;

  // Status derivado de isEnabled
  if (d.isEnabled === true) {
    payload.status = "active";
  } else if (d.isEnabled === false) {
    payload.status = "inactive";
  }

  // Licencia completa
  if (d.license) {
    const lic: BackendLicensePayload = {};
    if (d.license.number) lic.number = d.license.number;
    if (d.license.category) lic.category = d.license.category;
    if (d.license.issueDate) lic.issue_date = d.license.issueDate;
    if (d.license.expiryDate) lic.expiry_date = d.license.expiryDate;
    if (d.license.issuingAuthority) lic.issuing_authority = d.license.issuingAuthority;
    if (d.license.issuingCountry) lic.issuing_country = d.license.issuingCountry;
    if (d.license.points !== undefined) lic.points = d.license.points;
    if (d.license.maxPoints !== undefined) lic.max_points = d.license.maxPoints;
    if (d.license.verificationStatus) lic.verification_status = d.license.verificationStatus;
    if (d.license.restrictions) {
      lic.restrictions = {
        requires_glasses: d.license.restrictions.requiresGlasses,
        requires_hearing_aid: d.license.restrictions.requiresHearingAid,
        automatic_only: d.license.restrictions.automaticOnly,
        other_restrictions: d.license.restrictions.otherRestrictions,
      };
    }
    if (Object.keys(lic).length > 0) payload.license = lic;
  }

  // Contacto de emergencia (todos los campos del form se envían)
  if (d.emergencyContact) {
    const ec: BackendEmergencyContactPayload = {};
    if (d.emergencyContact.name) ec.name = d.emergencyContact.name;
    if (d.emergencyContact.relationship) ec.relationship = d.emergencyContact.relationship;
    if (d.emergencyContact.relationshipDetail) ec.relationship_detail = d.emergencyContact.relationshipDetail;
    if (d.emergencyContact.phone) ec.phone = d.emergencyContact.phone;
    if (d.emergencyContact.alternativePhone) ec.alternative_phone = d.emergencyContact.alternativePhone;
    if (d.emergencyContact.address) ec.address = d.emergencyContact.address;
    if (Object.keys(ec).length > 0) payload.emergency_contact = ec;
  }

  // Documentos (licencia, SOAT, DNI, certificados)
  if (d.documents && d.documents.length > 0) {
    payload.documents = d.documents.map((doc) => {
      const docPayload: BackendDriverDocumentPayload = {};
      if (doc.id) docPayload.id = doc.id;
      if (doc.name) docPayload.name = doc.name;
      if (doc.isRequired !== undefined) docPayload.is_required = doc.isRequired;
      if (doc.status) docPayload.status = doc.status;
      if (doc.expirationDate) docPayload.expiration_date = doc.expirationDate;
      if (doc.fileUrl) docPayload.file_url = doc.fileUrl;
      return docPayload;
    });
  }

  return payload;
}
