"use client";

import { useState } from "react";
import {
  TrendingDown,
  Search,
  Plus,
  Fuel,
  Wrench,
  Shield,
  FileText,
  Truck,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { TransportCost, CostType } from "@/types/finance";

interface CostsListProps {
  costs: TransportCost[];
  loading: boolean;
  onRecordCost?: () => void;
  onApproveCost?: (id: string) => void;
  onViewCost?: (cost: TransportCost) => void;
}

const costTypeConfig: Record<CostType, { label: string; icon: typeof Fuel; color: string }> = {
  fuel: { label: "Combustible", icon: Fuel, color: "text-amber-500" },
  toll: { label: "Peaje", icon: FileText, color: "text-blue-500" },
  maintenance: { label: "Mantenimiento", icon: Wrench, color: "text-orange-500" },
  insurance: { label: "Seguro", icon: Shield, color: "text-green-500" },
  penalty: { label: "Multa", icon: FileText, color: "text-red-500" },
  labor: { label: "Mano de Obra", icon: Wrench, color: "text-purple-500" },
  depreciation: { label: "Depreciación", icon: TrendingDown, color: "text-indigo-500" },
  administrative: { label: "Administrativo", icon: FileText, color: "text-slate-500" },
  accessorial: { label: "Servicios Adicionales", icon: Truck, color: "text-cyan-500" },
  other: { label: "Otro", icon: TrendingDown, color: "text-gray-500" },
};

export function CostsList({ costs, loading, onRecordCost, onApproveCost, onViewCost }: CostsListProps) {
  const [search, setSearch] = useState("");

  const filteredCosts = costs.filter(
    (c) =>
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.vehiclePlate?.toLowerCase().includes(search.toLowerCase())
  );

  // Calcular totales por tipo
  const totalsByType = costs.reduce((acc, cost) => {
    acc[cost.type] = (acc[cost.type] || 0) + cost.amount;
    return acc;
  }, {} as Record<CostType, number>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
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
    <div className="space-y-4">
      {/* Resumen por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(costTypeConfig).map(([type, config]) => {
          const Icon = config.icon;
          const total = totalsByType[type as CostType] || 0;
          return (
            <Card key={type} className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                  <p className="font-semibold">S/ {total.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Lista de costos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Costos de Transporte
              </CardTitle>
              <CardDescription>
                {filteredCosts.length} costos registrados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar costo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button onClick={onRecordCost}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Costo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCosts.length === 0 ? (
            <div className="text-center py-12">
              <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay costos registrados</p>
              <p className="text-sm text-muted-foreground mb-4">
                Registra los costos operativos de tu flota
              </p>
              <Button onClick={onRecordCost}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Costo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost) => {
                  const typeConfig = costTypeConfig[cost.type];
                  const TypeIcon = typeConfig.icon;
                  
                  return (
                    <TableRow key={cost.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                          <span>{typeConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {cost.description || "-"}
                      </TableCell>
                      <TableCell>
                        {cost.vehicleId ? (
                          <div className="flex items-center gap-1">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            {cost.vehicleId}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(cost.date).toLocaleDateString("es-PE")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        S/ {cost.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cost.isApproved ? "Aprobado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewCost?.(cost)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            {!cost.isApproved && (
                              <>
                                <DropdownMenuItem className="text-green-600" onClick={() => onApproveCost?.(cost.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprobar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rechazar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
