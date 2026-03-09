import { useState, useEffect, useCallback, useMemo } from "react";
import { reportService } from "@/services/report.service";
import type {
  ReportDefinition,
  ReportTemplate,
  GeneratedReport,
  ReportSchedule,
  ReportUsageStats,
  OperationalReportData,
  FinancialReportData,
  GenerateReportRequest,
  CreateReportDefinitionDTO,
  CreateReportScheduleDTO,
  GeneratedReportFilters,
  ReportType,
  ExportFormat,
} from "@/types/report";


interface UseReportsReturn {
  definitions: ReportDefinition[];
  templates: ReportTemplate[];
  generatedReports: GeneratedReport[];
  schedules: ReportSchedule[];
  stats: ReportUsageStats | null;
  categories: string[];

  loading: boolean;
  generating: boolean;
  error: string | null;
  total: number;
  page: number;

  // Definiciones
  fetchDefinitions: (filters?: { type?: ReportType; category?: string; search?: string }) => Promise<void>;
  createDefinition: (data: CreateReportDefinitionDTO) => Promise<ReportDefinition | null>;
  updateDefinition: (id: string, data: Partial<CreateReportDefinitionDTO>) => Promise<boolean>;
  deleteDefinition: (id: string) => Promise<boolean>;

  // Generación
  generateReport: (request: GenerateReportRequest) => Promise<GeneratedReport | null>;
  fetchGeneratedReports: (filters?: GeneratedReportFilters, page?: number) => Promise<void>;
  getReportStatus: (id: string) => Promise<string>;
  downloadReport: (id: string) => Promise<{ url: string; filename: string } | null>;

  fetchSchedules: () => Promise<void>;
  createSchedule: (data: CreateReportScheduleDTO) => Promise<ReportSchedule | null>;
  updateSchedule: (id: string, data: Partial<CreateReportScheduleDTO>) => Promise<boolean>;
  toggleSchedule: (id: string) => Promise<boolean>;
  deleteSchedule: (id: string) => Promise<boolean>;
  runScheduleNow: (id: string) => Promise<GeneratedReport | null>;

  fetchStats: () => Promise<void>;
  fetchCategories: () => Promise<void>;

  refresh: () => Promise<void>;
  setPage: (page: number) => void;
}

interface UseReportsOptions {
  autoFetch?: boolean;
  initialType?: ReportType;
  pageSize?: number;
}

