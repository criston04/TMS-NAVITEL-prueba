/**
 * Transformer bidireccional para Customer.
 *
 * REGLA: el frontend manda al backend EXACTAMENTE lo que el formulario captura.
 * Nada se recorta del lado del frontend. Si el backend no persiste un campo,
 * eso es un gap del backend que se documenta en `BACKEND_GAPS.md` y se le pide
 * que lo implemente. NO bajamos la riqueza del frontend para acomodarnos.
 *
 * Único ajuste obligatorio: `type` en INGLÉS ("company"/"person"). Confirmado
 * por sniff (2026-04-29) que el backend rechaza "empresa"/"persona" persistiendo
 * `""` vacío. Sin este cambio el form quedaba inutilizable.
 *
 * Sniff del backend (2026-04-29):
 *   - POST /master/customers SÍ acepta el body rico completo (addresses[], contacts[],
 *     billing_config) sin devolver error.
 *   - POST GUARDA en DB: id, tenant_id, code, type, document_type/number, name,
 *     trade_name, email, phone, phone2, website, address (string), status, category,
 *     credit_limit, credit_used, notes, industry, first_order_date,
 *     preferred_workflow_id, tags, operational_stats, stats_updated_at, created_by,
 *     created_at, updated_at, deleted_at.
 *   - POST IGNORA SILENCIOSAMENTE: addresses[], contacts[], billing_config.
 *     → Esto va a `BACKEND_GAPS.md` como deuda del backend.
 */

import type {
  Customer,
  CustomerType,
  DocumentType,
  CustomerCategory,
} from "@/types/models/customer";
import type { EntityStatus } from "@/types/common";

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DEL BACKEND
// ════════════════════════════════════════════════════════════════════════════

export interface BackendCustomer {
  id: string;
  tenant_id?: string;
  code?: string | null;
  type: string;                       // "company" | "person" | ""
  document_type: string;
  document_number: string;
  name: string;
  trade_name?: string | null;
  email: string;
  phone: string;
  phone2?: string | null;
  website?: string | null;
  address?: string | null;            // string plano del backend
  status: string;
  category?: string | null;
  credit_limit?: number | null;
  credit_used?: number | null;
  notes?: string | null;

  // Campos extra que el backend devuelve (sniff 2026-04-29)
  industry?: string | null;
  first_order_date?: string | null;
  preferred_workflow_id?: string | null;
  tags?: string[] | null;
  operational_stats?: Record<string, unknown> | null;
  stats_updated_at?: string | null;
  created_by?: string | null;

  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Una dirección del array `addresses[]` que mandamos al backend (shape rico).
 *
 * Importante: el backend espera `lat` y `lng` como campos PLANOS dentro de cada
 * address (NO anidados en `coordinates`). Sniff confirmado contra v3 Rev3 doc.
 */
export interface BackendCustomerAddressPayload {
  id?: string;
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  reference?: string;
  is_default?: boolean;
  /** Coordenadas planas (no anidadas en `coordinates`). */
  lat?: number;
  lng?: number;
  geofence_id?: string;
}

/** Un contacto del array `contacts[]` que mandamos al backend. */
export interface BackendCustomerContactPayload {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  is_primary?: boolean;
  notify_deliveries?: boolean;
  notify_incidents?: boolean;
}

/** Configuración de facturación que mandamos al backend. */
export interface BackendCustomerBillingPayload {
  payment_terms?: string;
  currency?: string;
  requires_po?: boolean;
  billing_email?: string;
  billing_address?: BackendCustomerAddressPayload;
  volume_discount?: number;
}

/**
 * Payload del POST/PUT — TODO lo que el formulario captura se envía.
 *
 * El backend de hoy persiste solo los campos planos. Los sub-objetos
 * (addresses[], contacts[], billing_config) están listados como deuda en
 * BACKEND_GAPS.md.
 */
export interface BackendCustomerPayload {
  // Planos (el backend SÍ persiste)
  code?: string;
  type?: string;                      // "company" | "person"
  document_type?: string;
  document_number?: string;
  name?: string;
  trade_name?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  website?: string;
  address?: string;                   // string concatenado de la dirección default
  status?: string;
  category?: string;
  credit_limit?: number;
  credit_used?: number;
  notes?: string;
  industry?: string;
  tags?: string[];
  preferred_workflow_id?: string;

