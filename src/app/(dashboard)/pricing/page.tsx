"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  Truck,
  Package,
  MapPin,
  Calendar,
  Percent,
  Calculator,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Tag,
  Clock,
  Fuel,
  Shield,
  Wrench,
} from "lucide-react";

import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Rate {
  id: string;
  name: string;
  code: string;
  type: "distance" | "weight" | "volume" | "fixed" | "hourly" | "percentage";
  category: "freight" | "accessorial" | "fuel" | "insurance" | "handling";
  basePrice: number;
  unit: string;
  minCharge?: number;
  maxCharge?: number;
  currency: string;
  validFrom: string;
  validTo?: string;
  isActive: boolean;
  conditions?: string;
  applicableTo: string[];
}

interface FuelSurcharge {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  percentage: number;
  effectiveDate: string;
  isActive: boolean;
}

const mockRates: Rate[] = [
  {
    id: "1",
    name: "Flete por Kilómetro - Carga General",
    code: "FLT-KM-001",
    type: "distance",
    category: "freight",
    basePrice: 12.50,
    unit: "km",
    minCharge: 500,
    currency: "MXN",
    validFrom: "2024-01-01",
    validTo: "2024-12-31",
    isActive: true,
    applicableTo: ["camion", "tractocamion"],
  },
  {
    id: "2",
    name: "Flete por Tonelada",
    code: "FLT-TON-001",
    type: "weight",
    category: "freight",
    basePrice: 850.00,
    unit: "ton",
    minCharge: 1000,
    currency: "MXN",
    validFrom: "2024-01-01",
    isActive: true,
    applicableTo: ["camion", "tractocamion"],
  },
  {
    id: "3",
    name: "Maniobra de Carga",
    code: "ACC-MAN-001",
    type: "fixed",
    category: "handling",
    basePrice: 350.00,
    unit: "servicio",
    currency: "MXN",
    validFrom: "2024-01-01",
    isActive: true,
    applicableTo: ["todos"],
  },
  {
    id: "4",
    name: "Tiempo de Espera",
    code: "ACC-ESP-001",
    type: "hourly",
    category: "accessorial",
    basePrice: 250.00,
    unit: "hora",
    minCharge: 250,
    currency: "MXN",
    validFrom: "2024-01-01",
    isActive: true,
    conditions: "Después de 2 horas de espera gratuita",
    applicableTo: ["todos"],
  },
  {
    id: "5",
    name: "Seguro de Carga",
    code: "SEG-001",
    type: "percentage",
    category: "insurance",
    basePrice: 0.5,
    unit: "%",
    minCharge: 100,
    currency: "MXN",
    validFrom: "2024-01-01",
    isActive: true,
    conditions: "Sobre valor declarado de la mercancía",
    applicableTo: ["todos"],
  },
  {
    id: "6",
    name: "Sobrecargo Combustible",
    code: "FUEL-001",
    type: "percentage",
    category: "fuel",
    basePrice: 8.5,
    unit: "%",
    currency: "MXN",
    validFrom: "2024-01-01",
    isActive: true,
    conditions: "Aplicable sobre flete base",
    applicableTo: ["todos"],
  },
];

