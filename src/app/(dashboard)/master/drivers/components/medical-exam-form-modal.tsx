"use client";

/**
 * MedicalExamFormModal — formulario de creación/edición de examen médico.
 *
 * Permite registrar un examen médico ocupacional MTC asociado a un conductor:
 *  - Tipo de examen (pre-ocupacional / periódico / post-incidente / etc.)
 *  - Fecha emisión y vencimiento
 *  - Clínica autorizada + médico evaluador
 *  - Resultado (aprobado / condicional / rechazado / pendiente)
 *  - Restricciones médicas aplicadas (multi-select)
 *  - Certificado (upload PDF — opcional)
 *  - Observaciones
 */

import { useEffect, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Heart, FileText, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { Driver, MedicalExam, MedicalExamType } from "@/types/models/driver";
import {
  medicalExamsService,
  AUTHORIZED_CLINICS,
  COMMON_MEDICAL_RESTRICTIONS,
} from "@/services/master/medical-exams.service";

const EXAM_TYPES: { value: MedicalExamType; label: string }[] = [
  { value: "pre_employment", label: "Pre-ocupacional" },
  { value: "periodic", label: "Periódico (anual)" },
  { value: "post_incident", label: "Post-incidente" },
  { value: "return_to_work", label: "Reincorporación" },
  { value: "exit", label: "Retiro" },
];

const RESULTS = [
  { value: "approved", label: "Aprobado" },
  { value: "conditional", label: "Aprobado con condiciones" },
  { value: "rejected", label: "No apto" },
  { value: "pending", label: "Pendiente de resultado" },
] as const;

const schema = z.object({
  driverId: z.string().min(1, "Conductor requerido"),
  type: z.enum(["pre_employment", "periodic", "post_incident", "return_to_work", "exit"]),
  date: z.string().min(1, "Fecha de emisión requerida"),
  expiryDate: z.string().min(1, "Fecha de vencimiento requerida"),
  result: z.enum(["approved", "conditional", "rejected", "pending"]),
  clinicName: z.string().min(2, "Clínica requerida"),
  clinicRuc: z.string().optional(),
  doctorName: z.string().min(2, "Nombre del médico requerido"),
  doctorCmp: z.string().optional(),
  certificateNumber: z.string().min(1, "Número de certificado requerido"),
  fileUrl: z.string().optional(),
  observations: z.string().optional(),
  restrictionCodes: z.array(z.string()).default([]),
});

export type MedicalExamFormData = z.infer<typeof schema>;

interface MedicalExamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conductores disponibles para asociar (cargar previamente desde driversService). */
  drivers: Driver[];
  /** Si viene, el modal abre en modo edición. */
  exam?: MedicalExam | null;
  /** Pre-selección de conductor (cuando se abre desde el drawer del driver). */
  defaultDriverId?: string;
  /** Callback al guardar exitosamente. */
  onSaved?: () => void;
}