export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
  const { autoFetch = true, initialType, pageSize = 20 } = options;

  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [stats, setStats] = useState<ReportUsageStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Definiciones
  const fetchDefinitions = useCallback(
    async (filters?: { type?: ReportType; category?: string; search?: string }) => {
      setLoading(true);
      setError(null);

      try {
        const result = await reportService.getDefinitions(filters);
        setDefinitions(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar definiciones";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createDefinition = useCallback(
    async (data: CreateReportDefinitionDTO): Promise<ReportDefinition | null> => {
      try {
        const definition = await reportService.createDefinition(data);
        setDefinitions(prev => [definition, ...prev]);
        return definition;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear definición";
        setError(message);
        return null;
      }
    },
    []
  );

  const updateDefinition = useCallback(
    async (id: string, data: Partial<CreateReportDefinitionDTO>): Promise<boolean> => {
      try {
        const updated = await reportService.updateDefinition(id, data);
        setDefinitions(prev => prev.map(d => (d.id === id ? updated : d)));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar definición";
        setError(message);
        return false;
      }
    },
    []
  );

  const deleteDefinition = useCallback(async (id: string): Promise<boolean> => {
    try {
      await reportService.deleteDefinition(id);
      setDefinitions(prev => prev.filter(d => d.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar definición";
      setError(message);
      return false;
    }
  }, []);

  // Plantillas
  const fetchTemplates = useCallback(async (type?: ReportType) => {
    try {
      const result = await reportService.getTemplates(type);
      setTemplates(result);
    } catch (err) {
      console.error("[useReports] Error al cargar plantillas:", err);
    }
  }, []);

  // Generación
  const generateReport = useCallback(
    async (request: GenerateReportRequest): Promise<GeneratedReport | null> => {
      setGenerating(true);
      setError(null);

      try {
        const report = await reportService.generateReport(request);
        setGeneratedReports(prev => [report, ...prev]);
        setTotal(prev => prev + 1);
        return report;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al generar reporte";
        setError(message);
        return null;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const fetchGeneratedReports = useCallback(
    async (filters?: GeneratedReportFilters, newPage?: number) => {
      setLoading(true);
      setError(null);

      try {
        const appliedPage = newPage || page;
        const result = await reportService.getGeneratedReports(filters, appliedPage, pageSize);
        setGeneratedReports(result.data);
        setTotal(result.total);
        if (newPage) setPage(newPage);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar reportes";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  const getReportStatus = useCallback(async (id: string): Promise<string> => {
    return reportService.getReportStatus(id);
  }, []);

  const downloadReport = useCallback(
    async (id: string): Promise<{ url: string; filename: string } | null> => {
      try {
        return await reportService.downloadReport(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al descargar reporte";
        setError(message);
        return null;
      }
    },
    []
  );

  const fetchSchedules = useCallback(async () => {
    try {
      const result = await reportService.getSchedules();
      setSchedules(result);
    } catch (err) {
      console.error("[useReports] Error al cargar programaciones:", err);
    }
  }, []);

  const createSchedule = useCallback(
    async (data: CreateReportScheduleDTO): Promise<ReportSchedule | null> => {
      try {
        const schedule = await reportService.createSchedule(data);
        setSchedules(prev => [...prev, schedule]);
        return schedule;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear programación";
        setError(message);
        return null;
      }
    },
    []
  );

  const updateSchedule = useCallback(
    async (id: string, data: Partial<CreateReportScheduleDTO>): Promise<boolean> => {
      try {
        const updated = await reportService.updateSchedule(id, data);
        setSchedules(prev => prev.map(s => (s.id === id ? updated : s)));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar programación";
        setError(message);
        return false;
      }
    },
    []
  );

  const toggleSchedule = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await reportService.toggleSchedule(id);
      setSchedules(prev => prev.map(s => (s.id === id ? updated : s)));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cambiar estado";
      setError(message);
      return false;
    }
  }, []);

  const deleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    try {
      await reportService.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar programación";
      setError(message);
      return false;
    }
  }, []);

  const runScheduleNow = useCallback(
    async (id: string): Promise<GeneratedReport | null> => {
      setGenerating(true);
      try {
        const report = await reportService.runScheduleNow(id);
        setGeneratedReports(prev => [report, ...prev]);
        return report;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al ejecutar programación";
        setError(message);
        return null;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const fetchStats = useCallback(async () => {
    try {
      const result = await reportService.getUsageStats();
      setStats(result);
    } catch (err) {
      console.error("[useReports] Error al cargar estadísticas:", err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await reportService.getReportCategories();
      setCategories(result);
    } catch (err) {
      console.error("[useReports] Error al cargar categorías:", err);
    }
  }, []);

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchDefinitions(initialType ? { type: initialType } : undefined),
      fetchGeneratedReports(),
      fetchSchedules(),
      fetchStats(),
      fetchCategories(),
    ]);
  }, [fetchDefinitions, fetchGeneratedReports, fetchSchedules, fetchStats, fetchCategories, initialType]);

  // Auto-fetch
  useEffect(() => {
    if (autoFetch) {
      fetchDefinitions(initialType ? { type: initialType } : undefined);
      fetchTemplates(initialType);
      fetchGeneratedReports();
      fetchSchedules();
      fetchStats();
      fetchCategories();
    }
  }, [autoFetch, initialType]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    definitions,
    templates,
    generatedReports,
    schedules,
    stats,
    categories,
    loading,
    generating,
    error,
    total,
    page,
    fetchDefinitions,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    generateReport,
    fetchGeneratedReports,
    getReportStatus,
    downloadReport,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    toggleSchedule,
    deleteSchedule,
    runScheduleNow,
    fetchStats,
    fetchCategories,
    refresh,
    setPage,
  };
}


export function useOperationalReport(startDate: string, endDate: string) {
  const [data, setData] = useState<OperationalReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const result = await reportService.getOperationalData(startDate, endDate);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar datos";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // KPIs calculados
  const kpis = useMemo(() => {
    if (!data) return null;

    return {
      efficiencyScore: Math.round(
        (data.completionRate * 0.4 + data.onTimeRate * 0.4 + data.utilizationRate * 0.2)
      ),
      avgOrdersPerVehicle: data.activeVehicles > 0
        ? Math.round(data.completedOrders / data.activeVehicles)
        : 0,
      incidentRate: data.completedOrders > 0
        ? ((data.totalIncidents / data.completedOrders) * 100).toFixed(2)
        : "0.00",
    };
  }, [data]);

  return { data, kpis, loading, error, refresh: fetch };
}


export function useFinancialReport(startDate: string, endDate: string) {
  const [data, setData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const result = await reportService.getFinancialData(startDate, endDate);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar datos";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Análisis
  const analysis = useMemo(() => {
    if (!data) return null;

    return {
      isHealthy: data.collectionRate >= 80 && data.grossMargin >= 20,
      revenuePerOrder: data.totalRevenue / (data.revenueByCustomer.length || 1),
      topCustomerShare: data.revenueByCustomer[0]
        ? ((data.revenueByCustomer[0].amount / data.totalRevenue) * 100).toFixed(1)
        : "0",
      fuelCostRatio: data.costsByCategory[0]
        ? ((data.costsByCategory[0].amount / data.totalCosts) * 100).toFixed(1)
        : "0",
    };
  }, [data]);

  return { data, analysis, loading, error, refresh: fetch };
}


export function useQuickReportGenerator() {
  const [generating, setGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      type: ReportType,
      format: ExportFormat,
      dateRange?: { start: string; end: string },
      parameters?: Record<string, unknown>
    ): Promise<GeneratedReport | null> => {
      setGenerating(true);
      setError(null);

      try {
        // Buscar definición por tipo
        const definitions = await reportService.getDefinitions({ type });
        const definition = definitions[0];

        if (!definition) {
          throw new Error(`No hay definición de reporte para tipo: ${type}`);
        }

        const report = await reportService.generateReport({
          definitionId: definition.id,
          format,
          dateRange,
          parameters,
        });

        setLastReport(report);
        return report;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al generar reporte";
        setError(message);
        return null;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const generateOperational = useCallback(
    (format: ExportFormat = "pdf", days: number = 7) => {
      const end = new Date();
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
      
      return generate(
        "operational",
        format,
        {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        }
      );
    },
    [generate]
  );

  const generateFinancial = useCallback(
    (format: ExportFormat = "excel", month?: string) => {
      const now = new Date();
      const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [year, m] = targetMonth.split("-").map(Number);
      
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0);
      
      return generate(
        "financial",
        format,
        {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        }
      );
    },
    [generate]
  );

  const generateFleet = useCallback(
    (format: ExportFormat = "pdf") => {
      return generate("fleet", format);
    },
    [generate]
  );

  return {
    generating,
    lastReport,
    error,
    generate,
    generateOperational,
    generateFinancial,
    generateFleet,
  };
}


export function useReportSchedules() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await reportService.getSchedules();
      setSchedules(result);
    } catch (err) {
      console.error("[useReportSchedules] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Próximas ejecuciones
  const upcomingRuns = useMemo(() => {
    return schedules
      .filter(s => s.isActive && s.nextRunAt)
      .sort((a, b) => 
        new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime()
      )
      .slice(0, 5);
  }, [schedules]);

  const stats = useMemo(() => ({
    total: schedules.length,
    active: schedules.filter(s => s.isActive).length,
    inactive: schedules.filter(s => !s.isActive).length,
    dailyCount: schedules.filter(s => s.frequency === "daily" && s.isActive).length,
    weeklyCount: schedules.filter(s => s.frequency === "weekly" && s.isActive).length,
    monthlyCount: schedules.filter(s => s.frequency === "monthly" && s.isActive).length,
  }), [schedules]);

  return {
    schedules,
    loading,
    upcomingRuns,
    stats,
    refresh: fetch,
  };
}

export default useReports;
