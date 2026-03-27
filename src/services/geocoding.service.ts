export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  confidence: "high" | "medium" | "low";
  source: "nominatim" | "google" | "manual";
}

export interface GeocodingError {
  code: "NOT_FOUND" | "RATE_LIMITED" | "API_ERROR" | "INVALID_ADDRESS";
  message: string;
}

/**
 * Servicio de geocodificación
 */
class GeocodingService {
  private nominatimUrl = "https://nominatim.openstreetmap.org/search";
  private cache = new Map<string, GeocodingResult>();
  private readonly CACHE_MAX_SIZE = 200;
  private lastRequestTime = 0;
  private minRequestInterval = 1100; // Nominatim requiere 1 request/segundo
  private rateLimitPromise: Promise<void> = Promise.resolve();

  /**
   * Geocodifica una dirección
   */
  async geocode(address: string, city?: string, country = "Peru"): Promise<GeocodingResult> {
    const fullAddress = [address, city, country].filter(Boolean).join(", ");
    const cacheKey = fullAddress.toLowerCase().trim();

    // Verificar caché
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    await this.waitForRateLimit();

    const result = await this.geocodeWithNominatim(fullAddress);
    this.addToCache(cacheKey, result);
    return result;
  }

  /**
   * Geocodifica usando OpenStreetMap Nominatim (gratuito)
   */
  private async geocodeWithNominatim(address: string): Promise<GeocodingResult> {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
      addressdetails: "1",
    });

    const response = await fetch(`${this.nominatimUrl}?${params}`, {
      headers: {
        "User-Agent": "TMS-Navitel/1.0 (contact@navitel.com)",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw { code: "RATE_LIMITED", message: "Demasiadas solicitudes. Intente más tarde." } as GeocodingError;
      }
      throw { code: "API_ERROR", message: "Error en el servicio de geocodificación" } as GeocodingError;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw { code: "NOT_FOUND", message: "No se encontraron coordenadas para esta dirección" } as GeocodingError;
    }

    const result = data[0];
    const importance = parseFloat(result.importance || "0");

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      formattedAddress: result.display_name,
      confidence: importance > 0.6 ? "high" : importance > 0.3 ? "medium" : "low",
      source: "nominatim",
    };
  }

  /**
   * Geocodificación reversa (coordenadas a dirección)
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    await this.waitForRateLimit();

    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          "User-Agent": "TMS-Navitel/1.0 (contact@navitel.com)",
        },
      }
    );

    this.lastRequestTime = Date.now();

    if (!response.ok) {
      throw { code: "API_ERROR", message: "Error en geocodificación reversa" } as GeocodingError;
    }

    const data = await response.json();
    return data.display_name || "";
  }

  /**
   * Valida si las coordenadas son válidas para Perú
   */
  isValidPeruCoordinates(lat: number, lng: number): boolean {
    // Límites aproximados de Perú
    const peruBounds = {
      minLat: -18.35,
      maxLat: -0.04,
      minLng: -81.33,
      maxLng: -68.65,
    };

    return (
      lat >= peruBounds.minLat &&
      lat <= peruBounds.maxLat &&
      lng >= peruBounds.minLng &&
      lng <= peruBounds.maxLng
    );
  }

  /**
   * Obtiene sugerencias de direcciones con precisión a nivel de calle
   */
  async getSuggestions(query: string, country = "Peru"): Promise<Array<{
    address: string;
    lat: number;
    lng: number;
  }>> {
    if (query.length < 3) return [];

    await this.waitForRateLimit();

    const params = new URLSearchParams({
      q: `${query}, ${country}`,
      format: "json",
      limit: "8",
      countrycodes: "pe",
      addressdetails: "1",
      dedupe: "1",
    });

    try {
      const response = await fetch(`${this.nominatimUrl}?${params}`, {
        headers: {
          "User-Agent": "TMS-Navitel/1.0 (contact@navitel.com)",
        },
      });

      this.lastRequestTime = Date.now();

      if (!response.ok) return [];

      const data = await response.json();
      return data.map((item: { display_name: string; lat: string; lon: string }) => ({
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Limpia la caché
   */
  clearCache(): void {
    this.cache.clear();
  }

  private addToCache(key: string, result: GeocodingResult): void {
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, result);
  }

  private async waitForRateLimit(): Promise<void> {
    this.rateLimitPromise = this.rateLimitPromise.then(async () => {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.minRequestInterval) {
        await new Promise(resolve =>
          setTimeout(resolve, this.minRequestInterval - elapsed)
        );
      }
      this.lastRequestTime = Date.now();
    });
    return this.rateLimitPromise;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** Instancia singleton */
export const geocodingService = new GeocodingService();
