"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Shield,
  Link2,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tenant } from "@/types/platform";
import { SYSTEM_MODULES, getModuleDefinition } from "@/types/platform";
import { tenantService } from "@/services/platform.service";

const categoryLabels: Record<string, string> = {
  operations: "Operaciones",
  monitoring: "Monitoreo",
  finance: "Finanzas",
  maintenance: "Mantenimiento",
  master: "Datos Maestros",
  reports: "Reportes",
  support: "Soporte",
};

const categoryColors: Record<string, string> = {
  operations: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  monitoring: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  finance: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  master: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  reports: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  support: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export default function ModulesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);
    try {
      const res = await tenantService.getAll({ pageSize: 100 });
      setTenants(res.items);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const moduleStats = useMemo(() => {
    const activeTenants = tenants.filter((t) => t.status === "active" || t.status === "trial");
    const total = activeTenants.length;

    return SYSTEM_MODULES.map((mod) => {
      const usingCount = activeTenants.filter((t) =>
        t.enabledModules.some((m) => m.moduleCode === mod.code && m.isEnabled)
      ).length;

      return {
        ...mod,
        usingCount,
        totalTenants: total,
        percentage: total > 0 ? Math.round((usingCount / total) * 100) : 0,
      };
    });
  }, [tenants]);

  const filtered = useMemo(() => {
    if (!search) return moduleStats;
    const q = search.toLowerCase();
    return moduleStats.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [moduleStats, search]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const mod of filtered) {
      if (!groups[mod.category]) groups[mod.category] = [];
      groups[mod.category].push(mod);
    }
    return groups;
  }, [filtered]);

  return (
    <PageWrapper
      title="Catálogo de Módulos"
      description="Vista global de módulos del sistema y su adopción por clientes"
    >
      <div className="space-y-4">
        {/* Buscador */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar módulo por nombre, código o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{SYSTEM_MODULES.length}</p>
              <p className="text-sm text-muted-foreground">Módulos Totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{SYSTEM_MODULES.filter((m) => m.isCore).length}</p>
              <p className="text-sm text-muted-foreground">Módulos Core</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{Object.keys(categoryLabels).length}</p>
              <p className="text-sm text-muted-foreground">Categorías</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{tenants.filter((t) => t.status === "active" || t.status === "trial").length}</p>
              <p className="text-sm text-muted-foreground">Tenants Activos</p>
            </CardContent>
          </Card>
        </div>

        {/* Módulos por categoría */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Cargando datos de módulos...
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedByCategory).map(([category, modules]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[category] ?? ""}`}>
                    {categoryLabels[category] ?? category}
                  </span>
                  <span className="text-muted-foreground text-sm font-normal">({modules.length} módulos)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Planes</TableHead>
                      <TableHead>Dependencias</TableHead>
                      <TableHead>Adopción</TableHead>
                      <TableHead className="text-right">Tenants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((mod) => (
                      <TableRow key={mod.code}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{mod.name}</p>
                            <p className="text-xs text-muted-foreground">{mod.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {mod.isCore ? (
                            <Badge variant="default" className="text-xs">
                              <Shield className="mr-1 h-3 w-3" />
                              Core
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Adicional</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {mod.includedInPlans.map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {mod.dependencies && mod.dependencies.length > 0 ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Link2 className="h-3 w-3" />
                              {mod.dependencies.map((d) => getModuleDefinition(d)?.name ?? d).join(", ")}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="w-24 space-y-1">
                            <Progress value={mod.percentage} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center">{mod.percentage}%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium">{mod.usingCount}/{mod.totalTenants}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageWrapper>
  );
}
