// Type declarations for CSS modules
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Side-effect CSS imports
declare module "leaflet/dist/leaflet.css";
declare module "@/styles/leaflet-custom.css";
