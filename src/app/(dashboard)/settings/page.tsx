"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Bell,
  Palette,
  Globe,
  Shield,
  Webhook,
  Mail,
  Key,
  Truck,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useSettings";
import type { SettingCategory } from "@/types/settings";
import {
  CompanySettings,
  NotificationSettings,
  AppearanceSettings,
  RegionalSettings,
  SecuritySettings,
  IntegrationSettings,
  EmailSettings,
  ApiKeySettings,
  FleetSettings,
  UserManagement,
} from "@/components/settings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const { settings, loading, updateSettings } = useSettings();

  // Wrapper para manejar actualizaciones con tipado correcto
  const handleUpdate = async (category: SettingCategory, data: Record<string, unknown>): Promise<void> => {
    await updateSettings({ category, settings: data });
  };

  return (
    <PageWrapper
      title="Configuración"
      description="Administra la configuración del sistema TMS"
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="border-b overflow-x-auto">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
            <TabsTrigger
              value="company"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger
              value="fleet"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Flota</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Apariencia</span>
            </TabsTrigger>
            <TabsTrigger
              value="regional"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Regional</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Integraciones</span>
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="company" className="space-y-6">
          <CompanySettings
            settings={settings?.general as unknown as Parameters<typeof CompanySettings>[0]['settings']}
            loading={loading}
            onUpdate={(data: Record<string, unknown>) => handleUpdate("general", data)}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6">
          <FleetSettings
            settings={settings?.fleet}
            loading={loading}
            onUpdate={(data: Record<string, unknown>) => handleUpdate("fleet", data)}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings
            settings={settings?.notifications}
            loading={loading}
            onUpdate={(data: Record<string, unknown>) => handleUpdate("notifications", data)}
          />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <AppearanceSettings
            settings={settings?.appearance}
            loading={loading}
            onUpdate={(data: Record<string, unknown>) => handleUpdate("appearance", data)}
          />
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          <RegionalSettings
            settings={settings?.localization as unknown as Parameters<typeof RegionalSettings>[0]['settings']}
            loading={loading}
            onUpdate={(data: Record<string, unknown>) => handleUpdate("localization", data)}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings
            settings={settings?.security}
            loading={loading}
            onUpdate={(data: Record<string, unknown>) => handleUpdate("security", data)}
          />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <EmailSettings
            settings={settings?.notifications as unknown as Parameters<typeof EmailSettings>[0]['settings']}
            loading={loading}
            onUpdate={(data: Record<string, unknown>) => handleUpdate("notifications", data)}
          />
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <ApiKeySettings />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
