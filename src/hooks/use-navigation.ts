/**
 * useNavigation Hook - Lógica de navegación extraída
 * Incluye soporte responsive: mobile drawer, tablet collapsed, desktop full
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";

interface UseNavigationOptions {
  defaultOpenMenus?: string[];
}

/** Breakpoints consistentes con Tailwind */
const MOBILE_BREAKPOINT = 768;   // md
const TABLET_BREAKPOINT = 1024;  // lg

export function useNavigation(options: UseNavigationOptions = {}) {
  const { defaultOpenMenus = ["Logística"] } = options;
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(defaultOpenMenus);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  /** Detectar tamaño de pantalla y ajustar sidebar automáticamente */
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < MOBILE_BREAKPOINT;
      const tablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;

      setIsMobile(mobile);
      setIsTablet(tablet);

      // En móvil: cerrar sidebar, en tablet: colapsar sidebar
      if (mobile) {
        setIsMobileOpen(false);
        setIsCollapsed(false);
      } else if (tablet) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      } else {
        setIsCollapsed(false);
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /** Cerrar drawer mobile al cambiar de ruta */
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [pathname, isMobile]);

  /** Verifica si una ruta está activa */
  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname.startsWith(href);
    },
    [pathname]
  );

  /** Alterna el estado de un menú */
  const toggleMenu = useCallback((title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  }, []);

  /** Verifica si un menú está abierto */
  const isMenuOpen = useCallback(
    (title: string) => openMenus.includes(title),
    [openMenus]
  );

  /** Alterna el estado del sidebar (desktop/tablet) */
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  /** Abre el drawer mobile */
  const openMobileMenu = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  /** Cierra el drawer mobile */
  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  /** Abre un menú específico */
  const openMenu = useCallback((title: string) => {
    setOpenMenus((prev) => (prev.includes(title) ? prev : [...prev, title]));
  }, []);

  /** Cierra un menú específico */
  const closeMenu = useCallback((title: string) => {
    setOpenMenus((prev) => prev.filter((t) => t !== title));
  }, []);

  return useMemo(
    () => ({
      pathname,
      openMenus,
      isCollapsed,
      isMobile,
      isTablet,
      isMobileOpen,
      isActive,
      isMenuOpen,
      toggleMenu,
      toggleSidebar,
      openMobileMenu,
      closeMobileMenu,
      openMenu,
      closeMenu,
    }),
    [
      pathname,
      openMenus,
      isCollapsed,
      isMobile,
      isTablet,
      isMobileOpen,
      isActive,
      isMenuOpen,
      toggleMenu,
      toggleSidebar,
      openMobileMenu,
      closeMobileMenu,
      openMenu,
      closeMenu,
    ]
  );
}
