import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { CustomerCategoriesProvider } from "@/contexts/customer-categories-context";
import { IntegrationInitializer } from "@/components/shared/integration-initializer";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Inicializar integraciones cross-module */}
      <IntegrationInitializer />

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
  );
}
