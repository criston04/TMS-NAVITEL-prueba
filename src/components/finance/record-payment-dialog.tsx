"use client";

import { useState } from "react";
import { CreditCard, Search } from "lucide-react";
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
import type { PaymentMethod } from "@/types/finance";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedInvoiceId?: string;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Transferencia Bancaria" },
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta de Crédito" },
  { value: "debit_card", label: "Tarjeta de Débito" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" },
];

export function RecordPaymentDialog({
  open,
  onOpenChange,
  preselectedInvoiceId,
}: RecordPaymentDialogProps) {
  const { invoices, recordPayment } = useFinance();
  const [loading, setLoading] = useState(false);

  // Form state
  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId || "");
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Filtrar facturas pendientes
  const pendingInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "cancelled" && inv.amountDue > 0
  );

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);

  const handleSubmit = async () => {
    if (!invoiceId || amount <= 0) return;

    setLoading(true);
    try {
      await recordPayment({
        invoiceId,
        amount,
        method,
        paymentDate: date,
        referenceNumber: reference,
        notes,
      });
      onOpenChange(false);
      // Reset
      setInvoiceId("");
      setAmount(0);
      setMethod("bank_transfer");
      setReference("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    } catch (error) {
      console.error("Error recording payment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Registra un pago recibido para una factura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selección de factura */}
          <div className="space-y-2">
            <Label>Factura *</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar factura" />
              </SelectTrigger>
              <SelectContent>
                {pendingInvoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    <div className="flex justify-between items-center gap-4">
                      <span>{inv.invoiceNumber}</span>
                      <span className="text-muted-foreground">
                        Pendiente: S/ {inv.amountDue.toLocaleString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info de factura seleccionada */}
          {selectedInvoice && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{selectedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Factura:</span>
                <span>S/ {selectedInvoice.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ya Pagado:</span>
                <span className="text-green-600">
                  S/ {selectedInvoice.amountPaid.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Saldo Pendiente:</span>
                <span className="text-amber-600">
                  S/ {selectedInvoice.amountDue.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto a Pagar *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                S/
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                max={selectedInvoice?.amountDue}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
            {selectedInvoice && amount > selectedInvoice.amountDue && (
              <p className="text-sm text-red-500">
                El monto excede el saldo pendiente
              </p>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label>Método de Pago *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha y Referencia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Pago *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>N° Referencia / Operación</Label>
              <Input
                placeholder="Ej: OP-123456"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
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
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !invoiceId ||
              amount <= 0 ||
              (selectedInvoice && amount > selectedInvoice.amountDue)
            }
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {loading ? "Registrando..." : "Registrar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