const mockFuelSurcharges: FuelSurcharge[] = [
  {
    id: "1",
    name: "Diesel",
    basePrice: 22.50,
    currentPrice: 24.80,
    percentage: 10.2,
    effectiveDate: "2024-02-01",
    isActive: true,
  },
  {
    id: "2",
    name: "Gasolina Premium",
    basePrice: 24.00,
    currentPrice: 25.50,
    percentage: 6.25,
    effectiveDate: "2024-02-01",
    isActive: false,
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const categoryConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  freight: { label: "Flete", color: "bg-blue-100 text-blue-700", icon: Truck },
  accessorial: { label: "Adicional", color: "bg-purple-100 text-purple-700", icon: Package },
  fuel: { label: "Combustible", color: "bg-orange-100 text-orange-700", icon: Fuel },
  insurance: { label: "Seguro", color: "bg-green-100 text-green-700", icon: Shield },
  handling: { label: "Maniobras", color: "bg-yellow-100 text-yellow-700", icon: Wrench },
};

const typeLabels: Record<string, string> = {
  distance: "Por Distancia",
  weight: "Por Peso",
  volume: "Por Volumen",
  fixed: "Cargo Fijo",
  hourly: "Por Hora",
  percentage: "Porcentaje",
};

// COMPONENTES

function RateCategoryBadge({ category }: { category: string }) {
  const config = categoryConfig[category] || { label: category, color: "bg-gray-100 text-gray-700", icon: Tag };
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function PricingStatsCards({ rates }: { rates: Rate[] }) {
  const stats = useMemo(() => {
    const active = rates.filter(r => r.isActive).length;
    const byCategory = rates.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { total: rates.length, active, byCategory };
  }, [rates]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Tarifas</CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">{stats.active} activas</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Fletes</CardTitle>
          <Truck className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byCategory.freight || 0}</div>
          <p className="text-xs text-muted-foreground">tarifas de flete</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Accesorios</CardTitle>
          <Package className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.byCategory.accessorial || 0) + (stats.byCategory.handling || 0)}
          </div>
          <p className="text-xs text-muted-foreground">servicios adicionales</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Combustible</CardTitle>
          <Fuel className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {mockFuelSurcharges.find(f => f.name === "Diesel")?.percentage || 0}%
          </div>
          <p className="text-xs text-muted-foreground">sobrecargo actual</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateRateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Tarifa</DialogTitle>
          <DialogDescription>
            Configure los parámetros de la nueva tarifa de transporte
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Flete por Kilómetro" />
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input placeholder="Ej: FLT-KM-001" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Por Distancia</SelectItem>
                  <SelectItem value="weight">Por Peso</SelectItem>
                  <SelectItem value="volume">Por Volumen</SelectItem>
                  <SelectItem value="fixed">Cargo Fijo</SelectItem>
                  <SelectItem value="hourly">Por Hora</SelectItem>
                  <SelectItem value="percentage">Porcentaje</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freight">Flete</SelectItem>
                  <SelectItem value="accessorial">Adicional</SelectItem>
                  <SelectItem value="fuel">Combustible</SelectItem>
                  <SelectItem value="insurance">Seguro</SelectItem>
                  <SelectItem value="handling">Maniobras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input placeholder="Ej: km, ton, hora" />
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Precio Base</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Cargo Mínimo</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Cargo Máximo</Label>
              <Input type="number" placeholder="Sin límite" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Válido Desde</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Válido Hasta</Label>
              <Input type="date" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Tarifa Activa</Label>
            <Switch defaultChecked />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Crear Tarifa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// COMPONENTE PRINCIPAL

export default function PricingPage() {
  const [showCreateRate, setShowCreateRate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("rates");
  const [loading] = useState(false);

  const filteredRates = useMemo(() => {
    return mockRates.filter((rate) => {
      const matchesSearch =
        rate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rate.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || rate.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <PageWrapper
      title="Tarifario"
      description="Gestión de tarifas, precios y configuración de costos de transporte"
    >
      {/* Stats Cards */}
      <PricingStatsCards rates={mockRates} />

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="freight">Flete</SelectItem>
              <SelectItem value="accessorial">Adicional</SelectItem>
              <SelectItem value="fuel">Combustible</SelectItem>
              <SelectItem value="insurance">Seguro</SelectItem>
              <SelectItem value="handling">Maniobras</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowCreateRate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarifa
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Tarifas
          </TabsTrigger>
          <TabsTrigger value="fuel" className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Combustible
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
        </TabsList>

        {/* Tarifas Tab */}
        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Tarifas</CardTitle>
              <CardDescription>
                {filteredRates.length} tarifa{filteredRates.length !== 1 ? "s" : ""} configurada{filteredRates.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Precio Base</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No se encontraron tarifas
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRates.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-mono text-sm">{rate.code}</TableCell>
                          <TableCell className="font-medium">{rate.name}</TableCell>
                          <TableCell>
                            <RateCategoryBadge category={rate.category} />
                          </TableCell>
                          <TableCell>{typeLabels[rate.type]}</TableCell>
                          <TableCell className="font-medium">
                            {rate.type === "percentage" 
                              ? `${rate.basePrice}%`
                              : `${formatCurrency(rate.basePrice)}/${rate.unit}`
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={rate.isActive ? "default" : "secondary"}>
                              {rate.isActive ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Combustible Tab */}
        <TabsContent value="fuel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sobrecargo por Combustible</CardTitle>
              <CardDescription>
                Configure los índices de combustible para cálculo automático de sobrecargos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Combustible</TableHead>
                    <TableHead>Precio Base</TableHead>
                    <TableHead>Precio Actual</TableHead>
                    <TableHead>Sobrecargo</TableHead>
                    <TableHead>Fecha Efectiva</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockFuelSurcharges.map((fuel) => (
                    <TableRow key={fuel.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-orange-500" />
                          {fuel.name}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(fuel.basePrice)}/L</TableCell>
                      <TableCell>{formatCurrency(fuel.currentPrice)}/L</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700">
                          +{fuel.percentage.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(fuel.effectiveDate)}</TableCell>
                      <TableCell>
                        <Badge variant={fuel.isActive ? "default" : "secondary"}>
                          {fuel.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculadora Tab */}
        <TabsContent value="calculator" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Fletes</CardTitle>
              <CardDescription>
                Calcule el costo estimado de un envío con las tarifas configuradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Origen</Label>
                    <Input placeholder="Ciudad de origen" />
                  </div>
                  <div className="space-y-2">
                    <Label>Destino</Label>
                    <Input placeholder="Ciudad de destino" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Distancia (km)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Peso (ton)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Vehículo</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="camion">Camión</SelectItem>
                        <SelectItem value="tractocamion">Tractocamión</SelectItem>
                        <SelectItem value="furgoneta">Furgoneta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Declarado</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <Button className="w-full">
                    <Calculator className="h-4 w-4 mr-2" />
                    Calcular Flete
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-semibold mb-4">Desglose de Costos</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Flete Base</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sobrecargo Combustible</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seguro de Carga</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maniobras</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA (16%)</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">$0.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <CreateRateDialog open={showCreateRate} onOpenChange={setShowCreateRate} />
    </PageWrapper>
  );
}
