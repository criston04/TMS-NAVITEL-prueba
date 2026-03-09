"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  FileText,
  Users,
  Loader2,
  Truck,
} from "lucide-react";
import type { Operator } from "@/types/models/operator";

/**
 * Esquema de validación para el formulario de operador logístico
 */
const operatorFormSchema = z.object({
  ruc: z.string().min(11, "RUC debe tener 11 dígitos").max(11, "RUC debe tener 11 dígitos"),
  businessName: z.string().min(3, "Razón social requerida"),
  tradeName: z.string().optional(),
  type: z.enum(["propio", "tercero", "asociado"]),
  email: z.string().email("Email inválido"),
  phone: z.string().min(7, "Teléfono requerido"),
  fiscalAddress: z.string().min(5, "Dirección fiscal requerida"),
  // Contacto principal
  contactName: z.string().optional(),
  contactPosition: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  // Contrato
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  // Flota
  fleetType: z.enum(["propia", "terceros", "mixta"]).optional(),
  ownVehiclesCount: z.number().min(0).optional(),
  thirdPartyVehiclesCount: z.number().min(0).optional(),
  // Notas
  notes: z.string().optional(),
});

export type OperatorFormData = z.infer<typeof operatorFormSchema>;

interface OperatorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator?: Operator | null;
  onSubmit: (data: OperatorFormData) => Promise<void>;
  isLoading?: boolean;
}

const OPERATOR_TYPES = [
  { value: "propio", label: "Propio", description: "Flota propia de la empresa" },
  { value: "tercero", label: "Tercero", description: "Operador subcontratado" },
  { value: "asociado", label: "Asociado", description: "Operador asociado estratégico" },
];

const FLEET_TYPES = [
  { value: "propia", label: "Propia" },
  { value: "terceros", label: "Terceros" },
  { value: "mixta", label: "Mixta" },
];

export function OperatorFormModal({
  open,
  onOpenChange,
  operator,
  onSubmit,
  isLoading = false,
}: OperatorFormModalProps) {
  const [activeTab, setActiveTab] = React.useState("general");

  const form = useForm<OperatorFormData>({
    resolver: zodResolver(operatorFormSchema),
    defaultValues: {
      ruc: "",
      businessName: "",
      tradeName: "",
      type: "tercero",
      email: "",
      phone: "",
      fiscalAddress: "",
      contactName: "",
      contactPosition: "",
      contactEmail: "",
      contactPhone: "",
      contractStartDate: "",
      contractEndDate: "",
      fleetType: "propia",
      ownVehiclesCount: 0,
      thirdPartyVehiclesCount: 0,
      notes: "",
    },
  });

  const isEditing = !!operator;

  // Cargar datos si es edición
  React.useEffect(() => {
    if (operator && open) {
      const primaryContact = operator.contacts?.find(c => c.isPrimary) || operator.contacts?.[0];
      form.reset({
        ruc: operator.ruc || "",
        businessName: operator.businessName || "",
        tradeName: operator.tradeName || "",
        type: operator.type || "tercero",
        email: operator.email || "",
        phone: operator.phone || "",
        fiscalAddress: operator.fiscalAddress || "",
        contactName: primaryContact?.name || "",
        contactPosition: primaryContact?.position || "",
        contactEmail: primaryContact?.email || "",
        contactPhone: primaryContact?.phone || "",
        contractStartDate: operator.contractStartDate || "",
        contractEndDate: operator.contractEndDate || "",
        fleetType: "propia",
        ownVehiclesCount: operator.vehiclesCount || 0,
        thirdPartyVehiclesCount: 0,
        notes: operator.notes || "",
      });
    }
  }, [operator, open, form]);

  // Reset cuando se cierra
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setActiveTab("general");
    }
  }, [open, form]);

  const handleSubmit = async (data: OperatorFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar operador:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? "Editar Operador Logístico" : "Nuevo Operador Logístico"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique la información del operador logístico"
              : "Complete la información para registrar un nuevo operador logístico"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                  <TabsTrigger value="general" className="flex items-center gap-2 py-3">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">General</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-2 py-3">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Contacto</span>
                  </TabsTrigger>
                  <TabsTrigger value="fleet" className="flex items-center gap-2 py-3">
                    <Truck className="h-4 w-4" />
                    <span className="hidden sm:inline">Flota</span>
                  </TabsTrigger>
                  <TabsTrigger value="contract" className="flex items-center gap-2 py-3">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Contrato</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="h-[55vh] px-6 py-4">
                {/* TAB: GENERAL */}
                <TabsContent value="general" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Datos de la Empresa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="ruc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RUC *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="20512345678"
                                  maxLength={11}
                                  {...field}
                                  onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))}
                                />
                              </FormControl>
                              <FormDescription>11 dígitos</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Operador *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {OPERATOR_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                      <div>
                                        <span>{t.label}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          - {t.description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Razón Social *</FormLabel>
                            <FormControl>
                              <Input placeholder="TRANSPORTES RAPIDOS SAC" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tradeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre Comercial</FormLabel>
                            <FormControl>
                              <Input placeholder="TransRapid" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="contacto@empresa.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono *</FormLabel>
                              <FormControl>
                                <Input placeholder="+51 1 234-5678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="fiscalAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección Fiscal *</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Av. Industrial 456, Ate, Lima" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: CONTACTO */}
                <TabsContent value="contact" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Contacto Principal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre Completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Carlos Mendoza" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactPosition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cargo</FormLabel>
                              <FormControl>
                                <Input placeholder="Gerente de Operaciones" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email del Contacto</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="cmendoza@empresa.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono del Contacto</FormLabel>
                              <FormControl>
                                <Input placeholder="+51 999-888-777" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: FLOTA */}
                <TabsContent value="fleet" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Composición de Flota</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fleetType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Flota</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {FLEET_TYPES.map(ft => (
                                  <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Indica si la flota es propia, de terceros o una combinación
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="ownVehiclesCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehículos Propios</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="thirdPartyVehiclesCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehículos de Terceros</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: CONTRATO Y NOTAS */}
                <TabsContent value="contract" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Vigencia del Contrato</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contractStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Inicio</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contractEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Fin</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Notas adicionales sobre el operador..."
                                className="min-h-25"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>

              {/* ACCIONES */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isEditing ? "Guardar Cambios" : "Crear Operador"}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default OperatorFormModal;
