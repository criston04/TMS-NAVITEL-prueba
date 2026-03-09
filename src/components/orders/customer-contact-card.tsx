'use client';

import { useState } from 'react';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface CustomerInfo {
  id: string;
  name: string;
  tradeName?: string;
  rfc?: string;
  address?: string;
  phone?: string;
  email?: string;
  mainContact?: {
    name: string;
    position?: string;
    phone: string;
    email: string;
  };
  billingAddress?: string;
  creditLimit?: number;
  paymentTerms?: string;
}

export interface OrderContactInfo {
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

interface CustomerContactCardProps {
  /** Información del cliente seleccionado */
  customer: CustomerInfo | null;
  /** Contacto específico para esta orden */
  orderContact?: OrderContactInfo;
  /** Callback al cambiar contacto de la orden */
  onOrderContactChange?: (contact: OrderContactInfo | null) => void;
  /** Mostrar formulario de contacto adicional */
  showOrderContactForm?: boolean;
  /** Modo compacto */
  compact?: boolean;
}

// COMPONENTE PRINCIPAL

export function CustomerContactCard({
  customer,
  orderContact,
  onOrderContactChange,
  showOrderContactForm = true,
  compact = false,
}: CustomerContactCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showContactForm, setShowContactForm] = useState(!!orderContact);
  const [localContact, setLocalContact] = useState<OrderContactInfo>(
    orderContact || { name: '', phone: '', email: '', notes: '' }
  );

  if (!customer) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Selecciona un cliente para ver su información</p>
        </CardContent>
      </Card>
    );
  }

  const handleContactChange = (field: keyof OrderContactInfo, value: string) => {
    const newContact = { ...localContact, [field]: value };
    setLocalContact(newContact);
    onOrderContactChange?.(newContact);
  };

  const handleRemoveContact = () => {
    setShowContactForm(false);
    setLocalContact({ name: '', phone: '', email: '', notes: '' });
    onOrderContactChange?.(null);
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" />
                Información del Cliente
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{customer.name}</Badge>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Datos del Cliente */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    {customer.tradeName && (
                      <p className="text-sm text-muted-foreground">{customer.tradeName}</p>
                    )}
                    {customer.rfc && (
                      <p className="text-xs text-muted-foreground font-mono">{customer.rfc}</p>
                    )}
                  </div>
                </div>

                {customer.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <p className="text-sm">{customer.address}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-sm hover:text-primary transition-colors"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}

                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-sm hover:text-primary transition-colors"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}

                {customer.paymentTerms && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {customer.paymentTerms}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Contacto Principal */}
            {customer.mainContact && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Contacto Principal
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{customer.mainContact.name}</span>
                    {customer.mainContact.position && (
                      <span className="text-xs text-muted-foreground">
                        ({customer.mainContact.position})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`tel:${customer.mainContact.phone}`}
                      className="text-sm hover:text-primary"
                    >
                      {customer.mainContact.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`mailto:${customer.mainContact.email}`}
                      className="text-sm hover:text-primary"
                    >
                      {customer.mainContact.email}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Contacto Específico para la Orden */}
            {showOrderContactForm && (
              <div className="border-t pt-4">
                {!showContactForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowContactForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar contacto específico para esta orden
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Contacto para esta orden</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveContact}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Quitar
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Nombre</Label>
                        <Input
                          id="contactName"
                          placeholder="Nombre del contacto"
                          value={localContact.name}
                          onChange={(e) => handleContactChange('name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Teléfono</Label>
                        <Input
                          id="contactPhone"
                          type="tel"
                          placeholder="+52 55 1234 5678"
                          value={localContact.phone}
                          onChange={(e) => handleContactChange('phone', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          placeholder="contacto@ejemplo.com"
                          value={localContact.email}
                          onChange={(e) => handleContactChange('email', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactNotes">Notas de contacto</Label>
                      <Textarea
                        id="contactNotes"
                        placeholder="Horarios de disponibilidad, instrucciones especiales..."
                        value={localContact.notes || ''}
                        onChange={(e) => handleContactChange('notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// COMPONENTE MINI (para resumen)

export function CustomerContactMini({ customer }: { customer: CustomerInfo }) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Building2 className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{customer.name}</p>
        {customer.tradeName && (
          <p className="text-sm text-muted-foreground truncate">{customer.tradeName}</p>
        )}
      </div>
      {customer.phone && (
        <a
          href={`tel:${customer.phone}`}
          className={cn(
            'p-2 rounded-full hover:bg-muted transition-colors',
            'text-muted-foreground hover:text-primary'
          )}
        >
          <Phone className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
