"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Play,
  TrendingUp,
  Truck,
  Users,
  Package,
} from "lucide-react";

import { useReports, useQuickReportGenerator } from "@/hooks/useReports";

import type { ReportType, ReportDefinition, GenerateReportRequest } from "@/types/report";

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

// Componentes de Reportes
import {
  ReportDefinitionsList,
  GeneratedReportsList,
  ReportSchedulesList,
  QuickReportCard,
  CreateReportDialog,
  ScheduleReportDialog,
  GenerateReportDialog,
} from "@/components/reports";

const quickReports = [
  {
    id: "quick-ops-daily",
    title: "Operaciones del Día",
    description: "Resumen de todas las operaciones de hoy",
    icon: Package,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    type: "operational" as const,
  },
  {
    id: "quick-fleet-status",
    title: "Estado de Flota",
    description: "Disponibilidad y ubicación de vehículos",
    icon: Truck,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    type: "fleet" as const,
  },
  {
    id: "quick-driver-performance",
    title: "Rendimiento Conductores",
    description: "KPIs y métricas de conductores",
    icon: Users,
    color: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-950/20",
    type: "driver" as const,
  },
  {
    id: "quick-financial",
    title: "Resumen Financiero",
    description: "Ingresos, costos y rentabilidad",
    icon: TrendingUp,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    type: "financial" as const,
  },
];

// COMPONENTE PRINCIPAL

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("quick");
  const [selectedDefinition, setSelectedDefinition] = useState<ReportDefinition | null>(null);

  const {
    definitions,
    generatedReports,
    schedules,
    loading,
    generating: hookGenerating,
    refresh,
    createDefinition,
    createSchedule,
    generateReport,
    downloadReport,
    toggleSchedule,
    deleteSchedule,
    runScheduleNow,
  } = useReports();

  const { generate, generating } = useQuickReportGenerator();

  const handleQuickReport = async (type: ReportType) => {
    await generate(type, "pdf");
  };

  // Handler: crear definición de reporte
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreateReport = async (data: any) => {
    await createDefinition({
      code: data.code,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      dataSource: data.type,
      columns: data.columns.map(({ id: _id, ...rest }: { id: string; field: string; header: string; format?: string; isVisible: boolean; sortable?: boolean }) => ({
        field: rest.field,
        header: rest.header,
        format: rest.format as "text" | "number" | "date" | "datetime" | "currency" | "percentage" | "boolean" | undefined,
        isVisible: rest.isVisible,
        sortable: rest.sortable,
      })),
    });
  };

  // Handler: programar reporte
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleScheduleReport = async (params: any) => {
    await createSchedule({
      definitionId: params.definitionId,
      name: params.name,
      frequency: params.frequency,
      format: params.format,
      timeOfDay: params.time,
      recipients: params.recipients,
      dayOfWeek: params.dayOfWeek,
      dayOfMonth: params.dayOfMonth,
    });
  };

  // Handler: generar reporte desde diálogo
  const handleGenerateReport = async (params: {
    definitionId: string;
    format: "pdf" | "excel" | "csv" | "json" | "html";
    dateRangeType: string;
    dateRange?: { startDate: Date; endDate: Date };
    filters?: Record<string, unknown>;
    includeCharts?: boolean;
    includeSummary?: boolean;
  }) => {
    const request: GenerateReportRequest = {
      definitionId: params.definitionId,
      format: params.format,
      parameters: {
        includeCharts: params.includeCharts,
        includeSummary: params.includeSummary,
      },
    };
    if (params.dateRange) {
      request.dateRange = {
        start: params.dateRange.startDate.toISOString().split("T")[0],
        end: params.dateRange.endDate.toISOString().split("T")[0],
      };
    }
    await generateReport(request);
  };

  // Handler: generar reporte rápido desde lista de definiciones
  const handleDefinitionGenerate = (id: string) => {
    const def = definitions.find((d) => d.id === id);
    if (def) {
      setSelectedDefinition(def);
    }
  };

  // Handler: descargar reporte
  const handleDownloadReport = (id: string) => {
    downloadReport(id);
  };

  // Handler: toggle de programación
  const handleToggleSchedule = (id: string) => {
    toggleSchedule(id);
  };

  // Handler: ejecutar programación ahora
  const handleRunScheduleNow = (id: string) => {
    runScheduleNow(id);
  };

  // Handler: eliminar programación
  const handleDeleteSchedule = (id: string) => {
    deleteSchedule(id);
  };

  return (
    <PageWrapper
      title="Reportes"
      description="Genera, programa y descarga reportes del sistema"
    >
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <GenerateReportDialog
            trigger={
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Generar
              </Button>
            }
            definition={selectedDefinition ?? definitions[0] ?? undefined}
            onGenerate={handleGenerateReport}
            isGenerating={hookGenerating}
          />
          <ScheduleReportDialog
            trigger={
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Programar
              </Button>
            }
            onSchedule={handleScheduleReport}
          />
          <CreateReportDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Reporte
              </Button>
            }
            onCreate={handleCreateReport}
          />
        </div>
      </div>

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Reportes Rápidos
          </TabsTrigger>
          <TabsTrigger value="definitions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Definiciones
          </TabsTrigger>
          <TabsTrigger value="generated" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Generados
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Programados
          </TabsTrigger>
        </TabsList>

        {/* Tab: Reportes Rápidos */}
        <TabsContent value="quick" className="space-y-6">
          {/* Reportes rápidos predefinidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickReports.map((report) => (
              <QuickReportCard
                key={report.id}
                title={report.title}
                description={report.description}
                icon={report.icon}
                color={report.color}
                bgColor={report.bgColor}
                onGenerate={() => handleQuickReport(report.type)}
                generating={generating}
              />
            ))}
          </div>

          {/* Reportes recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Reportes Recientes
              </CardTitle>
              <CardDescription>
                Últimos reportes generados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneratedReportsList
                reports={generatedReports.slice(0, 5)}
                loading={loading}
                onDownload={handleDownloadReport}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Definiciones */}
        <TabsContent value="definitions" className="space-y-4">
          <ReportDefinitionsList
            definitions={definitions}
            loading={loading}
            onGenerate={handleDefinitionGenerate}
          />
        </TabsContent>

        {/* Tab: Reportes Generados */}
        <TabsContent value="generated" className="space-y-4">
          <GeneratedReportsList
            reports={generatedReports}
            loading={loading}
            onDownload={handleDownloadReport}
          />
        </TabsContent>

        {/* Tab: Programaciones */}
        <TabsContent value="schedules" className="space-y-4">
          <ReportSchedulesList
            schedules={schedules}
            loading={loading}
            onToggle={handleToggleSchedule}
            onRunNow={handleRunScheduleNow}
            onDelete={handleDeleteSchedule}
          />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
