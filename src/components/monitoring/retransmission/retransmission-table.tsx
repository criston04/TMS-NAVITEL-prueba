"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { RetransmissionRow } from "./retransmission-row";
import { RetransmissionSkeleton } from "../common/skeletons/retransmission-skeleton";
import type { RetransmissionRecord } from "@/types/monitoring";

type SortField = "vehiclePlate" | "companyName" | "gpsCompanyName" | "lastConnection" | "movementStatus" | "retransmissionStatus" | "disconnectedDuration";
type SortOrder = "asc" | "desc";

interface RetransmissionTableProps {
  
  records: RetransmissionRecord[];
  
  isLoading?: boolean;
  /** Callback al hacer clic en comentario */
  onCommentClick: (record: RetransmissionRecord) => void;
  /** Clase adicional */
  className?: string;
}

interface ColumnConfig {
  key: SortField;
  label: string;
  sortable: boolean;
}

const columns: ColumnConfig[] = [
  { key: "vehiclePlate", label: "Vehículo", sortable: true },
  { key: "companyName", label: "Empresa", sortable: true },
  { key: "gpsCompanyName", label: "GPS Provider", sortable: true },
  { key: "lastConnection", label: "Última Conexión", sortable: true },
  { key: "movementStatus", label: "Movimiento", sortable: true },
  { key: "retransmissionStatus", label: "Estado", sortable: true },
  { key: "disconnectedDuration", label: "Duración", sortable: true },
];

/**
 * Tabla de registros de retransmisión con sorting
 */
export function RetransmissionTable({
  records,
  isLoading = false,
  onCommentClick,
  className,
}: RetransmissionTableProps) {
  const [sortField, setSortField] = useState<SortField>("lastConnection");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Ordenar registros
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "vehiclePlate":
        case "companyName":
        case "gpsCompanyName":
        case "movementStatus":
        case "retransmissionStatus":
          comparison = a[sortField].localeCompare(b[sortField]);
          break;
        case "lastConnection":
          comparison = new Date(a.lastConnection).getTime() - new Date(b.lastConnection).getTime();
          break;
        case "disconnectedDuration":
          comparison = a.disconnectedDuration - b.disconnectedDuration;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [records, sortField, sortOrder]);

  /**
   * Maneja el clic en encabezado de columna para ordenar
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  /**
   * Renderiza el icono de ordenamiento
   */
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="ml-1 h-4 w-4" />
      : <ArrowDown className="ml-1 h-4 w-4" />;
  };

  if (isLoading) {
    return <RetransmissionSkeleton rows={10} className={className} />;
  }

  if (records.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <p className="text-lg font-medium text-muted-foreground">
          No se encontraron registros
        </p>
        <p className="text-sm text-muted-foreground">
          Intenta ajustar los filtros de búsqueda
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                  column.sortable && "cursor-pointer select-none hover:text-foreground"
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <span className="flex items-center">
                  {column.label}
                  {column.sortable && renderSortIcon(column.key)}
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Dirección
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Comentarios
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRecords.map((record) => (
            <RetransmissionRow
              key={record.id}
              record={record}
              onCommentClick={onCommentClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
