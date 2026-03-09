"use client";

import { useState } from "react";
import { Filter, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus, InvoiceFilters as IFilters } from "@/types/finance";

const statusOptions: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "sent", label: "Enviada" },
  { value: "paid", label: "Pagada" },
  { value: "partial", label: "Pago Parcial" },
  { value: "overdue", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
];

const periodOptions = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Este trimestre" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Personalizado" },
];

interface InvoiceFiltersProps {
  onFiltersChange?: (filters: IFilters) => void;
}

export function InvoiceFilters({ onFiltersChange }: InvoiceFiltersProps) {
  const [status, setStatus] = useState<string>("");
  const [period, setPeriod] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const buildFilters = (statusVal: string, periodVal: string): IFilters => {
    const filters: IFilters = {};
    if (statusVal) filters.status = statusVal as InvoiceStatus;
    if (periodVal) {
      const now = new Date();
      const start = new Date();
      switch (periodVal) {
        case "today": start.setHours(0, 0, 0, 0); break;
        case "week": start.setDate(now.getDate() - 7); break;
        case "month": start.setMonth(now.getMonth() - 1); break;
        case "quarter": start.setMonth(now.getMonth() - 3); break;
        case "year": start.setFullYear(now.getFullYear() - 1); break;
      }
      filters.startDate = start.toISOString().split("T")[0];
      filters.endDate = now.toISOString().split("T")[0];
    }
    return filters;
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    if (value && !activeFilters.includes(`status:${value}`)) {
      setActiveFilters([...activeFilters.filter(f => !f.startsWith("status:")), `status:${value}`]);
    }
    onFiltersChange?.(buildFilters(value, period));
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value && !activeFilters.includes(`period:${value}`)) {
      setActiveFilters([...activeFilters.filter(f => !f.startsWith("period:")), `period:${value}`]);
    }
    onFiltersChange?.(buildFilters(status, value));
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
    const newStatus = filter.startsWith("status:") ? "" : status;
    const newPeriod = filter.startsWith("period:") ? "" : period;
    if (filter.startsWith("status:")) setStatus("");
    if (filter.startsWith("period:")) setPeriod("");
    onFiltersChange?.(buildFilters(newStatus, newPeriod));
  };

  const clearAll = () => {
    setActiveFilters([]);
    setStatus("");
    setPeriod("");
    onFiltersChange?.({});
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Fecha personalizada
        </Button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {activeFilters.map((filter) => {
            const [type, value] = filter.split(":");
            const label = type === "status"
              ? statusOptions.find(o => o.value === value)?.label
              : periodOptions.find(o => o.value === value)?.label;
            
            return (
              <Badge key={filter} variant="secondary" className="gap-1">
                {label}
                <button onClick={() => removeFilter(filter)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  );
}
