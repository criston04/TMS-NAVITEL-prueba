import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Strip console.log/info/debug en build de producción.
  // Mantiene console.error y console.warn para diagnóstico real.
  // Resultado: -300+ console.log eliminados del bundle final, mejor TTI,
  // y sin fuga de PII en consola del usuario.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  // tw-animate-css only exports via the "style" condition, which neither
  // Turbopack nor webpack support by default. Adding "style" to webpack's
  // conditionNames lets both `next dev --webpack` and `next build` resolve it.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.conditionNames = [
      "style",
      ...(config.resolve.conditionNames || [
        "browser",
        "module",
        "import",
        "require",
        "default",
      ]),
    ];
    return config;
  },
};

export default nextConfig;
