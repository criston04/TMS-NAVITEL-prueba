---
description: "Use when working with maps, geofences, route planning, Leaflet, React-Leaflet, drawing tools, geocoding, GPS tracking, or any geospatial feature in TMS-NAVITEL."
applyTo: "src/components/map/**,src/components/geofences/**,src/components/route-planner/**,src/components/monitoring/**,src/hooks/useDrawingTools*,src/services/geocoding*,src/services/routing*,src/contexts/route-planner*,src/types/route-planner*,src/types/geofence*,src/types/monitoring*"
---

# Maps & Geospatial Instructions — TMS-NAVITEL

## Stack

- **Leaflet** 1.9+ (core map library)
- **React-Leaflet** 5+ (React bindings — component-based API)
- **leaflet-draw** (drawing tools for geofences/routes)
- **leaflet-path-drag** (draggable paths)
- **Custom styles**: `src/styles/leaflet-custom.css`

## Architecture

### Component Organization
```
src/components/
├── map/              # Shared map primitives and base map component
├── geofences/        # Geofence creation, editing, visualization
├── route-planner/    # Route planning with waypoints and optimization
└── monitoring/       # Real-time vehicle tracking and GPS visualization
```

### Context
- `src/contexts/route-planner-context.tsx` — Manages route planner state (waypoints, routes, optimization settings).
- Map components consume this context; services handle geocoding/routing API calls.

### Hooks
- `useDrawingTools` — Manages Leaflet Draw integration for creating/editing geofences.
- Map-specific hooks should follow the same `{ data, isLoading, error }` return pattern.

## React-Leaflet 5 Rules

1. **Component-based API**: Use `<MapContainer>`, `<TileLayer>`, `<Marker>`, `<Polygon>`, etc. — not imperative Leaflet API.
2. **No direct DOM access**: Avoid `document.getElementById` for map containers.
3. **Event handling**: Use React-Leaflet event props (`eventHandlers={{ click: handler }}`).
4. **Dynamic updates**: Use `useMap()` hook inside child components to access the map instance when imperative control is needed.
5. **SSR safety**: Leaflet requires `window`. Use `dynamic(() => import(...), { ssr: false })` for map components in Next.js.

```typescript
// ✅ SSR-safe map component
import dynamic from 'next/dynamic';

const MapView = dynamic(
  () => import('@/components/map/map-view'),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```

## Geospatial Data

- Coordinates: always `[lat, lng]` for Leaflet (not `[lng, lat]` like GeoJSON).
- GeoJSON support via `@mapbox/togeojson` for KML/GPX imports.
- Validate coordinate bounds before rendering (lat: -90 to 90, lng: -180 to 180).
- Handle edge cases: empty coordinate arrays, single-point polygons, self-intersecting geometries.

## Performance

- Use `useMemo` for large marker arrays to prevent re-rendering the entire layer.
- Cluster markers when displaying 100+ points.
- Debounce map move/zoom events before triggering data fetches.
- Avoid re-creating tile layer instances on re-render.

## What to Avoid

- Imperative Leaflet API when React-Leaflet components suffice
- Rendering maps without SSR protection in Next.js
- Unbounded marker rendering without clustering
- Hardcoded tile server URLs — use configuration
- Memory leaks from event listeners not cleaned up on unmount
