import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
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

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto min-h-0">
            <CustomerCategoriesProvider>
              {children}
            </CustomerCategoriesProvider>
          </main>
        </div>
      </div>
    </EntityCacheProvider>
  );
}
