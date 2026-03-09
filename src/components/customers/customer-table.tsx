"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  User,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Power,
  Mail,
  Phone,
  MapPin,
  Copy,
} from "lucide-react";
import { Customer } from "@/types/models";
import { cn } from "@/lib/utils";
import { useCustomerCategories } from "@/contexts/customer-categories-context";

interface CustomerTableProps {
  customers: Customer[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
}

// CATEGORY_COLORS y CATEGORY_LABELS ahora vienen del hook useCustomerCategories()

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  );
}

export function CustomerTable({
  customers,
  isLoading = false,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: CustomerTableProps) {
  const { badgeMap: CATEGORY_COLORS, labelMap: CATEGORY_LABELS } = useCustomerCategories();
  const allSelected = customers.length > 0 && selectedIds.size === customers.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < customers.length;

  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-x-auto">
        <Table className="min-w-[600px] lg:min-w-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Documento</TableHead>
              <TableHead className="hidden lg:table-cell">Contacto</TableHead>
              <TableHead className="hidden md:table-cell">Ciudad</TableHead>
              <TableHead className="hidden sm:table-cell">Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="border rounded-lg p-6 sm:p-12 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">No hay clientes</h3>
        <p className="text-muted-foreground">
          No se encontraron clientes con los filtros aplicados
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="min-w-[600px] lg:min-w-0">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as HTMLButtonElement).dataset.state = someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                }}
                onCheckedChange={(checked) => {
                  if (checked) onSelectAll();
                  else onClearSelection();
                }}
              />
            </TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Documento</TableHead>
            <TableHead className="hidden lg:table-cell">Contacto</TableHead>
            <TableHead className="hidden md:table-cell">Ciudad</TableHead>
            <TableHead className="hidden sm:table-cell">Categoría</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const primaryAddress = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
            const category = customer.category || "standard";
            const isSelected = selectedIds.has(customer.id);

            return (
              <TableRow 
                key={customer.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  isSelected && "bg-muted/30"
                )}
                onClick={() => onView(customer)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(customer.id)}
                  />
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      customer.type === "empresa" 
                        ? "bg-primary/10" 
                        : "bg-blue-500/10"
                    )}>
                      {customer.type === "empresa" 
                        ? <Building2 className="h-5 w-5 text-primary" />
                        : <User className="h-5 w-5 text-blue-500" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {customer.tradeName || customer.code}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      {customer.documentType}: {customer.documentNumber}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(customer.documentNumber);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <a 
                        href={`mailto:${customer.email}`} 
                        className="hover:underline text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {customer.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {primaryAddress && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {primaryAddress.city}
                    </div>
                  )}
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <Badge className={cn("font-normal", CATEGORY_COLORS[category] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                    {CATEGORY_LABELS[category] || category}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge 
                    className={customer.status === "active" 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 border-0" 
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400 border-0"
                    }
                  >
                    {customer.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onView(customer)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(customer)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(customer)}>
                        <Power className="h-4 w-4 mr-2" />
                        {customer.status === "active" ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(customer)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
