"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, Search, Car } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VehicleOption {
  id: string;
  plate: string;
  economicNumber?: string;
  type?: string;
}

interface VehicleSelectorProps {
  vehicles: VehicleOption[];
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect: (vehicleId: string) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function VehicleSelector({
  vehicles,
  selectedId,
  selectedIds = [],
  onSelect,
  multiple = false,
  placeholder = "Select vehicle...",
  disabled = false,
  className,
}: VehicleSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles;
    const searchLower = search.toLowerCase();
    return vehicles.filter(v => 
      v.plate.toLowerCase().includes(searchLower) ||
      v.economicNumber?.toLowerCase().includes(searchLower)
    );
  }, [vehicles, search]);

  const selectedVehicle = useMemo(() => {
    if (!selectedId) return null;
    return vehicles.find(v => v.id === selectedId);
  }, [vehicles, selectedId]);

  const buttonText = useMemo(() => {
    if (multiple) {
      if (selectedIds.length === 0) return placeholder;
      if (selectedIds.length === 1) {
        const v = vehicles.find(v => v.id === selectedIds[0]);
        return v?.plate || placeholder;
      }
      return `${selectedIds.length} vehicles`;
    }
    return selectedVehicle?.plate || placeholder;
  }, [multiple, selectedIds, selectedVehicle, vehicles, placeholder]);

  const handleSelect = (vehicleId: string) => {
    onSelect(vehicleId);
    if (!multiple) {
      setIsOpen(false);
    }
  };

  const isSelected = (vehicleId: string) => {
    if (multiple) {
      return selectedIds.includes(vehicleId);
    }
    return selectedId === vehicleId;
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={!selectedVehicle ? "text-muted-foreground" : ""}>
            {buttonText}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by plate..."
              className="flex h-10 w-full bg-transparent py-3 pl-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          
          <ScrollArea className="max-h-[200px]">
            {filteredVehicles.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No vehicles found
              </div>
            ) : (
              <div className="p-1">
                {filteredVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => handleSelect(vehicle.id)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected(vehicle.id) && "bg-accent"
                    )}
                  >
                    <span className="flex-1 text-left">
                      <span className="font-medium">{vehicle.plate}</span>
                      {vehicle.economicNumber && (
                        <span className="ml-2 text-muted-foreground">
                          {vehicle.economicNumber}
                        </span>
                      )}
                    </span>
                    {isSelected(vehicle.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
