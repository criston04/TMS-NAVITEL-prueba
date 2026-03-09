"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Building2,
  Box,
  Users,
  Key,
  PauseCircle,
  PlayCircle,
  Trash2,
  ArrowRightLeft,
  RefreshCw,
  Shield,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlatformActivityLog } from "@/types/platform";
import { platformDashboardService } from "@/services/platform.service";

const actionConfig: Record<
  PlatformActivityLog["action"],
  { label: string; icon: typeof Activity; color: string }
> = {
  tenant_created: { label: "Tenant creado", icon: Building2, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
  tenant_suspended: { label: "Tenant suspendido", icon: PauseCircle, color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  tenant_reactivated: { label: "Tenant reactivado", icon: PlayCircle, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  tenant_cancelled: { label: "Tenant cancelado", icon: Trash2, color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  module_enabled: { label: "Módulo activado", icon: Box, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
  module_disabled: { label: "Módulo desactivado", icon: Box, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  user_created: { label: "Usuario creado", icon: Users, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  user_reset_password: { label: "Reset de contraseña", icon: Key, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  vehicle_transferred: { label: "Vehículo transferido", icon: ArrowRightLeft, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  plan_changed: { label: "Plan cambiado", icon: RefreshCw, color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30" },
  master_user_created: { label: "Usuario maestro creado", icon: Shield, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<PlatformActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const response = await platformDashboardService.getActivityLog({ page, pageSize: 20 });
      if (page === 1) {
        setActivities(response.items);
      } else {
        setActivities((prev) => [...prev, ...response.items]);
      }
      setHasMore(response.pagination.hasNext);
    } catch (err) {
      console.error("Error loading activity:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  function formatTimestamp(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Hace un momento";
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <PageWrapper
      title="Log de Actividad"
      description="Registro de todas las acciones realizadas en la plataforma"
      actions={
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            loadActivity();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refrescar
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>
            Todas las acciones de administración realizadas por los usuarios de plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && activities.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Cargando actividad...
            </div>
          ) : activities.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p>No hay actividad registrada</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((activity) => {
                const config = actionConfig[activity.action];
                const Icon = config.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {activity.tenantName && (
                          <span className="text-xs text-muted-foreground">
                            · {activity.tenantName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {activity.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                  >
                    {loading ? "Cargando..." : "Cargar más"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
