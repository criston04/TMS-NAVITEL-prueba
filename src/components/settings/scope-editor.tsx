"use client";

/**
 * ScopeEditor — define el ALCANCE de visibilidad de un usuario.
 *
 * 2026-05-07: creado para que un Tenant Admin pueda restringir QUE DATOS ve un
 * subusuario (no que ACCIONES — eso es el PermissionsEditor).
 *
 * Ejemplos:
 *  - Despachador A solo ve vehiculos de la flota Lima.
 *  - Conductor B solo ve sus propios viajes (driverIds: [self.id]).
 *  - Operador C solo ve geocercas de tipo "warehouse".
 *
 * Backend correspondiente: `PATCH /users/:id/scope`
 */

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Globe } from "lucide-react";
import type { UserScope, ScopeType } from "@/types/platform";
import { vehiclesService } from "@/services/master/vehicles.service";
import { customersService } from "@/services/master/customers.service";
import { geofencesService } from "@/services/master/geofences.service";

interface SimpleEntity {
  id: string;
  label: string;
}

interface ScopeEditorProps {
  value: UserScope;
  onChange: (scope: UserScope) => void;
  readOnly?: boolean;
}

const SCOPE_OPTIONS: Array<{ value: ScopeType; label: string; description: string }> = [
  { value: "all", label: "Sin restriccion", description: "Ve TODOS los datos del tenant." },
  { value: "by_vehicles", label: "Por vehiculos", description: "Solo ve unidades especificas." },
  { value: "by_fleet_groups", label: "Por grupos de flota", description: "Solo ve grupos asignados." },
  { value: "by_geofences", label: "Por geocercas", description: "Solo ve datos en geocercas asignadas." },
  { value: "by_customers", label: "Por clientes", description: "Solo ve ordenes de clientes asignados." },
  { value: "custom", label: "Personalizado", description: "Combinacion de varios filtros." },
];

const OPERATION_TYPES = [
  "delivery", "pickup", "transfer", "return", "rental", "maintenance",
];

