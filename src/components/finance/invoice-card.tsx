"use client";

import { FileText, Calendar, Building2, MoreVertical } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Invoice, InvoiceStatus } from "@/types/finance";

interface InvoiceCardProps {
  invoice: Invoice;
  onClick?: () => void;
}

const statusConfig: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Pagada", color: "bg-green-100 text-green-700" },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700" },
  overdue: { label: "Vencida", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Anulada", color: "bg-gray-100 text-gray-500" },
  disputed: { label: "En Disputa", color: "bg-purple-100 text-purple-700" },
};

export function InvoiceCard({ invoice, onClick }: InvoiceCardProps) {
  const paidPercentage = invoice.total > 0 
    ? (invoice.amountPaid / invoice.total) * 100 
    : 0;

  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== "paid";

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold">{invoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">
                {{
                  service: "Servicio",
                  freight: "Flete",
                  accessorial: "Servicios Adicionales",
                  fuel: "Combustible",
                  credit: "Nota de Crédito",
                  debit: "Nota de Débito",
                }[invoice.type] || invoice.type}
              </p>
            </div>
          </div>
          <Badge className={statusConfig[invoice.status].color}>
            {statusConfig[invoice.status].label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Cliente */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{invoice.customerName}</span>
        </div>

        {/* Fechas */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(invoice.issueDate).toLocaleDateString("es-PE")}</span>
          </div>
          <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
            <span>Vence:</span>
            <span>{new Date(invoice.dueDate).toLocaleDateString("es-PE")}</span>
          </div>
        </div>

        {/* Montos */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">S/ {invoice.total.toLocaleString()}</span>
          </div>
          {invoice.amountPaid > 0 && invoice.amountDue > 0 && (
            <>
              <Progress value={paidPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pagado: S/ {invoice.amountPaid.toLocaleString()}</span>
                <span>Pendiente: S/ {invoice.amountDue.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="ghost" size="sm" className="ml-auto" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
