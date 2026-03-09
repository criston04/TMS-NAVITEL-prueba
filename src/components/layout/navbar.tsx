'use client';

import { memo, useState } from 'react';
import {
  Search,
  LayoutGrid,
  Bell,
  Settings,
  User,
  LogOut,
  Globe,
  Building2,
  Menu,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/hooks/use-navigation';

interface TenantConfig {
  /** Nombre de la empresa */
  name: string;
  /** Nombre corto/siglas */
  shortName?: string;
  /** URL del logo (opcional) */
  logoUrl?: string;
  /** Color primario de la marca */
  brandColor?: string;
}

const NAVBAR_HEIGHT = 'h-14'; // 56px - compacto pero funcional

const CURRENT_TENANT: TenantConfig = {
  name: 'ANTARES LOGISTICS',
  shortName: 'GT',
  logoUrl: '/images/antares-logo.jpeg', // Logo de la empresa cliente
  brandColor: '#0055EE', // Azul del logo de Antares
};

// COMPONENTE LOGO EMPRESA

interface TenantLogoProps {
  tenant: TenantConfig;
  className?: string;
}

function TenantLogo({ tenant, className }: TenantLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Si hay logo y no hubo error, mostrarlo (SOLO LA IMAGEN)
  if (tenant.logoUrl && !imageError) {
    return (
      <div className={cn('flex items-center', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tenant.logoUrl}
          alt={tenant.name}
          className="h-10 w-auto object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Sin logo o con error, mostrar icono + nombre
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div 
        className="flex items-center justify-center h-9 w-9 rounded-lg shadow-sm"
        style={{ backgroundColor: tenant.brandColor || '#2563eb' }}
      >
        {tenant.shortName ? (
          <span className="text-sm font-bold text-white">
            {tenant.shortName}
          </span>
        ) : (
          <Building2 className="h-5 w-5 text-white" />
        )}
      </div>
      <span className="hidden md:block text-sm font-semibold" style={{ color: tenant.brandColor }}>
        {tenant.name}
      </span>
    </div>
  );
}

// COMPONENTE

export const Navbar = memo(function Navbar() {
  const { isMobile, openMobileMenu } = useNavigation();

  return (
    <header
      className={cn(
        // Layout
        'sticky top-0 z-40',
        'flex items-center justify-between',
        // Spacing
        'px-3 sm:px-4 md:px-6',
        // Sizing
        NAVBAR_HEIGHT,
        // Visual
        'border-b bg-background/80 backdrop-blur-md',
        // Spacing para íconos en mobile
        'gap-2'
      )}
    >
      {/* Left side: hamburger (mobile) + search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Hamburger button - visible solo en mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            onClick={openMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Search */}
        <div className="relative w-full max-w-xs sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar... ⌘K"
            className={cn(
              // Spacing
              'pl-8',
              // Sizing
              'h-8 w-full',
              // Visual
              'rounded-md bg-muted/50',
              // States
              'focus-visible:bg-background'
            )}
          />
        </div>
      </div>

      {/* Logo de la empresa cliente (tenant) + Actions - Agrupados a la derecha */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Logo del tenant - oculto en pantallas muy pequeñas */}
        <div className="hidden sm:flex items-center">
          <TenantLogo tenant={CURRENT_TENANT} />
        </div>

        {/* Separador vertical */}
        <div className="hidden lg:block h-6 w-px bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Language - oculto en mobile xs */}
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8">
            <Globe className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Grid Menu - oculto en mobile */}
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative ml-1 h-8 w-8 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    JD
                  </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">
                  admin@navitel.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-3.5 w-3.5" />
              <span className="text-sm">Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-3.5 w-3.5" />
              <span className="text-sm">Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span className="text-sm">Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
});

export type { TenantConfig };
export { CURRENT_TENANT, TenantLogo };
