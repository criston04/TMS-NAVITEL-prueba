"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  DollarSign,
  Calendar,
  Clock,
  Hash,
  Save,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegionalSettings as RegionalSettingsType } from "@/types/settings";

interface RegionalSettingsProps {
  settings?: RegionalSettingsType;
  loading: boolean;
  onUpdate?: (data: Partial<RegionalSettingsType>) => void;
}

const timezones = [
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
];

const currencies = [
  { value: "PEN", label: "Sol Peruano (S/)", symbol: "S/" },
  { value: "USD", label: "Dólar Americano ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "COP", label: "Peso Colombiano ($)", symbol: "$" },
  { value: "MXN", label: "Peso Mexicano ($)", symbol: "$" },
  { value: "CLP", label: "Peso Chileno ($)", symbol: "$" },
  { value: "ARS", label: "Peso Argentino ($)", symbol: "$" },
  { value: "BRL", label: "Real Brasileño (R$)", symbol: "R$" },
];

const dateFormats = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "15/01/2024" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "01/15/2024" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2024-01-15" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY", example: "15-01-2024" },
];

const timeFormats = [
  { value: "24h", label: "24 horas", example: "14:30" },
  { value: "12h", label: "12 horas", example: "2:30 PM" },
];

const numberFormats = [
  { value: "es-PE", label: "1.234,56 (Perú)", decimal: ",", thousands: "." },
  { value: "en-US", label: "1,234.56 (EE.UU.)", decimal: ".", thousands: "," },
  { value: "de-DE", label: "1.234,56 (Alemania)", decimal: ",", thousands: "." },
];

export function RegionalSettings({
  settings,
  loading,
  onUpdate,
}: RegionalSettingsProps) {
  const [formData, setFormData] = useState({
    timezone: "America/Lima",
    currency: "PEN",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h" as "12h" | "24h",
    numberFormat: "es-PE",
    firstDayOfWeek: 1,
    measurementUnit: "metric",
    // Campos adicionales del tipo
    currencySymbol: "S/",
    currencyPosition: "before" as "before" | "after",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    distanceUnit: "km" as "km" | "mi",
    weightUnit: "kg" as "kg" | "lb",
    temperatureUnit: "C" as "C" | "F",
  });

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        timezone: settings.timezone ?? prev.timezone,
        currency: settings.currency ?? prev.currency,
        dateFormat: settings.dateFormat ?? prev.dateFormat,
        timeFormat: settings.timeFormat ?? prev.timeFormat,
        firstDayOfWeek: settings.firstDayOfWeek ?? prev.firstDayOfWeek,
        currencySymbol: settings.currencySymbol ?? prev.currencySymbol,
        currencyPosition: settings.currencyPosition ?? prev.currencyPosition,
        decimalSeparator: settings.decimalSeparator ?? prev.decimalSeparator,
        thousandsSeparator: settings.thousandsSeparator ?? prev.thousandsSeparator,
        distanceUnit: settings.distanceUnit ?? prev.distanceUnit,
        weightUnit: settings.weightUnit ?? prev.weightUnit,
        temperatureUnit: settings.temperatureUnit ?? prev.temperatureUnit,
      }));
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { numberFormat, measurementUnit, ...dataToSubmit } = formData;
    onUpdate?.(dataToSubmit as Partial<RegionalSettingsType>);
  };

  const selectedCurrency = currencies.find((c) => c.value === formData.currency);
  const selectedDate = dateFormats.find((d) => d.value === formData.dateFormat);
  const selectedTime = timeFormats.find((t) => t.value === formData.timeFormat);
  const selectedNumber = numberFormats.find((n) => n.value === formData.numberFormat);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Ubicación y Hora
          </CardTitle>
          <CardDescription>
            Configura tu zona horaria y preferencias de ubicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Zona Horaria
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Primer Día de la Semana</Label>
              <Select
                value={String(formData.firstDayOfWeek)}
                onValueChange={(value) => handleChange("firstDayOfWeek", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Lunes</SelectItem>
                  <SelectItem value="0">Domingo</SelectItem>
                  <SelectItem value="6">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moneda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Moneda
          </CardTitle>
          <CardDescription>
            Configura la moneda predeterminada para operaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda Principal</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleChange("currency", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCurrency && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Vista previa:</p>
              <p className="text-lg font-medium">
                {selectedCurrency.symbol} 1,234.56
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formato de Fecha y Hora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Formato de Fecha y Hora
          </CardTitle>
          <CardDescription>
            Configura cómo se muestran las fechas y horas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Formato de Fecha</Label>
              <Select
                value={formData.dateFormat}
                onValueChange={(value) => handleChange("dateFormat", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  Ejemplo: {selectedDate.example}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Formato de Hora</Label>
              <Select
                value={formData.timeFormat}
                onValueChange={(value) => handleChange("timeFormat", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTime && (
                <p className="text-sm text-muted-foreground">
                  Ejemplo: {selectedTime.example}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formato de Números */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Formato de Números
          </CardTitle>
          <CardDescription>
            Configura el formato de separadores decimales y de miles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Formato Numérico</Label>
              <Select
                value={formData.numberFormat}
                onValueChange={(value) => handleChange("numberFormat", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {numberFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sistema de Medidas</Label>
              <Select
                value={formData.measurementUnit}
                onValueChange={(value) => handleChange("measurementUnit", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Métrico (km, kg, L)</SelectItem>
                  <SelectItem value="imperial">Imperial (mi, lb, gal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedNumber && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Vista previa:</p>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Entero</p>
                  <p className="font-mono">1{selectedNumber.thousands}234{selectedNumber.thousands}567</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Decimal</p>
                  <p className="font-mono">1{selectedNumber.thousands}234{selectedNumber.decimal}56</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Porcentaje</p>
                  <p className="font-mono">85{selectedNumber.decimal}5%</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
