"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Key,
  Smartphone,
  History,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import type { SecuritySettings as SecuritySettingsType } from "@/types/settings";
import { AlertModal } from "@/components/ui/alert-modal";

interface SecuritySettingsProps {
  settings?: SecuritySettingsType;
  loading: boolean;
  onUpdate?: (data: Partial<SecuritySettingsType>) => void;
}

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

const mockSessions: LoginSession[] = [
  {
    id: "1",
    device: "Chrome en Windows",
    location: "Lima, Perú",
    ip: "190.12.34.56",
    lastActive: "Ahora",
    current: true,
  },
  {
    id: "2",
    device: "Safari en iPhone",
    location: "Lima, Perú",
    ip: "190.12.34.78",
    lastActive: "Hace 2 horas",
    current: false,
  },
  {
    id: "3",
    device: "Chrome en Android",
    location: "Lima, Perú",
    ip: "190.12.34.90",
    lastActive: "Hace 1 día",
    current: false,
  },
];

export function SecuritySettings({
  settings,
  loading,
  onUpdate,
}: SecuritySettingsProps) {
  const [formData, setFormData] = useState({
    enableTwoFactor: false,
    sessionTimeoutMinutes: 30,
    passwordExpirationDays: 90,
    requireStrongPassword: true,
    loginNotifications: true,
    allowMultipleSessions: true,
    enableIpWhitelist: false,
    ipWhitelist: [] as string[],
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [sessions] = useState<LoginSession[]>(mockSessions);
  const [passwordAlert, setPasswordAlert] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.(formData as Partial<SecuritySettingsType>);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordAlert(true);
      return;
    }
    // Aquí iría la lógica para cambiar la contraseña
    console.log("Changing password...");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleCloseSession = (sessionId: string) => {
    console.log("Closing session:", sessionId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cambiar Contraseña */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualiza tu contraseña de acceso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    handlePasswordChange("currentPassword", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      current: !prev.current,
                    }))
                  }
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    handlePasswordChange("newPassword", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      new: !prev.new,
                    }))
                  }
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    handlePasswordChange("confirmPassword", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      confirm: !prev.confirm,
                    }))
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleChangePassword}
            disabled={
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              !passwordForm.confirmPassword
            }
          >
            <Key className="h-4 w-4 mr-2" />
            Cambiar Contraseña
          </Button>
        </CardContent>
      </Card>

      {/* Autenticación de Dos Factores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Autenticación de Dos Factores
          </CardTitle>
          <CardDescription>
            Añade una capa extra de seguridad a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitar 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Requerir código de verificación al iniciar sesión
              </p>
            </div>
            <Switch
              checked={formData.enableTwoFactor}
              onCheckedChange={(checked) =>
                handleChange("enableTwoFactor", checked)
              }
            />
          </div>

          {formData.enableTwoFactor && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>2FA Activado</AlertTitle>
              <AlertDescription>
                Tu cuenta está protegida con autenticación de dos factores.
                <Button variant="link" className="p-0 h-auto ml-2">
                  Configurar dispositivo
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Políticas de Seguridad
          </CardTitle>
          <CardDescription>
            Configura las políticas de seguridad de la cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tiempo de Sesión (minutos)</Label>
              <Select
                value={formData.sessionTimeoutMinutes.toString()}
                onValueChange={(value) =>
                  handleChange("sessionTimeoutMinutes", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="480">8 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expiración de Contraseña</Label>
              <Select
                value={formData.passwordExpirationDays.toString()}
                onValueChange={(value) =>
                  handleChange("passwordExpirationDays", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="60">60 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                  <SelectItem value="180">180 días</SelectItem>
                  <SelectItem value="0">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Requerir Contraseña Fuerte</Label>
              <p className="text-sm text-muted-foreground">
                Mínimo 8 caracteres, mayúsculas, números y símbolos
              </p>
            </div>
            <Switch
              checked={formData.requireStrongPassword}
              onCheckedChange={(checked) =>
                handleChange("requireStrongPassword", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Notificaciones de Inicio de Sesión</Label>
              <p className="text-sm text-muted-foreground">
                Recibir email cuando alguien inicie sesión
              </p>
            </div>
            <Switch
              checked={formData.loginNotifications}
              onCheckedChange={(checked) =>
                handleChange("loginNotifications", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Permitir Sesiones Múltiples</Label>
              <p className="text-sm text-muted-foreground">
                Iniciar sesión en varios dispositivos simultáneamente
              </p>
            </div>
            <Switch
              checked={formData.allowMultipleSessions}
              onCheckedChange={(checked) =>
                handleChange("allowMultipleSessions", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Sesiones Activas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sesiones Activas
          </CardTitle>
          <CardDescription>
            Dispositivos donde tu cuenta está conectada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{session.device}</p>
                    {session.current && (
                      <Badge variant="secondary">Sesión Actual</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {session.location} • {session.ip}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Última actividad: {session.lastActive}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCloseSession(session.id)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar
                </Button>
              )}
            </div>
          ))}

          <Button variant="destructive" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Todas las Sesiones
          </Button>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>

      <AlertModal
        open={passwordAlert}
        onOpenChange={setPasswordAlert}
        title="Contraseñas no coinciden"
        description="La nueva contraseña y su confirmación deben ser iguales. Por favor verifica e intenta nuevamente."
        variant="warning"
      />
    </div>
  );
}
