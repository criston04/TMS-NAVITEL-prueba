"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChevronLeft, Settings, HelpCircle, LogOut, X } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { useNavigation } from "@/hooks/use-navigation";
import { navigationConfig, platformNavigationConfig, filterNavigation } from "@/config/navigation";
import { NavLink } from "./nav-link";
import { NavGroup } from "./nav-group";

function SidebarHeader({ isCollapsed }: Readonly<{ isCollapsed: boolean }>) {
  return (
    <div className="flex h-16 items-center justify-center px-2">
      {isCollapsed ? (
        <div className="flex h-10 w-10 items-center justify-center">
          <Image
            src="/navitel-logo-black.png"
            alt="Navitel"
            width={40}
            height={40}
            className="dark:hidden object-contain"
          />
          <Image
            src="/navitel-logo-white.png"
            alt="Navitel"
            width={40}
            height={40}
            className="hidden dark:block object-contain"
          />
        </div>
      ) : (
        <Link href="/" className="flex items-center justify-center group">
          <div className="flex h-20 w-48 items-center justify-center">
            <Image
              src="/navitel-logo-black.png"
              alt="Navitel"
              width={180}
              height={72}
              className="dark:hidden object-contain transition-transform group-hover:scale-105"
            />
            <Image
              src="/navitel-logo-white.png"
              alt="Navitel"
              width={180}
              height={72}
              className="hidden dark:block object-contain transition-transform group-hover:scale-105"
            />
          </div>
        </Link>
      )}
    </div>
  );
}

function SidebarFooter({
  isCollapsed,
  onLogout,
}: Readonly<{
  isCollapsed: boolean;
  onLogout: () => void;
}>) {
  const footerItems = [
    { title: "Configuración", href: "/settings", icon: Settings },
    { title: "Ayuda", href: "/help", icon: HelpCircle },
  ];

  return (
    <div className="border-t p-2 space-y-0.5">
      {footerItems.map((item) => (
        <NavLink
          key={item.href}
          {...item}
          isCollapsed={isCollapsed}
          isActive={false}
        />
      ))}

      {/* Logout button */}
      <TooltipProvider>
        <button
          onClick={onLogout}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-muted-foreground",
            "transition-all duration-200 ease-out",
            "hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && (
            <span className="text-xs font-medium">Cerrar sesión</span>
          )}
        </button>
      </TooltipProvider>
    </div>
  );
}

function SidebarToggle({
  isCollapsed,
  onToggle,
}: Readonly<{
  isCollapsed: boolean;
  onToggle: () => void;
}>) {
  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "absolute -right-2.5 top-4 z-50 h-5 w-5 rounded-full border shadow-sm",
        "transition-all duration-200 hover:scale-110"
      )}
      onClick={onToggle}
    >
      <ChevronLeft
        className={cn(
          "h-3 w-3 transition-transform duration-300",
          isCollapsed && "rotate-180"
        )}
      />
    </Button>
  );
}

export function Sidebar() {
  const { logout, isPlatform, can, hasModuleEnabled, tier, user, platformUser } = useAuth();
  const {
    isCollapsed,
    isMobile,
    isMobileOpen,
    isActive,
    toggleSidebar,
    closeMobileMenu,
  } = useNavigation();

  // Determinar rol actual
  const currentRole = platformUser?.role ?? user?.role ?? "";

  // Construir contexto para filtrado de navegación
  const filterCtx = {
    role: currentRole,
    tier: tier ?? "",
    can: (resource: string, action: string) => can(resource as never, action as never),
    hasModuleEnabled: (mod: string) => hasModuleEnabled(mod as never),
    isPlatform,
  };

  // Elegir y filtrar la navegación según el tipo de usuario
  const groups = isPlatform
    ? filterNavigation(platformNavigationConfig, filterCtx)
    : filterNavigation(navigationConfig, filterCtx);

  const sidebarContent = (
    <>
      {/* Header fijo */}
      <div className="shrink-0 flex items-center justify-between">
        <SidebarHeader isCollapsed={!isMobile && isCollapsed} />
        {/* Botón cerrar en mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 h-8 w-8 md:hidden"
            onClick={closeMobileMenu}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      {!isMobile && (
        <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      )}

      {/* Navigation con scroll invisible */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <nav
          className={cn(
            "h-full px-2 py-2 pb-4 overflow-y-auto",
            // Ocultar scrollbar en todos los navegadores
            "scrollbar-none",
            "[&::-webkit-scrollbar]:hidden",
            "[-ms-overflow-style:none]",
            "[scrollbar-width:none]"
          )}
        >
          <div className="flex flex-col">
            {groups.map((group) => (
              <NavGroup
                key={group.groupTitle}
                group={group}
                isCollapsed={!isMobile && isCollapsed}
                isActive={isActive}
              />
            ))}
          </div>
        </nav>
      </div>

      {/* Footer fijo */}
      <div className="shrink-0">
        <SidebarFooter isCollapsed={!isMobile && isCollapsed} onLogout={logout} />
      </div>
    </>
  );

  // Mobile: Drawer con overlay
  if (isMobile) {
    return (
      <TooltipProvider delayDuration={0}>
        {/* Overlay oscuro */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden"
            onClick={closeMobileMenu}
          />
        )}
        {/* Drawer lateral */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card",
            "transition-transform duration-300 ease-out md:hidden",
            "shadow-2xl",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </TooltipProvider>
    );
  }

  // Desktop/Tablet: Sidebar fijo colapsable
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative hidden md:flex h-screen flex-col border-r bg-card",
          "transition-all duration-300 ease-out",
          isCollapsed ? "w-14" : "w-56"
        )}
      >
        {sidebarContent}
      </aside>
    </TooltipProvider>
  );
}
