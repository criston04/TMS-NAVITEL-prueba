"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Box, Thermometer, AlertTriangle } from "lucide-react";
import type { Product } from "@/types/models/product";

// ---- Schema ----
const productFormSchema = z.object({
  sku: z.string().min(3, "SKU debe tener al menos 3 caracteres").max(30),
  name: z.string().min(2, "Nombre requerido").max(120),
  description: z.string().optional(),
  category: z.enum(["general", "perecible", "peligroso", "fragil", "refrigerado", "congelado", "granel"]),
  unitOfMeasure: z.enum(["kg", "ton", "lt", "m3", "unit", "pallet", "container"]),
  barcode: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  // Dimensiones
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  volume: z.coerce.number().min(0).optional(),
  // Condiciones de transporte
  requiresRefrigeration: z.boolean().default(false),
  minTemperature: z.coerce.number().optional(),
  maxTemperature: z.coerce.number().optional(),
  requiresSpecialHandling: z.boolean().default(false),
  handlingInstructions: z.string().optional(),
  stackable: z.boolean().default(true),
  maxStackHeight: z.coerce.number().min(0).optional(),
  // Otros
  customerId: z.string().optional(),
  notes: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// ---- Constantes ----
const CATEGORIES = [
  { value: "general", label: "General", icon: "📦" },
  { value: "perecible", label: "Perecible", icon: "🍎" },
  { value: "peligroso", label: "Peligroso", icon: "⚠️" },
  { value: "fragil", label: "Frágil", icon: "🔲" },
  { value: "refrigerado", label: "Refrigerado", icon: "❄️" },
  { value: "congelado", label: "Congelado", icon: "🧊" },
  { value: "granel", label: "Granel", icon: "🏗️" },
] as const;

const UNITS = [
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "ton", label: "Tonelada (ton)" },
  { value: "lt", label: "Litro (lt)" },
  { value: "m3", label: "Metro cúbico (m³)" },
  { value: "unit", label: "Unidad" },
  { value: "pallet", label: "Pallet" },
  { value: "container", label: "Contenedor" },
] as const;

// ---- Props ----
interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  isLoading?: boolean;
}

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  onSubmit,
  isLoading = false,
}: ProductFormModalProps) {
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      category: "general",
      unitOfMeasure: "kg",
      barcode: "",
      unitPrice: undefined,
      length: undefined,
      width: undefined,
      height: undefined,
      weight: undefined,
      volume: undefined,
      requiresRefrigeration: false,
      minTemperature: undefined,
      maxTemperature: undefined,
      requiresSpecialHandling: false,
      handlingInstructions: "",
      stackable: true,
      maxStackHeight: undefined,
      customerId: "",
      notes: "",
    },
  });

  const watchRefrigeration = form.watch("requiresRefrigeration");
  const watchSpecialHandling = form.watch("requiresSpecialHandling");

  // Cargar datos en modo edición
  React.useEffect(() => {
    if (product && open) {
      form.reset({
        sku: product.sku,
        name: product.name,
        description: product.description || "",
        category: product.category,
        unitOfMeasure: product.unitOfMeasure,
        barcode: product.barcode || "",
        unitPrice: product.unitPrice,
        length: product.dimensions?.length,
        width: product.dimensions?.width,
        height: product.dimensions?.height,
        weight: product.dimensions?.weight,
        volume: product.dimensions?.volume,
        requiresRefrigeration: product.transportConditions.requiresRefrigeration,
        minTemperature: product.transportConditions.minTemperature,
        maxTemperature: product.transportConditions.maxTemperature,
        requiresSpecialHandling: product.transportConditions.requiresSpecialHandling,
        handlingInstructions: product.transportConditions.handlingInstructions || "",
        stackable: product.transportConditions.stackable,
        maxStackHeight: product.transportConditions.maxStackHeight,
        customerId: product.customerId || "",
        notes: product.notes || "",
      });
    }
  }, [product, open, form]);

  // Reset al cerrar
  React.useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const handleSubmit = async (data: ProductFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar producto:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Box className="h-5 w-5" />
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique la información del producto"
              : "Complete la información para registrar un nuevo producto en el catálogo"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] px-6 py-4">
              {/* Sección 1: Información básica */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Información del Producto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="sku" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU *</FormLabel>
                        <FormControl><Input placeholder="SKU-GEN-001" {...field} /></FormControl>
                        <FormDescription className="text-xs">Código único del producto</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="barcode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras</FormLabel>
                        <FormControl><Input placeholder="7501234567890" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl><Input placeholder="Nombre del producto" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl><Textarea placeholder="Descripción del producto..." className="min-h-16" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value}>
                                <span className="flex items-center gap-2">{c.icon} {c.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="unitOfMeasure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidad de Medida *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {UNITS.map(u => (
                              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="unitPrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Unitario (S/)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* Sección 2: Dimensiones */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dimensiones y Peso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <FormField control={form.control} name="length" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Largo (cm)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="width" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Ancho (cm)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="height" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Alto (cm)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="weight" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Peso (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="volume" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Volumen (m³)</FormLabel>
                        <FormControl><Input type="number" step="0.001" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* Sección 3: Condiciones de Transporte */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Condiciones de Transporte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={form.control} name="requiresRefrigeration" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-sm">Requiere Refrigeración</FormLabel>
                          <FormDescription className="text-xs">Cadena de frío</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="stackable" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-sm">Apilable</FormLabel>
                          <FormDescription className="text-xs">Permite apilar</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>

                  {watchRefrigeration && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <FormField control={form.control} name="minTemperature" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Temp. Mínima (°C)</FormLabel>
                          <FormControl><Input type="number" placeholder="-18" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="maxTemperature" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Temp. Máxima (°C)</FormLabel>
                          <FormControl><Input type="number" placeholder="8" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  <Separator />

                  <FormField control={form.control} name="requiresSpecialHandling" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          Manejo Especial
                        </FormLabel>
                        <FormDescription className="text-xs">Requiere precauciones adicionales</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />

                  {watchSpecialHandling && (
                    <FormField control={form.control} name="handlingInstructions" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Instrucciones de Manejo</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Instrucciones especiales..." className="min-h-16" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="maxStackHeight" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Altura Máxima de Apilamiento (niveles)</FormLabel>
                      <FormControl><Input type="number" placeholder="3" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Sección 4: Notas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Información Adicional</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Notas / Observaciones</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notas adicionales sobre el producto..." className="min-h-16" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Registrar Producto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ProductFormModal;
