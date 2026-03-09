"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, Shield, Building2, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import type { AuthUser, PlatformUser } from "@/types/auth";

/**
 * Mock users para demostración de los 3 niveles de jerarquía:
 *   Nivel 1: Platform Owner (proveedor del TMS)
 *   Nivel 2: Usuario Maestro (admin del client/tenant)
 *   Nivel 3: Subusuario (operador dentro del tenant)
 */
const DEMO_ACCOUNTS: {
  label: string;
  description: string;
  icon: typeof Shield;
  email: string;
  user: AuthUser | PlatformUser;
}[] = [
  {
    label: "Platform Owner",
    description: "Administrador de la plataforma TMS — gestiona todos los clientes",
    icon: Shield,
    email: "admin@tms-navitel.com",
    user: {
      id: "platform-001",
      name: "Admin TMS Navitel",
      email: "admin@tms-navitel.com",
      role: "platform_owner",
      tier: "platform",
      isActive: true,
    } as PlatformUser,
  },
  {
    label: "Usuario Maestro",
    description: "Administrador de Transportes del Norte S.A. — gestiona su empresa",
    icon: Building2,
    email: "cperez@transportesnorte.com",
    user: {
      id: "user-tn-001",
      name: "Carlos Pérez",
      email: "cperez@transportesnorte.com",
      role: "owner",
      tier: "tenant_admin",
      tenantId: "tenant-001",
      tenantName: "Transportes del Norte S.A.",
      isActive: true,
      enabledModules: [
        "orders", "scheduling", "monitoring", "invoicing", "payments",
        "costs", "rates", "settlements", "maintenance", "customers",
        "drivers", "vehicles", "geofences", "reports", "notifications",
        "workflows", "bitacora", "route_planner",
      ],
    } as AuthUser,
  },
  {
    label: "Subusuario (Operador)",
    description: "Despachador de Transportes del Norte — acceso limitado",
    icon: Users,
    email: "jlopez@transportesnorte.com",
    user: {
      id: "user-tn-010",
      name: "Juan López",
      email: "jlopez@transportesnorte.com",
      role: "despachador",
      tier: "tenant_user",
      tenantId: "tenant-001",
      tenantName: "Transportes del Norte S.A.",
      isActive: true,
      enabledModules: [
        "orders", "scheduling", "monitoring", "customers",
        "drivers", "vehicles", "notifications",
      ],
      scope: { type: "all" },
      createdBy: "user-tn-001",
    } as AuthUser,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (formData.email && formData.password) {
        // Buscar si coincide con alguna cuenta demo
        const demoAccount = DEMO_ACCOUNTS.find(
          (acc) => acc.email.toLowerCase() === formData.email.toLowerCase()
        );

        if (demoAccount) {
          login(demoAccount.user);
        } else {
          // Fallback: crear usuario maestro genérico
          login({
            id: "1",
            name: "Usuario Demo",
            email: formData.email,
            role: "owner",
            tier: "tenant_admin",
            tenantId: "tenant-001",
            tenantName: "Demo Transport S.A.C.",
            isActive: true,
            enabledModules: [
              "orders", "scheduling", "monitoring", "invoicing", "payments",
              "costs", "rates", "settlements", "maintenance", "customers",
              "drivers", "vehicles", "geofences", "reports", "notifications",
              "workflows", "bitacora", "route_planner",
            ],
          } as AuthUser);
        }

        // Platform owners van al panel de plataforma
        if (demoAccount?.user.tier === "platform") {
          router.push("/platform");
        } else {
          router.push("/");
        }
      } else {
        setError(t("validation.fillAllFields"));
      }
    } catch {
      setError(t("validation.loginError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      login(account.user);
      if (account.user.tier === "platform") {
        router.push("/platform");
      } else {
        router.push("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("auth.welcomeBack")}
        </h1>
        <p className="text-muted-foreground">
          {t("auth.welcomeBackDesc")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("auth.email")}
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                className="pl-10 h-11 bg-background border-input transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t("auth.password")}
              </label>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isLoading}
                className="pl-10 pr-12 h-11 bg-background border-input transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="remember" 
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <label htmlFor="remember" className="text-sm text-muted-foreground select-none cursor-pointer">
            {t("auth.rememberMe")}
          </label>
        </div>

        <Button 
          type="submit" 
          className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t("auth.loggingIn")}
            </>
          ) : (
            <>
              {t("auth.loginButton")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {/* Demo Accounts */}
      <div className="space-y-3 pt-2">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Acceso rápido (Demo)
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            return (
              <button
                key={account.email}
                type="button"
                disabled={isLoading}
                onClick={() => handleDemoLogin(account)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:bg-accent hover:border-primary/30 disabled:opacity-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{account.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {account.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
