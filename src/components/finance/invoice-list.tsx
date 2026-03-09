"use client";

import { useState } from "react";
import {
  FileText,
  MoreHorizontal,
  Send,
  Eye,
  Download,
  XCircle,
  Plus,
  Search,
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
import type { Invoice, InvoiceStatus } from "@/types/finance";

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  onCreateInvoice?: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onSendInvoice?: (id: string) => void;
  onCancelInvoice?: (id: string) => void;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  pending: { label: "Pendiente", variant: "outline" },
  sent: { label: "Enviada", variant: "default" },
  paid: { label: "Pagada", variant: "default" },
  partial: { label: "Pago Parcial", variant: "outline" },
  overdue: { label: "Vencida", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "secondary" },
  disputed: { label: "En Disputa", variant: "destructive" },
};

export function InvoiceList({ invoices, loading, onCreateInvoice, onViewInvoice, onSendInvoice, onCancelInvoice }: InvoiceListProps) {
  const [search, setSearch] = useState("");

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase())
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
              <FileText className="h-5 w-5" />
              Facturas
            </CardTitle>
            <CardDescription>
              {filteredInvoices.length} facturas encontradas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar factura..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Button onClick={onCreateInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay facturas</p>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primera factura para comenzar
            </p>
            <Button onClick={onCreateInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Factura
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[700px] lg:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>N° Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(invoice.issueDate).toLocaleDateString("es-PE")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(invoice.dueDate).toLocaleDateString("es-PE")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    S/ {invoice.total.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {invoice.amountDue > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        S/ {invoice.amountDue.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">
                        Pagado
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[invoice.status].variant}>
                      {statusConfig[invoice.status].label}
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
                        <DropdownMenuItem onClick={() => onViewInvoice?.(invoice)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const blob = new Blob([`Factura: ${invoice.invoiceNumber}\nCliente: ${invoice.customerName}\nTotal: S/ ${invoice.total}`], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${invoice.invoiceNumber}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </DropdownMenuItem>
                        {invoice.status === "draft" && (
                          <DropdownMenuItem onClick={() => onSendInvoice?.(invoice.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                          <DropdownMenuItem className="text-red-600" onClick={() => onCancelInvoice?.(invoice.id)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Anular
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
