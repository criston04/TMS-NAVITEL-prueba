"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  GripVertical,
  Check,
  X,
  Tags,
  Info,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCustomerCategories, AVAILABLE_COLORS } from "@/contexts/customer-categories-context";
import type { CustomerCategoryConfig } from "@/config/customer-categories.config";

/**
 * Botón + Dialog de administración de categorías de cliente.
 * Se integra dentro del módulo de clientes como acción "Configurar".
 */
export function CustomerCategorySettingsDialog() {
  const {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    resetToDefaults,
  } = useCustomerCategories();

  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form state for add/edit
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("slate");

  const resetForm = () => {
    setFormLabel("");
    setFormDescription("");
    setFormColor("slate");
  };

  const handleStartAdd = () => {
    resetForm();
    setEditingValue(null);
    setIsAdding(true);
  };

  const handleStartEdit = (cat: CustomerCategoryConfig) => {
    setFormLabel(cat.label);
    setFormDescription(cat.description || "");
    const colorMatch = cat.color.match(/bg-(\w+)-500/);
    setFormColor(colorMatch?.[1] || "slate");
    setEditingValue(cat.value);
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingValue(null);
    setIsAdding(false);
    resetForm();
  };

  const handleSaveAdd = useCallback(() => {
    if (!formLabel.trim()) return;
    const slug = formLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    if (categories.some((c) => c.value === slug)) return;

    const colorDef = AVAILABLE_COLORS.find((c) => c.value === formColor) || AVAILABLE_COLORS[0];
    const newCat: CustomerCategoryConfig = {
      value: slug,
      label: formLabel.trim(),
      color: colorDef.dot,
      bgColor: colorDef.bg,
      badgeClass: colorDef.badge,
      description: formDescription.trim() || undefined,
    };
    addCategory(newCat);
    setIsAdding(false);
    resetForm();
  }, [formLabel, formDescription, formColor, categories, addCategory]);

  const handleSaveEdit = useCallback(() => {
    if (!editingValue || !formLabel.trim()) return;
    const colorDef = AVAILABLE_COLORS.find((c) => c.value === formColor) || AVAILABLE_COLORS[0];
    updateCategory(editingValue, {
      label: formLabel.trim(),
      color: colorDef.dot,
      bgColor: colorDef.bg,
      badgeClass: colorDef.badge,
      description: formDescription.trim() || undefined,
    });
    setEditingValue(null);
    resetForm();
  }, [editingValue, formLabel, formDescription, formColor, updateCategory]);

  const handleDelete = useCallback(() => {
    if (deleteTarget) {
      removeCategory(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, removeCategory]);

  const handleReset = useCallback(() => {
    resetToDefaults();
    setShowResetConfirm(false);
  }, [resetToDefaults]);

  const renderColorPicker = () => (
    <div className="flex flex-wrap gap-1.5">
      {AVAILABLE_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => setFormColor(c.value)}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center",
            formColor === c.value
              ? "border-foreground scale-110 shadow-sm"
              : "border-transparent hover:border-muted-foreground/40"
          )}
          title={c.name}
        >
          <div className={cn("h-4 w-4 rounded-full", c.dot)} />
        </button>
      ))}
    </div>
  );

  const renderForm = (onSave: () => void) => (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Nombre de categoría *
          </label>
          <Input
            placeholder="Ej: Distribuidor, Retail, OEM..."
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Descripción (opcional)
          </label>
          <Input
            placeholder="Descripción breve de la categoría"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Color
        </label>
        {renderColorPicker()}
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!formLabel.trim()}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {editingValue ? "Guardar" : "Agregar"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="shrink-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <Tags className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Categorías de Clientes</DialogTitle>
                <DialogDescription>
                  Personaliza las clasificaciones comerciales según tu modelo operativo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Área scrollable — usa div nativo para evitar problemas con Radix ScrollArea */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 pb-2">
            {/* Info */}
            <div className="flex items-start gap-2 rounded-lg border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-900/10 p-3">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Estas categorías se usan en formularios, filtros y reportes del módulo de Clientes.
                Cada organización puede definir sus propias clasificaciones.
              </p>
            </div>

            {/* Lista de categorías */}
            <div className="space-y-1.5">
              {categories.map((cat) => {
                const isEditing = editingValue === cat.value;
                if (isEditing) {
                  return (
                    <div key={cat.value}>
                      {renderForm(handleSaveEdit)}
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.value}
                    className="group flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    <div className={cn("h-3 w-3 rounded-full shrink-0", cat.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{cat.label}</span>
                        <Badge variant="outline" className="text-[10px] h-5 font-mono px-1.5">
                          {cat.value}
                        </Badge>
                        {cat.value === "standard" && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            Por defecto
                          </Badge>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleStartEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {cat.value !== "standard" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(cat.value)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Add form or button */}
            {isAdding ? (
              renderForm(handleSaveAdd)
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={handleStartAdd}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Categoría
              </Button>
            )}
          </div>

          {/* Footer fijo — contador y restaurar */}
          <div className="shrink-0 flex items-center justify-between pt-4 border-t mt-4">
            <p className="text-xs text-muted-foreground">
              {categories.length} categoría{categories.length !== 1 ? "s" : ""} configurada{categories.length !== 1 ? "s" : ""}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="text-muted-foreground h-7 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Restaurar por defecto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="z-[10000]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Los clientes que tengan esta categoría asignada cambiarán a &ldquo;Estándar&rdquo;.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="z-[10000]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar categorías por defecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se reemplazarán todas las categorías personalizadas con las categorías originales del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
