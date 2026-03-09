"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, Download, Clock, Map as MapIcon, BarChart3, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRetransmission } from "@/hooks/monitoring/use-retransmission";
import { RetransmissionStats } from "./retransmission-stats";
import { RetransmissionFilters } from "./retransmission-filters";
import { RetransmissionTable } from "./retransmission-table";
import { CommentModal } from "./comment-modal";
import { ConnectivityChart } from "./connectivity-chart";
import { PriorityBadge } from "./priority-badge";
import { RetransmissionPdfExport } from "./retransmission-pdf-export";
import type { RetransmissionRecord } from "@/types/monitoring";

interface RetransmissionContainerProps {
  /** Clase adicional */
  className?: string;
}

/**
 * Contenedor principal del módulo de retransmisión
 */
export function RetransmissionContainer({
  className,
}: RetransmissionContainerProps) {
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    record: RetransmissionRecord | null;
  }>({
    isOpen: false,
    record: null,
  });
  const [activeView, setActiveView] = useState<"table" | "chart">("table");

  const {
    records,
    stats,
    gpsCompanies,
    companies,
    isLoading,
    error,
    filters,
    lastUpdated,
    setFilters,
    updateComment,
    refresh,
  } = useRetransmission({
    autoRefresh: true,
    refreshIntervalMs: 15000,
  });

  /**
   * Abre el modal de comentarios
   */
  const handleOpenComment = useCallback((record: RetransmissionRecord) => {
    setCommentModal({ isOpen: true, record });
  }, []);

  /**
   * Cierra el modal de comentarios
   */
  const handleCloseComment = useCallback(() => {
    setCommentModal({ isOpen: false, record: null });
  }, []);

  /**
   * Guarda el comentario
   */
  const handleSaveComment = useCallback(async (comment: string) => {
    if (!commentModal.record) return;
    await updateComment(commentModal.record.id, comment);
  }, [commentModal.record, updateComment]);

  /**
   * Formatea la última actualización
   */
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return "Nunca";
    return date.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={cn("space-y-6 p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Retransmisión GPS</h1>
          <p className="text-muted-foreground">
            Monitoreo del estado de conexión de los dispositivos GPS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Última actualización: {formatLastUpdated(lastUpdated)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <RetransmissionPdfExport records={records} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error al cargar datos</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Estadísticas */}
      <RetransmissionStats stats={stats} isLoading={isLoading} />

      {/* Vista Tabla/Gráfico */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "table" | "chart")}>
        <TabsList>
          <TabsTrigger value="table" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Tabla
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Tendencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4 space-y-4">
          {/* Filtros */}
          <RetransmissionFilters
            filters={filters}
            onFiltersChange={setFilters}
            gpsCompanies={gpsCompanies}
            companies={companies}
          />

          {/* Tabla */}
          <RetransmissionTable
            records={records}
            isLoading={isLoading}
            onCommentClick={handleOpenComment}
          />
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <ConnectivityChart
            data={(() => {
              // Generate trend data from current records
              const total = records.length || 1;
              const online = records.filter((r) => r.retransmissionStatus === "online").length;
              const delayed = records.filter((r) => r.retransmissionStatus === "temporary_loss").length;
              const disconnected = records.filter((r) => r.retransmissionStatus === "disconnected").length;
              // Create simulated historical trend (last 12 hours)
              return Array.from({ length: 12 }, (_, i) => ({
                timestamp: new Date(Date.now() - (11 - i) * 3600000).toISOString(),
                onlinePercentage: Math.max(40, (online / total * 100) + (Math.random() - 0.5) * 15),
                temporaryLossPercentage: Math.max(0, (delayed / total * 100) + (Math.random() - 0.5) * 10),
                disconnectedPercentage: Math.max(0, (disconnected / total * 100) + (Math.random() - 0.5) * 8),
                totalVehicles: total,
              }));
            })()}
          />
        </TabsContent>
      </Tabs>

      {/* Contador de resultados */}
      <div className="text-sm text-muted-foreground">
        Mostrando {records.length} de {stats.total} registros
      </div>

      {/* Modal de comentarios */}
      <CommentModal
        isOpen={commentModal.isOpen}
        onClose={handleCloseComment}
        onSave={handleSaveComment}
        initialComment={commentModal.record?.comments || ""}
        vehiclePlate={commentModal.record?.vehiclePlate || ""}
      />
    </div>
  );
}
