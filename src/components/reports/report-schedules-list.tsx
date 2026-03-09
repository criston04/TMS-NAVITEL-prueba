"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  MoreHorizontal,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  CalendarRange,
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
import { Switch } from "@/components/ui/switch";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReportSchedule, ScheduleFrequency } from "@/types/report";

interface ReportSchedulesListProps {
  schedules: ReportSchedule[];
  loading: boolean;
  onToggle?: (id: string, enabled: boolean) => void;
  onRunNow?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreate?: () => void;
}

const frequencyConfig: Record<
  ScheduleFrequency,
  { label: string; icon: typeof Calendar; color: string }
> = {
  once: { label: "Una vez", icon: CalendarDays, color: "bg-gray-100 text-gray-800" },
  daily: { label: "Diario", icon: CalendarDays, color: "bg-blue-100 text-blue-800" },
  weekly: { label: "Semanal", icon: CalendarRange, color: "bg-green-100 text-green-800" },
  biweekly: { label: "Quincenal", icon: CalendarRange, color: "bg-emerald-100 text-emerald-800" },
  monthly: { label: "Mensual", icon: Calendar, color: "bg-purple-100 text-purple-800" },
  quarterly: { label: "Trimestral", icon: Calendar, color: "bg-amber-100 text-amber-800" },
  yearly: { label: "Anual", icon: Calendar, color: "bg-pink-100 text-pink-800" },
};

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatNextRun(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  
  if (diff < 0) return "Pendiente";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `En ${days} día${days > 1 ? "s" : ""}`;
  if (hours > 0) return `En ${hours} hora${hours > 1 ? "s" : ""}`;
  
  const minutes = Math.floor(diff / (1000 * 60));
  return `En ${minutes} minuto${minutes > 1 ? "s" : ""}`;
}

export function ReportSchedulesList({
  schedules,
  loading,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
  onCreate,
}: ReportSchedulesListProps) {
  const [search, setSearch] = useState("");

  const filtered = schedules.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
              <Calendar className="h-5 w-5" />
              Reportes Programados
            </CardTitle>
            <CardDescription>
              {schedules.filter((s) => s.isActive).length} activos de{" "}
              {schedules.length} programaciones
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Programar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay reportes programados</p>
            <p className="text-sm text-muted-foreground mb-4">
              Programa la generación automática de reportes
            </p>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Programar Reporte
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Activo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Próxima Ejecución</TableHead>
                <TableHead>Última Ejecución</TableHead>
                <TableHead>Destinatarios</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((schedule) => {
                const freq = frequencyConfig[schedule.frequency];
                const FreqIcon = freq.icon;
                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={(checked) =>
                          onToggle?.(schedule.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.definitionId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={freq.color}>
                        <FreqIcon className="h-3 w-3 mr-1" />
                        {freq.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {schedule.isActive && schedule.nextRunAt ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1 text-green-600">
                                <Clock className="h-4 w-4" />
                                <span>{formatNextRun(schedule.nextRunAt)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatDate(schedule.nextRunAt)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {schedule.lastRunAt ? (
                        <div className="flex items-center gap-1 text-sm">
                          {schedule.lastStatus === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span>{formatDate(schedule.lastRunAt)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {schedule.recipients && schedule.recipients.length > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{schedule.recipients.length}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="text-sm">
                                {schedule.recipients.slice(0, 3).map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                                {schedule.recipients.length > 3 && (
                                  <li>+{schedule.recipients.length - 3} más</li>
                                )}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRunNow?.(schedule.id)}
                          title="Ejecutar ahora"
                          disabled={!schedule.isActive}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(schedule.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRunNow?.(schedule.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Ejecutar Ahora
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onToggle?.(schedule.id, !schedule.isActive)
                              }
                            >
                              {schedule.isActive ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onDelete?.(schedule.id)}
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
        )}
      </CardContent>
    </Card>
  );
}
