"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Upload,
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { CompanySettings as CompanySettingsType } from "@/types/settings";

interface CompanySettingsProps {
  settings?: CompanySettingsType;
  loading: boolean;
  onUpdate?: (data: Partial<CompanySettingsType>) => void;
}

export function CompanySettings({ settings, loading, onUpdate }: CompanySettingsProps) {
  const [formData, setFormData] = useState<Partial<CompanySettingsType>>({
    name: "",
    legalName: "",
    taxId: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    website: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof CompanySettingsType, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.(formData);
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
            <div key={i} className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información de la Empresa
          </CardTitle>
          <CardDescription>
            Datos generales de identificación de tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.logo} alt="Logo" />
              <AvatarFallback className="text-2xl">
                {formData.name?.substring(0, 2).toUpperCase() || "TM"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label>Logo de la Empresa</Label>
              <Button type="button" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Subir Logo
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG o JPG. Máximo 2MB. Recomendado: 200x200px
              </p>
            </div>
          </div>

          <Separator />

          {/* Datos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Comercial *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Mi Empresa SAC"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Razón Social</Label>
              <Input
                id="legalName"
                value={formData.legalName || ""}
                onChange={(e) => handleChange("legalName", e.target.value)}
                placeholder="MI EMPRESA S.A.C."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxId" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                RUC / NIT
              </Label>
              <Input
                id="taxId"
                value={formData.taxId || ""}
                onChange={(e) => handleChange("taxId", e.target.value)}
                placeholder="20123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industria</Label>
              <Input
                id="industry"
                value={formData.industry || ""}
                onChange={(e) => handleChange("industry", e.target.value)}
                placeholder="Transporte y Logística"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicación
          </CardTitle>
          <CardDescription>
            Dirección física de la empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Av. Principal 123, Oficina 456"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city || ""}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Lima"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado / Departamento</Label>
              <Input
                id="state"
                value={formData.state || ""}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="Lima"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country || ""}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Perú"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Código Postal</Label>
              <Input
                id="postalCode"
                value={formData.postalCode || ""}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                placeholder="15001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Input
                id="timezone"
                value={formData.timezone || "America/Lima"}
                onChange={(e) => handleChange("timezone", e.target.value)}
                placeholder="America/Lima"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Información de Contacto
          </CardTitle>
          <CardDescription>
            Datos de contacto de la empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+51 1 234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Corporativo
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contacto@miempresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Sitio Web
            </Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://www.miempresa.com"
            />
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
