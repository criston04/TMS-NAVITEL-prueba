"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Plus,
  Check,
  X,
  Play,
  Clock,
  Car,

} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VehicleTransferRequest, Tenant, CreateVehicleTransferDTO } from "@/types/platform";
import { vehicleTransferService, tenantService } from "@/services/platform.service";

const statusConfig: Record<
  VehicleTransferRequest["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Check }
> = {
  pending: { label: "Pendiente", variant: "secondary", icon: Clock },
  approved: { label: "Aprobada", variant: "default", icon: Check },
  completed: { label: "Completada", variant: "default", icon: Check },
  rejected: { label: "Rechazada", variant: "destructive", icon: X },
  cancelled: { label: "Cancelada", variant: "outline", icon: X },
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<VehicleTransferRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    vehicleIds: "",
    fromTenantId: "",
    toTenantId: "",
    reason: "",
    transferGpsHistory: true,
    transferMaintenanceHistory: true,
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [transferRes, tenantRes] = await Promise.all([
        vehicleTransferService.getAll({ pageSize: 100 }),
        tenantService.getAll({ pageSize: 100 }),
      ]);
      setTransfers(transferRes.items);
      setTenants(tenantRes.items);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const ids = form.vehicleIds.split(",").map((id) => id.trim()).filter(Boolean);
      const dto: CreateVehicleTransferDTO = {
        vehicleIds: ids,
        fromTenantId: form.fromTenantId,
        toTenantId: form.toTenantId,
        reason: form.reason,
        transferGpsHistory: form.transferGpsHistory,
        transferMaintenanceHistory: form.transferMaintenanceHistory,
        notes: form.notes || undefined,
      };
      await vehicleTransferService.create(dto);
      setCreateOpen(false);
      setForm({
        vehicleIds: "", fromTenantId: "", toTenantId: "", reason: "",
        transferGpsHistory: true, transferMaintenanceHistory: true, notes: "",
      });
      loadData();
    } catch (err) {
      console.error("Error creating transfer:", err);
    }
  }

  async function handleApprove(id: string) {
    try {
      await vehicleTransferService.approve(id);
      loadData();
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function handleExecute(id: string) {
    if (!confirm("¿Ejecutar la transferencia? Los vehículos se moverán al tenant destino.")) return;
    try {
      await vehicleTransferService.execute(id);
      loadData();
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Motivo del rechazo:");
    if (!reason) return;
    try {
      await vehicleTransferService.reject(id, reason);
      loadData();
    } catch (err) {
      console.error("Error:", err);
    }
  }

  const activeTenants = tenants.filter((t) => t.status === "active" || t.status === "trial");

  return (
    <PageWrapper
      title="Transferencias de Vehículos"
      description="Gestione transferencias de unidades entre cuentas de clientes"
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Transferencia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Transferencia</DialogTitle>
              <DialogDescription>
                Transferir vehículos de una cuenta a otra. Solo el Owner puede ejecutar transferencias.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tenant Origen</Label>
                <Select value={form.fromTenantId} onValueChange={(v) => setForm({ ...form, fromTenantId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTenants.map((t) => (
                      <SelectItem key={t.id} value={t.id} disabled={t.id === form.toTenantId}>
                        {t.name} ({t.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tenant Destino</Label>
                <Select value={form.toTenantId} onValueChange={(v) => setForm({ ...form, toTenantId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTenants.map((t) => (
                      <SelectItem key={t.id} value={t.id} disabled={t.id === form.fromTenantId}>
                        {t.name} ({t.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>IDs de Vehículos (separados por coma)</Label>
                <Input
                  value={form.vehicleIds}
                  onChange={(e) => setForm({ ...form, vehicleIds: e.target.value })}
                  placeholder="VEH-001, VEH-002, VEH-003"
                />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reasignación de flota..."
                />
              </div>
              <div className="flex gap-4">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.transferGpsHistory}
                    onChange={(e) => setForm({ ...form, transferGpsHistory: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  Transferir historial GPS
                </Label>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.transferMaintenanceHistory}
                    onChange={(e) => setForm({ ...form, transferMaintenanceHistory: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  Transferir historial de mantenimiento
                </Label>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={!form.fromTenantId || !form.toTenantId || !form.vehicleIds || !form.reason}
              >
                Crear Solicitud
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Solicitudes de Transferencia ({transfers.length})
          </CardTitle>
          <CardDescription>
            Historial de transferencias de vehículos entre cuentas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Cargando transferencias...
            </div>
          ) : transfers.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
              <ArrowRightLeft className="h-8 w-8 mb-2 opacity-50" />
              <p>No hay transferencias registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origen → Destino</TableHead>
                    <TableHead>Vehículos</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Opciones</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-35">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => {
                    const st = statusConfig[t.status];
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{t.fromTenantName}</p>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <ArrowRightLeft className="h-3 w-3" />
                              {t.toTenantName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{t.vehicleIds.length} unid.</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-50 truncate">{t.reason}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {t.transferGpsHistory && <Badge variant="outline" className="text-xs">GPS</Badge>}
                            {t.transferMaintenanceHistory && <Badge variant="outline" className="text-xs">Mant.</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.requestedAt).toLocaleDateString("es")}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {t.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600"
                                  title="Aprobar"
                                  onClick={() => handleApprove(t.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  title="Rechazar"
                                  onClick={() => handleReject(t.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {t.status === "approved" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-blue-600"
                                onClick={() => handleExecute(t.id)}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Ejecutar
                              </Button>
                            )}
                            {(t.status === "completed" || t.status === "rejected") && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
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
    </PageWrapper>
  );
}
