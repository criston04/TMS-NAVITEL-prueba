import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { LicenseBanner } from "@/components/layout/license-banner";
import { TierGuard } from "@/components/layout/tier-guard";
import { CustomerCategoriesProvider } from "@/contexts/customer-categories-context";
import { EntityCacheProvider } from "@/contexts/entity-cache-context";
import { IntegrationInitializer } from "@/components/shared/integration-initializer";
import { RouteLogger } from "@/components/shared/route-logger";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // EntityCacheProvider carga datos maestros (customers/drivers/vehicles/operators/geofences)
    // una sola vez al entrar al dashboard. Cualquier componente puede usar useEntityCache()
    // para resolver IDs a nombres sin fetches adicionales.
    <EntityCacheProvider>
      <div className="flex h-screen overflow-hidden bg-muted/30">
        {/* Inicializar integraciones cross-module */}
        <IntegrationInitializer />

        {/* Log de navegacion entre modulos (para debug de backend) */}
        <RouteLogger />

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Navbar */}
          <Navbar />

          {/*
            License banner — muestra trial / vencimiento / suspension del tenant.
            Solo renderiza cuando el backend expone GET /me/license. Si no, devuelve null.
            Ver: src/hooks/useLicense.ts + otros/docs-backend/17-plataforma/PLATAFORMA-BACKEND-HANDOFF.md
          */}
          <LicenseBanner />

          {/* Page Content — TierGuard valida la URL contra el tier/rol del usuario */}
          <main className="flex-1 overflow-y-auto min-h-0">
            <CustomerCategoriesProvider>
              <TierGuard>{children}</TierGuard>
            </CustomerCategoriesProvider>
          </main>
        </div>
      </div>
    </EntityCacheProvider>
  );
}
