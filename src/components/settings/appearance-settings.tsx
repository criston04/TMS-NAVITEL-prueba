"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Layout,
  Save,
  Type,
  Languages,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { AppearanceSettings as AppearanceSettingsType } from "@/types/settings";

interface AppearanceSettingsProps {
  settings?: AppearanceSettingsType;
  loading: boolean;
  onUpdate?: (data: Partial<AppearanceSettingsType>) => void;
}

const colorSchemes = [
  { value: "blue", label: "Azul", color: "bg-blue-500" },
  { value: "green", label: "Verde", color: "bg-green-500" },
  { value: "purple", label: "Púrpura", color: "bg-purple-500" },
  { value: "orange", label: "Naranja", color: "bg-orange-500" },
  { value: "red", label: "Rojo", color: "bg-red-500" },
  { value: "teal", label: "Teal", color: "bg-teal-500" },
];

const fontSizeMap: Record<"small" | "medium" | "large", number> = {
  small: 12,
  medium: 14,
  large: 18,
};

const fontSizeReverse = (px: number): "small" | "medium" | "large" => {
  if (px <= 13) return "small";
  if (px <= 16) return "medium";
  return "large";
};

export function AppearanceSettings({
  settings,
  loading,
  onUpdate,
}: AppearanceSettingsProps) {
  const [formData, setFormData] = useState({
    theme: "system" as "light" | "dark" | "system",
    colorScheme: "blue",
    fontSize: "medium" as "small" | "medium" | "large",
    fontSizePx: 14, // Estado local para el slider
    compactMode: false,
    sidebarCollapsed: false,
    showBreadcrumbs: true,
    animationsEnabled: true,
    language: "es",
  });

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        theme: settings.theme ?? prev.theme,
        colorScheme: settings.colorScheme ?? prev.colorScheme,
        fontSize: settings.fontSize ?? prev.fontSize,
        fontSizePx: fontSizeMap[settings.fontSize ?? prev.fontSize],
        compactMode: settings.compactMode ?? prev.compactMode,
        sidebarCollapsed: settings.sidebarCollapsed ?? prev.sidebarCollapsed,
        showBreadcrumbs: settings.showBreadcrumbs ?? prev.showBreadcrumbs,
        animationsEnabled: settings.animationsEnabled ?? prev.animationsEnabled,
        language: settings.language ?? prev.language,
      }));
    }
  }, [settings]);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { fontSizePx, ...dataToSubmit } = formData;
    onUpdate?.(dataToSubmit as Partial<AppearanceSettingsType>);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema
          </CardTitle>
          <CardDescription>
            Personaliza la apariencia de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Modo de Color</Label>
            <RadioGroup
              value={formData.theme}
              onValueChange={(value) => handleChange("theme", value)}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="light"
                className={cn(
                  "flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors",
                  formData.theme === "light"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
              >
                <RadioGroupItem value="light" id="light" className="sr-only" />
                <Sun className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">Claro</span>
              </Label>
              <Label
                htmlFor="dark"
                className={cn(
                  "flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors",
                  formData.theme === "dark"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
              >
                <RadioGroupItem value="dark" id="dark" className="sr-only" />
                <Moon className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">Oscuro</span>
              </Label>
              <Label
                htmlFor="system"
                className={cn(
                  "flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors",
                  formData.theme === "system"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
              >
                <RadioGroupItem value="system" id="system" className="sr-only" />
                <Monitor className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">Sistema</span>
              </Label>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Color de Acento</Label>
            <div className="flex flex-wrap gap-3">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.value}
                  type="button"
                  onClick={() => handleChange("colorScheme", scheme.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
                    formData.colorScheme === scheme.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full", scheme.color)} />
                  <span className="text-sm">{scheme.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tipografía */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Tipografía
          </CardTitle>
          <CardDescription>
            Ajusta el tamaño del texto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Tamaño de Fuente</Label>
              <span className="text-sm text-muted-foreground">
                {formData.fontSizePx}px
              </span>
            </div>
            <Slider
              value={[formData.fontSizePx]}
              onValueChange={([value]) => {
                setFormData(prev => ({
                  ...prev,
                  fontSizePx: value,
                  fontSize: fontSizeReverse(value)
                }));
              }}
              min={12}
              max={20}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pequeño</span>
              <span>Normal</span>
              <span>Grande</span>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <p style={{ fontSize: `${formData.fontSizePx}px` }}>
              Vista previa del texto con el tamaño seleccionado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Diseño
          </CardTitle>
          <CardDescription>
            Opciones de diseño de la interfaz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Modo Compacto</Label>
              <p className="text-sm text-muted-foreground">
                Reduce el espaciado para mostrar más contenido
              </p>
            </div>
            <Switch
              checked={formData.compactMode}
              onCheckedChange={(checked) => handleChange("compactMode", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Sidebar Colapsado por Defecto</Label>
              <p className="text-sm text-muted-foreground">
                Iniciar con la barra lateral minimizada
              </p>
            </div>
            <Switch
              checked={formData.sidebarCollapsed}
              onCheckedChange={(checked) =>
                handleChange("sidebarCollapsed", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Mostrar Breadcrumbs</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar ruta de navegación en la parte superior
              </p>
            </div>
            <Switch
              checked={formData.showBreadcrumbs}
              onCheckedChange={(checked) =>
                handleChange("showBreadcrumbs", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Animaciones</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar transiciones y animaciones
              </p>
            </div>
            <Switch
              checked={formData.animationsEnabled}
              onCheckedChange={(checked) =>
                handleChange("animationsEnabled", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Idioma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Idioma
          </CardTitle>
          <CardDescription>
            Selecciona el idioma de la interfaz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.language}
            onValueChange={(value) => handleChange("language", value)}
          >
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Restaurar Predeterminados
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
