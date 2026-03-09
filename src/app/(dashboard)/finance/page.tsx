"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  Download,
  Plus,
  RefreshCw,
  PieChart,
  BarChart3,
} from "lucide-react";

import { useFinance, useProfitability, useCashFlow } from "@/hooks/useFinance";
import type { InvoiceFilters as IInvoiceFilters } from "@/types/finance";

// Utilidad para fechas por defecto (último mes)
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

// Componentes UI
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Componentes de Finanzas
import {
  FinanceStatsCards,
  InvoiceList,
  InvoiceFilters,
  PaymentList,
  CostsList,
  ProfitabilityChart,
  CashFlowChart,
  CreateInvoiceDialog,
  RecordPaymentDialog,
  RecordCostDialog,
} from "@/components/finance";

// COMPONENTE PRINCIPAL

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showRecordCost, setShowRecordCost] = useState(false);

  // Rango de fechas por defecto
  const dateRange = useMemo(() => getDefaultDateRange(), []);

  const {
    invoices,
    payments,
    costs,
    stats,
    loading,
    refresh,
    fetchInvoices,
    sendInvoice,
    cancelInvoice,
    approveCost,
  } = useFinance();

  const { analysis: profitability } = useProfitability(dateRange.startDate, dateRange.endDate);
  const { cashFlow } = useCashFlow(dateRange.startDate, dateRange.endDate);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleFilterChange = useCallback((filters: IInvoiceFilters) => {
    fetchInvoices(filters);
  }, [fetchInvoices]);

  const handleSendInvoice = useCallback(async (id: string) => {
    await sendInvoice(id);
    refresh();
  }, [sendInvoice, refresh]);

  const handleCancelInvoice = useCallback(async (id: string) => {
    await cancelInvoice(id);
    refresh();
  }, [cancelInvoice, refresh]);

  const handleApproveCost = useCallback(async (id: string) => {
    await approveCost(id);
    refresh();
  }, [approveCost, refresh]);

  return (
    <PageWrapper
      title="Finanzas"
      description="Gestión de facturas, pagos, costos y análisis financiero"
    >
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowRecordCost(true)} variant="outline" size="sm">
            <TrendingDown className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Registrar Costo</span>
          </Button>
          <Button onClick={() => setShowRecordPayment(true)} variant="outline" size="sm">
            <CreditCard className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Registrar Pago</span>
          </Button>
          <Button onClick={() => setShowCreateInvoice(true)} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Factura</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <FinanceStatsCards stats={stats} loading={loading} />

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 overflow-x-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Facturas
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Costos
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análisis
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rentabilidad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Rentabilidad
                </CardTitle>
                <CardDescription>
                  Análisis de márgenes y ganancias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfitabilityChart data={profitability} />
              </CardContent>
            </Card>

            {/* Flujo de Caja */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  Flujo de Caja
                </CardTitle>
                <CardDescription>
                  Ingresos vs egresos del período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CashFlowChart data={cashFlow} />
              </CardContent>
            </Card>
          </div>

          {/* Alertas financieras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Alertas Financieras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats && stats.overdueCount > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-400">
                        {stats.overdueCount} facturas vencidas
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-500">
                        Total pendiente: S/ {stats.totalOverdue?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                )}
                {stats && stats.pendingCount > 5 && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        {stats.pendingCount} facturas pendientes de pago
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-500">
                        Revisar estado de cobranza
                      </p>
                    </div>
                  </div>
                )}
                {(!stats || (stats.overdueCount === 0 && stats.pendingCount <= 5)) && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Sin alertas pendientes. Finanzas en orden.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Facturas */}
        <TabsContent value="invoices" className="space-y-4">
          <InvoiceFilters onFiltersChange={handleFilterChange} />
          <InvoiceList
            invoices={invoices}
            loading={loading}
            onCreateInvoice={() => setShowCreateInvoice(true)}
            onSendInvoice={handleSendInvoice}
            onCancelInvoice={handleCancelInvoice}
          />
        </TabsContent>

        {/* Tab: Pagos */}
        <TabsContent value="payments" className="space-y-4">
          <PaymentList
            payments={payments}
            loading={loading}
            onRecordPayment={() => setShowRecordPayment(true)}
          />
        </TabsContent>

        {/* Tab: Costos */}
        <TabsContent value="costs" className="space-y-4">
          <CostsList
            costs={costs}
            loading={loading}
            onRecordCost={() => setShowRecordCost(true)}
            onApproveCost={handleApproveCost}
          />
        </TabsContent>

        {/* Tab: Análisis */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolución Mensual</CardTitle>
                <CardDescription>
                  Comparativa de ingresos, costos y margen
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ProfitabilityChart data={profitability} showTrend />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Costos</CardTitle>
                <CardDescription>Por categoría</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <CashFlowChart data={cashFlow} variant="pie" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogos */}
      <CreateInvoiceDialog
        open={showCreateInvoice}
        onOpenChange={setShowCreateInvoice}
      />
      <RecordPaymentDialog
        open={showRecordPayment}
        onOpenChange={setShowRecordPayment}
      />
      <RecordCostDialog
        open={showRecordCost}
        onOpenChange={setShowRecordCost}
      />
    </PageWrapper>
  );
}
