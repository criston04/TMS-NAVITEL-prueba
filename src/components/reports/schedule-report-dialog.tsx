"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ReportDefinition, ExportFormat, ScheduleFrequency } from "@/types/report";

interface ScheduleReportDialogProps {
  trigger?: React.ReactNode;
  definition?: ReportDefinition;
  onSchedule?: (params: ScheduleReportParams) => void;
  isScheduling?: boolean;
}

interface ScheduleReportParams {
  name: string;
  definitionId: string;
  frequency: ScheduleFrequency;
  format: ExportFormat;
  startDate: Date;
  endDate?: Date;
  time: string;
  recipients: string[];
  enabled: boolean;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

const frequencies: { value: ScheduleFrequency; label: string; description: string }[] = [
  { value: "daily", label: "Diario", description: "Todos los días" },
  { value: "weekly", label: "Semanal", description: "Un día específico de la semana" },
  { value: "biweekly", label: "Quincenal", description: "Cada dos semanas" },
  { value: "monthly", label: "Mensual", description: "Un día específico del mes" },
  { value: "quarterly", label: "Trimestral", description: "Cada 3 meses" },
  { value: "yearly", label: "Anual", description: "Una vez al año" },
];

const weekDays = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const formats: { value: ExportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
];

export function ScheduleReportDialog({
  trigger,
  definition,
  onSchedule,
  isScheduling = false,
}: ScheduleReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("excel");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [time, setTime] = useState("08:00");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(false);

  const handleSchedule = () => {
    if (!definition || !startDate) return;

    const params: ScheduleReportParams = {
      name: name || `${definition.name} - ${frequencies.find(f => f.value === frequency)?.label}`,
      definitionId: definition.id,
      frequency,
      format: selectedFormat,
      startDate,
      time,
      recipients,
      enabled,
    };

    if (hasEndDate && endDate) {
      params.endDate = endDate;
    }

    if (frequency === "weekly" || frequency === "biweekly") {
      params.dayOfWeek = dayOfWeek;
    }

    if (frequency === "monthly" || frequency === "quarterly" || frequency === "yearly") {
      params.dayOfMonth = dayOfMonth;
    }

    onSchedule?.(params);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setFrequency("weekly");
    setSelectedFormat("excel");
    setStartDate(new Date());
    setEndDate(undefined);
    setTime("08:00");
    setDayOfWeek(1);
    setDayOfMonth(1);
    setRecipients([]);
    setNewRecipient("");
    setEnabled(true);
    setHasEndDate(false);
  };

  const addRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient("");
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const showDayOfWeek = frequency === "weekly" || frequency === "biweekly";
  const showDayOfMonth = frequency === "monthly" || frequency === "quarterly" || frequency === "yearly";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Programar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programar Reporte
          </DialogTitle>
          <DialogDescription>
            {definition ? (
              <>Configurar envío automático para: <strong>{definition.name}</strong></>
            ) : (
              "Configura el envío automático del reporte"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nombre de la programación */}
          <div className="space-y-2">
            <Label htmlFor="scheduleName">Nombre de la Programación</Label>
            <Input
              id="scheduleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={definition ? `${definition.name} - Semanal` : "Mi reporte programado"}
            />
          </div>

          <Separator />

          {/* Frecuencia */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Frecuencia
            </Label>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as ScheduleFrequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    <div>
                      <span className="font-medium">{freq.label}</span>
                      <p className="text-xs text-muted-foreground">
                        {freq.description}
                      </p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Día de la semana */}
            {showDayOfWeek && (
              <div className="space-y-2">
                <Label className="text-sm">Día de la Semana</Label>
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(value) => setDayOfWeek(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekDays.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Día del mes */}
            {showDayOfMonth && (
              <div className="space-y-2">
                <Label className="text-sm">Día del Mes</Label>
                <Select
                  value={dayOfMonth.toString()}
                  onValueChange={(value) => setDayOfMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Día {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hora de ejecución */}
            <div className="space-y-2">
              <Label className="text-sm">Hora de Ejecución</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Período de vigencia */}
          <div className="space-y-3">
            <Label>Período de Vigencia</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Fecha de Inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "PP", { locale: es })
                        : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fecha de Fin</Label>
                  <Switch
                    checked={hasEndDate}
                    onCheckedChange={setHasEndDate}
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !hasEndDate && "opacity-50",
                        !endDate && "text-muted-foreground"
                      )}
                      disabled={!hasEndDate}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate && hasEndDate
                        ? format(endDate, "PP", { locale: es })
                        : "Sin límite"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={es}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Formato */}
          <div className="space-y-2">
            <Label>Formato de Salida</Label>
            <Select
              value={selectedFormat}
              onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formats.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Destinatarios */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Destinatarios
            </Label>
            
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="ml-1 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addRecipient}
                disabled={!newRecipient}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              El reporte se enviará automáticamente a estos correos
            </p>
          </div>

          <Separator />

          {/* Estado */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Activar Programación</Label>
              <p className="text-sm text-muted-foreground">
                Comenzará a ejecutarse según la configuración
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || !startDate}
          >
            {isScheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Programando...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Programar Reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
