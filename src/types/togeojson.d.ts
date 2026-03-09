declare module 'togeojson' {
  const toGeoJSON: {
    kml: (doc: Document) => GeoJSON.FeatureCollection;
    gpx: (doc: Document) => GeoJSON.FeatureCollection;
  };
  export default toGeoJSON;
}

declare module '@mapbox/togeojson' {
  export function kml(doc: Document): GeoJSON.FeatureCollection;
  export function gpx(doc: Document): GeoJSON.FeatureCollection;
}
