"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Car,
  DollarSign,
  TrendingUp,

  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  PlayCircle,
  PauseCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PlatformDashboard } from "@/types/platform";
import { platformDashboardService } from "@/services/platform.service";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof PlayCircle }> = {
  tenant_created: { label: "Creado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: PlayCircle },
  tenant_suspended: { label: "Suspendido", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: PauseCircle },
  tenant_reactivated: { label: "Reactivado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: PlayCircle },
  vehicle_transferred: { label: "Transferencia", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Car },
  module_enabled: { label: "Módulo", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400", icon: Activity },
  module_disabled: { label: "Módulo", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Activity },
  master_user_created: { label: "Usuario", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400", icon: Users },
  user_created: { label: "Usuario", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400", icon: Users },
  user_reset_password: { label: "Password", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: AlertTriangle },
  plan_changed: { label: "Plan", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400", icon: TrendingUp },
  tenant_cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: PauseCircle },
};

export default function PlatformDashboardPage() {
  const [dashboard, setDashboard] = useState<PlatformDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await platformDashboardService.getDashboard();
        setDashboard(data);
      } catch (err) {
        console.error("Error loading platform dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <PageWrapper title="Panel de Plataforma" description="Cargando...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-28" />
            </Card>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!dashboard) {
    return (
      <PageWrapper title="Panel de Plataforma" description="Error al cargar datos">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No se pudieron cargar los datos del dashboard.
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Panel de Plataforma"
      description="Gestión global del sistema TMS — Vista del proveedor"
      actions={
        <Link href="/platform/tenants">
          <Button>
            <Building2 className="mr-2 h-4 w-4" />
            Gestionar Clientes
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* KPIs principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                  <p className="text-3xl font-bold">{dashboard.totalTenants}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <PlayCircle className="h-3 w-3" /> {dashboard.activeTenants} activos
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="h-3 w-3" /> {dashboard.trialTenants} trial
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <PauseCircle className="h-3 w-3" /> {dashboard.suspendedTenants} susp.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Usuarios Totales</p>
                  <p className="text-3xl font-bold">{dashboard.totalUsers}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                De todos los tenants activos en la plataforma
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vehículos Totales</p>
                  <p className="text-3xl font-bold">{dashboard.totalVehicles}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Car className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Flota combinada de todos los clientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MRR</p>
                  <p className="text-3xl font-bold">{formatCurrency(dashboard.monthlyRecurringRevenue)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                {dashboard.churnRate < 0.05 ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <ArrowUpRight className="h-3 w-3" /> Churn {(dashboard.churnRate * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600">
                    <ArrowDownRight className="h-3 w-3" /> Churn {(dashboard.churnRate * 100).toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground">
                  +{dashboard.newTenantsThisMonth} nuevo{dashboard.newTenantsThisMonth !== 1 ? "s" : ""} este mes
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribución por plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución por Plan</CardTitle>
              <CardDescription>Tenants por tipo de suscripción</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.planDistribution.map((item) => (
                <div key={item.plan} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{item.plan}</span>
                    <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Módulos más usados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Módulos más Utilizados</CardTitle>
              <CardDescription>Top módulos por adopción</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.topModules.map((mod) => (
                <div key={mod.moduleCode} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{mod.moduleName}</span>
                    <span className="text-muted-foreground">{mod.tenantsUsing} tenants ({mod.percentage}%)</span>
                  </div>
                  <Progress value={mod.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actividad reciente */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Actividad Reciente</CardTitle>
                <CardDescription>Últimas acciones en la plataforma</CardDescription>
              </div>
              <Link href="/platform/activity">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todo
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.recentActivity.slice(0, 5).map((act) => {
                  const config = statusConfig[act.action] ?? statusConfig.tenant_created;
                  return (
                    <div key={act.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                        <config.icon className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug line-clamp-2">{act.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(act.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