export function MedicalExamFormModal({
  open,
  onOpenChange,
  drivers,
  exam,
  defaultDriverId,
  onSaved,
}: MedicalExamFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!exam;

  const form = useForm<MedicalExamFormData>({
    resolver: zodResolver(schema) as Resolver<MedicalExamFormData>,
    defaultValues: {
      driverId: defaultDriverId ?? "",
      type: "periodic",
      date: "",
      expiryDate: "",
      result: "pending",
      clinicName: "",
      clinicRuc: "",
      doctorName: "",
      doctorCmp: "",
      certificateNumber: "",
      fileUrl: "",
      observations: "",
      restrictionCodes: [],
    },
  });

  // Cargar datos al editar
  useEffect(() => {
    if (!open) return;
    if (exam) {
      form.reset({
        driverId: defaultDriverId ?? "",
        type: exam.type,
        date: exam.date,
        expiryDate: exam.expiryDate,
        result: exam.result,
        clinicName: exam.clinicName,
        clinicRuc: exam.clinicRuc ?? "",
        doctorName: exam.doctorName,
        doctorCmp: exam.doctorCmp ?? "",
        certificateNumber: exam.certificateNumber,
        fileUrl: exam.fileUrl ?? "",
        observations: exam.observations ?? "",
        restrictionCodes: exam.restrictions.map((r) => r.code),
      });
    } else {
      form.reset({
        driverId: defaultDriverId ?? "",
        type: "periodic",
        date: "",
        expiryDate: "",
        result: "pending",
        clinicName: "",
        clinicRuc: "",
        doctorName: "",
        doctorCmp: "",
        certificateNumber: "",
        fileUrl: "",
        observations: "",
        restrictionCodes: [],
      });
    }
  }, [open, exam, defaultDriverId, form]);

  const handleClinicSelect = (clinicId: string) => {
    const clinic = AUTHORIZED_CLINICS.find((c) => c.id === clinicId);
    if (clinic) {
      form.setValue("clinicName", clinic.name);
      form.setValue("clinicRuc", clinic.ruc);
    }
  };

  const onSubmit = async (data: MedicalExamFormData) => {
    setSubmitting(true);
    try {
      const restrictions = COMMON_MEDICAL_RESTRICTIONS.filter((r) =>
        data.restrictionCodes.includes(r.code),
      );
      const payload = {
        type: data.type,
        date: data.date,
        expiryDate: data.expiryDate,
        result: data.result,
        restrictions,
        clinicName: data.clinicName,
        clinicRuc: data.clinicRuc || undefined,
        doctorName: data.doctorName,
        doctorCmp: data.doctorCmp || undefined,
        certificateNumber: data.certificateNumber,
        fileUrl: data.fileUrl || undefined,
        observations: data.observations || undefined,
      };

      if (isEdit && exam) {
        await medicalExamsService.updateMedicalExam(exam.id, payload);
        toast.success("Examen actualizado correctamente");
      } else {
        await medicalExamsService.createMedicalExam(data.driverId, payload);
        toast.success("Examen registrado correctamente");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar el examen";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {isEdit ? "Editar Examen Médico" : "Nuevo Examen Médico"}
          </DialogTitle>
          <DialogDescription>
            Examen médico ocupacional según normativa MTC.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Conductor */}
            {!isEdit && (
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conductor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un conductor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.fullName || `${d.firstName} ${d.lastName}`} — {d.documentNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tipo + Resultado */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Examen *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXAM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
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
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RESULTS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
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
                name="expiryDate"
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

            {/* Clínica */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clinicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clínica autorizada *</FormLabel>
                    <Select onValueChange={handleClinicSelect} value={undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={field.value || "Seleccione o escriba manual"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AUTHORIZED_CLINICS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} — {c.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormControl>
                      <Input
                        placeholder="O escriba manualmente"
                        {...field}
                        className="mt-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clinicRuc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUC de la clínica</FormLabel>
                    <FormControl>
                      <Input placeholder="20100091896" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Médico */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="doctorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Médico evaluador *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="doctorCmp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CMP del médico</FormLabel>
                    <FormControl>
                      <Input placeholder="CMP-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Certificado */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="certificateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº de certificado *</FormLabel>
                    <FormControl>
                      <Input placeholder="CERT-2026-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del certificado (PDF)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://... o ruta del archivo"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Restricciones */}
            <FormField
              control={form.control}
              name="restrictionCodes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restricciones médicas</FormLabel>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                    {COMMON_MEDICAL_RESTRICTIONS.map((r) => {
                      const checked = field.value.includes(r.code);
                      return (
                        <label
                          key={r.code}
                          className="flex items-start gap-2 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              if (c) field.onChange([...field.value, r.code]);
                              else field.onChange(field.value.filter((x) => x !== r.code));
                            }}
                          />
                          <span>{r.description}</span>
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observaciones */}
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el examen..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <>
                    <FileText className="h-4 w-4 animate-pulse" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEdit ? "Guardar cambios" : "Registrar examen"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
