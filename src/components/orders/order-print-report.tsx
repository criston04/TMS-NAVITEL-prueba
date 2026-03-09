"use client";

import type { Order } from "@/types/order";

/**
 * Genera e imprime un reporte profesional de la orden con hoja de ruta.
 * @returns true si se abrió correctamente, false si la ventana fue bloqueada.
 */
export function printOrderReport(order: Order): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return false;
  }

  // ── Helpers de formato ──────────────────────────────────────────
  const fmt = (date: string) =>
    new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const fmtShort = (date: string) =>
    new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const fmtOnlyDate = (date: string) =>
    new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));

  const typeLabel = (type: string) =>
    ({ origin: "Origen", waypoint: "Punto Intermedio", destination: "Destino" }[type] ?? type);

  const statusLabel = (s: string) =>
    ({
      pending: "Pendiente",
      assigned: "Asignada",
      in_transit: "En Tránsito",
      completed: "Completada",
      cancelled: "Cancelada",
      closed: "Cerrada",
    }[s] ?? s);

  const priorityLabel = (p: string) =>
    ({ low: "Baja", normal: "Normal", high: "Alta", urgent: "Urgente" }[p] ?? p);

  const statusColor = (s: string) =>
    ({
      pending: "#f59e0b",
      assigned: "#3b82f6",
      in_transit: "#8b5cf6",
      completed: "#10b981",
      cancelled: "#ef4444",
      closed: "#6b7280",
    }[s] ?? "#6b7280");

  const priorityColor = (p: string) =>
    ({
      low: "#6b7280",
      normal: "#3b82f6",
      high: "#f59e0b",
      urgent: "#ef4444",
    }[p] ?? "#3b82f6");

  // ── Datos ordenados ─────────────────────────────────────────────
  const milestones = [...order.milestones].sort((a, b) => a.sequence - b.sequence);
  const origin = milestones.find((m) => m.type === "origin");
  const destination = milestones.find((m) => m.type === "destination");
  const totalStops = milestones.length;
  const docId = `${order.orderNumber}-${fmtOnlyDate(order.createdAt).replace(/\//g, "")}`;

  // ── Íconos SVG inline ───────────────────────────────────────────
  const icons = {
    truck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    phone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    mapPin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    package: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    route: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`,
    clipboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  // ── Tabla de itinerario ─────────────────────────────────────────
  const scheduleRows = milestones
    .map(
      (m, i) => `
      <tr>
        <td class="cell-center">
          <span class="step-number ${m.type === "origin" ? "step-origin" : m.type === "destination" ? "step-dest" : "step-wp"}">${i + 1}</span>
        </td>
        <td>
          <div class="place-name">${m.geofenceName}</div>
          <div class="place-addr">${m.address}</div>
        </td>
        <td class="cell-center">
          <span class="type-badge type-${m.type}">${typeLabel(m.type)}</span>
        </td>
        <td class="cell-center cell-time">${fmtShort(m.estimatedArrival)}</td>
        <td class="cell-center cell-time">${m.estimatedDeparture ? fmtShort(m.estimatedDeparture) : "—"}</td>
        <td>
          ${m.contact ? `<span class="contact-name">${m.contact.name}</span><br/><span class="contact-phone">${icons.phone} ${m.contact.phone}</span>` : '<span class="text-muted">—</span>'}
        </td>
      </tr>`
    )
    .join("");

  // ── Tarjetas de hoja de ruta ────────────────────────────────────
  const routeCards = milestones
    .map(
      (m, i) => `
    <div class="route-card">
      <div class="route-card-left">
        <div class="route-step-circle ${m.type === "origin" ? "circle-origin" : m.type === "destination" ? "circle-dest" : "circle-wp"}">
          ${i + 1}
        </div>
        ${i < milestones.length - 1 ? '<div class="route-connector"></div>' : ""}
      </div>
      <div class="route-card-body">
        <div class="route-card-header">
          <span class="type-badge type-${m.type}">${typeLabel(m.type)}</span>
          <span class="route-card-title">${m.geofenceName}</span>
        </div>
        <div class="route-card-grid">
          <div class="route-card-item">
            <span class="route-card-icon">${icons.mapPin}</span>
            <div>
              <div class="route-card-label">Dirección</div>
              <div class="route-card-value">${m.address}</div>
            </div>
          </div>
          <div class="route-card-item">
            <span class="route-card-icon">${icons.clock}</span>
            <div>
              <div class="route-card-label">Llegada programada</div>
              <div class="route-card-value">${fmtShort(m.estimatedArrival)}</div>
            </div>
          </div>
          ${
            m.estimatedDeparture
              ? `<div class="route-card-item">
            <span class="route-card-icon">${icons.clock}</span>
            <div>
              <div class="route-card-label">Salida estimada</div>
              <div class="route-card-value">${fmtShort(m.estimatedDeparture)}</div>
            </div>
          </div>`
              : ""
          }
          ${
            m.contact
              ? `<div class="route-card-item">
            <span class="route-card-icon">${icons.user}</span>
            <div>
              <div class="route-card-label">Contacto</div>
              <div class="route-card-value">${m.contact.name} &middot; ${m.contact.phone}</div>
            </div>
          </div>`
              : ""
          }
          <div class="route-card-item">
            <div>
              <div class="route-card-label">Coordenadas</div>
              <div class="route-card-value coords">${m.coordinates.lat.toFixed(6)}, ${m.coordinates.lng.toFixed(6)}</div>
            </div>
          </div>
          ${
            m.notes
              ? `<div class="route-card-item full-width">
            <div>
              <div class="route-card-label">Observaciones</div>
              <div class="route-card-value">${m.notes}</div>
            </div>
          </div>`
              : ""
          }
        </div>
      </div>
    </div>`
    )
    .join("");

  // ── HTML del documento ──────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>OT ${order.orderNumber} — Hoja de Ruta</title>
  <style>
    /* ===== RESET & BASE ===== */
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      line-height: 1.55;
      font-size: 13px;
      padding: 14mm 16mm;
      background: #fff;
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 18px;
      border-bottom: 3px solid #0f172a;
      margin-bottom: 22px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 48px; height: 48px;
      background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -1px;
    }
    .brand-text h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .brand-text span {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
    }
    .header-meta {
      text-align: right;
    }
    .order-ref {
      font-size: 22px;
      font-weight: 800;
      font-family: 'Courier New', monospace;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .header-meta-row {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    /* ===== STATUS STRIP ===== */
    .status-strip {
      display: flex;
      gap: 12px;
      margin-bottom: 22px;
      flex-wrap: wrap;
    }
    .stat-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .stat-chip .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    /* ===== SECTIONS ===== */
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-hdr {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-hdr svg { color: #3b82f6; flex-shrink: 0; }

    /* ===== INFO GRID ===== */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      background: #e2e8f0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-cell {
      background: #fff;
      padding: 10px 14px;
    }
    .info-cell.span2 { grid-column: span 2; }
    .info-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 2px;
    }
    .info-val {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    /* ===== RESOURCES ROW ===== */
    .resources-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .resource-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      background: #f8fafc;
    }
    .resource-icon {
      width: 42px; height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .resource-icon.driver { background: #dbeafe; color: #1d4ed8; }
    .resource-icon.vehicle { background: #f0fdf4; color: #16a34a; }
    .resource-info .r-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; }
    .resource-info .r-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .resource-info .r-detail { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 4px; margin-top: 1px; }

    /* ===== TABLE ===== */
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    thead { background: #0f172a; }
    thead th { color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 10px 12px; text-align: left; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; vertical-align: middle; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .cell-center { text-align: center; }
    .cell-time { font-family: 'Courier New', monospace; font-weight: 600; font-size: 12px; white-space: nowrap; }
    .place-name { font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .place-addr { font-size: 11px; color: #64748b; line-height: 1.4; }
    .step-number {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%; font-weight: 800; font-size: 12px; color: #fff;
    }
    .step-origin { background: #16a34a; }
    .step-dest { background: #dc2626; }
    .step-wp { background: #2563eb; }
    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .type-origin { background: #dcfce7; color: #15803d; }
    .type-waypoint { background: #fef3c7; color: #a16207; }
    .type-destination { background: #fee2e2; color: #b91c1c; }
    .contact-name { font-weight: 600; font-size: 12px; }
    .contact-phone { font-size: 11px; color: #64748b; display: inline-flex; align-items: center; gap: 3px; }
    .text-muted { color: #cbd5e1; }

    /* ===== ROUTE CARDS (Hoja de Ruta) ===== */
    .route-card {
      display: flex;
      gap: 0;
      min-height: 100px;
      page-break-inside: avoid;
    }
    .route-card-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 44px;
      flex-shrink: 0;
    }
    .route-step-circle {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
      color: #fff;
      flex-shrink: 0;
      z-index: 1;
    }
    .circle-origin { background: #16a34a; }
    .circle-dest { background: #dc2626; }
    .circle-wp { background: #2563eb; }
    .route-connector {
      width: 3px;
      flex: 1;
      background: repeating-linear-gradient(
        to bottom,
        #cbd5e1 0px, #cbd5e1 6px,
        transparent 6px, transparent 12px
      );
      margin: 4px 0;
    }
    .route-card-body {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-left: 10px;
      margin-bottom: 10px;
    }
    .route-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .route-card-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .route-card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
    }
    .route-card-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .route-card-item.full-width { grid-column: 1 / -1; }
    .route-card-icon { color: #94a3b8; margin-top: 1px; flex-shrink: 0; }
    .route-card-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; }
    .route-card-value { font-size: 12.5px; font-weight: 500; color: #334155; }
    .route-card-value.coords { font-family: 'Courier New', monospace; font-size: 11px; color: #64748b; }

    /* ===== CARGO GRID ===== */
    .cargo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 2px;
      background: #e2e8f0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .cargo-cell {
      background: #fff;
      padding: 10px 14px;
      text-align: center;
    }
    .cargo-val { font-size: 18px; font-weight: 800; color: #0f172a; }
    .cargo-lbl { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px; }
    .cargo-note {
      margin-top: 10px;
      padding: 10px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 12px;
      color: #92400e;
    }
    .cargo-note strong { font-weight: 700; }

    /* ===== SUMMARY BAR ===== */
    .summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #0f172a, #1e3a5f);
      color: #fff;
      border-radius: 10px;
      padding: 16px 24px;
      margin-bottom: 20px;
    }
    .summary-item { text-align: center; }
    .summary-val { font-size: 20px; font-weight: 800; }
    .summary-lbl { font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .summary-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.2); }

    /* ===== NOTES ===== */
    .notes-box {
      background: #f1f5f9;
      border-left: 4px solid #3b82f6;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      font-size: 12.5px;
      color: #334155;
      line-height: 1.6;
    }

    /* ===== SIGNATURES ===== */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      margin-top: 30px;
      padding-top: 20px;
    }
    .sig-block {
      text-align: center;
    }
    .sig-line {
      border-top: 2px solid #cbd5e1;
      margin-bottom: 6px;
      margin-top: 50px;
    }
    .sig-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
    .sig-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }

    /* ===== FOOTER ===== */
    .footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
    }
    .footer-left { display: flex; align-items: center; gap: 6px; }
    .footer-right { text-align: right; }
    .footer-id { font-family: 'Courier New', monospace; font-weight: 600; }

    /* ===== TOOLBAR ===== */
    .print-toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9999;
      background: #0f172a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.25);
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    .print-toolbar-info {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .print-toolbar-info .tb-icon {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
    }
    .print-toolbar-actions {
      display: flex;
      gap: 8px;
    }
    .tb-btn {
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity 0.15s;
    }
    .tb-btn:hover { opacity: 0.85; }
    .tb-btn-print {
      background: #3b82f6;
      color: #fff;
    }
    .tb-btn-close {
      background: #334155;
      color: #cbd5e1;
    }
    body { padding-top: 60px !important; }

    /* ===== PRINT ===== */
    @media print {
      .print-toolbar { display: none !important; }
      body { padding-top: 0 !important; padding: 8mm 10mm; font-size: 12px; }
      .section { page-break-inside: avoid; }
      .route-card { page-break-inside: avoid; }
      thead { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead th { color: #fff !important; }
      .summary-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .brand-icon { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .step-number, .route-step-circle { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .type-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .stat-chip .dot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    @page {
      size: A4;
      margin: 8mm;
    }
  </style>
</head>
<body>

  <!-- ═══════ TOOLBAR ═══════ -->
  <div class="print-toolbar">
    <div class="print-toolbar-info">
      <div class="tb-icon">TMS</div>
      <span>Vista previa — ${order.orderNumber}</span>
    </div>
    <div class="print-toolbar-actions">
      <button class="tb-btn tb-btn-print" onclick="window.print()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir
      </button>
      <button class="tb-btn tb-btn-close" onclick="window.close()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Cerrar
      </button>
    </div>
  </div>

  <!-- ═══════ HEADER ═══════ -->
  <div class="header">
    <div class="header-brand">
      <div class="brand-icon">TMS</div>
      <div class="brand-text">
        <h1>NAVITEL</h1>
        <span>Orden de Transporte</span>
      </div>
    </div>
    <div class="header-meta">
      <div class="order-ref">${order.orderNumber}</div>
      <div class="header-meta-row">Emitida: ${fmt(order.createdAt)}</div>
      <div class="header-meta-row">Doc. ID: ${docId}</div>
    </div>
  </div>

  <!-- ═══════ STATUS STRIP ═══════ -->
  <div class="status-strip">
    <div class="stat-chip">
      <span class="dot" style="background:${statusColor(order.status)}"></span>
      ${statusLabel(order.status)}
    </div>
    <div class="stat-chip">
      <span class="dot" style="background:${priorityColor(order.priority)}"></span>
      Prioridad: ${priorityLabel(order.priority)}
    </div>
    <div class="stat-chip">
      ${icons.mapPin} ${totalStops} parada${totalStops !== 1 ? "s" : ""}
    </div>
    ${order.serviceType ? `<div class="stat-chip">${icons.truck} ${order.serviceType}</div>` : ""}
  </div>

  <!-- ═══════ INFO GENERAL ═══════ -->
  <div class="section">
    <div class="section-hdr">${icons.info} Información General</div>
    <div class="info-grid">
      <div class="info-cell">
        <div class="info-lbl">N.° de Orden</div>
        <div class="info-val">${order.orderNumber}</div>
      </div>
      <div class="info-cell">
        <div class="info-lbl">Cliente</div>
        <div class="info-val">${order.customer?.name || "—"}${order.customer?.code ? ` (${order.customer.code})` : ""}</div>
      </div>
      <div class="info-cell">
        <div class="info-lbl">Fecha de Creación</div>
        <div class="info-val">${fmt(order.createdAt)}</div>
      </div>
      <div class="info-cell">
        <div class="info-lbl">Origen</div>
        <div class="info-val">${origin?.geofenceName || "—"}</div>
      </div>
      <div class="info-cell span2">
        <div class="info-lbl">Destino</div>
        <div class="info-val">${destination?.geofenceName || "—"}</div>
      </div>
    </div>
  </div>

  <!-- ═══════ RECURSOS ═══════ -->
  <div class="resources-row">
    <div class="resource-card">
      <div class="resource-icon driver">${icons.user}</div>
      <div class="resource-info">
        <div class="r-label">Conductor</div>
        <div class="r-name">${order.driver?.fullName || "Sin asignar"}</div>
        ${order.driver?.phone ? `<div class="r-detail">${icons.phone} ${order.driver.phone}</div>` : ""}
      </div>
    </div>
    <div class="resource-card">
      <div class="resource-icon vehicle">${icons.truck}</div>
      <div class="resource-info">
        <div class="r-label">Vehículo</div>
        <div class="r-name">${order.vehicle?.plate || "Sin asignar"}</div>
        ${order.vehicle?.model ? `<div class="r-detail">${order.vehicle.model}</div>` : ""}
      </div>
    </div>
  </div>

  <!-- ═══════ ITINERARIO ═══════ -->
  <div class="section">
    <div class="section-hdr">${icons.clipboard} Programación e Itinerario</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px;text-align:center">#</th>
          <th>Lugar / Dirección</th>
          <th style="width:110px;text-align:center">Tipo</th>
          <th style="width:120px;text-align:center">Llegada</th>
          <th style="width:120px;text-align:center">Salida</th>
          <th style="width:150px">Contacto</th>
        </tr>
      </thead>
      <tbody>${scheduleRows}</tbody>
    </table>
  </div>

  <!-- ═══════ CARGA ═══════ -->
  ${
    order.cargo
      ? `
  <div class="section">
    <div class="section-hdr">${icons.package} Información de Carga</div>
    <div class="cargo-grid">
      <div class="cargo-cell">
        <div class="cargo-val">${order.cargo.weightKg} kg</div>
        <div class="cargo-lbl">Peso</div>
      </div>
      <div class="cargo-cell">
        <div class="cargo-val">${order.cargo.quantity}</div>
        <div class="cargo-lbl">Unidades</div>
      </div>
      ${order.cargo.volumeM3 ? `<div class="cargo-cell"><div class="cargo-val">${order.cargo.volumeM3} m³</div><div class="cargo-lbl">Volumen</div></div>` : ""}
      ${order.cargo.declaredValue ? `<div class="cargo-cell"><div class="cargo-val">$${order.cargo.declaredValue}</div><div class="cargo-lbl">Valor Declarado</div></div>` : ""}
      <div class="cargo-cell">
        <div class="cargo-val" style="font-size:13px;font-weight:600">${order.cargo.description}</div>
        <div class="cargo-lbl">Descripción</div>
      </div>
      <div class="cargo-cell">
        <div class="cargo-val" style="font-size:13px;font-weight:600">${order.cargo.type}</div>
        <div class="cargo-lbl">Tipo</div>
      </div>
    </div>
    ${order.cargo.handlingInstructions ? `<div class="cargo-note"><strong>Instrucciones de Manejo:</strong> ${order.cargo.handlingInstructions}</div>` : ""}
  </div>`
      : ""
  }

  <!-- ═══════ HOJA DE RUTA ═══════ -->
  <div class="section">
    <div class="section-hdr">${icons.route} Hoja de Ruta — Detalle de Paradas</div>
    ${routeCards}
  </div>

  <!-- ═══════ RESUMEN ═══════ -->
  <div class="summary-bar">
    <div class="summary-item">
      <div class="summary-val">${totalStops}</div>
      <div class="summary-lbl">Paradas</div>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <div class="summary-val">${origin?.geofenceName || "—"}</div>
      <div class="summary-lbl">Origen</div>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <div class="summary-val">${destination?.geofenceName || "—"}</div>
      <div class="summary-lbl">Destino</div>
    </div>
    <div class="summary-divider"></div>
    <div class="summary-item">
      <div class="summary-val">${milestones.filter((m) => m.type === "waypoint").length}</div>
      <div class="summary-lbl">Intermedios</div>
    </div>
  </div>

  <!-- ═══════ NOTAS ═══════ -->
  ${
    order.notes
      ? `
  <div class="section">
    <div class="section-hdr">${icons.info} Notas Adicionales</div>
    <div class="notes-box">${order.notes}</div>
  </div>`
      : ""
  }

  <!-- ═══════ FIRMAS ═══════ -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Despachador</div>
      <div class="sig-sub">Nombre y firma</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Conductor</div>
      <div class="sig-sub">${order.driver?.fullName || "___________________"}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Recepción</div>
      <div class="sig-sub">Nombre, firma y sello</div>
    </div>
  </div>

  <!-- ═══════ FOOTER ═══════ -->
  <div class="footer">
    <div class="footer-left">
      <span class="footer-id">TMS-NAVITEL</span>
      <span>|</span>
      <span>Documento generado automáticamente — No requiere firma digital</span>
    </div>
    <div class="footer-right">
      Impreso: ${fmt(new Date().toISOString())}<br/>
      <span class="footer-id">${docId}</span>
    </div>
  </div>

</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
