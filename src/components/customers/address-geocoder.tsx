"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, CheckCircle2, AlertCircle, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { geocodingService, GeocodingResult, GeocodingError } from "@/services/geocoding.service";

interface AddressGeocoderProps {
  street: string;
  city: string;
  state: string;
  country?: string;
  currentCoordinates?: { lat: number; lng: number } | null;
  onCoordinatesFound: (coords: { lat: number; lng: number }, formattedAddress: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AddressGeocoder({
  street,
  city,
  state,
  country = "Perú",
  currentCoordinates,
  onCoordinatesFound,
  disabled = false,
  className,
}: AddressGeocoderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeocodingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const canGeocode = street.length >= 5 && city.length >= 2;

  const handleGeocode = useCallback(async () => {
    if (!canGeocode) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const fullAddress = [street, city, state, country].filter(Boolean).join(", ");
      const geocodeResult = await geocodingService.geocode(fullAddress);
      setResult(geocodeResult);
    } catch (err) {
      const geoError = err as GeocodingError;
      setError(geoError.message || "Error al geocodificar");
    } finally {
      setIsLoading(false);
    }
  }, [street, city, state, country, canGeocode]);

  const handleApplyCoordinates = useCallback(() => {
    if (result) {
      onCoordinatesFound(
        { lat: result.lat, lng: result.lng },
        result.formattedAddress
      );
      setIsOpen(false);
    }
  }, [result, onCoordinatesFound]);

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Alta precisión
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Precisión media
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Baja precisión
          </Badge>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canGeocode}
          className={cn(
            "gap-1.5",
            currentCoordinates && "border-green-500 text-green-600",
            className
          )}
          onClick={() => {
            if (!isOpen) {
              handleGeocode();
            }
            setIsOpen(true);
          }}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : currentCoordinates ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          <span className="text-xs">
            {currentCoordinates ? "Ubicado" : "Ubicar"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Geocodificación</span>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                Buscando ubicación...
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    No se pudo ubicar
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={handleGeocode}
              >
                Reintentar
              </Button>
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                      Ubicación encontrada
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 line-clamp-2">
                      {result.formattedAddress}
                    </p>
                  </div>
                  {getConfidenceBadge(result.confidence)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">Latitud</span>
                  <p className="font-mono font-medium">{result.lat.toFixed(6)}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">Longitud</span>
                  <p className="font-mono font-medium">{result.lng.toFixed(6)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleApplyCoordinates}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Aplicar
                </Button>
              </div>
            </div>
          )}

          {currentCoordinates && !result && !isLoading && !error && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Coordenadas actuales:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">Latitud</span>
                  <p className="font-mono font-medium">{currentCoordinates.lat.toFixed(6)}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">Longitud</span>
                  <p className="font-mono font-medium">{currentCoordinates.lng.toFixed(6)}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleGeocode}
              >
                Buscar nueva ubicación
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
