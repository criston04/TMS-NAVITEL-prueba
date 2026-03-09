"use client";

import { useState } from "react";
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  MoreHorizontal,
  Eye,
  Download,
  Building2,
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
import type { Payment, PaymentStatus, PaymentMethod } from "@/types/finance";

interface PaymentListProps {
  payments: Payment[];
  loading: boolean;
  onRecordPayment?: () => void;
}

const statusConfig: Record<PaymentStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending: { label: "Pendiente", icon: Clock, color: "text-amber-500" },
  processing: { label: "Procesando", icon: Clock, color: "text-blue-500" },
  completed: { label: "Completado", icon: CheckCircle, color: "text-green-500" },
  failed: { label: "Fallido", icon: XCircle, color: "text-red-500" },
  refunded: { label: "Reembolsado", icon: XCircle, color: "text-gray-500" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-gray-500" },
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  credit_card: "Tarjeta Crédito",
  debit_card: "Tarjeta Débito",
  check: "Cheque",
  credit: "Crédito",
  other: "Otro",
};

export function PaymentList({ payments, loading, onRecordPayment }: PaymentListProps) {
  const [search, setSearch] = useState("");

  const filteredPayments = payments.filter(
    (p) =>
      p.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagos
            </CardTitle>
            <CardDescription>
              {filteredPayments.length} pagos registrados
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pago..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={onRecordPayment}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay pagos registrados</p>
            <p className="text-sm text-muted-foreground mb-4">
              Registra un pago cuando recibas un abono
            </p>
            <Button onClick={onRecordPayment}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const StatusIcon = statusConfig[payment.status].icon;
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.referenceNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {payment.invoiceNumber || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(payment.paymentDate).toLocaleDateString("es-PE")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {methodLabels[payment.method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      S/ {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <StatusIcon className={`h-4 w-4 ${statusConfig[payment.status].color}`} />
                        <span className="text-sm">
                          {statusConfig[payment.status].label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar comprobante
                          </DropdownMenuItem>
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
  );
}
