import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Permitir imágenes de cualquier dominio remoto si es necesario
    remotePatterns: [],
    // Deshabilitar optimización para imágenes locales si hay problemas
    unoptimized: false,
  },
};

export default nextConfig;