export function ScopeEditor({ value, onChange, readOnly = false }: ScopeEditorProps) {
  const [vehicles, setVehicles] = useState<SimpleEntity[]>([]);
  const [customers, setCustomers] = useState<SimpleEntity[]>([]);
  const [geofences, setGeofences] = useState<SimpleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar listas solo cuando se necesita
  useEffect(() => {
    if (value.type === "all") return;

    setIsLoading(true);
    Promise.all([
      value.type === "by_vehicles" || value.type === "custom"
        ? vehiclesService.getAll({ pageSize: 200 }).then((r) =>
            r.items.map((v) => ({
              id: v.id,
              label: `${v.plate} — ${v.specs?.brand ?? ""} ${v.specs?.model ?? ""}`.trim(),
            })),
          ).catch(() => [])
        : Promise.resolve([]),
      value.type === "by_customers" || value.type === "custom"
        ? customersService.getAll({ pageSize: 200 }).then((r) =>
            r.items.map((c) => ({ id: c.id, label: c.name })),
          ).catch(() => [])
        : Promise.resolve([]),
      value.type === "by_geofences" || value.type === "custom"
        ? geofencesService.getAll({ pageSize: 200 }).then((r) =>
            r.items.map((g) => ({ id: g.id, label: g.name })),
          ).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([v, c, g]) => {
        setVehicles(v);
        setCustomers(c);
        setGeofences(g);
      })
      .finally(() => setIsLoading(false));
  }, [value.type]);

  const handleTypeChange = (type: ScopeType) => {
    if (readOnly) return;
    // Reset arrays cuando cambia el tipo
    onChange({ type });
  };

  const toggleArrayItem = (
    field: "vehicleIds" | "fleetGroupIds" | "geofenceIds" | "customerIds" | "operationTypes" | "driverIds",
    id: string,
  ) => {
    if (readOnly) return;
    const current = value[field] ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ ...value, [field]: next });
  };

  const summary = useMemo(() => {
    if (value.type === "all") return "Sin restriccion (ve todo)";
    const parts: string[] = [];
    if (value.vehicleIds?.length) parts.push(`${value.vehicleIds.length} vehiculos`);
    if (value.fleetGroupIds?.length) parts.push(`${value.fleetGroupIds.length} grupos`);
    if (value.geofenceIds?.length) parts.push(`${value.geofenceIds.length} geocercas`);
    if (value.customerIds?.length) parts.push(`${value.customerIds.length} clientes`);
    if (value.operationTypes?.length) parts.push(`${value.operationTypes.length} tipos`);
    if (value.driverIds?.length) parts.push(`${value.driverIds.length} conductores`);
    return parts.length === 0 ? "Sin items asignados" : parts.join(" + ");
  }, [value]);

  return (
    <div className="space-y-4">
      {/* Selector de tipo */}
      <div className="space-y-2">
        <Label htmlFor="scopeType">Tipo de alcance</Label>
        <Select
          value={value.type}
          onValueChange={(v: ScopeType) => handleTypeChange(v)}
          disabled={readOnly}
        >
          <SelectTrigger id="scopeType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumen */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          <strong>Alcance:</strong> {summary}
        </AlertDescription>
      </Alert>

      {value.type === "all" ? (
        <p className="text-sm text-muted-foreground">
          Sin restriccion. El usuario tiene visibilidad completa de los datos del tenant.
        </p>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vehiculos */}
          {(value.type === "by_vehicles" || value.type === "custom") && (
            <EntityPicker
              label={`Vehiculos (${value.vehicleIds?.length ?? 0} seleccionados)`}
              entities={vehicles}
              selected={value.vehicleIds ?? []}
              onToggle={(id) => toggleArrayItem("vehicleIds", id)}
              readOnly={readOnly}
            />
          )}

          {/* Geocercas */}
          {(value.type === "by_geofences" || value.type === "custom") && (
            <EntityPicker
              label={`Geocercas (${value.geofenceIds?.length ?? 0} seleccionadas)`}
              entities={geofences}
              selected={value.geofenceIds ?? []}
              onToggle={(id) => toggleArrayItem("geofenceIds", id)}
              readOnly={readOnly}
            />
          )}

          {/* Clientes */}
          {(value.type === "by_customers" || value.type === "custom") && (
            <EntityPicker
              label={`Clientes (${value.customerIds?.length ?? 0} seleccionados)`}
              entities={customers}
              selected={value.customerIds ?? []}
              onToggle={(id) => toggleArrayItem("customerIds", id)}
              readOnly={readOnly}
            />
          )}

          {/* Tipos de operacion */}
          {(value.type === "custom") && (
            <div className="space-y-2">
              <Label>Tipos de operacion</Label>
              <div className="flex flex-wrap gap-2">
                {OPERATION_TYPES.map((t) => {
                  const isSelected = value.operationTypes?.includes(t) ?? false;
                  return (
                    <Button
                      key={t}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayItem("operationTypes", t)}
                      disabled={readOnly}
                    >
                      {t}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-componente: lista filtrable con checkboxes ──

interface EntityPickerProps {
  label: string;
  entities: SimpleEntity[];
  selected: string[];
  onToggle: (id: string) => void;
  readOnly?: boolean;
}

function EntityPicker({ label, entities, selected, onToggle, readOnly }: EntityPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      entities.filter((e) =>
        e.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [entities, search],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Badge variant="secondary" className="text-xs">
          {selected.length} / {entities.length}
        </Badge>
      </div>
      <input
        type="text"
        placeholder={`Buscar... (${entities.length} disponibles)`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border px-3 py-1.5 text-sm"
        disabled={readOnly}
      />
      {entities.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No hay items disponibles (verifica que el modulo este activo y existan registros).
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/10 p-2 space-y-1">
          {filtered.map((e) => {
            const isChecked = selected.includes(e.id);
            return (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggle(e.id)}
                  disabled={readOnly}
                />
                <span className="text-sm">{e.label}</span>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              Ningun item coincide con "{search}".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
