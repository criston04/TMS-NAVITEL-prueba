"use client";

import { useState } from "react";
import { TrendingDown, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFinance } from "@/hooks/useFinance";
import type { CostType } from "@/types/finance";

interface RecordCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const costTypes: { value: CostType; label: string }[] = [
  { value: "fuel", label: "Combustible" },
  { value: "toll", label: "Peaje" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "insurance", label: "Seguro" },
  { value: "penalty", label: "Multa" },
  { value: "labor", label: "Mano de Obra" },
  { value: "depreciation", label: "Depreciación" },
  { value: "administrative", label: "Administrativo" },
  { value: "accessorial", label: "Servicios Adicionales" },
  { value: "other", label: "Otro" },
];

const vehicles = [
  { id: "veh-001", plate: "ABC-123" },
  { id: "veh-002", plate: "DEF-456" },
  { id: "veh-003", plate: "GHI-789" },
  { id: "veh-004", plate: "JKL-012" },
];

const orders = [
  { id: "ord-001", number: "ORD-2024-001" },
  { id: "ord-002", number: "ORD-2024-002" },
  { id: "ord-003", number: "ORD-2024-003" },
];

export function RecordCostDialog({ open, onOpenChange }: RecordCostDialogProps) {
  const { recordCost } = useFinance();
  const [loading, setLoading] = useState(false);

  // Form state
  const [type, setType] = useState<CostType>("fuel");
  const [amount, setAmount] = useState<number>(0);
  const [vehicleId, setVehicleId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (amount <= 0) return;

    setLoading(true);
    try {
      await recordCost({
        type,
        amount,
        vehicleId: vehicleId || undefined,
        orderId: orderId || undefined,
        date,
        description,
        receiptNumber: receiptNumber || undefined,
        notes: notes || undefined,
      });
      onOpenChange(false);
      // Reset
      setType("fuel");
      setAmount(0);
      setVehicleId("");
      setOrderId("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setReceiptNumber("");
      setNotes("");
    } catch (error) {
      console.error("Error recording cost:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Costo</DialogTitle>
          <DialogDescription>
            Registra un gasto operativo de la flota
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de costo */}
          <div className="space-y-2">
            <Label>Tipo de Costo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as CostType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {costTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  S/
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="pl-10"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Vehículo y Orden */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehículo (opcional)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orden (opcional)</Label>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              placeholder="Ej: Carga de combustible - Grifo Repsol"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* N° Comprobante */}
          <div className="space-y-2">
            <Label>N° Comprobante / Recibo</Label>
            <Input
              placeholder="Ej: F001-00012345"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
            />
          </div>

          {/* Adjuntar comprobante */}
          <div className="space-y-2">
            <Label>Adjuntar Comprobante (opcional)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arrastra o haz clic para subir
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, JPG o PNG (máx. 5MB)
              </p>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Observaciones adicionales"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || amount <= 0}>
            <TrendingDown className="h-4 w-4 mr-2" />
            {loading ? "Registrando..." : "Registrar Costo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
