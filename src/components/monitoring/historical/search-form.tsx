"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VehicleSelector } from "@/components/monitoring/common/vehicle-selector";
import { DateTimePicker } from "@/components/monitoring/common/date-time-picker";
import type { HistoricalRouteParams } from "@/types/monitoring";

interface SearchFormProps {
  onSearch: (params: HistoricalRouteParams) => void;
  vehicles: Array<{ id: string; plate: string }>;
  isLoading?: boolean;
  validationErrors?: string[];
  className?: string;
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setHours(date.getHours() - 24);
  return date.toISOString();
}

function getDefaultEndDate(): string {
  return new Date().toISOString();
}

function getMinDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date;
}

export function SearchForm({
  onSearch,
  vehicles,
  isLoading = false,
  validationErrors = [],
  className,
}: SearchFormProps) {
  const [vehicleId, setVehicleId] = useState<string>("");
  const [startDateTime, setStartDateTime] = useState<string>(getDefaultStartDate());
  const [endDateTime, setEndDateTime] = useState<string>(getDefaultEndDate());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    onSearch({
      vehicleId,
      startDateTime,
      endDateTime,
    });
  };

  const isFormValid = vehicleId && startDateTime && endDateTime;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Errores de validacion</span>
          </div>
          <ul className="list-inside list-disc">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Label>Vehiculo</Label>
        <VehicleSelector
          vehicles={vehicles.map((v) => ({ id: v.id, plate: v.plate }))}
          selectedId={vehicleId}
          onSelect={setVehicleId}
          placeholder="Seleccionar vehiculo..."
        />
      </div>

      <div className="space-y-2">
        <Label>Fecha y hora de inicio</Label>
        <DateTimePicker
          value={startDateTime}
          onChange={setStartDateTime}
          minDate={getMinDate()}
          maxDate={new Date()}
          placeholder="Seleccionar inicio..."
        />
      </div>

      <div className="space-y-2">
        <Label>Fecha y hora de fin</Label>
        <DateTimePicker
          value={endDateTime}
          onChange={setEndDateTime}
          minDate={getMinDate()}
          maxDate={new Date()}
          placeholder="Seleccionar fin..."
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || isLoading}
      >
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            Buscando...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Buscar ruta
          </>
        )}
      </Button>
    </form>
  );
}
