/** Idiomas soportados por la aplicación */
export const locales = ["es", "en"] as const;

/** Tipo de idioma válido */
export type Locale = (typeof locales)[number];

/** Idioma por defecto de la aplicación */
export const defaultLocale: Locale = "es";

/** Nombres legibles de cada idioma */
export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

/** Banderas emoji de cada idioma */
export const localeFlags: Record<Locale, string> = {
  es: "🇪🇸",
  en: "🇺🇸",
};
