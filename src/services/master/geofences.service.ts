import { BulkService } from "@/services/base.service";
import { 
  Geofence, 
  GeofenceGeometry, 
  GeofenceCategory,
  GeofenceAlerts,
  GeofenceStats,
  PolygonGeometry,
  CircleGeometry,
  GeoCoordinate 
} from "@/types/models/geofence";
import { geofencesMock } from "@/mocks/master";

/**
 * Opciones de exportación KML
 */
interface KMLExportOptions {
  geofenceIds?: string[];
  includeStyles?: boolean;
  includeFolders?: boolean;
}

/**
 * Resultado de importación KML
 */
interface KMLImportResult {
  imported: Geofence[];
  errors: Array<{
    name: string;
    reason: string;
  }>;
}

/**
 * Filtros específicos de geocercas
 */
export interface GeofenceFilters {
  category?: GeofenceCategory;
  type?: "polygon" | "circle" | "corridor";
  tags?: string[];
  customerId?: string;
  hasAlerts?: boolean;
}

/**
 * Servicio de Geocercas
 * Extiende BulkService para soporte de importación/exportación
 */
class GeofencesService extends BulkService<Geofence> {
  constructor() {
    super("/master/geofences", geofencesMock);
  }

  /**
   * Obtiene geocercas filtradas por categoría
   */
  async getByCategory(category: GeofenceCategory): Promise<Geofence[]> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      return this.mockData.filter((g) => g.category === category);
    }
    
    const response = await this.getAll({ 
      filters: { category } 
    });
    return response.items;
  }

  /**
   * Obtiene geocercas por tipo geométrico
   */
  async getByType(type: "polygon" | "circle" | "corridor"): Promise<Geofence[]> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      return this.mockData.filter((g) => g.type === type);
    }
    
    const response = await this.getAll({ 
      filters: { type } 
    });
    return response.items;
  }

  /**
   * Obtiene geocercas asociadas a un cliente
   */
  async getByCustomer(customerId: string): Promise<Geofence[]> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      return this.mockData.filter((g) => g.customerId === customerId);
    }
    
    const response = await this.getAll({ 
      filters: { customerId } 
    });
    return response.items;
  }

  /**
   * Obtiene geocercas que contienen un punto
   */
  async getContainingPoint(point: GeoCoordinate): Promise<Geofence[]> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      return this.mockData.filter((g) => this.isPointInGeofence(point, g));
    }
    
    // En producción, esto se haría en el backend con PostGIS
    const response = await this.getAll();
    return response.items.filter((g) => this.isPointInGeofence(point, g));
  }

  /**
   * Verifica si un punto está dentro de una geocerca
   */
  private isPointInGeofence(point: GeoCoordinate, geofence: Geofence): boolean {
    const { geometry } = geofence;
    
    if (geometry.type === "circle") {
      const circleGeom = geometry as CircleGeometry;
      const distance = this.calculateDistance(point, circleGeom.center);
      return distance <= circleGeom.radius;
    }
    
    if (geometry.type === "polygon") {
      const polygonGeom = geometry as PolygonGeometry;
      return this.isPointInPolygon(point, polygonGeom.coordinates);
    }
    
    // Corridor - simplificado
    return false;
  }

  /**
   * Calcula distancia entre dos puntos (Haversine)
   */
  private calculateDistance(p1: GeoCoordinate, p2: GeoCoordinate): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRad(p2.lat - p1.lat);
    const dLng = this.toRad(p2.lng - p1.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(p1.lat)) * Math.cos(this.toRad(p2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Verifica si un punto está dentro de un polígono (Ray Casting)
   */
  private isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
    let inside = false;
    const x = point.lng;
    const y = point.lat;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Calcula el área de una geocerca en metros cuadrados
   */
  calculateArea(geofence: Geofence): number {
    const { geometry } = geofence;
    
    if (geometry.type === "circle") {
      const circleGeom = geometry as CircleGeometry;
      return Math.PI * Math.pow(circleGeom.radius, 2);
    }
    
    if (geometry.type === "polygon") {
      const polygonGeom = geometry as PolygonGeometry;
      return this.calculatePolygonArea(polygonGeom.coordinates);
    }
    
    return 0;
  }

  /**
   * Calcula área de polígono usando fórmula de Shoelace
   */
  private calculatePolygonArea(coordinates: GeoCoordinate[]): number {
    if (coordinates.length < 3) return 0;
    
    let area = 0;
    const n = coordinates.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // Convertir a metros aproximados
      const x1 = coordinates[i].lng * 111320 * Math.cos(coordinates[i].lat * Math.PI / 180);
      const y1 = coordinates[i].lat * 110540;
      const x2 = coordinates[j].lng * 111320 * Math.cos(coordinates[j].lat * Math.PI / 180);
      const y2 = coordinates[j].lat * 110540;
      
      area += x1 * y2 - x2 * y1;
    }
    
    return Math.abs(area / 2);
  }

  /**
   * Calcula el perímetro de una geocerca en metros
   */
  calculatePerimeter(geofence: Geofence): number {
    const { geometry } = geofence;
    
    if (geometry.type === "circle") {
      const circleGeom = geometry as CircleGeometry;
      return 2 * Math.PI * circleGeom.radius;
    }
    
    if (geometry.type === "polygon") {
      const polygonGeom = geometry as PolygonGeometry;
      let perimeter = 0;
      const coords = polygonGeom.coordinates;
      
      for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        perimeter += this.calculateDistance(coords[i], coords[j]);
      }
      
      return perimeter;
    }
    
    return 0;
  }

  /**
   * Obtiene estadísticas de geocercas
   */
  async getStats(): Promise<GeofenceStats> {
    if (this.useMocks) {
      await this.simulateDelay(300);
    }
    
    const geofences = this.useMocks 
      ? this.mockData 
      : (await this.getAll()).items;
    
    const byCategory = {} as Record<GeofenceCategory, number>;
    const categories: GeofenceCategory[] = [
      "warehouse", "customer", "plant", "port", 
      "checkpoint", "restricted", "delivery", "other"
    ];
    
    categories.forEach((cat) => {
      byCategory[cat] = geofences.filter((g) => g.category === cat).length;
    });
    
    const uniqueTags = new Set(
      geofences.flatMap((g) => g.tags.map((t) => t.id))
    );
    
    return {
      total: geofences.length,
      polygons: geofences.filter((g) => g.type === "polygon").length,
      circles: geofences.filter((g) => g.type === "circle").length,
      byCategory,
      tagsCount: uniqueTags.size,
    };
  }

  /**
   * Exporta geocercas a formato KML
   */
  async exportToKML(options: KMLExportOptions = {}): Promise<string> {
    await this.simulateDelay(500);
    
    const { geofenceIds, includeStyles = true } = options;
    
    let geofences = this.mockData;
    if (geofenceIds && geofenceIds.length > 0) {
      geofences = geofences.filter((g) => geofenceIds.includes(g.id));
    }
    
    const kmlContent = this.generateKML(geofences, includeStyles);
    return kmlContent;
  }

  /**
   * Genera contenido KML
   */
  private generateKML(geofences: Geofence[], includeStyles: boolean): string {
    const styles = includeStyles ? geofences.map((g) => `
    <Style id="style-${g.id}">
      <LineStyle>
        <color>${this.hexToKMLColor(g.color)}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>${this.hexToKMLColor(g.color, g.opacity)}</color>
      </PolyStyle>
    </Style>`).join("") : "";

    const placemarks = geofences.map((g) => {
      let geometryKML = "";
      
      if (g.geometry.type === "polygon") {
        const polygonGeom = g.geometry as PolygonGeometry;
        const coords = polygonGeom.coordinates
          .map((c) => `${c.lng},${c.lat},0`)
          .join(" ");
        geometryKML = `
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coords} ${polygonGeom.coordinates[0].lng},${polygonGeom.coordinates[0].lat},0</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>`;
      } else if (g.geometry.type === "circle") {
        // KML no soporta círculos nativamente, aproximamos con polígono
        const circleGeom = g.geometry as CircleGeometry;
        const circleCoords = this.generateCircleCoordinates(
          circleGeom.center, 
          circleGeom.radius, 
          36
        );
        const coords = circleCoords.map((c) => `${c.lng},${c.lat},0`).join(" ");
        geometryKML = `
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coords}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>`;
      }

      return `
    <Placemark>
      <name>${this.escapeXML(g.name)}</name>
      <description>${this.escapeXML(g.description || "")}</description>
      ${includeStyles ? `<styleUrl>#style-${g.id}</styleUrl>` : ""}
      ${geometryKML}
    </Placemark>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Geocercas TMS Navitel</name>
    <description>Exportación de geocercas</description>
    ${styles}
    ${placemarks}
  </Document>
</kml>`;
  }

  /**
   * Genera coordenadas de círculo aproximado
   */
  private generateCircleCoordinates(
    center: GeoCoordinate, 
    radius: number, 
    points: number
  ): GeoCoordinate[] {
    const coords: GeoCoordinate[] = [];
    const earthRadius = 6371000;
    
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360 / points) * (Math.PI / 180);
      const latOffset = (radius / earthRadius) * (180 / Math.PI);
      const lngOffset = latOffset / Math.cos(center.lat * Math.PI / 180);
      
      coords.push({
        lat: center.lat + latOffset * Math.cos(angle),
        lng: center.lng + lngOffset * Math.sin(angle),
      });
    }
    
    return coords;
  }

  /**
   * Convierte color hex a formato KML (AABBGGRR)
   */
  private hexToKMLColor(hex: string, opacity: number = 1): string {
    const cleanHex = hex.replace("#", "");
    const r = cleanHex.substring(0, 2);
    const g = cleanHex.substring(2, 4);
    const b = cleanHex.substring(4, 6);
    const a = Math.round(opacity * 255).toString(16).padStart(2, "0");
    return `${a}${b}${g}${r}`;
  }

  /**
   * Escapa caracteres especiales para XML
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Importa geocercas desde KML
   */
  async importFromKML(kmlContent: string): Promise<KMLImportResult> {
    await this.simulateDelay(800);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlContent, "text/xml");
    const placemarks = doc.querySelectorAll("Placemark");
    
    const imported: Geofence[] = [];
    const errors: Array<{ name: string; reason: string }> = [];
    
    placemarks.forEach((placemark) => {
      const name = placemark.querySelector("name")?.textContent || "Sin nombre";
      const description = placemark.querySelector("description")?.textContent || "";
      
      try {
        const polygon = placemark.querySelector("Polygon");
        const point = placemark.querySelector("Point");
        
        if (polygon) {
          const coordsStr = polygon.querySelector("coordinates")?.textContent?.trim();
          if (coordsStr) {
            const coordinates = this.parseKMLCoordinates(coordsStr);
            if (coordinates.length >= 3) {
              const geofence = this.createGeofenceFromKML(name, description, {
                type: "polygon",
                coordinates,
              });
              imported.push(geofence);
              this.mockData.push(geofence);
            }
          }
        } else if (point) {
          // Crear círculo con radio default
          const coordsStr = point.querySelector("coordinates")?.textContent?.trim();
          if (coordsStr) {
            const [lng, lat] = coordsStr.split(",").map(Number);
            const geofence = this.createGeofenceFromKML(name, description, {
              type: "circle",
              center: { lat, lng },
              radius: 500, // Radio default de 500m
            });
            imported.push(geofence);
            this.mockData.push(geofence);
          }
        } else {
          errors.push({ name, reason: "Geometría no soportada" });
        }
      } catch {
        errors.push({ name, reason: "Error al procesar geometría" });
      }
    });
    
    return { imported, errors };
  }

  /**
   * Parsea coordenadas KML
   */
  private parseKMLCoordinates(coordsStr: string): GeoCoordinate[] {
    return coordsStr
      .trim()
      .split(/\s+/)
      .filter((c) => c.length > 0)
      .map((coord) => {
        const [lng, lat] = coord.split(",").map(Number);
        return { lat, lng };
      })
      .filter((c) => !isNaN(c.lat) && !isNaN(c.lng));
  }

  /**
   * Crea geocerca desde datos KML
   */
  private createGeofenceFromKML(
    name: string, 
    description: string, 
    geometry: GeofenceGeometry
  ): Geofence {
    const now = new Date().toISOString();
    return {
      id: `geo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: `KML-${Date.now()}`,
      name,
      description,
      type: geometry.type,
      category: "other",
      geometry,
      color: "#00c9ff",
      opacity: 0.2,
      tags: [],
      alerts: {
        onEntry: false,
        onExit: false,
        onDwell: false,
      },
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Valida que un polígono no se auto-intersecte
   */
  validatePolygon(coordinates: GeoCoordinate[]): { valid: boolean; message?: string } {
    if (coordinates.length < 3) {
      return { valid: false, message: "El polígono debe tener al menos 3 puntos" };
    }
    
    // Verificar auto-intersección
    for (let i = 0; i < coordinates.length; i++) {
      const a1 = coordinates[i];
      const a2 = coordinates[(i + 1) % coordinates.length];
      
      for (let j = i + 2; j < coordinates.length; j++) {
        if (j === coordinates.length - 1 && i === 0) continue; // Ignorar último con primero
        
        const b1 = coordinates[j];
        const b2 = coordinates[(j + 1) % coordinates.length];
        
        if (this.linesIntersect(a1, a2, b1, b2)) {
          return { valid: false, message: "El polígono se auto-intersecta" };
        }
      }
    }
    
    return { valid: true };
  }

  /**
   * Verifica si dos líneas se intersectan
   */
  private linesIntersect(
    a1: GeoCoordinate, 
    a2: GeoCoordinate, 
    b1: GeoCoordinate, 
    b2: GeoCoordinate
  ): boolean {
    const det = (a2.lng - a1.lng) * (b2.lat - b1.lat) - (b2.lng - b1.lng) * (a2.lat - a1.lat);
    if (det === 0) return false;
    
    const lambda = ((b2.lat - b1.lat) * (b2.lng - a1.lng) + (b1.lng - b2.lng) * (b2.lat - a1.lat)) / det;
    const gamma = ((a1.lat - a2.lat) * (b2.lng - a1.lng) + (a2.lng - a1.lng) * (b2.lat - a1.lat)) / det;
    
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }

  /**
   * Actualiza configuración de alertas
   */
  async updateAlerts(id: string, alerts: GeofenceAlerts): Promise<Geofence> {
    return this.update(id, { alerts });
  }

  /**
   * Asocia geocerca a un cliente
   */
  async associateCustomer(geofenceId: string, customerId: string): Promise<Geofence> {
    return this.update(geofenceId, { customerId });
  }

  /**
   * Cambia el estado de una geocerca
   */
  async toggleStatus(id: string): Promise<Geofence> {
    const geofence = await this.getById(id);
    const newStatus = geofence.status === "active" ? "inactive" : "active";
    return this.update(id, { status: newStatus });
  }

  /**
   * Duplica una geocerca
   */
  async duplicate(id: string, newName?: string): Promise<Geofence> {
    const original = await this.getById(id);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = original;
    
    return this.create({
      ...rest,
      name: newName || `${original.name} (copia)`,
      code: `GEO-${Date.now()}`,
    });
  }

  /**
   * Elimina múltiples geocercas
   */
  async deleteMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(id)));
  }

  /**
   * Actualiza color de múltiples geocercas
   */
  async updateColorBatch(ids: string[], color: string): Promise<Geofence[]> {
    return Promise.all(ids.map((id) => this.update(id, { color })));
  }
}

/** Instancia singleton del servicio */
export const geofencesService = new GeofencesService();
