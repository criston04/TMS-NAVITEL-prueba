"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Server,
  Lock,
  TestTube2,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import type { EmailSettings as EmailSettingsType } from "@/types/settings";

interface EmailSettingsProps {
  settings?: EmailSettingsType;
  loading: boolean;
  onUpdate?: (data: Partial<EmailSettingsType>) => void;
}

export function EmailSettings({ settings, loading, onUpdate }: EmailSettingsProps) {
  const [formData, setFormData] = useState({
    provider: "smtp",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: "",
    smtpPassword: "",
    fromName: "",
    fromEmail: "",
    replyTo: "",
    footerText: "",
  });

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.(formData as Partial<EmailSettingsType>);
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    
    setTestStatus("testing");
    
    // Simular envío de prueba
    setTimeout(() => {
      setTestStatus(Math.random() > 0.3 ? "success" : "error");
    }, 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Proveedor de Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuración de Email
          </CardTitle>
          <CardDescription>
            Configura el servidor de correo para enviar notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Proveedor de Email</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => handleChange("provider", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smtp">SMTP Personalizado</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="ses">Amazon SES</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Configuración SMTP */}
      {formData.provider === "smtp" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Configuración SMTP
            </CardTitle>
            <CardDescription>
              Credenciales del servidor de correo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">Servidor SMTP</Label>
                <Input
                  id="smtpHost"
                  value={formData.smtpHost}
                  onChange={(e) => handleChange("smtpHost", e.target.value)}
                  placeholder="smtp.ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Puerto</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => handleChange("smtpPort", parseInt(e.target.value))}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Usuario</Label>
                <Input
                  id="smtpUser"
                  value={formData.smtpUser}
                  onChange={(e) => handleChange("smtpUser", e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Contraseña
                </Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={formData.smtpPassword}
                  onChange={(e) => handleChange("smtpPassword", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Conexión Segura (TLS/SSL)</Label>
                <p className="text-sm text-muted-foreground">
                  Usar encriptación para conexión segura
                </p>
              </div>
              <Switch
                checked={formData.smtpSecure}
                onCheckedChange={(checked) => handleChange("smtpSecure", checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remitente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Información del Remitente
          </CardTitle>
          <CardDescription>
            Datos que aparecerán como remitente en los correos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromName">Nombre del Remitente</Label>
              <Input
                id="fromName"
                value={formData.fromName}
                onChange={(e) => handleChange("fromName", e.target.value)}
                placeholder="TMS NAVITEL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email del Remitente</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.fromEmail}
                onChange={(e) => handleChange("fromEmail", e.target.value)}
                placeholder="noreply@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="replyTo">Responder a (Reply-To)</Label>
            <Input
              id="replyTo"
              type="email"
              value={formData.replyTo}
              onChange={(e) => handleChange("replyTo", e.target.value)}
              placeholder="soporte@empresa.com"
            />
            <p className="text-sm text-muted-foreground">
              Email al que llegarán las respuestas de los destinatarios
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="footerText">Texto de Pie de Email</Label>
            <Textarea
              id="footerText"
              value={formData.footerText}
              onChange={(e) => handleChange("footerText", e.target.value)}
              placeholder="Este es un mensaje automático del sistema TMS..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Probar Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Probar Configuración
          </CardTitle>
          <CardDescription>
            Envía un correo de prueba para verificar la configuración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="testEmail">Email de Prueba</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <Button
              type="button"
              onClick={handleTestEmail}
              disabled={!testEmail || testStatus === "testing"}
            >
              {testStatus === "testing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Prueba
                </>
              )}
            </Button>
          </div>

          {testStatus === "success" && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>
                El correo de prueba fue enviado correctamente a {testEmail}
              </AlertDescription>
            </Alert>
          )}

          {testStatus === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                No se pudo enviar el correo. Verifica la configuración SMTP.
              </AlertDescription>
            </Alert>
          )}
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
