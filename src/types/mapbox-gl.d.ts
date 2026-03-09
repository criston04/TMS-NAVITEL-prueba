declare module 'mapbox-gl' {
  namespace mapboxgl {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type StyleSpecification = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Map = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Marker = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type LngLatBounds = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type NavigationControl = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ScaleControl = any;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapboxgl: any;
  export default mapboxgl;
  export = mapboxgl;
}

declare module 'mapbox-gl/dist/mapbox-gl.css' {
  const content: string;
  export default content;
}
