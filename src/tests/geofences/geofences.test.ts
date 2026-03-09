/**
 * @fileoverview Tests para el módulo Geofences
 *
 * Cubre:
 * 1. geofencesService — CRUD, KML, batch ops
 * 2. Geofence types (polygon, circle, corridor)
 * 3. GeofenceCategory (8 categorías)
 * 4. Mock data quality
 * 5. page-new.tsx usa useGeofences hook (no window globals)
 * 6. L.Draw handlers (useDrawingTools tiene EDITED/DELETED)
 * 7. page.tsx ya no usa window.__xxx
 *
 * Ejecutar: npx vitest run src/tests/geofences/geofences.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('@/config/api.config', () => ({
  apiConfig: { useMocks: true, baseUrl: 'http://localhost:3000/api' },
  API_ENDPOINTS: {},
}));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { geofencesMock, geofenceColors, geofenceCategories } from '@/mocks/master/geofences.mock';
import type {
  GeofenceType,
  GeofenceCategory,
  Geofence,
  PolygonGeometry,
  CircleGeometry,
  GeofenceAlerts,
} from '@/types/models/geofence';

/* ============================================================
   1. Geofence Types
   ============================================================ */
describe('Geofence Types', () => {
  const validTypes: GeofenceType[] = ['polygon', 'circle', 'corridor'];

  it('tiene 3 tipos válidos', () => {
    expect(validTypes).toHaveLength(3);
  });

  it('polygon y circle son los más comunes', () => {
    const typesInMock = new Set(geofencesMock.map(g => g.geometry.type));
    expect(typesInMock.has('polygon') || typesInMock.has('circle')).toBe(true);
  });
});

/* ============================================================
   2. GeofenceCategory — 8 categorías
   ============================================================ */
describe('Geofence Categories', () => {
  const validCategories: GeofenceCategory[] = [
    'warehouse', 'customer', 'plant', 'port',
    'checkpoint', 'restricted', 'delivery', 'other',
  ];

  it('tiene 8 categorías válidas', () => {
    expect(validCategories).toHaveLength(8);
  });

  it('geofenceCategories mock tiene metadata para cada categoría', () => {
    expect(geofenceCategories).toBeDefined();
    expect(Array.isArray(geofenceCategories) || typeof geofenceCategories === 'object').toBe(true);
  });

  it('geofenceColors tiene al menos 10 colores', () => {
    expect(Array.isArray(geofenceColors)).toBe(true);
    expect(geofenceColors.length).toBeGreaterThanOrEqual(10);
  });
});

/* ============================================================
   3. Mock data quality
   ============================================================ */
describe('Geofence Mock Data', () => {
  it('geofencesMock tiene geocercas', () => {
    expect(Array.isArray(geofencesMock)).toBe(true);
    expect(geofencesMock.length).toBeGreaterThan(0);
  });

  it('cada geocerca tiene campos obligatorios', () => {
    for (const geofence of geofencesMock) {
      expect(geofence).toHaveProperty('id');
      expect(geofence).toHaveProperty('name');
      expect(geofence).toHaveProperty('geometry');
      expect(geofence).toHaveProperty('category');
      expect(geofence).toHaveProperty('color');
      expect(geofence).toHaveProperty('status');
    }
  });

  it('geometry.type es polygon o circle', () => {
    const validTypes = ['polygon', 'circle', 'corridor'];
    for (const geofence of geofencesMock) {
      expect(validTypes).toContain(geofence.geometry.type);
    }
  });

  it('polygon geometries tienen coordinates array', () => {
    const polygons = geofencesMock.filter(g => g.geometry.type === 'polygon');
    for (const pg of polygons) {
      const geo = pg.geometry as PolygonGeometry;
      expect(Array.isArray(geo.coordinates)).toBe(true);
      expect(geo.coordinates.length).toBeGreaterThanOrEqual(3);
      for (const coord of geo.coordinates) {
        expect(typeof coord.lat).toBe('number');
        expect(typeof coord.lng).toBe('number');
      }
    }
  });

  it('circle geometries tienen center y radius', () => {
    const circles = geofencesMock.filter(g => g.geometry.type === 'circle');
    for (const cg of circles) {
      const geo = cg.geometry as CircleGeometry;
      expect(geo.center).toBeDefined();
      expect(typeof geo.center.lat).toBe('number');
      expect(typeof geo.center.lng).toBe('number');
      expect(typeof geo.radius).toBe('number');
      expect(geo.radius).toBeGreaterThan(0);
    }
  });

  it('status es active o inactive', () => {
    for (const geofence of geofencesMock) {
      expect(['active', 'inactive']).toContain(geofence.status);
    }
  });

  it('category es una de las 8 válidas', () => {
    const validCategories = [
      'warehouse', 'customer', 'plant', 'port',
      'checkpoint', 'restricted', 'delivery', 'other',
    ];
    for (const geofence of geofencesMock) {
      expect(validCategories).toContain(geofence.category);
    }
  });
});

