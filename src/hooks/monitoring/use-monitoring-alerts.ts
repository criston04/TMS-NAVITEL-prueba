"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { MonitoringAlert, AlertRule, AlertRuleType, AlertSeverity, TrackedVehicle } from "@/types/monitoring";

const MOCK_ALERT_RULES: AlertRule[] = [
  {
    id: "rule-1",
    name: "Velocidad máxima urbana",
    type: "speed_limit",
    enabled: true,
    severity: "warning",
    conditions: { speedLimit: 60 },
    notifySound: true,
    notifyEmail: false,
    notifySms: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-2",
    name: "Velocidad carretera",
    type: "speed_limit",
    enabled: true,
    severity: "critical",
    conditions: { speedLimit: 90 },
    notifySound: true,
    notifyEmail: true,
    notifySms: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-3",
    name: "Parada prolongada",
    type: "stop_duration",
    enabled: true,
    severity: "warning",
    conditions: { maxStopMinutes: 30 },
    notifySound: true,
    notifyEmail: false,
    notifySms: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-4",
    name: "Pérdida de señal GPS",
    type: "disconnection",
    enabled: true,
    severity: "critical",
    conditions: { maxDisconnectionMinutes: 15 },
    notifySound: true,
    notifyEmail: true,
    notifySms: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-5",
    name: "Botón de pánico",
    type: "sos",
    enabled: true,
    severity: "critical",
    conditions: {},
    notifySound: true,
    notifyEmail: true,
    notifySms: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function generateMockAlerts(vehicles: TrackedVehicle[]): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];
  const now = Date.now();

  // Speed alerts
  vehicles.forEach((v) => {
    if (v.position.speed > 70) {
      alerts.push({
        id: `alert-speed-${v.id}`,
        vehicleId: v.id,
        vehiclePlate: v.plate,
        driverName: v.driverName,
        alertType: "speed_limit",
        severity: v.position.speed > 85 ? "critical" : "warning",
        status: "active",
        title: "Exceso de velocidad",
        message: `${v.plate} circula a ${v.position.speed} km/h (límite: ${v.position.speed > 85 ? 90 : 60} km/h)`,
        timestamp: new Date(now - Math.random() * 300000).toISOString(),
        position: { lat: v.position.lat, lng: v.position.lng },
      });
    }
  });

  // Disconnection alerts
  vehicles.filter((v) => v.connectionStatus === "disconnected").forEach((v) => {
    alerts.push({
      id: `alert-disc-${v.id}`,
      vehicleId: v.id,
      vehiclePlate: v.plate,
      driverName: v.driverName,
      alertType: "disconnection",
      severity: "critical",
      status: "active",
      title: "Sin conexión GPS",
      message: `${v.plate} perdió conexión GPS hace más de 15 minutos`,
      timestamp: new Date(now - Math.random() * 900000).toISOString(),
      position: { lat: v.position.lat, lng: v.position.lng },
    });
  });

  // Stop duration alerts
  vehicles.filter((v) => v.movementStatus === "stopped" && v.stoppedSince).forEach((v) => {
    const stoppedMs = now - new Date(v.stoppedSince!).getTime();
    if (stoppedMs > 1800000) { // 30 min
      alerts.push({
        id: `alert-stop-${v.id}`,
        vehicleId: v.id,
        vehiclePlate: v.plate,
        driverName: v.driverName,
        alertType: "stop_duration",
        severity: "warning",
        status: "active",
        title: "Parada prolongada",
        message: `${v.plate} detenido hace ${Math.floor(stoppedMs / 60000)} minutos`,
        timestamp: v.stoppedSince!,
        position: { lat: v.position.lat, lng: v.position.lng },
      });
    }
  });

  // Temp loss alerts
  vehicles.filter((v) => v.connectionStatus === "temporary_loss").forEach((v) => {
    alerts.push({
      id: `alert-temp-${v.id}`,
      vehicleId: v.id,
      vehiclePlate: v.plate,
      driverName: v.driverName,
      alertType: "disconnection",
      severity: "warning",
      status: "active",
      title: "Pérdida temporal de señal",
      message: `${v.plate} presenta intermitencia en la señal GPS`,
      timestamp: new Date(now - Math.random() * 600000).toISOString(),
      position: { lat: v.position.lat, lng: v.position.lng },
    });
  });

  // Some acknowledged/resolved alerts for history
  alerts.push({
    id: "alert-resolved-1",
    vehicleId: vehicles[0]?.id || "v-1",
    vehiclePlate: vehicles[0]?.plate || "ABC-123",
    alertType: "speed_limit",
    severity: "warning",
    status: "resolved",
    title: "Exceso de velocidad",
    message: "Velocidad normalizada",
    timestamp: new Date(now - 3600000).toISOString(),
    resolvedAt: new Date(now - 3000000).toISOString(),
  });

  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Hook para gestión de alertas de monitoreo
 */
export function useMonitoringAlerts({ vehicles }: { vehicles: TrackedVehicle[] }) {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>(MOCK_ALERT_RULES);

  // Generar alertas basadas en el estado de los vehículos
  useEffect(() => {
    if (vehicles.length === 0) return;
    const generated = generateMockAlerts(vehicles);
    setAlerts((prev) => {
      // Merge: keep existing status changes, add new
      const existing = new Map(prev.map((a) => [a.id, a]));
      return generated.map((a) => {
        const ex = existing.get(a.id);
        if (ex && ex.status !== "active") return ex; // Keep acknowledged/resolved state
        return a;
      });
    });
  }, [vehicles]);

  const acknowledge = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: "acknowledged" as const, acknowledgedAt: new Date().toISOString() }
          : a
      )
    );
  }, []);

  const resolve = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: "resolved" as const, resolvedAt: new Date().toISOString() }
          : a
      )
    );
  }, []);

  const addRule = useCallback((rule: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) => {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules((prev) => [...prev, newRule]);
  }, []);

  const toggleRule = useCallback((ruleId: string, enabled: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled, updatedAt: new Date().toISOString() } : r))
    );
  }, []);

  const deleteRule = useCallback((ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status === "active"), [alerts]);
  const criticalAlerts = useMemo(
    () => alerts.filter((a) => a.severity === "critical" && a.status === "active"),
    [alerts]
  );

  return {
    alerts,
    rules,
    activeAlerts,
    criticalAlerts,
    activeCount: activeAlerts.length,
    criticalCount: criticalAlerts.length,
    acknowledge,
    resolve,
    addRule,
    toggleRule,
    deleteRule,
  };
}
