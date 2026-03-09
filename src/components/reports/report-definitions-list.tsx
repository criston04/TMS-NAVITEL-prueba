"use client";

import { useState } from "react";
import {
  FileText,
  Play,
  Calendar,
  MoreHorizontal,
  Search,
  Plus,
  Edit,
  Copy,
  Trash2,
  BarChart3,
  PieChart,
  Table as TableIcon,
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
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportDefinition, ReportType } from "@/types/report";

interface ReportDefinitionsListProps {
  definitions: ReportDefinition[];
  loading: boolean;
  onGenerate?: (id: string) => void;
  onSchedule?: (id: string) => void;
  onCreate?: () => void;
}

const typeConfig: Record<ReportType, { label: string; icon: typeof BarChart3; color: string }> = {
  operational: { label: "Operacional", icon: BarChart3, color: "text-blue-500" },
  financial: { label: "Financiero", icon: PieChart, color: "text-green-500" },
  fleet: { label: "Flota", icon: TableIcon, color: "text-amber-500" },
  driver: { label: "Conductores", icon: TableIcon, color: "text-violet-500" },
  customer: { label: "Clientes", icon: TableIcon, color: "text-pink-500" },
  order: { label: "Órdenes", icon: TableIcon, color: "text-cyan-500" },
  route: { label: "Rutas", icon: TableIcon, color: "text-orange-500" },
  maintenance: { label: "Mantenimiento", icon: TableIcon, color: "text-red-500" },
  fuel: { label: "Combustible", icon: TableIcon, color: "text-yellow-500" },
  incident: { label: "Incidentes", icon: TableIcon, color: "text-rose-500" },
  compliance: { label: "Cumplimiento", icon: TableIcon, color: "text-emerald-500" },
  kpi: { label: "KPIs", icon: BarChart3, color: "text-indigo-500" },
  custom: { label: "Personalizado", icon: FileText, color: "text-gray-500" },
};

export function ReportDefinitionsList({
  definitions,
  loading,
  onGenerate,
  onSchedule,
  onCreate,
}: ReportDefinitionsListProps) {
  const [search, setSearch] = useState("");

  const filtered = definitions.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  );

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
              Definiciones de Reportes
            </CardTitle>
            <CardDescription>
              {filtered.length} reportes disponibles
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar reporte..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay definiciones</p>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primer reporte personalizado
            </p>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Reporte
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[550px] lg:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                <TableHead className="text-center hidden md:table-cell">Usos</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((def) => {
                const config = typeConfig[def.type];
                const Icon = config.icon;
                return (
                  <TableRow key={def.id}>
                    <TableCell className="hidden md:table-cell font-mono text-sm">{def.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{def.name}</p>
                        {def.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {def.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{def.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {def.usageCount || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onGenerate?.(def.id)}
                          title="Generar"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onSchedule?.(def.id)}
                          title="Programar"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
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
