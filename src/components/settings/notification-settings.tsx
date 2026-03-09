"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Monitor,
  Save,
  Volume2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import type { NotificationSettings as NotificationSettingsType } from "@/types/settings";

interface NotificationSettingsProps {
  settings?: NotificationSettingsType;
  loading: boolean;
  onUpdate?: (data: Partial<NotificationSettingsType>) => void;
}

interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

export function NotificationSettings({
  settings,
  loading,
  onUpdate,
}: NotificationSettingsProps) {
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: "orders",
      label: "Órdenes",
      description: "Nuevas órdenes, cambios de estado, entregas",
      email: true,
      push: true,
      sms: false,
      inApp: true,
    },
    {
      id: "fleet",
      label: "Flota",
      description: "Alertas de vehículos, mantenimiento, documentos",
      email: true,
      push: true,
      sms: true,
      inApp: true,
    },
    {
      id: "drivers",
      label: "Conductores",
      description: "Asignaciones, licencias, desempeño",
      email: false,
      push: true,
      sms: false,
      inApp: true,
    },
    {
      id: "geofences",
      label: "Geocercas",
      description: "Entrada/salida de zonas, tiempo en zona",
      email: false,
      push: true,
      sms: false,
      inApp: true,
    },
    {
      id: "incidents",
      label: "Incidentes",
      description: "Alertas de seguridad, accidentes, emergencias",
      email: true,
      push: true,
      sms: true,
      inApp: true,
    },
    {
      id: "finance",
      label: "Finanzas",
      description: "Pagos, facturas, vencimientos",
      email: true,
      push: false,
      sms: false,
      inApp: true,
    },
    {
      id: "reports",
      label: "Reportes",
      description: "Reportes programados, generación completada",
      email: true,
      push: false,
      sms: false,
      inApp: true,
    },
    {
      id: "system",
      label: "Sistema",
      description: "Actualizaciones, mantenimiento, seguridad",
      email: true,
      push: true,
      sms: false,
      inApp: true,
    },
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    enableAll: true,
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    soundEnabled: true,
  });

  const handleCategoryChange = (
    categoryId: string,
    channel: "email" | "push" | "sms" | "inApp",
    value: boolean
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, [channel]: value } : cat
      )
    );
  };

  const handleGlobalChange = (field: string, value: boolean | string) => {
    setGlobalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.({
      enableEmailNotifications: globalSettings.emailEnabled,
      enableSmsNotifications: globalSettings.smsEnabled,
      enablePushNotifications: globalSettings.pushEnabled,
      enableInAppNotifications: globalSettings.inAppEnabled,
    } as Partial<NotificationSettingsType>);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Configuración Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configuración General
          </CardTitle>
          <CardDescription>
            Controles globales de notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Activar Todas las Notificaciones</Label>
              <p className="text-sm text-muted-foreground">
                Control maestro de notificaciones
              </p>
            </div>
            <Switch
              checked={globalSettings.enableAll}
              onCheckedChange={(checked) =>
                handleGlobalChange("enableAll", checked)
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm">Email</Label>
              </div>
              <Switch
                checked={globalSettings.emailEnabled}
                onCheckedChange={(checked) =>
                  handleGlobalChange("emailEnabled", checked)
                }
              />
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm">Push</Label>
              </div>
              <Switch
                checked={globalSettings.pushEnabled}
                onCheckedChange={(checked) =>
                  handleGlobalChange("pushEnabled", checked)
                }
              />
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm">SMS</Label>
              </div>
              <Switch
                checked={globalSettings.smsEnabled}
                onCheckedChange={(checked) =>
                  handleGlobalChange("smsEnabled", checked)
                }
              />
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm">In-App</Label>
              </div>
              <Switch
                checked={globalSettings.inAppEnabled}
                onCheckedChange={(checked) =>
                  handleGlobalChange("inAppEnabled", checked)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Sonidos de Notificación
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproducir sonido al recibir notificaciones
              </p>
            </div>
            <Switch
              checked={globalSettings.soundEnabled}
              onCheckedChange={(checked) =>
                handleGlobalChange("soundEnabled", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Preferencias por Categoría</CardTitle>
          <CardDescription>
            Configura cómo recibir notificaciones de cada módulo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Categoría</th>
                  <th className="text-center py-3 px-2 font-medium">
                    <Mail className="h-4 w-4 mx-auto" />
                  </th>
                  <th className="text-center py-3 px-2 font-medium">
                    <Monitor className="h-4 w-4 mx-auto" />
                  </th>
                  <th className="text-center py-3 px-2 font-medium">
                    <Smartphone className="h-4 w-4 mx-auto" />
                  </th>
                  <th className="text-center py-3 px-2 font-medium">
                    <MessageSquare className="h-4 w-4 mx-auto" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b last:border-0">
                    <td className="py-4 px-2">
                      <div>
                        <p className="font-medium">{category.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </td>
                    <td className="text-center py-4 px-2">
                      <Checkbox
                        checked={category.email}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(
                            category.id,
                            "email",
                            checked as boolean
                          )
                        }
                        disabled={!globalSettings.emailEnabled}
                      />
                    </td>
                    <td className="text-center py-4 px-2">
                      <Checkbox
                        checked={category.push}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(
                            category.id,
                            "push",
                            checked as boolean
                          )
                        }
                        disabled={!globalSettings.pushEnabled}
                      />
                    </td>
                    <td className="text-center py-4 px-2">
                      <Checkbox
                        checked={category.sms}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(
                            category.id,
                            "sms",
                            checked as boolean
                          )
                        }
                        disabled={!globalSettings.smsEnabled}
                      />
                    </td>
                    <td className="text-center py-4 px-2">
                      <Checkbox
                        checked={category.inApp}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(
                            category.id,
                            "inApp",
                            checked as boolean
                          )
                        }
                        disabled={!globalSettings.inAppEnabled}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
