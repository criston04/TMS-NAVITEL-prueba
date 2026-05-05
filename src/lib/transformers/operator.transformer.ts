/**
 * Transformer bidireccional para Operator (Operador Logístico).
 *
 * REGLA: el frontend manda al backend EXACTAMENTE lo que el formulario captura.
 * Los sub-objetos del form (contacts[], checklist, documents[]) se envían
 * completos. Si el backend no los persiste, queda como deuda en BACKEND_GAPS.md.
 *
 * Sniff del backend (2026-04-29):
 *   - POST /master/operators SÍ acepta el body rico sin error.
 *   - POST GUARDA: id, tenant_id, code, name, trade_name, type ("carrier"),
 *     document_type, document_number, ruc (duplicado), contact_name,
 *     email, phone, address, fiscal_address (duplicado), city, country, status,
 *     contract_start_date, contract_end_date, drivers_count, vehicles_count,
 *     rating, notes, business_name (siempre null — descarta).
 *   - POST IGNORA: contacts[], checklist, documents[]. Va a BACKEND_GAPS.md.
 */

import type {
  Operator,
  OperatorType,
  OperatorStatus,
  OperatorValidationChecklist,
} from "@/types/models/operator";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DEL BACKEND
// ════════════════════════════════════════════════════════════════════════════

export interface BackendOperator {
  id: string;
  tenant_id?: string;
  code?: string | null;

  name?: string | null;
  trade_name?: string | null;
  type?: string | null;          // "carrier" típico

  document_type?: string | null;
  document_number?: string | null;
  ruc?: string | null;           // duplicado server-side

  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;

  address?: string | null;
  fiscal_address?: string | null;
  city?: string | null;
  country?: string | null;

  status?: string;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  drivers_count?: number;
  vehicles_count?: number;
  rating?: number | null;
  notes?: string | null;

  business_name?: string | null; // backend siempre lo devuelve null

  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface BackendOperatorContactPayload {
  id?: string;
  name?: string;
  position?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
}

export interface BackendOperatorChecklistItemPayload {
  id?: string;
  label?: string;
  checked?: boolean;
  date?: string;
}

export interface BackendOperatorChecklistPayload {
  items?: BackendOperatorChecklistItemPayload[];
  is_complete?: boolean;
  last_updated?: string;
}

export interface BackendOperatorDocumentPayload {
  id?: string;
  name?: string;
  is_required?: boolean;
  status?: string;
  expiration_date?: string;
  file_url?: string;
}

/**
 * Payload del POST/PUT — TODO lo que el form captura.
 *
 * Mandamos los aliases legacy (`business_name`, `ruc`, `fiscal_address`)
 * porque algunas tablas internas del backend los siguen usando, y los nombres
 * canónicos v3 Rev3 (`name`, `document_number`, `address`).
 */
export interface BackendOperatorPayload {
  // Planos canónicos
  code?: string;
  name?: string;
  trade_name?: string;
  type?: string;
  document_type?: string;
  document_number?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  notes?: string;

  // Aliases legacy (compat con DB / endpoints viejos)
  business_name?: string;
  ruc?: string;
  fiscal_address?: string;

