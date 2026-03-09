"use client";

import { cn } from "@/lib/utils";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RetransmissionRecord } from "@/types/monitoring";

interface RetransmissionPdfExportProps {
  records: RetransmissionRecord[];
  className?: string;
}

/**
 * Genera reporte PDF de retransmisión (desconexiones GPS)
 */
function generateRetransmissionReport(records: RetransmissionRecord[]) {
  const now = new Date().toLocaleString("es-PE");
  const totalDisconnected = records.filter(
    (d) => d.retransmissionStatus === "disconnected"
  ).length;
  const tempLoss = records.filter(
    (d) => d.retransmissionStatus === "temporary_loss"
  ).length;
  const online = records.filter(
    (d) => d.retransmissionStatus === "online"
  ).length;

  const avgMinutes =
    records.length > 0
      ? records.reduce((s, d) => s + Math.round(d.disconnectedDuration / 60), 0) / records.length
      : 0;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Retransmisión GPS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dc2626; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { font-size: 22px; color: #dc2626; }
    .header .meta { text-align: right; font-size: 12px; color: #666; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 16px; color: #991b1b; margin-bottom: 10px; border-left: 3px solid #dc2626; padding-left: 8px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .metric { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center; }
    .metric .value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .metric .label { font-size: 11px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #991b1b; color: white; padding: 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #fef2f2; }
    .status-disconnected { color: #dc2626; font-weight: bold; }
    .status-temp_loss { color: #f59e0b; font-weight: bold; }
    .status-online { color: #16a34a; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📡 Reporte de Retransmisión GPS</h1>
    <div class="meta">
      <p><strong>Generado:</strong> ${now}</p>
      <p><strong>Total vehículos:</strong> ${records.length}</p>
    </div>
  </div>

  <div class="section">
    <h2>Resumen</h2>
    <div class="grid">
      <div class="metric">
        <div class="value" style="color:#dc2626">${totalDisconnected}</div>
        <div class="label">Desconectados</div>
      </div>
      <div class="metric">
        <div class="value" style="color:#f59e0b">${tempLoss}</div>
        <div class="label">Pérdida temporal</div>
      </div>
      <div class="metric">
        <div class="value" style="color:#16a34a">${online}</div>
        <div class="label">Online</div>
      </div>
      <div class="metric">
        <div class="value">${avgMinutes.toFixed(0)} min</div>
        <div class="label">Promedio sin señal</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Detalle de Dispositivos</h2>
    <table>
      <thead>
        <tr>
          <th>Placa</th>
          <th>Empresa</th>
          <th>GPS</th>
          <th>Estado</th>
          <th>Duración sin señal</th>
          <th>Última conexión</th>
        </tr>
      </thead>
      <tbody>
        ${records
          .sort((a, b) => b.disconnectedDuration - a.disconnectedDuration)
          .map(
            (d) => `
          <tr>
            <td><strong>${d.vehiclePlate}</strong></td>
            <td>${d.companyName || "—"}</td>
            <td>${d.gpsCompanyName || "—"}</td>
            <td class="status-${d.retransmissionStatus}">${
              d.retransmissionStatus === "disconnected"
                ? "Desconectado"
                : d.retransmissionStatus === "temporary_loss"
                ? "Pérdida temporal"
                : "Online"
            }</td>
            <td>${Math.round(d.disconnectedDuration / 60)} min</td>
            <td>${new Date(d.lastConnection).toLocaleString("es-PE")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>TMS NAVITEL — Sistema de Gestión de Transporte — Reporte de Retransmisión GPS</p>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => win.print(), 500);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Botón para exportar reporte de retransmisión en PDF
 */
export function RetransmissionPdfExport({
  records,
  className,
}: RetransmissionPdfExportProps) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("gap-1.5", className)}
      onClick={() => generateRetransmissionReport(records)}
      disabled={records.length === 0}
    >
      <FileText className="h-3.5 w-3.5" />
      Exportar PDF
    </Button>
  );
}