  // Sub-objetos ricos (frontend los manda; backend pendiente de persistirlos)
  addresses?: BackendCustomerAddressPayload[];
  contacts?: BackendCustomerContactPayload[];
  billing_config?: BackendCustomerBillingPayload;
}

// ════════════════════════════════════════════════════════════════════════════
// BACKEND → FRONTEND
// ════════════════════════════════════════════════════════════════════════════

export function mapCustomerFromBackend(b: BackendCustomer): Customer {
  // Sintetiza UNA dirección si el backend mandó string plano. Cuando el backend
  // implemente customer_addresses, esta lógica se reemplaza por leer b.addresses.
  const addresses: Customer["addresses"] = b.address
    ? [
        {
          id: "addr-primary",
          label: "Principal",
          street: b.address,
          city: "",
          state: "",
          country: "PE",
          isDefault: true,
        },
      ]
    : [];

  // Type: backend devuelve "company"/"person" o "" (vacío si rechazó el valor).
  // Default a "company" si está vacío para que la UI no rompa.
  const typeValue: CustomerType =
    b.type === "company" || b.type === "person" ? b.type : "company";

  return {
    id: b.id,
    code: b.code ?? "",
    type: typeValue,
    documentType: (b.document_type as DocumentType) ?? "RUC",
    documentNumber: b.document_number ?? "",
    name: b.name ?? "",
    tradeName: b.trade_name ?? undefined,
    email: b.email ?? "",
    phone: b.phone ?? "",
    phone2: b.phone2 ?? undefined,
    website: b.website ?? undefined,
    status: (b.status as EntityStatus) ?? "active",
    category: (b.category as CustomerCategory) ?? undefined,
    creditLimit: b.credit_limit ?? undefined,
    creditUsed: b.credit_used ?? undefined,
    notes: b.notes ?? undefined,
    industry: b.industry ?? undefined,
    tags: b.tags ?? undefined,
    preferredWorkflowId: b.preferred_workflow_id ?? undefined,
    firstOrderDate: b.first_order_date ?? undefined,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    addresses,
    contacts: [],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND → BACKEND
// ════════════════════════════════════════════════════════════════════════════

/**
 * Mapea Customer del frontend → payload del backend.
 *
 * Manda TODO lo que el form captura: planos + addresses[] rico + contacts[] +
 * billing_config. El backend hoy ignora los sub-objetos (gap documentado),
 * pero el envío queda fiel al modelo del frontend para que cuando el backend
 * lo implemente no haya que tocar el cliente.
 */
export function mapCustomerToBackend(c: Partial<Customer>): BackendCustomerPayload {
  const payload: BackendCustomerPayload = {};

  // ── Campos planos ───────────────────────────────────────────────────
  if (c.code !== undefined) payload.code = c.code;
  if (c.type !== undefined) payload.type = c.type;
  if (c.documentType !== undefined) payload.document_type = c.documentType;
  if (c.documentNumber !== undefined) payload.document_number = c.documentNumber;
  if (c.name !== undefined) payload.name = c.name;
  if (c.tradeName !== undefined) payload.trade_name = c.tradeName;
  if (c.email !== undefined) payload.email = c.email;
  if (c.phone !== undefined) payload.phone = c.phone;
  if (c.phone2 !== undefined) payload.phone2 = c.phone2;
  if (c.website !== undefined) payload.website = c.website;
  if (c.status !== undefined) payload.status = c.status;
  if (c.category !== undefined) payload.category = c.category;
  if (c.creditLimit !== undefined) payload.credit_limit = c.creditLimit;
  if (c.creditUsed !== undefined) payload.credit_used = c.creditUsed;
  if (c.notes !== undefined) payload.notes = c.notes;
  if (c.industry !== undefined) payload.industry = c.industry;
  if (c.tags !== undefined) payload.tags = c.tags;
  if (c.preferredWorkflowId !== undefined) payload.preferred_workflow_id = c.preferredWorkflowId;

  // ── Direcciones: shape rico + string plano de la default ────────────
  // Mandamos AMBOS para que:
  //  (a) el backend actual guarde el string plano (lo único que persiste hoy)
  //  (b) cuando implemente customer_addresses, ya reciba el array rico sin
  //      cambios en el frontend.
  //
  // Nota sobre coordenadas: el backend v3 Rev3 espera `lat` y `lng` como campos
  // PLANOS dentro de cada address (no anidados en `coordinates`). El frontend
  // los tiene anidados en `coordinates: {lat, lng}` — los aplanamos aquí.
  if (c.addresses && c.addresses.length > 0) {
    // Array rico
    payload.addresses = c.addresses.map((a) => {
      const addr: BackendCustomerAddressPayload = {};
      if (a.id) addr.id = a.id;
      if (a.label) addr.label = a.label;
      if (a.street) addr.street = a.street;
      if (a.city) addr.city = a.city;
      if (a.state) addr.state = a.state;
      if (a.country) addr.country = a.country;
      if (a.zipCode) addr.zip_code = a.zipCode;
      if (a.reference) addr.reference = a.reference;
      if (a.isDefault !== undefined) addr.is_default = a.isDefault;
      // Coordenadas: aplanar `coordinates: {lat, lng}` → `lat`, `lng` planos
      if (a.coordinates?.lat !== undefined) addr.lat = a.coordinates.lat;
      if (a.coordinates?.lng !== undefined) addr.lng = a.coordinates.lng;
      if (a.geofenceId) addr.geofence_id = a.geofenceId;
      return addr;
    });

    // String plano (compat con backend actual)
    const primary = c.addresses.find((a) => a.isDefault) ?? c.addresses[0];
    const parts = [primary.street, primary.city, primary.state, primary.country]
      .filter((p) => p && p.trim().length > 0);
    if (parts.length > 0) payload.address = parts.join(", ");
  }

  // ── Contactos (array rico) ──────────────────────────────────────────
  if (c.contacts && c.contacts.length > 0) {
    payload.contacts = c.contacts.map((ct) => {
      const contact: BackendCustomerContactPayload = {};
      if (ct.id) contact.id = ct.id;
      if (ct.name) contact.name = ct.name;
      if (ct.email) contact.email = ct.email;
      if (ct.phone) contact.phone = ct.phone;
      if (ct.position) contact.position = ct.position;
      if (ct.department) contact.department = ct.department;
      if (ct.isPrimary !== undefined) contact.is_primary = ct.isPrimary;
      if (ct.notifyDeliveries !== undefined) contact.notify_deliveries = ct.notifyDeliveries;
      if (ct.notifyIncidents !== undefined) contact.notify_incidents = ct.notifyIncidents;
      return contact;
    });
  }

  // ── Configuración de facturación ────────────────────────────────────
  // BUG del backend confirmado 2026-05-01: si se envía `billing_address`
  // dentro de `billing_config`, el backend tira HTTP 500 Internal Server Error.
  // Probablemente intenta hacer un JOIN/INSERT con una tabla `customer_billing_address`
  // que no existe.
  // SOLUCION: NO enviar `billing_address` hasta que el backend lo arregle.
  // Cuando el backend cree la tabla y maneje el sub-objeto, descomentar el bloque.
  if (c.billingConfig) {
    const bc = c.billingConfig;
    const billing: BackendCustomerBillingPayload = {};
    if (bc.paymentTerms) billing.payment_terms = bc.paymentTerms;
    if (bc.currency) billing.currency = bc.currency;
    if (bc.requiresPO !== undefined) billing.requires_po = bc.requiresPO;
    if (bc.billingEmail) billing.billing_email = bc.billingEmail;
    if (bc.volumeDiscount !== undefined) billing.volume_discount = bc.volumeDiscount;

    // NO enviar billing_address — rompe el backend con HTTP 500.
    // Ver BACKEND_GAPS.md sección "Customer billing_address bug".
    // if (bc.billingAddress) {
    //   const addr: BackendCustomerAddressPayload = {};
    //   if (bc.billingAddress.street) addr.street = bc.billingAddress.street;
    //   if (bc.billingAddress.city) addr.city = bc.billingAddress.city;
    //   if (bc.billingAddress.state) addr.state = bc.billingAddress.state;
    //   if (bc.billingAddress.country) addr.country = bc.billingAddress.country;
    //   if (bc.billingAddress.zipCode) addr.zip_code = bc.billingAddress.zipCode;
    //   if (bc.billingAddress.coordinates?.lat !== undefined) addr.lat = bc.billingAddress.coordinates.lat;
    //   if (bc.billingAddress.coordinates?.lng !== undefined) addr.lng = bc.billingAddress.coordinates.lng;
    //   if (Object.keys(addr).length > 0) billing.billing_address = addr;
    // }

    if (Object.keys(billing).length > 0) payload.billing_config = billing;
  }

  return payload;
}
