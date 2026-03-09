// leaflet-path-drag
declare module "leaflet-path-drag" {
  import * as L from "leaflet";
  
  interface DraggableOptions {
    draggable?: boolean;
  }
  
  // Extender las interfaces de Leaflet
  declare module "leaflet" {
    interface PathOptions {
      draggable?: boolean;
    }
    
    interface Path {
      dragging?: {
        enable: () => void;
        disable: () => void;
        enabled: () => boolean;
      };
    }
    
    interface Polygon {
      dragging?: {
        enable: () => void;
        disable: () => void;
        enabled: () => boolean;
      };
    }
    
    interface Circle {
      dragging?: {
        enable: () => void;
        disable: () => void;
        enabled: () => boolean;
      };
    }
  }
}

// leaflet-draw extensions
declare module "leaflet" {
  namespace Draw {
    class Polygon {
      constructor(map: L.Map | L.DrawMap, options?: object);
      enable(): void;
      disable(): void;
    }
    
    class Circle {
      constructor(map: L.Map | L.DrawMap, options?: object);
      enable(): void;
      disable(): void;
    }
    
    class Rectangle {
      constructor(map: L.Map | L.DrawMap, options?: object);
      enable(): void;
      disable(): void;
    }
    
    class Marker {
      constructor(map: L.Map | L.DrawMap, options?: object);
      enable(): void;
      disable(): void;
    }
    
    class Polyline {
      constructor(map: L.Map | L.DrawMap, options?: object);
      enable(): void;
      disable(): void;
    }
  }
  
  namespace DrawEvents {
    interface Created {
      layer: L.Layer;
      layerType: string;
    }
    
    interface Edited {
      layers: L.LayerGroup;
    }
    
    interface Deleted {
      layers: L.LayerGroup;
    }
  }
  
  namespace Edit {
    class Poly {
      constructor(layer: L.Polygon, options?: object);
      enable(): void;
      disable(): void;
    }
    
    class Circle {
      constructor(layer: L.Circle);
      enable(): void;
      disable(): void;
    }
  }
  
  interface DrawMap extends L.Map {
    mergeOptions: (options: object) => void;
    addInitHook: (hook: () => void) => void;
  }
}
