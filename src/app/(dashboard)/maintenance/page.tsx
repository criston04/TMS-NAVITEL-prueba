/**
 * @fileoverview Dashboard de Mantenimiento de Flota - Rediseño UX/UI Premium
 * Sistema TMS Navitel - Diseño SaaS moderno, limpio y profesional
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Truck,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Package,
  ClipboardCheck,
  FileText,
  Plus,
  ArrowRight,
  ChevronRight,
  Activity,
  Timer,
  Gauge,
  CircleDollarSign,
  AlertCircle,
  Settings2,
  BarChart3,
} from 'lucide-react';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Vehicle, WorkOrder, Alert, MaintenanceMetrics } from '@/types/maintenance';
import Link from 'next/link';

// ============================================================================
// COMPONENTES DE UI REUTILIZABLES
// ============================================================================

/** KPI Card Component - Diseño minimalista con énfasis en el número */
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  href?: string;
}) => {
  const colorMap = {
    primary: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-sky-50 text-sky-600',
  };

  const content = (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{value}</span>
              {trend && trendValue && (
                <span
                  className={`flex items-center text-xs font-semibold ${
                    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-500'
                  }`}
                >
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  ) : null}
                  {trendValue}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${colorMap[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
};

/** Quick Action Card - Acceso rápido con diseño limpio */
const QuickActionCard = ({
  title,
  description,
  icon: Icon,
  href,
  badge,
  color = 'slate',
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: number | string;
  color?: string;
}) => {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
    green: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
    red: 'bg-red-100 text-red-600 group-hover:bg-red-200',
  };

  return (
    <Link href={href}>
      <Card className="group border border-slate-200 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer bg-white hover:bg-slate-50/80 hover:border-primary/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${colorMap[color]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                {badge !== undefined && badge !== 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-xs">
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

/** Work Order Item - Diseño compacto y escaneable */
const WorkOrderItem = ({
  order,
  vehicle,
}: {
  order: WorkOrder;
  vehicle?: Vehicle;
}) => {
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-blue-700',
    on_hold: 'bg-slate-50 text-slate-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
  };

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
      {/* Priority Indicator */}
      <div
        className={`w-1.5 h-12 rounded-full ${
          order.priority === 'urgent'
            ? 'bg-red-500'
            : order.priority === 'high'
            ? 'bg-orange-500'
            : 'bg-slate-300'
        }`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-primary">
            {order.orderNumber}
          </span>
          <Badge
            variant="secondary"
            className={statusColors[order.status] || statusColors.pending}
          >
            {order.status === 'pending'
              ? 'Pendiente'
              : order.status === 'in_progress'
              ? 'En Proceso'
              : order.status === 'on_hold'
              ? 'En Espera'
              : order.status}
          </Badge>
          {order.priority === 'urgent' && (
            <Badge className="bg-red-500 text-white text-xs">Urgente</Badge>
          )}
        </div>
        <p className="font-medium text-slate-900 truncate">{order.title}</p>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          {vehicle && (
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              {vehicle.plate}
            </span>
          )}
          {order.scheduledDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(order.scheduledDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <Link href={`/maintenance/work-orders/${order.id}`}>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
};

/** Alert Item - Con prioridad visual clara */
const AlertItem = ({ alert }: { alert: Alert }) => {
  const severityConfig: Record<string, { bg: string; icon: string; badge: string }> = {
    critical: {
      bg: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
    },
    high: {
      bg: 'bg-orange-50 border-orange-200',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-700',
    },
    medium: {
      bg: 'bg-amber-50 border-amber-200',
      icon: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    },
    low: {
      bg: 'bg-slate-50 border-slate-200',
      icon: 'text-slate-600',
      badge: 'bg-slate-100 text-slate-700',
    },
  };

  const config = severityConfig[alert.severity] || severityConfig.low;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg}`}>
      <div className={`mt-0.5 ${config.icon}`}>
        {alert.severity === 'error' ? (
          <AlertCircle className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-slate-900">{alert.title}</p>
          <Badge variant="secondary" className={config.badge}>
            {alert.severity === 'error'
              ? 'Crítico'
              : alert.severity === 'warning'
              ? 'Advertencia'
              : 'Información'}
          </Badge>
        </div>
        <p className="text-sm text-slate-600">{alert.message}</p>
        <p className="text-xs text-slate-400 mt-2">
          {new Date(alert.createdAt).toLocaleString()}
        </p>
      </div>
      {alert.actionUrl && (
        <Link href={alert.actionUrl}>
          <Button variant="ghost" size="sm" className="shrink-0">
            {alert.actionLabel || 'Ver'}
          </Button>
        </Link>
      )}
    </div>
  );
};

/** Metric Item - Para la sección de métricas */
const MetricItem = ({
  label,
  value,
  unit,
  color = 'slate',
  progress,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  progress?: number;
}) => {
  const colorMap: Record<string, string> = {
    slate: 'text-slate-900',
    green: 'text-emerald-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${colorMap[color]}`}>{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {progress !== undefined && (
        <Progress value={progress} className="h-1.5 bg-slate-100" />
      )}
    </div>
  );
};

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function MaintenancePage() {
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<MaintenanceMetrics | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesData, workOrdersData, alertsData, metricsData] = await Promise.all([
        maintenance.getVehicles(),
        maintenance.getWorkOrders(),
        maintenance.getAlerts({ unreadOnly: true }),
        maintenance.getMaintenanceMetrics(),
      ]);

      setVehicles(vehiclesData);
      setWorkOrders(workOrdersData);
      setAlerts(alertsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de KPIs
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const inMaintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
  const pendingWorkOrders = workOrders.filter(w => w.status === 'pending').length;
  const inProgressWorkOrders = workOrders.filter(w => w.status === 'in_progress').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'error' || a.severity === 'warning').length;
  const availabilityRate = vehicles.length > 0 ? Math.round((activeVehicles / vehicles.length) * 100) : 0;

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary mx-auto" />
          </div>
          <p className="text-slate-500 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-8">
        {/* ================================================================ */}
        {/* HEADER */}
        {/* ================================================================ */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/" className="hover:text-slate-700 transition-colors">
                Inicio
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-slate-900 font-medium">Mantenimiento de Flota</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mantenimiento de Flota</h1>
            <p className="text-slate-500 mt-1">
              Gestión integral de mantenimiento preventivo y correctivo
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-3">
            <Link href="/maintenance/work-orders/new">
              <Button size="lg" className="gap-2 shadow-sm">
                <Plus className="h-5 w-5" />
                Nueva Orden de Trabajo
              </Button>
            </Link>
          </div>
        </header>

        {/* ================================================================ */}
        {/* CRITICAL ALERT BANNER */}
        {/* ================================================================ */}
        {criticalAlerts > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white p-6 shadow-lg">
            <div className="absolute right-0 top-0 opacity-10">
              <AlertTriangle className="h-32 w-32 -translate-y-4 translate-x-4" />
            </div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {criticalAlerts} Alerta{criticalAlerts > 1 ? 's' : ''} Crítica
                    {criticalAlerts > 1 ? 's' : ''}
                  </h3>
                  <p className="text-red-100">Requieren atención inmediata</p>
                </div>
              </div>
              <Link href="/maintenance/alerts">
                <Button variant="secondary" className="bg-white text-red-600 hover:bg-red-50">
                  Ver Alertas
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* KPIs GRID */}
        {/* ================================================================ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Vehículos Operativos"
            value={activeVehicles}
            subtitle={`de ${vehicles.length} unidades`}
            icon={Truck}
            color="success"
            trend="up"
            trendValue={`${availabilityRate}%`}
            href="/maintenance/vehicles"
          />
          <KPICard
            title="En Mantenimiento"
            value={inMaintenanceVehicles}
            subtitle="vehículos en taller"
            icon={Wrench}
            color={inMaintenanceVehicles > 0 ? 'warning' : 'primary'}
          />
          <KPICard
            title="OT Pendientes"
            value={pendingWorkOrders}
            subtitle={`${inProgressWorkOrders} en proceso`}
            icon={FileText}
            color={pendingWorkOrders > 5 ? 'danger' : 'info'}
            href="/maintenance/work-orders"
          />
          <KPICard
            title="Costo Mensual"
            value={`S/ ${metrics?.totalCost?.toLocaleString() || '0'}`}
            subtitle={`S/ ${metrics?.costPerKm?.toFixed(2) || '0'}/km`}
            icon={CircleDollarSign}
            color="primary"
            trend="down"
            trendValue="-8%"
          />
        </section>

        {/* ================================================================ */}
        {/* MAIN CONTENT GRID */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============================================================ */}
          {/* LEFT COLUMN - Quick Actions */}
          {/* ============================================================ */}
          <section className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Accesos Rápidos</h2>
            </div>

            <div className="space-y-3">
              <QuickActionCard
                title="Gestión de Vehículos"
                description="Flota completa y estados"
                icon={Truck}
                href="/maintenance/vehicles"
                badge={vehicles.length}
                color="green"
              />
              <QuickActionCard
                title="Mantenimiento Preventivo"
                description="Programación y calendario"
                icon={Calendar}
                href="/maintenance/preventive"
                color="blue"
              />
              <QuickActionCard
                title="Órdenes de Trabajo"
                description="Gestionar OT activas"
                icon={FileText}
                href="/maintenance/work-orders"
                badge={pendingWorkOrders || undefined}
                color="orange"
              />
              <QuickActionCard
                title="Inventario de Repuestos"
                description="Control de stock"
                icon={Package}
                href="/maintenance/parts"
                color="purple"
              />
              <QuickActionCard
                title="Inspecciones"
                description="Checklists y registros"
                icon={ClipboardCheck}
                href="/maintenance/inspections"
                color="slate"
              />
              <QuickActionCard
                title="Documentos Vehiculares"
                description="Certificados y permisos"
                icon={FileText}
                href="/maintenance/documents"
                color="red"
              />
            </div>
          </section>

          {/* ============================================================ */}
          {/* CENTER COLUMN - Work Orders */}
          {/* ============================================================ */}
          <section className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Órdenes Pendientes</h2>
              <Link href="/maintenance/work-orders">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {workOrders
                .filter(w => w.status === 'pending' || w.status === 'in_progress')
                .slice(0, 4)
                .map((order) => {
                  const vehicle = vehicles.find(v => v.id === order.vehicleId);
                  return <WorkOrderItem key={order.id} order={order} vehicle={vehicle} />;
                })}

              {workOrders.filter(w => w.status === 'pending' || w.status === 'in_progress')
                .length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
                  <div className="p-4 bg-emerald-50 rounded-full mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="font-medium text-slate-900">¡Todo al día!</p>
                  <p className="text-sm text-slate-500">No hay órdenes pendientes</p>
                </div>
              )}
            </div>
          </section>

          {/* ============================================================ */}
          {/* RIGHT COLUMN - Alerts */}
          {/* ============================================================ */}
          <section className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Alertas</h2>
              <Link href="/maintenance/alerts">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {alerts.slice(0, 4).map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}

              {alerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
                  <div className="p-4 bg-emerald-50 rounded-full mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="font-medium text-slate-900">Sin alertas</p>
                  <p className="text-sm text-slate-500">Todo funciona correctamente</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ================================================================ */}
        {/* METRICS SECTION */}
        {/* ================================================================ */}
        {metrics && (
          <section>
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Métricas del Período
                  </CardTitle>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                    Febrero 2026
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-4">
                  <MetricItem
                    label="Disponibilidad"
                    value={metrics.availabilityRate?.toFixed(1) || '0'}
                    unit="%"
                    color="green"
                    progress={metrics.availabilityRate}
                  />
                  <MetricItem
                    label="Tiempo Fuera de Servicio"
                    value={metrics.totalDowntimeHours || '0'}
                    unit="hrs"
                    color="orange"
                  />
                  <MetricItem
                    label="Preventivo / Correctivo"
                    value={`${metrics.totalPreventive || 0} / ${metrics.totalCorrective || 0}`}
                    color="blue"
                  />
                  <MetricItem
                    label="MTTR"
                    value={metrics.mttr?.toFixed(1) || '0'}
                    unit="hrs"
                    color="purple"
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
