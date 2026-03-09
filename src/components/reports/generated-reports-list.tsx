"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileType,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Trash2,
  Share2,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { GeneratedReport, ExportFormat, ReportStatus } from "@/types/report";

interface GeneratedReportsListProps {
  reports: GeneratedReport[];
  loading: boolean;
  onDownload?: (id: string) => void;
  onPreview?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRegenerate?: (id: string) => void;
  onRefresh?: () => void;
}

const formatConfig: Record<ExportFormat, { label: string; icon: typeof FileText; color: string }> = {
  pdf: { label: "PDF", icon: FileText, color: "text-red-500" },
  excel: { label: "Excel", icon: FileSpreadsheet, color: "text-green-500" },
  csv: { label: "CSV", icon: FileType, color: "text-blue-500" },
  json: { label: "JSON", icon: FileType, color: "text-amber-500" },
  html: { label: "HTML", icon: FileType, color: "text-purple-500" },
};

const statusConfig: Record<ReportStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: "Pendiente", icon: Clock, color: "bg-amber-100 text-amber-800" },
  generating: { label: "Generando", icon: Loader2, color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completado", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  failed: { label: "Error", icon: AlertCircle, color: "bg-red-100 text-red-800" },
  expired: { label: "Expirado", icon: Clock, color: "bg-gray-100 text-gray-800" },
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function GeneratedReportsList({
  reports,
  loading,
  onDownload,
  onPreview,
  onDelete,
  onRegenerate,
  onRefresh,
}: GeneratedReportsListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = reports.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reportes Generados
            </CardTitle>
            <CardDescription>
              {filtered.length} reportes disponibles para descarga
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar reporte..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-48"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="generating">Generando</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="failed">Con Error</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay reportes generados</p>
            <p className="text-sm text-muted-foreground">
              Genera un reporte desde la pestaña de Reportes Rápidos
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[650px] lg:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Formato</TableHead>
                <TableHead className="hidden md:table-cell">Período</TableHead>
                <TableHead className="hidden md:table-cell">Generado</TableHead>
                <TableHead className="hidden lg:table-cell">Tamaño</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((report) => {
                const format = formatConfig[report.format];
                const status = statusConfig[report.status];
                const StatusIcon = status.icon;
                const FormatIcon = format.icon;
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FormatIcon className={`h-4 w-4 ${format.color}`} />
                        <span className="font-medium">{report.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{format.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {report.dateRange ? (
                        <>
                          {formatDate(report.dateRange.start)} -{" "}
                          {formatDate(report.dateRange.end)}
                        </>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell">
                      {report.completedAt ? formatDate(report.completedAt) : "-"}
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">
                      {formatFileSize(report.fileSize)}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.color}>
                        <StatusIcon
                          className={`h-3 w-3 mr-1 ${
                            report.status === "generating" ? "animate-spin" : ""
                          }`}
                        />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {report.status === "completed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDownload?.(report.id)}
                              title="Descargar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onPreview?.(report.id)}
                              title="Vista previa"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {report.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRegenerate?.(report.id)}
                            title="Reintentar"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={report.status !== "completed"}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Compartir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRegenerate?.(report.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onDelete?.(report.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
