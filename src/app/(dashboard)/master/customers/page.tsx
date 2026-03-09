"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Plus, 
  Download,
  Upload,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { 
  Customer, 
  CreateCustomerDTO, 
  UpdateCustomerDTO 
} from "@/types/models";
import { useCustomers } from "@/hooks/useCustomers";
import {
  CustomerFormModal,
  CustomerDetailDrawer,
  CustomerDeleteDialog,
  CustomerBulkDeleteDialog,
  CustomerImportModal,
  CustomerFilters,
  CustomerTable,
  CustomerStats,
  CustomerPagination,
  CustomerCategorySettingsDialog,
} from "@/components/customers";

/**
 * Página principal de Clientes
 */
export default function CustomersPage() {
  const {
    customers,
    stats,
    isLoading,
    isLoadingStats,
    page,
    pageSize,
    totalPages,
    totalItems,
    filters,
    selectedIds,
    cities,
    setPage,
    setPageSize,
    setFilters,
    clearFilters,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    toggleCustomerStatus,
    toggleSelection,
    selectAll,
    clearSelection,
    exportToCSV,
    refresh,
    findByDocument,
  } = useCustomers({ autoLoad: true, initialPageSize: 10 });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setSelectedCustomer(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormModalOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleOpenView = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailDrawerOpen(true);
  }, []);

  const handleOpenDelete = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleFormSubmit = useCallback(async (data: CreateCustomerDTO | UpdateCustomerDTO) => {
    setIsSubmitting(true);
    try {
      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, data as UpdateCustomerDTO);
      } else {
        await createCustomer(data as CreateCustomerDTO);
      }
      setIsFormModalOpen(false);
      setSelectedCustomer(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCustomer, updateCustomer, createCustomer]);

  const handleDelete = useCallback(async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      await deleteCustomer(selectedCustomer.id);
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCustomer, deleteCustomer]);

  const handleToggleStatus = useCallback(async (customer: Customer) => {
    await toggleCustomerStatus(customer.id);
  }, [toggleCustomerStatus]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleteDialogOpen(true);
  }, [selectedIds]);

  const handleConfirmBulkDelete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Eliminar uno por uno hasta implementar bulk delete
      for (const id of Array.from(selectedIds)) {
        await deleteCustomer(id);
      }
      setIsBulkDeleteDialogOpen(false);
      clearSelection();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, deleteCustomer, clearSelection]);

  return (
    <PageWrapper title="Clientes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Gestión de Clientes
            </h1>
            <p className="text-muted-foreground">
              Administra la información de tus clientes
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <CustomerCategorySettingsDialog />
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Cliente</span>
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <CustomerStats stats={stats} isLoading={isLoadingStats} />

        {/* Filtros */}
        <CustomerFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          cities={cities}
        />

        {/* Acciones masivas */}
        {selectedIds.size > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-sm">
                  <strong>{selectedIds.size}</strong> cliente(s) seleccionado(s)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Deseleccionar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Seleccionados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla */}
        <CustomerTable
          customers={customers}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onView={handleOpenView}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          onToggleStatus={handleToggleStatus}
        />

        {/* Paginación */}
        {totalPages > 0 && (
          <CustomerPagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* Modal de Formulario */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSubmit={handleFormSubmit}
        customer={selectedCustomer}
        isLoading={isSubmitting}
        onFindByDocument={findByDocument}
      />

      {/* Drawer de Detalle */}
      <CustomerDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleOpenDelete}
      />

      {/* Dialog de Eliminación */}
      <CustomerDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedCustomer(null);
        }}
        onConfirm={handleDelete}
        customer={selectedCustomer}
        isLoading={isSubmitting}
      />

      {/* Dialog de Eliminación Masiva */}
      <CustomerBulkDeleteDialog
        isOpen={isBulkDeleteDialogOpen}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        selectedCount={selectedIds.size}
        isLoading={isSubmitting}
      />

      {/* Modal de Importación */}
      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (customers) => {
          // Crear clientes uno por uno
          let successCount = 0;
          const errors: { row: number; message: string }[] = [];
          for (let i = 0; i < customers.length; i++) {
            try {
              await createCustomer(customers[i]);
              successCount++;
            } catch {
              errors.push({ row: i + 1, message: "Error al crear cliente" });
            }
          }
          return {
            success: successCount,
            failed: errors.length,
            errors,
          };
        }}
      />
    </PageWrapper>
  );
}
