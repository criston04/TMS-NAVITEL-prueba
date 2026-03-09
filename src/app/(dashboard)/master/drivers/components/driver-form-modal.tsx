"use client";

import * as React from "react";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  User,
  FileText,
  Heart,
  Shield,
  Phone,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Driver, 
} from "@/types/models/driver";
import { 
  LICENSE_VEHICLE_COMPATIBILITY,
  BLOOD_TYPES,
  LICENSE_CATEGORIES,
} from "@/lib/validators/driver-validators";


/**
 * Esquema de validación para el formulario de conductor
 */
const driverFormSchema = z.object({
  // Información Personal
  firstName: z.string().min(2, "Nombre muy corto").max(50, "Nombre muy largo"),
  lastName: z.string().min(2, "Apellido muy corto").max(50, "Apellido muy largo"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(9, "Teléfono inválido").max(15),
  secondaryPhone: z.string().optional(),
  documentType: z.enum(["DNI", "CE", "PASSPORT"]),
  documentNumber: z.string().min(8, "Número de documento inválido"),
  birthDate: z.string().min(1, "Fecha requerida"),
  address: z.string().min(5, "Dirección muy corta"),
  district: z.string().optional(),
  city: z.string().min(2, "Ciudad requerida"),
  department: z.string().optional(),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  photoUrl: z.string().optional(),

  // Licencia de Conducir
  license: z.object({
    number: z.string().min(8, "Número de licencia inválido"),
    category: z.enum(["A-I", "A-IIa", "A-IIb", "A-IIIa", "A-IIIb", "A-IIIc"]),
    issueDate: z.string().min(1, "Fecha requerida"),
    expiryDate: z.string().min(1, "Fecha requerida"),
    issuingEntity: z.string().default("MTC"),
    restrictions: z.array(z.string()).optional(),
    points: z.number().min(0).max(100).default(100),
    fileUrl: z.string().optional(),
  }),

  // Contactos de Emergencia
  emergencyContacts: z.array(z.object({
    name: z.string().min(2, "Nombre requerido"),
    relationship: z.string().min(2, "Relación requerida"),
    phone: z.string().min(9, "Teléfono inválido"),
    secondaryPhone: z.string().optional(),
    address: z.string().optional(),
  })).min(1, "Al menos un contacto de emergencia requerido"),

  status: z.enum(["active", "inactive", "suspended", "on_leave", "terminated"]).default("active"),
  hireDate: z.string().optional(),
  operatorId: z.string().optional(),
  operatorName: z.string().optional(),
  notes: z.string().optional(),
});

type DriverFormData = z.infer<typeof driverFormSchema>;

export type { DriverFormData };

/**
 * Props del componente
 */
interface DriverFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
  onSubmit: (data: DriverFormData) => Promise<void>;
  isLoading?: boolean;
}


