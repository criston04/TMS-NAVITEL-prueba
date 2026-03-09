'use client';

import { ClipboardList, Download, RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';
import { Button } from '@/components/ui/button';
import { BitacoraView } from '@/components/bitacora/bitacora-view';
import {
  mockBitacoraEntries,
  mockBitacoraStats,
  mockBitacoraVehicleSummaries,
  mockBitacoraGeofenceSummaries,
} from '@/mocks/bitacora.mock';

/**
 * Página principal de Bitácora — Control operativo.
 * Visualiza ingresos, salidas y recorridos no planificados.
 * Permite crear órdenes posteriores a partir de eventos registrados.
 */
export default function BitacoraPage() {
  return (
    <PageWrapper
      title="Bitácora"
      description="Control operativo — ingresos, salidas y eventos no planificados"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
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
        entries={mockBitacoraEntries}
        stats={mockBitacoraStats}
        vehicleSummaries={mockBitacoraVehicleSummaries}
        geofenceSummaries={mockBitacoraGeofenceSummaries}
      />
    </PageWrapper>
  );
}
