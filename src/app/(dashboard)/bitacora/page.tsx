'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Download, RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';
import { Button } from '@/components/ui/button';
import { bitacoraService } from '@/services/bitacora.service';

// Vista de 1104 líneas — lazy-load
const BitacoraView = dynamic(
  () => import('@/components/bitacora/bitacora-view').then(m => ({ default: m.BitacoraView })),
  { ssr: false, loading: () => <div className="h-[600px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" /> }
);
import type {
  BitacoraEntry,
  BitacoraStats,
  BitacoraVehicleSummary,
  BitacoraGeofenceSummary,
} from '@/types/bitacora';

/**
 * Página principal de Bitácora — Control operativo.
 * Visualiza ingresos, salidas y recorridos no planificados.
 * Permite crear órdenes posteriores a partir de eventos registrados.
 *
 * Consume el backend real vía bitacoraService (ver 15 endpoints en /bitacora/*).
 */
export default function BitacoraPage() {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [stats, setStats] = useState<BitacoraStats | null>(null);
  const [vehicleSummaries, setVehicleSummaries] = useState<BitacoraVehicleSummary[]>([]);
  const [geofenceSummaries, setGeofenceSummaries] = useState<BitacoraGeofenceSummary[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [entriesResp, statsResp, vehResp, geoResp] = await Promise.all([
        bitacoraService.getEntries({}, 1, 200).catch(() => ({ entries: [], total: 0, page: 1, pageSize: 200 })),
        bitacoraService.getStats().catch(() => null),
        bitacoraService.getVehicleSummary().catch(() => []),
        bitacoraService.getGeofenceSummary().catch(() => []),
      ]);
      setEntries(entriesResp.entries);
      setStats(statsResp);
      setVehicleSummaries(vehResp);
      setGeofenceSummaries(geoResp);
    } catch (err) {
      console.warn("[BitacoraPage] Error cargando bitácora:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <PageWrapper
      title="Bitácora"
      description="Control operativo — ingresos, salidas y eventos no planificados"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={loadAll} disabled={isRefreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      }
    >
      <BitacoraView
        entries={entries}
        stats={stats ?? {
          totalEntries: 0,
          totalEntries_entry: 0,
          totalEntries_exit: 0,
          unplannedStops: 0,
          deviations: 0,
          dwellEvents: 0,
          activeEvents: 0,
          reviewedEvents: 0,
          ordersCreated: 0,
          avgDwellMinutes: 0,
          expectedRate: 0,
        }}
        vehicleSummaries={vehicleSummaries}
        geofenceSummaries={geofenceSummaries}
      />
    </PageWrapper>
  );
}