const DOCUMENT_TYPES = [
  { value: "DNI", label: "DNI" },
  { value: "CE", label: "Carné de Extranjería" },
  { value: "PASSPORT", label: "Pasaporte" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Activo", color: "bg-green-500" },
  { value: "inactive", label: "Inactivo", color: "bg-gray-500" },
  { value: "suspended", label: "Suspendido", color: "bg-red-500" },
  { value: "on_leave", label: "De Permiso", color: "bg-yellow-500" },
  { value: "terminated", label: "Cesado", color: "bg-slate-500" },
];

const DEPARTMENTS = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca",
  "Callao", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad",
  "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco",
  "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

const RELATIONSHIPS = [
  "Esposo/a", "Padre", "Madre", "Hijo/a", "Hermano/a", "Tío/a", "Amigo/a", "Otro",
];


export function DriverFormModal({
  open,
  onOpenChange,
  driver,
  onSubmit,
  isLoading = false,
}: DriverFormModalProps) {
  const [activeTab, setActiveTab] = React.useState("personal");

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema) as Resolver<DriverFormData>,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      secondaryPhone: "",
      documentType: "DNI",
      documentNumber: "",
      birthDate: "",
      address: "",
      district: "",
      city: "",
      department: "Lima",
      bloodType: "O+",
      photoUrl: "",
      license: {
        number: "",
        category: "A-IIb",
        issueDate: "",
        expiryDate: "",
        issuingEntity: "MTC",
        restrictions: [],
        points: 100,
        fileUrl: "",
      },
      emergencyContacts: [
        { name: "", relationship: "", phone: "", secondaryPhone: "", address: "" },
      ],
      status: "active",
      hireDate: "",
      operatorId: "",
      operatorName: "",
      notes: "",
    },
  });

  const { fields: emergencyFields, append: addEmergencyContact, remove: removeEmergencyContact } = useFieldArray({
    control: form.control,
    name: "emergencyContacts",
  });

  // Cargar datos del conductor si es edición
  // Función auxiliar para convertir restricciones de objeto a array de strings
  const convertLicenseRestrictions = (restrictions?: {
    requiresGlasses?: boolean;
    requiresHearingAid?: boolean;
    automaticOnly?: boolean;
    otherRestrictions?: string[];
  }): string[] => {
    if (!restrictions) return [];
    const result: string[] = [];
    if (restrictions.requiresGlasses) result.push("Requiere lentes correctivos");
    if (restrictions.requiresHearingAid) result.push("Requiere audífonos");
    if (restrictions.automaticOnly) result.push("Solo transmisión automática");
    if (restrictions.otherRestrictions) result.push(...restrictions.otherRestrictions);
    return result;
  };

  React.useEffect(() => {
    if (driver && open) {
      // Compatibilidad con mocks legacy y modelo nuevo
      const driverAny = driver as unknown as Record<string, unknown>;
      const firstName = driver.firstName || (driverAny.name as string)?.split(" ")[0] || "";
      const lastName = driver.lastName || (driverAny.name as string)?.split(" ").slice(1).join(" ") || "";
      const licenseCategory = driver.license?.category || (driverAny.licenseCategory as string) || (driverAny.licenseType as string) || "A-IIb";
      const licenseNumber = driver.license?.number || (driverAny.licenseNumber as string) || "";
      const licenseExpiry = driver.license?.expiryDate || (driverAny.licenseExpiry as string) || "";
      
      form.reset({
        firstName,
        lastName,
        email: driver.email,
        phone: driver.phone,
        secondaryPhone: driver.alternativePhone || "",
        documentType: (driver.documentType?.toUpperCase() as "DNI" | "CE" | "PASSPORT") || "DNI",
        documentNumber: driver.documentNumber || "",
        birthDate: driver.birthDate || "",
        address: driver.address || "",
        district: driver.district || "",
        city: driver.province || "",
        department: driver.department || "Lima",
        bloodType: driver.bloodType || "O+",
        photoUrl: driver.photoUrl || "",
        license: {
          number: licenseNumber,
          category: licenseCategory as DriverFormData["license"]["category"],
          issueDate: driver.license?.issueDate || "",
          expiryDate: licenseExpiry,
          issuingEntity: driver.license?.issuingAuthority || "MTC",
          restrictions: convertLicenseRestrictions(driver.license?.restrictions),
          points: driver.license?.points || 100,
          fileUrl: driver.license?.fileUrl || "",
        },
        emergencyContacts: driver.emergencyContact
          ? [{
              name: driver.emergencyContact.name,
              relationship: driver.emergencyContact.relationship,
              phone: driver.emergencyContact.phone,
              secondaryPhone: driver.emergencyContact.alternativePhone || "",
              address: "",
            }, ...(driver.additionalEmergencyContacts?.map(c => ({
              name: c.name,
              relationship: c.relationship,
              phone: c.phone,
              secondaryPhone: c.alternativePhone || "",
              address: "",
            })) || [])]
          : [{ name: "", relationship: "", phone: "", secondaryPhone: "", address: "" }],
        status: driver.status,
        hireDate: driver.hireDate || "",
        operatorId: driver.operatorId || "",
        operatorName: driver.operatorName || "",
        notes: driver.notes || "",
      });
    }
  }, [driver, open, form]);

  // Reset cuando se cierra
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setActiveTab("personal");
    }
  }, [open, form]);

  const handleSubmit = async (data: DriverFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar conductor:", error);
    }
  };

  const isEditing = !!driver;
  const selectedCategory = form.watch("license.category");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Conductor" : "Nuevo Conductor"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifique la información del conductor" 
              : "Complete toda la información requerida para registrar el conductor"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-5 h-auto">
                  <TabsTrigger value="personal" className="flex items-center gap-2 py-3">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Personal</span>
                  </TabsTrigger>
                  <TabsTrigger value="license" className="flex items-center gap-2 py-3">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Licencia</span>
                  </TabsTrigger>
                  <TabsTrigger value="medical" className="flex items-center gap-2 py-3">
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">Médico</span>
                  </TabsTrigger>
                  <TabsTrigger value="emergency" className="flex items-center gap-2 py-3">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Emergencia</span>
                  </TabsTrigger>
                  <TabsTrigger value="employment" className="flex items-center gap-2 py-3">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Laboral</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="h-[55vh] px-6 py-4">
                {/* TAB: INFORMACIÓN PERSONAL */}
                <TabsContent value="personal" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Datos Personales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombres *</FormLabel>
                              <FormControl>
                                <Input placeholder="Juan Carlos" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Apellidos *</FormLabel>
                              <FormControl>
                                <Input placeholder="Pérez García" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="documentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo Doc. *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DOCUMENT_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
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
                            <FormItem className="col-span-2">
                              <FormLabel>Número de Documento *</FormLabel>
                              <FormControl>
                                <Input placeholder="12345678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Nacimiento *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bloodType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Sangre *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BLOOD_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="conductor@email.com" {...field} />
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
                                <Input placeholder="987654321" {...field} />
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
                      <CardTitle className="text-base">Dirección</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección *</FormLabel>
                            <FormControl>
                              <Input placeholder="Av. Principal 123, Dpto 4B" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="district"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Distrito</FormLabel>
                              <FormControl>
                                <Input placeholder="Miraflores" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciudad *</FormLabel>
                              <FormControl>
                                <Input placeholder="Lima" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Departamento</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DEPARTMENTS.map(dept => (
                                    <SelectItem key={dept} value={dept}>
                                      {dept}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: LICENCIA DE CONDUCIR */}
                <TabsContent value="license" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Licencia de Conducir</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="license.number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Licencia *</FormLabel>
                              <FormControl>
                                <Input placeholder="Q12345678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="license.category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoría *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {LICENSE_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {selectedCategory && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Vehículos autorizados para categoría {selectedCategory}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {LICENSE_VEHICLE_COMPATIBILITY[selectedCategory]?.map(vehicleType => (
                              <Badge key={vehicleType} variant="secondary">
                                {vehicleType}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="license.issueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Emisión *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="license.expiryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Vencimiento *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="license.issuingEntity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Entidad Emisora</FormLabel>
                              <FormControl>
                                <Input placeholder="MTC" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="license.points"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Puntos Disponibles</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={0} 
                                  max={100}
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Sistema de puntos MTC (máximo 100)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="p-4 border border-dashed rounded-lg">
                        <div className="flex items-center gap-4">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Adjuntar copia de licencia</p>
                            <p className="text-sm text-muted-foreground">
                              PDF o imagen (máx. 5MB)
                            </p>
                          </div>
                          <Button type="button" variant="outline" className="ml-auto">
                            Subir archivo
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: INFORMACIÓN MÉDICA */}
                <TabsContent value="medical" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        Información Médica
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800 dark:text-amber-200">
                              Exámenes Médicos Requeridos
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              Según normativa MTC, todo conductor debe contar con exámenes médicos 
                              y psicológicos vigentes. Estos se gestionan desde el módulo de 
                              Exámenes Médicos después de crear el conductor.
                            </p>
                          </div>
                        </div>
                      </div>

                      {isEditing && driver && (
                        <div className="space-y-4">
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground">
                                Examen Médico
                              </p>
                              {driver.medicalExamHistory?.length ? (
                                <div className="mt-2">
                                  <Badge variant="outline" className="bg-green-50">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Vigente hasta {driver.medicalExamHistory[0].expiryDate}
                                  </Badge>
                                </div>
                              ) : (
                                <Badge variant="destructive" className="mt-2">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Sin examen registrado
                                </Badge>
                              )}
                            </div>
                            <div className="p-4 border rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground">
                                Examen Psicológico
                              </p>
                              {driver.psychologicalExamHistory?.length ? (
                                <div className="mt-2">
                                  <Badge variant="outline" className="bg-green-50">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Vigente hasta {driver.psychologicalExamHistory[0].expiryDate}
                                  </Badge>
                                </div>
                              ) : (
                                <Badge variant="destructive" className="mt-2">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Sin examen registrado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm">
                          <strong>Tipo de Sangre registrado:</strong>{" "}
                          <Badge variant="outline" className="ml-2">
                            {form.watch("bloodType")}
                          </Badge>
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          El tipo de sangre se configura en la pestaña de Información Personal
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: CONTACTOS DE EMERGENCIA */}
                <TabsContent value="emergency" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Contactos de Emergencia</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addEmergencyContact({
                          name: "",
                          relationship: "",
                          phone: "",
                          secondaryPhone: "",
                          address: "",
                        })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {emergencyFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">Contacto {index + 1}</Badge>
                            {emergencyFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEmergencyContact(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombre Completo *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="María García" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.relationship`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Relación *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {RELATIONSHIPS.map(rel => (
                                        <SelectItem key={rel} value={rel}>
                                          {rel}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.phone`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Teléfono Principal *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="987654321" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`emergencyContacts.${index}.secondaryPhone`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Teléfono Secundario</FormLabel>
                                  <FormControl>
                                    <Input placeholder="01-1234567" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`emergencyContacts.${index}.address`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dirección</FormLabel>
                                <FormControl>
                                  <Input placeholder="Dirección del contacto" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}

                      {form.formState.errors.emergencyContacts?.root && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.emergencyContacts.root.message}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: INFORMACIÓN LABORAL */}
                <TabsContent value="employment" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Estado Laboral</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {STATUS_OPTIONS.map(status => (
                                    <SelectItem key={status.value} value={status.value}>
                                      <div className="flex items-center gap-2">
                                        <span className={cn("w-2 h-2 rounded-full", status.color)} />
                                        {status.label}
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
                          name="hireDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Contratación</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Empresa Transportista / Operador Logístico */}
                      <Separator className="my-2" />
                      <p className="text-sm font-medium text-muted-foreground mb-2">Empresa Transportista / Operador</p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="operatorId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código / RUC de Empresa</FormLabel>
                              <FormControl>
                                <Input placeholder="20512345678" {...field} />
                              </FormControl>
                              <FormDescription className="text-xs">
                                RUC o código interno del operador logístico
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="operatorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre de Empresa</FormLabel>
                              <FormControl>
                                <Input placeholder="Transportes Nacional S.A.C." {...field} />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Razón social de la empresa transportista
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas / Observaciones</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Información adicional sobre el conductor..."
                                className="min-h-25"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isEditing && driver && (
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                          <p className="text-sm font-medium">Información del Sistema</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p>ID: {driver.id}</p>
                            <p>Creado: {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString("es-PE") : "N/A"}</p>
                            {driver.assignedVehicleId && (
                              <p className="col-span-2">
                                Vehículo asignado: {driver.assignedVehiclePlate || driver.assignedVehicleId}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
                  {isEditing ? "Guardar Cambios" : "Crear Conductor"}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default DriverFormModal;
