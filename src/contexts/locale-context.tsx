"use client";

import React, { createContext, useContext, useState, useCallback, useSyncExternalStore, useMemo } from "react";
import { Locale, defaultLocale, locales } from "@/config/i18n";
import { translations } from "@/locales/translations";

type TranslationFunction = (key: string, params?: Record<string, string>) => string;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationFunction;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = "navitel-locale";

// Custom hook to detect client-side hydration using useSyncExternalStore
function useHydrated(): boolean {
  return useSyncExternalStore(
    // subscribe - no-op since this value never changes
    () => () => {},
    // getSnapshot - client value
    () => true,
    // getServerSnapshot - server value
    () => false
  );
}

function getSavedLocale(): Locale {
  if (globalThis.window === undefined) {
    return defaultLocale;
  }
  
  const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (savedLocale && locales.includes(savedLocale)) {
    return savedLocale;
  }
  
  const browserLang = navigator.language.split("-")[0] as Locale;
  if (locales.includes(browserLang)) {
    return browserLang;
  }
  
  return defaultLocale;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, keys: string[]): string | undefined {
  let value = obj;
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return typeof value === "string" ? value : undefined;
}

function replaceParams(text: string, params?: Record<string, string>): string {
  if (!params) return text;
  return text.replaceAll(/\{\{(\w+)\}\}/g, (_, paramKey) => params[paramKey] || `{{${paramKey}}}`);
}

export function LocaleProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  // Use useSyncExternalStore for hydration detection - React 19 recommended pattern
  const isHydrated = useHydrated();
  // Initialize with default locale, then update on client
  const [localeValue, setLocaleValue] = useState<Locale>(defaultLocale);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize locale from storage when hydrated
  if (isHydrated && !initialized) {
    const savedLocale = getSavedLocale();
    if (savedLocale !== localeValue) {
      setLocaleValue(savedLocale);
    }
    setInitialized(true);
  }

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleValue(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t: TranslationFunction = useCallback(
    (key: string, params?: Record<string, string>) => {
      const keys = key.split(".");
      
      // Try current locale first
      const value = getNestedValue(translations[localeValue], keys);
      if (value) return replaceParams(value, params);
      
      // Fallback to default locale
      const fallbackValue = getNestedValue(translations[defaultLocale], keys);
      if (fallbackValue) return replaceParams(fallbackValue, params);
      
      return key;
    },
    [localeValue]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ locale: localeValue, setLocale, t }),
    [localeValue, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

export function useTranslations() {
  const { t } = useLocale();
  return t;
}