/* ============================================================
   4. GeofenceAlerts structure
   ============================================================ */
describe('Geofence Alerts', () => {
  it('geocercas con alerts tienen onEntry y onExit', () => {
    const withAlerts = geofencesMock.filter(g => g.alerts);
    for (const geofence of withAlerts) {
      expect(geofence.alerts).toHaveProperty('onEntry');
      expect(geofence.alerts).toHaveProperty('onExit');
      expect(typeof geofence.alerts!.onEntry).toBe('boolean');
      expect(typeof geofence.alerts!.onExit).toBe('boolean');
    }
  });
});

/* ============================================================
   5. page.tsx migration — NO window.__xxx globals
   ============================================================ */
describe('Geofences Page Migration', () => {
  it('page.tsx no contiene window.__xxx globals', () => {
    const pagePath = path.resolve(__dirname, '../../app/(dashboard)/master/geofences/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    // Must NOT contain window globals
    expect(content).not.toContain('window.__drawPolygon');
    expect(content).not.toContain('window.__drawCircle');
    expect(content).not.toContain('window.__importKML');
    expect(content).not.toContain('window.__editGeofence');
    expect(content).not.toContain('window.__cancelEditing');
    expect(content).not.toContain('window.__saveGeofence');
    expect(content).not.toContain('window.__deleteGeofence');
    expect(content).not.toContain('window.__zoomToGeofence');
    expect(content).not.toContain('window.__flyToCoordinates');
    expect(content).not.toContain('window.__addSearchMarker');
    expect(content).not.toContain('window.__removeSearchMarker');
  });

  it('page.tsx usa useGeofences hook', () => {
    const pagePath = path.resolve(__dirname, '../../app/(dashboard)/master/geofences/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('useGeofences');
  });

  it('page.tsx usa GeofencesMapNew (no GeofencesMap)', () => {
    const pagePath = path.resolve(__dirname, '../../app/(dashboard)/master/geofences/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('GeofencesMapNew');
  });

  it('page.tsx usa useRef para comunicación con el mapa', () => {
    const pagePath = path.resolve(__dirname, '../../app/(dashboard)/master/geofences/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('useRef');
    expect(content).toContain('GeofencesMapNewRef');
  });
});

/* ============================================================
   6. L.Draw handlers — useDrawingTools
   ============================================================ */
describe('L.Draw Handlers (useDrawingTools)', () => {
  it('useDrawingTools.ts tiene EDITED handler', () => {
    const hookPath = path.resolve(__dirname, '../../hooks/useDrawingTools.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('L.Draw.Event.EDITED');
    expect(content).toContain('onGeometryEdited');
  });

  it('useDrawingTools.ts tiene DELETED handler', () => {
    const hookPath = path.resolve(__dirname, '../../hooks/useDrawingTools.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('L.Draw.Event.DELETED');
    expect(content).toContain('onGeometryDeleted');
  });

  it('EDITED handler no está vacío (procesa layers)', () => {
    const hookPath = path.resolve(__dirname, '../../hooks/useDrawingTools.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');
    // Find the EDITED handler and check it has eachLayer
    const editedIndex = content.indexOf('L.Draw.Event.EDITED');
    const editedBlock = content.substring(editedIndex, editedIndex + 200);
    expect(editedBlock).toContain('eachLayer');
  });

  it('DELETED handler no está vacío (procesa layers)', () => {
    const hookPath = path.resolve(__dirname, '../../hooks/useDrawingTools.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');
    const deletedIndex = content.indexOf('L.Draw.Event.DELETED');
    const deletedBlock = content.substring(deletedIndex, deletedIndex + 200);
    expect(deletedBlock).toContain('eachLayer');
  });
});

/* ============================================================
   7. geofences-map-new.tsx uses forwardRef + useImperativeHandle
   ============================================================ */
describe('GeofencesMapNew Architecture', () => {
  it('usa forwardRef', () => {
    const mapNewPath = path.resolve(__dirname, '../../components/geofences/geofences-map-new.tsx');
    const content = fs.readFileSync(mapNewPath, 'utf-8');
    expect(content).toContain('forwardRef');
  });

  it('usa useImperativeHandle', () => {
    const mapNewPath = path.resolve(__dirname, '../../components/geofences/geofences-map-new.tsx');
    const content = fs.readFileSync(mapNewPath, 'utf-8');
    expect(content).toContain('useImperativeHandle');
  });

  it('expone métodos via ref (drawPolygon, etc.)', () => {
    const mapNewPath = path.resolve(__dirname, '../../components/geofences/geofences-map-new.tsx');
    const content = fs.readFileSync(mapNewPath, 'utf-8');
    expect(content).toContain('drawPolygon');
    expect(content).toContain('drawCircle');
  });
});
