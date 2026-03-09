"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Building2, 
  User, 
  MapPin, 
  Users, 
  FileText,
  CheckCircle2,
  Briefcase,
  Mail,
  Phone,
  AlertCircle,
  CreditCard,
  Percent,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Customer, 
  CustomerType, 
  DocumentType, 
  CustomerCategory,
  PaymentTerms,
  CreateCustomerDTO,
  UpdateCustomerDTO 
} from "@/types/models";
import {
  validateDocument,
  getRecommendedDocumentType,
  getDocumentPlaceholder,
  getDocumentLength,
} from "@/lib/validators/document-validators";
import { AddressGeocoder } from "./address-geocoder";
import { useCustomerCategories } from "@/contexts/customer-categories-context";

// Schema de validación con validación personalizada de documentos
const addressSchema = z.object({
  label: z.string().optional(),
  street: z.string().min(5, "Dirección muy corta"),
  city: z.string().min(2, "Ciudad requerida"),
  state: z.string().min(2, "Departamento requerido"),
  country: z.string(),
  zipCode: z.string().optional(),
  reference: z.string().optional(),
  isDefault: z.boolean(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

const contactSchema = z.object({
  name: z.string().min(3, "Nombre muy corto"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(6, "Teléfono muy corto"),
  position: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean(),
  notifyDeliveries: z.boolean(),
  notifyIncidents: z.boolean(),
});

// Schema de facturación
const billingSchema = z.object({
  paymentTerms: z.enum(["immediate", "15_days", "30_days", "45_days", "60_days"]),
  currency: z.enum(["PEN", "USD"]),
  requiresPO: z.boolean(),
  billingEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  volumeDiscount: z.number().min(0).max(100).optional(),
  creditLimit: z.number().min(0).optional(),
  taxExempt: z.boolean().optional(),
});

const customerSchema = z.object({
  type: z.enum(["empresa", "persona"]),
  documentType: z.enum(["RUC", "DNI", "CE", "PASSPORT"]),
  documentNumber: z.string().min(1, "Documento requerido"),
  name: z.string().min(3, "Nombre muy corto"),
  tradeName: z.string().optional(),
  email: z.string().email("Email inválido"),
  phone: z.string().min(6, "Teléfono muy corto"),
  phone2: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  category: z.string().min(1, "Categoría requerida").optional(),
  notes: z.string().optional(),
  industry: z.string().optional(),
  tags: z.string().optional(), // Comma separated
  addresses: z.array(addressSchema).min(1, "Debe tener al menos una dirección"),
  contacts: z.array(contactSchema).min(1, "Debe tener al menos un contacto"),
  billing: billingSchema.optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerDTO | UpdateCustomerDTO) => Promise<void>;
  customer?: Customer | null;
  isLoading?: boolean;
  onFindByDocument?: (documentNumber: string) => Promise<Customer | null>;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "RUC", label: "RUC (Empresas)" },
  { value: "DNI", label: "DNI (Personas)" },
  { value: "CE", label: "Carné de Extranjería" },
  { value: "PASSPORT", label: "Pasaporte" },
];

const CUSTOMER_TYPES: { value: CustomerType; label: string; icon: typeof Building2 }[] = [
  { value: "empresa", label: "Empresa", icon: Building2 },
  { value: "persona", label: "Persona Natural", icon: User },
];

// CATEGORIES ahora viene del hook useCustomerCategories()

const PAYMENT_TERMS: { value: PaymentTerms; label: string; days: number }[] = [
  { value: "immediate", label: "Contado", days: 0 },
  { value: "15_days", label: "15 días", days: 15 },
  { value: "30_days", label: "30 días", days: 30 },
  { value: "45_days", label: "45 días", days: 45 },
  { value: "60_days", label: "60 días", days: 60 },
];

const CURRENCIES = [
  { value: "PEN", label: "Soles (PEN)", symbol: "S/" },
  { value: "USD", label: "Dólares (USD)", symbol: "$" },
];

export function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  customer,
  isLoading = false,
  onFindByDocument,
}: CustomerFormModalProps) {
  const [activeTab, setActiveTab] = useState("general");
  const { categories: CATEGORIES } = useCustomerCategories();
  const [documentValidation, setDocumentValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [isCheckingDocument, setIsCheckingDocument] = useState(false);
  const isEditing = !!customer;

  // Valores por defecto como constante para reutilizar en reset
  const INITIAL_VALUES: CustomerFormData = {
    type: "empresa",
    documentType: "RUC",
    documentNumber: "",
    name: "",
    tradeName: "",
    email: "",
    phone: "",
    phone2: "",
    website: "",
    category: "standard",
    notes: "",
    industry: "",
    tags: "",
    addresses: [
      {
        label: "Principal",
        street: "",
        city: "",
        state: "",
        country: "Perú",
        isDefault: true,
      },
    ],
    contacts: [
      {
        name: "",
        email: "",
        phone: "",
        position: "",
        isPrimary: true,
        notifyDeliveries: true,
        notifyIncidents: true,
      },
    ],
    billing: {
      paymentTerms: "30_days",
      currency: "PEN",
      requiresPO: false,
      billingEmail: "",
      volumeDiscount: 0,
      creditLimit: 0,
      taxExempt: false,
    },
  };

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: INITIAL_VALUES,
  });

  // Watch para validación en tiempo real del documento
  const watchDocumentType = form.watch("documentType");
  const watchDocumentNumber = form.watch("documentNumber");
  const watchCustomerType = form.watch("type");

  // Validar documento en tiempo real y buscar duplicados
  const customerProp = customer as Customer | null | undefined;
  
  const validateDocumentRealTime = useCallback(async () => {
    if (!watchDocumentNumber || watchDocumentNumber.length < 3) {
      setDocumentValidation(null);
      setExistingCustomer(null);
      return;
    }
    
    const result = validateDocument(watchDocumentType, watchDocumentNumber);
    setDocumentValidation(result);

    // Si el documento es válido y no estamos editando, buscar duplicados
    if (result.isValid && !isEditing && onFindByDocument) {
      setIsCheckingDocument(true);
      try {
        const found: Customer | null = await onFindByDocument(watchDocumentNumber);
        // Solo mostrar si es otro cliente (no el mismo en edición)
        const currentCustomerId = customerProp ? customerProp.id : undefined;
        if (found && found.id !== currentCustomerId) {
          setExistingCustomer(found);
        } else {
          setExistingCustomer(null);
        }
      } catch {
        setExistingCustomer(null);
      } finally {
        setIsCheckingDocument(false);
      }
    } else {
      setExistingCustomer(null);
    }
  }, [watchDocumentType, watchDocumentNumber, isEditing, onFindByDocument, customerProp]);

  // Ejecutar validación cuando cambia el documento
  useEffect(() => {
    const timer = setTimeout(() => {
      validateDocumentRealTime();
    }, 300); // Debounce de 300ms
    
    return () => clearTimeout(timer);
  }, [validateDocumentRealTime]);

  // Cambiar tipo de documento automáticamente cuando cambia el tipo de cliente
  useEffect(() => {
    const recommended = getRecommendedDocumentType(watchCustomerType);
    const currentDocType = form.getValues("documentType");
    
    // Solo cambiar si el documento actual está vacío o si es diferente al recomendado
    if (!watchDocumentNumber || watchDocumentNumber.length === 0) {
      if (currentDocType !== recommended) {
        form.setValue("documentType", recommended);
      }
    }
  }, [watchCustomerType, form, watchDocumentNumber]);

  // Cargar datos del cliente si es edición
  useEffect(() => {
    if (customer) {
      form.reset({
        type: customer.type,
        documentType: customer.documentType,
        documentNumber: customer.documentNumber,
        name: customer.name,
        tradeName: customer.tradeName || "",
        email: customer.email,
        phone: customer.phone,
        phone2: customer.phone2 || "",
        website: customer.website || "",
        category: customer.category || "standard",
        notes: customer.notes || "",
        industry: customer.industry || "",
        tags: customer.tags?.join(", ") || "",
        addresses: customer.addresses.map(a => ({
          ...a,
          label: a.label || "",
          reference: a.reference || "",
        })),
        contacts: customer.contacts.map(c => ({
          ...c,
          position: c.position || "",
          department: c.department || "",
          notifyDeliveries: c.notifyDeliveries ?? true,
          notifyIncidents: c.notifyIncidents ?? true,
        })),
        billing: customer.billingConfig ? {
          paymentTerms: customer.billingConfig.paymentTerms || "30_days",
          currency: customer.billingConfig.currency || "PEN",
          requiresPO: customer.billingConfig.requiresPO || false,
          billingEmail: customer.billingConfig.billingEmail || "",
          volumeDiscount: customer.billingConfig.volumeDiscount || 0,
          creditLimit: customer.creditLimit || 0,
          taxExempt: false,
        } : undefined,
      });
      // Validar documento existente
      setTimeout(() => validateDocumentRealTime(), 100);
      setExistingCustomer(null);
    } else {
      // Reset explícito a valores iniciales para evitar estado residual
      form.reset(INITIAL_VALUES);
      setActiveTab("general");
      setDocumentValidation(null);
      setExistingCustomer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, form]);

  const handleSubmit = async (data: CustomerFormData) => {
    // Validar documento antes de enviar
    const docValidation = validateDocument(data.documentType, data.documentNumber);
    if (!docValidation.isValid) {
      form.setError("documentNumber", { message: docValidation.message });
      setActiveTab("general");
      return;
    }

    const payload: CreateCustomerDTO = {
      type: data.type,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      name: data.name,
      tradeName: data.tradeName || undefined,
      email: data.email,
      phone: data.phone,
      phone2: data.phone2 || undefined,
      website: data.website || undefined,
      category: data.category,
      notes: data.notes || undefined,
      industry: data.industry || undefined,
      tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      addresses: data.addresses,
      contacts: data.contacts,
      billingConfig: data.billing ? {
        paymentTerms: data.billing.paymentTerms,
        currency: data.billing.currency,
        requiresPO: data.billing.requiresPO,
        billingEmail: data.billing.billingEmail || undefined,
        volumeDiscount: data.billing.volumeDiscount,
      } : undefined,
    };

    // creditLimit va a nivel raíz del DTO de actualización
    const finalPayload = isEditing && data.billing?.creditLimit
      ? { ...payload, creditLimit: data.billing.creditLimit }
      : payload;

    await onSubmit(finalPayload);
  };

  // Agregar/remover direcciones
  const addresses = form.watch("addresses");
  const addAddress = () => {
    form.setValue("addresses", [
      ...addresses,
      { label: "", street: "", city: "", state: "", country: "Perú", isDefault: false },
    ]);
  };
  const removeAddress = (index: number) => {
    if (addresses.length > 1) {
      form.setValue("addresses", addresses.filter((_, i) => i !== index));
    }
  };

  // Agregar/remover contactos
  const contacts = form.watch("contacts");
  const addContact = () => {
    form.setValue("contacts", [
      ...contacts,
      { name: "", email: "", phone: "", isPrimary: false, notifyDeliveries: true, notifyIncidents: true },
    ]);
  };
  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      form.setValue("contacts", contacts.filter((_, i) => i !== index));
    }
  };

  // Manejar cierre del dialog reseteando el formulario
  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      // Reset inmediato antes de cerrar para limpiar estado
      form.reset(INITIAL_VALUES);
      setActiveTab("general");
      setDocumentValidation(null);
      setExistingCustomer(null);
    }
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, form]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[85vh] max-h-[780px] flex flex-col p-0 gap-0 overflow-hidden border shadow-2xl rounded-xl">
        {/* Header limpio y elegante */}
        <DialogHeader className="px-6 py-4 shrink-0 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              isEditing 
                ? "bg-amber-500/10 text-amber-600" 
                : "bg-primary/10 text-primary"
            )}>
              {isEditing ? (
                <FileText className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold">
                {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEditing 
                  ? "Modifica la información del cliente" 
                  : "Registra un nuevo cliente en el sistema"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              {/* Tabs elegantes con indicadores de error */}
              {(() => {
                const errors = form.formState.errors;
                const hasGeneralErrors = !!(errors.type || errors.category || errors.documentType || errors.documentNumber || errors.name || errors.tradeName || errors.email || errors.phone || errors.phone2 || errors.industry || errors.website || errors.notes || errors.tags);
                const hasAddressErrors = !!errors.addresses;
                const hasContactErrors = !!errors.contacts;
                const hasBillingErrors = !!errors.billing;
                return (
              <div className="px-8 pt-3 pb-2 bg-background/50 backdrop-blur-sm border-b">
                <TabsList className="grid w-full max-w-lg grid-cols-4 h-10 p-1 bg-muted/50 rounded-lg overflow-visible">
                  <TabsTrigger 
                    value="general" 
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 text-sm relative"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>General</span>
                    {hasGeneralErrors && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="addresses" 
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 text-sm relative"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Direcciones</span>
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-medium">
                      {addresses.length}
                    </Badge>
                    {hasAddressErrors && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="contacts" 
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 text-sm relative"
                  >
                    <Users className="h-4 w-4" />
                    <span>Contactos</span>
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-medium">
                      {contacts.length}
                    </Badge>
                    {hasContactErrors && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="billing" 
                    className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 gap-1.5 text-sm relative"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Facturación</span>
                    {hasBillingErrors && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />}
                  </TabsTrigger>
                </TabsList>
              </div>
                );
              })()}

              <ScrollArea type="always" className="flex-1 min-h-0">
                <div className="px-8 py-6">
                  {/* Tab General */}
                  <TabsContent value="general" className="mt-0 space-y-5">
                    {/* Fila 1: Tipo, Categoría, Documento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Tipo de Cliente</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Seleccionar tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CUSTOMER_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      <div className="flex items-center gap-2">
                                        <type.icon className="h-4 w-4 text-primary" />
                                        {type.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Categoría</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Seleccionar categoría" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${cat.color}`} />
                                        {cat.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="documentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Tipo Documento</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 transition-colors">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DOCUMENT_TYPES.map((doc) => (
                                    <SelectItem key={doc.value} value={doc.value}>
                                      {doc.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="documentNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Número Documento</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    placeholder={getDocumentPlaceholder(watchDocumentType)}
                                    maxLength={getDocumentLength(watchDocumentType).max}
                                    className={cn(
                                      "h-10 rounded-lg font-mono pr-10 transition-colors",
                                      documentValidation?.isValid === true && !existingCustomer && "border-green-500 focus:border-green-500",
                                      documentValidation?.isValid === false && "border-red-500 focus:border-red-500",
                                      existingCustomer && "border-amber-500 focus:border-amber-500",
                                      !documentValidation && "border-muted-foreground/20 hover:border-primary/50 focus:border-primary"
                                    )}
                                    {...field} 
                                  />
                                  {isCheckingDocument && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                  {!isCheckingDocument && documentValidation && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      {existingCustomer ? (
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                      ) : documentValidation.isValid ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              {documentValidation && !documentValidation.isValid && (
                                <p className="text-xs text-red-500 mt-1">{documentValidation.message}</p>
                              )}
                              {documentValidation?.isValid && !existingCustomer && (
                                <p className="text-xs text-green-600 mt-1">✓ {documentValidation.message}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Alerta de cliente duplicado */}
                      {existingCustomer && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                                Cliente existente encontrado
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                Ya existe un cliente registrado con este documento:
                              </p>
                              <div className="bg-amber-100 dark:bg-amber-900/30 rounded p-2 mt-2">
                                <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm truncate">
                                  {existingCustomer.name}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  {existingCustomer.documentType}: {existingCustomer.documentNumber}
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  Estado: {existingCustomer.status === "active" ? "Activo" : "Inactivo"}
                                </p>
                              </div>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                                Puede continuar si desea crear un duplicado, o modificar el documento.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Fila 2: Razón Social y Nombre Comercial */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Razón Social / Nombre</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ej: Transportes S.A.C." 
                                  className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                  {...field} 
                                />
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
                              <FormLabel className="text-xs font-medium">Nombre Comercial</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ej: TransNavitel" 
                                  className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                    {/* Fila 3: Email, Teléfono, Industria, Web */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Email Principal</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="contacto@empresa.com" 
                                  className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                  {...field} 
                                />
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
                              <FormLabel className="text-xs font-medium">Teléfono Principal</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+51 999 000 000" 
                                  className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Sector / Industria</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ej: Retail, Minería" 
                                  className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Sitio Web</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://..." 
                                  className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                    {/* Fila 4: Etiquetas */}
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Etiquetas</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="vip, crédito, local (separar con comas)" 
                                className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    {/* Fila 5: Notas */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">Notas Adicionales</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Información relevante, acuerdos especiales, observaciones..." 
                                className="min-h-17.5 rounded-lg resize-none border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </TabsContent>

                  {/* Tab Direcciones */}
                  <TabsContent value="addresses" className="mt-0 space-y-4">
                    <div className="space-y-4">
                      {addresses.map((_, index) => (
                        <div 
                          key={index} 
                          className="group relative border rounded-xl p-5 bg-linear-to-br from-card to-muted/20 hover:shadow-md transition-all duration-200"
                        >
                          {/* Header de la tarjeta */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                                index === 0 
                                  ? "bg-primary/10 text-primary" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-medium text-sm">
                                  {index === 0 ? "Dirección Principal" : `Sucursal ${index}`}
                                </span>
                                {index === 0 && (
                                  <Badge variant="outline" className="ml-2 text-[10px] h-5 bg-primary/5 border-primary/20 text-primary">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <AddressGeocoder
                                street={addresses[index]?.street || ""}
                                city={addresses[index]?.city || ""}
                                state={addresses[index]?.state || ""}
                                country={addresses[index]?.country || "Perú"}
                                currentCoordinates={addresses[index]?.coordinates}
                                onCoordinatesFound={(coords) => {
                                  form.setValue(`addresses.${index}.coordinates`, coords);
                                }}
                              />
                              {addresses.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAddress(index)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                  aria-label={`Eliminar dirección ${index + 1}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name={`addresses.${index}.street`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">Dirección / Calle</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Av. Principal 123, Urb. Industrial" 
                                      className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-3 gap-3">
                              <FormField
                                control={form.control}
                                name={`addresses.${index}.city`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">Ciudad</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Lima" 
                                        className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`addresses.${index}.state`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">Departamento</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Lima" 
                                        className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`addresses.${index}.zipCode`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">Código Postal</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="15001" 
                                        className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name={`addresses.${index}.reference`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">Referencia</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Frente al parque industrial, cerca de..." 
                                      className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addAddress} 
                      className="w-full h-12 border-dashed border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all duration-200 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Otra Dirección
                    </Button>
                  </TabsContent>

                  {/* Tab Contactos */}
                  <TabsContent value="contacts" className="mt-0 space-y-4">
                    <div className="space-y-4">
                      {contacts.map((_, index) => (
                        <div 
                          key={index} 
                          className="group relative border rounded-xl p-5 bg-linear-to-br from-card to-blue-50/30 dark:to-blue-950/20 hover:shadow-md transition-all duration-200"
                        >
                          {/* Header de la tarjeta */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-colors ${index === 0 ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "bg-muted text-foreground/60"}`}
                              >
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-medium text-sm">
                                  {index === 0 ? "Contacto Principal" : `Contacto ${index + 1}`}
                                </span>
                                {index === 0 && (
                                  <Badge variant="outline" className="ml-2 text-[10px] h-5 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Primario
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {contacts.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeContact(index)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                aria-label={`Eliminar contacto ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`contacts.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">Nombre Completo</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="Juan Pérez" 
                                        className="h-10 pl-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`contacts.${index}.position`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">Cargo / Puesto</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="Gerente Logística" 
                                        className="h-10 pl-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`contacts.${index}.email`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">Correo Electrónico</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        type="email" 
                                        placeholder="juan@empresa.com" 
                                        className="h-10 pl-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`contacts.${index}.phone`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">Teléfono / Celular</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="+51 999 000 000" 
                                        className="h-10 pl-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addContact} 
                      className="w-full h-12 border-dashed border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-200 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Otro Contacto
                    </Button>
                  </TabsContent>

                  {/* Tab Facturación */}
                  <TabsContent value="billing" className="mt-0 space-y-5">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Columna izquierda - Términos de pago */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="font-semibold text-sm">Términos de Pago</h3>
                        </div>

                        <FormField
                          control={form.control}
                          name="billing.paymentTerms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Plazo de Pago</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Seleccionar plazo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {PAYMENT_TERMS.map((term) => (
                                    <SelectItem key={term.value} value={term.value}>
                                      <span className="flex items-center gap-2">
                                        {term.label}
                                        {term.days > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            ({term.days} días)
                                          </span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billing.currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Moneda</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Seleccionar moneda" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CURRENCIES.map((curr) => (
                                    <SelectItem key={curr.value} value={curr.value}>
                                      <span className="flex items-center gap-2">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        {curr.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billing.creditLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Límite de Crédito</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    {form.watch("billing.currency") === "USD" ? "$" : "S/"}
                                  </span>
                                  <Input 
                                    type="number"
                                    min={0}
                                    placeholder="0.00" 
                                    className="h-10 pl-8 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Columna derecha - Descuentos y opciones */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <Percent className="h-4 w-4 text-green-600" />
                          </div>
                          <h3 className="font-semibold text-sm">Descuentos y Opciones</h3>
                        </div>

                        <FormField
                          control={form.control}
                          name="billing.volumeDiscount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Descuento por Volumen (%)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="0" 
                                    className="h-10 pr-8 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    %
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billing.billingEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Email de Facturación</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    type="email"
                                    placeholder="facturacion@empresa.com" 
                                    className="h-10 pl-10 rounded-lg border-muted-foreground/20 hover:border-primary/50 focus:border-primary transition-colors" 
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Se usará el email principal si se deja vacío
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Opciones adicionales */}
                        <div className="space-y-3 pt-2">
                          <FormField
                            control={form.control}
                            name="billing.requiresPO"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium cursor-pointer">
                                    Requiere Orden de Compra
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    No procesar pedidos sin OC
                                  </p>
                                </div>
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="billing.taxExempt"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium cursor-pointer">
                                    Exento de IGV
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    Cliente exonerado de impuestos
                                  </p>
                                </div>
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value || false}
                                    onChange={field.onChange}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            {/* Footer elegante */}
            <DialogFooter className="px-6 py-4 border-t bg-linear-to-r from-muted/30 via-background to-muted/30 shrink-0 gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading} 
                className="h-10 px-6 rounded-lg border-muted-foreground/20 hover:bg-muted/50 transition-all"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading} 
                className={`h-10 px-6 min-w-40 rounded-lg font-medium shadow-lg transition-all duration-200 bg-linear-to-r ${isEditing ? "from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" : "from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"}`}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Registrar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
