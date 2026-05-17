"use client";

/**
 * PsychologicalExamFormModal — formulario de creación/edición de evaluación psicológica.
 *
 * Evaluación psicosensométrica MTC requerida para conductores profesionales.
 * Asociada a un conductor específico.
 */

import { useEffect, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Save, FileText } from "lucide-react";
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
import { toast } from "sonner";
import type { PsychologicalExam } from "@/types/models/driver";
import {
  medicalExamsService,
  AUTHORIZED_PSYCH_CENTERS,
} from "@/services/master/medical-exams.service";

const RESULTS = [
  { value: "approved", label: "Apto" },
  { value: "conditional", label: "Apto con observaciones" },
  { value: "rejected", label: "No apto" },
  { value: "pending", label: "Pendiente de resultado" },
] as const;

const schema = z.object({
  date: z.string().min(1, "Fecha de emisión requerida"),
  expiryDate: z.string().min(1, "Fecha de vencimiento requerida"),
  result: z.enum(["approved", "conditional", "rejected", "pending"]),
  centerName: z.string().min(2, "Centro requerido"),
  psychologistName: z.string().min(2, "Nombre del psicólogo requerido"),
  psychologistLicense: z.string().optional(),
  certificateNumber: z.string().min(1, "Número de certificado requerido"),
  fileUrl: z.string().optional(),
  observations: z.string().optional(),
});

export type PsychologicalExamFormData = z.infer<typeof schema>;

interface PsychologicalExamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conductor al que pertenece esta evaluación. */
  driverId: string;
  /** Si viene, abre en modo edición. */
  exam?: PsychologicalExam | null;
  onSaved?: () => void;
}

export function PsychologicalExamFormModal({
  open,
  onOpenChange,
  driverId,
  exam,
  onSaved,
}: PsychologicalExamFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!exam;

  const form = useForm<PsychologicalExamFormData>({
    resolver: zodResolver(schema) as Resolver<PsychologicalExamFormData>,
    defaultValues: {
      date: "",
      expiryDate: "",
      result: "pending",
      centerName: "",
      psychologistName: "",
      psychologistLicense: "",
      certificateNumber: "",
      fileUrl: "",
      observations: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (exam) {
      form.reset({
        date: exam.date,
        expiryDate: exam.expiryDate,
        result: exam.result,
        centerName: exam.centerName,
        psychologistName: exam.psychologistName,
        psychologistLicense: exam.psychologistLicense ?? "",
        certificateNumber: exam.certificateNumber,
        fileUrl: exam.fileUrl ?? "",
        observations: exam.observations ?? "",
      });
    } else {
      form.reset({
        date: "",
        expiryDate: "",
        result: "pending",
        centerName: "",
        psychologistName: "",
        psychologistLicense: "",
        certificateNumber: "",
        fileUrl: "",
        observations: "",
      });
    }
  }, [open, exam, form]);

  const handleCenterSelect = (centerId: string) => {
    const center = AUTHORIZED_PSYCH_CENTERS.find((c) => c.id === centerId);
    if (center) {
      form.setValue("centerName", center.name);
    }
  };

  const onSubmit = async (data: PsychologicalExamFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        date: data.date,
        expiryDate: data.expiryDate,
        result: data.result,
        centerName: data.centerName,
        psychologistName: data.psychologistName,
        psychologistLicense: data.psychologistLicense || undefined,
        certificateNumber: data.certificateNumber,
        // 2026-05-17: perfil psicológico default — el form aún no lo captura.
        // Cuando se agregue UI para los 4 niveles (stress/reaction/attention/pressure),
        // se reemplaza este default por los valores del form.
        profile: exam?.profile ?? {
          stressLevel: "moderate" as const,
          reactionTime: "normal" as const,
          attentionLevel: "good" as const,
          pressureHandling: "good" as const,
        },
        fileUrl: data.fileUrl || undefined,
        observations: data.observations || undefined,
      };

      if (isEdit && exam) {
        await medicalExamsService.updatePsychologicalExam(exam.id, payload);
        toast.success("Evaluación psicológica actualizada");
      } else {
        await medicalExamsService.createPsychologicalExam(driverId, payload);
        toast.success("Evaluación psicológica registrada");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-violet-500" />
            {isEdit ? "Editar Evaluación Psicológica" : "Nueva Evaluación Psicológica"}
          </DialogTitle>
          <DialogDescription>
            Evaluación psicosensométrica MTC.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Resultado + Fechas */}
            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="certificateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº de certificado *</FormLabel>
                    <FormControl>
                      <Input placeholder="PSY-2026-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* Centro */}
            <FormField
              control={form.control}
              name="centerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro autorizado *</FormLabel>
                  <Select onValueChange={handleCenterSelect} value={undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={field.value || "Seleccione o escriba manual"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AUTHORIZED_PSYCH_CENTERS.map((c) => (
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

            {/* Psicólogo */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="psychologistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Psicólogo evaluador *</FormLabel>
                    <FormControl>
                      <Input placeholder="Lic. María García" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="psychologistLicense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colegiatura (CPsP)</FormLabel>
                    <FormControl>
                      <Input placeholder="CPsP-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Archivo */}
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

            {/* Observaciones */}
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
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
                    {isEdit ? "Guardar cambios" : "Registrar evaluación"}
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