  // Sub-objetos ricos (form: contacts, checklist, documents)
  contacts?: BackendOperatorContactPayload[];
  checklist?: BackendOperatorChecklistPayload;
  documents?: BackendOperatorDocumentPayload[];
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ════════════════════════════════════════════════════════════════════════════

function defaultChecklist(): OperatorValidationChecklist {
  return {
    items: [],
    isComplete: false,
    lastUpdated: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND → FRONTEND
// ════════════════════════════════════════════════════════════════════════════

export function mapOperatorFromBackend(b: BackendOperator): Operator {
  // Type: backend usa "carrier"; frontend usa "propio"|"tercero"|"asociado"
  let typeValue: OperatorType = "tercero";
  if (b.type === "propio" || b.type === "tercero" || b.type === "asociado") {
    typeValue = b.type;
  } else if (b.type === "owned" || b.type === "internal") {
    typeValue = "propio";
  }

  // Status: backend "active"|"inactive"|"blocked"|"suspended" → frontend "enabled"|"blocked"|"pending"
  let statusValue: OperatorStatus = "pending";
  if (b.status === "active" || b.status === "enabled") {
    statusValue = "enabled";
  } else if (b.status === "blocked" || b.status === "suspended" || b.status === "inactive") {
    statusValue = "blocked";
  }

  const businessName = b.name ?? b.business_name ?? "";
  const rucValue = b.document_number ?? b.ruc ?? "";
  const addressValue = b.address ?? b.fiscal_address ?? "";

  return {
    id: b.id,
    code: b.code ?? "",
    ruc: rucValue,
    businessName,
    tradeName: b.trade_name ?? undefined,
    type: typeValue,
    email: b.email ?? "",
    phone: b.phone ?? "",
    fiscalAddress: addressValue,
    status: statusValue,

    contacts: [],
    checklist: defaultChecklist(),
    documents: [],
    driversCount: b.drivers_count ?? 0,
    vehiclesCount: b.vehicles_count ?? 0,

    contractStartDate: b.contract_start_date ?? undefined,
    contractEndDate: b.contract_end_date ?? undefined,
    notes: b.notes ?? undefined,

    createdAt: b.created_at,
    updatedAt: b.updated_at,
  } as Operator;
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND → BACKEND
// ════════════════════════════════════════════════════════════════════════════

export function mapOperatorToBackend(o: Partial<Operator>): BackendOperatorPayload {
  const payload: BackendOperatorPayload = {};

  if (o.code !== undefined) payload.code = o.code;

  // Nombre: enviamos AMBOS — `name` (canónico) y `business_name` (alias legacy)
  // para máxima compat. El backend canónico persiste `name`.
  if (o.businessName !== undefined) {
    payload.name = o.businessName;
    payload.business_name = o.businessName;
  }

  // RUC / documento
  if (o.ruc !== undefined) {
    payload.document_number = o.ruc;
    payload.document_type = "RUC";
    payload.ruc = o.ruc;            // alias legacy
  }

  // Dirección: enviamos `address` (canónico) y `fiscal_address` (alias legacy)
  if (o.fiscalAddress !== undefined) {
    payload.address = o.fiscalAddress;
    payload.fiscal_address = o.fiscalAddress;
  }

  if (o.tradeName !== undefined) payload.trade_name = o.tradeName;
  if (o.email !== undefined) payload.email = o.email;
  if (o.phone !== undefined) payload.phone = o.phone;
  if (o.contractStartDate !== undefined) payload.contract_start_date = o.contractStartDate;
  if (o.contractEndDate !== undefined) payload.contract_end_date = o.contractEndDate;
  if (o.notes !== undefined) payload.notes = o.notes;

  // Type: backend canónico es "carrier" para "tercero". Otros valores van como están.
  if (o.type !== undefined) {
    payload.type = o.type === "tercero" ? "carrier" : o.type;
  }

  // Status: enabled→active, blocked→blocked, pending→pending
  if (o.status === "enabled") payload.status = "active";
  else if (o.status === "blocked") payload.status = "blocked";
  else if (o.status === "pending") payload.status = "pending";

  // ── Sub-objeto contacts[] (form captura array completo) ─────────────
  if (o.contacts && o.contacts.length > 0) {
    payload.contacts = o.contacts.map((ct) => {
      const contact: BackendOperatorContactPayload = {};
      if (ct.id) contact.id = ct.id;
      if (ct.name) contact.name = ct.name;
      if (ct.position) contact.position = ct.position;
      if (ct.email) contact.email = ct.email;
      if (ct.phone) contact.phone = ct.phone;
      if (ct.isPrimary !== undefined) contact.is_primary = ct.isPrimary;
      return contact;
    });

    // Backend POST también acepta `contact_name` plano (denormalizado del primary).
    // Lo derivamos del contacto primario (o el primero si ninguno es primary).
    const primaryContact = o.contacts.find((c) => c.isPrimary) ?? o.contacts[0];
    if (primaryContact?.name) {
      payload.contact_name = primaryContact.name;
    }
  }

  // Fallback: el backend exige `contact_name` obligatorio. Si el form no llenó
  // contacto principal, usamos businessName como fallback para no fallar el POST.
  if (!payload.contact_name && o.businessName) {
    payload.contact_name = o.businessName;
  }

  // ── Sub-objeto checklist (form: cumplimiento documental) ────────────
  if (o.checklist) {
    const cl: BackendOperatorChecklistPayload = {};
    if (o.checklist.items && o.checklist.items.length > 0) {
      cl.items = o.checklist.items.map((it) => {
        const item: BackendOperatorChecklistItemPayload = {};
        if (it.id) item.id = it.id;
        if (it.label) item.label = it.label;
        if (it.checked !== undefined) item.checked = it.checked;
        if (it.date) item.date = it.date;
        return item;
      });
    }
    if (o.checklist.isComplete !== undefined) cl.is_complete = o.checklist.isComplete;
    if (o.checklist.lastUpdated) cl.last_updated = o.checklist.lastUpdated;
    if (Object.keys(cl).length > 0) payload.checklist = cl;
  }

  // ── Documentos del operador ─────────────────────────────────────────
  if (o.documents && o.documents.length > 0) {
    payload.documents = o.documents.map((doc) => {
      const d: BackendOperatorDocumentPayload = {};
      if (doc.id) d.id = doc.id;
      if (doc.name) d.name = doc.name;
      if (doc.required !== undefined) d.is_required = doc.required;
      if (doc.uploaded !== undefined) d.status = doc.uploaded ? "valid" : "missing";
      if (doc.expiresAt) d.expiration_date = doc.expiresAt;
      if (doc.fileName) d.file_url = doc.fileName;
      return d;
    });
  }

  return payload;
}
