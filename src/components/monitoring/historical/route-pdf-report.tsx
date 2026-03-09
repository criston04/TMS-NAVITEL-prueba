"use client";

import { cn } from "@/lib/utils";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HistoricalRoutePoint } from "@/types/monitoring";

interface RoutePdfReportProps {
  vehiclePlate: string;
  date: string;
  points: HistoricalRoutePoint[];
  distanceKm: number;
  durationMin: number;
  className?: string;
}

/**
 * Genera y descarga un reporte PDF de la ruta (simulado como HTML print)
 */
function generateRouteReport(
  plate: string,
  date: string,
  points: HistoricalRoutePoint[],
  distanceKm: number,
  durationMin: number
) {
  // Calculate statistics
  const speeds = points.map((p) => p.speed ?? 0).filter((s) => s > 0);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

  // Detect stops
  let stopCount = 0;
  let inStop = false;
  points.forEach((p) => {
    if ((p.speed ?? 0) < 3 && !inStop) {
      stopCount++;
      inStop = true;
    } else if ((p.speed ?? 0) >= 3) {
      inStop = false;
    }
  });

  const startTime = points.length > 0 ? new Date(points[0].timestamp).toLocaleString("es-PE") : "N/A";
  const endTime =
    points.length > 0
      ? new Date(points[points.length - 1].timestamp).toLocaleString("es-PE")
      : "N/A";

  const hours = Math.floor(durationMin / 60);
  const mins = Math.round(durationMin % 60);
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Ruta - ${plate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { font-size: 22px; color: #2563eb; }
    .header .meta { text-align: right; font-size: 12px; color: #666; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 16px; color: #1e40af; margin-bottom: 10px; border-left: 3px solid #2563eb; padding-left: 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .metric .value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .metric .label { font-size: 11px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #1e40af; color: white; padding: 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📍 Reporte de Ruta Histórica</h1>
    <div class="meta">
      <p><strong>Vehículo:</strong> ${plate}</p>
      <p><strong>Fecha:</strong> ${date}</p>
      <p><strong>Generado:</strong> ${new Date().toLocaleString("es-PE")}</p>
    </div>
  </div>

  <div class="section">
    <h2>Resumen General</h2>
    <div class="grid">
      <div class="metric">
        <div class="value">${distanceKm.toFixed(1)} km</div>
        <div class="label">Distancia Total</div>
      </div>
      <div class="metric">
        <div class="value">${durationStr}</div>
        <div class="label">Duración</div>
      </div>
      <div class="metric">
        <div class="value">${avgSpeed.toFixed(0)} km/h</div>
        <div class="label">Velocidad Promedio</div>
      </div>
      <div class="metric">
        <div class="value">${maxSpeed.toFixed(0)} km/h</div>
        <div class="label">Velocidad Máxima</div>
      </div>
      <div class="metric">
        <div class="value">${stopCount}</div>
        <div class="label">Paradas</div>
      </div>
      <div class="metric">
        <div class="value">${points.length}</div>
        <div class="label">Puntos GPS</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Cronología</h2>
    <table>
      <thead>
        <tr><th>Inicio</th><th>Fin</th><th>Puntos</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${startTime}</td>
          <td>${endTime}</td>
          <td>${points.length}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Muestra de Puntos GPS (primeros 50)</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Hora</th><th>Lat</th><th>Lng</th><th>Vel (km/h)</th></tr>
      </thead>
      <tbody>
        ${points
          .slice(0, 50)
          .map(
            (p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${new Date(p.timestamp).toLocaleTimeString("es-PE")}</td>
            <td>${p.lat.toFixed(5)}</td>
            <td>${p.lng.toFixed(5)}</td>
            <td>${(p.speed ?? 0).toFixed(0)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>TMS NAVITEL — Sistema de Gestión de Transporte — Reporte generado automáticamente</p>
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
 * Botón para generar y descargar reporte PDF de ruta histórica
 */
export function RoutePdfReport({
  vehiclePlate,
  date,
  points,
  distanceKm,
  durationMin,
  className,
}: RoutePdfReportProps) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("gap-1.5", className)}
      onClick={() => generateRouteReport(vehiclePlate, date, points, distanceKm, durationMin)}
      disabled={points.length === 0}
    >
      <FileText className="h-3.5 w-3.5" />
      Reporte PDF
    </Button>
  );
}
