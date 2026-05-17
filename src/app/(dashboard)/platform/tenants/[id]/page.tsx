"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Car,
  Box,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CalendarPlus,
  Shield,
  Edit,
  PauseCircle,
  PlayCircle,
  Key,
  Plus,
  Check,
  X,
  AlertTriangle,
  Globe,
  DollarSign,
  Clock,
  FileText,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Tenant,
  TenantStatus,
  SubscriptionPlan,
  TenantModuleConfig,
  SystemModuleCode,
  SystemModuleDefinition,
  UpdateTenantDTO,
  CreateMasterUserDTO,
} from "@/types/platform";
import {
  SYSTEM_MODULES,
  getModuleDefinition,
  checkModuleDependencies,
  checkModuleDependents,
} from "@/types/platform";
import { tenantService, tenantModuleService, masterUserService, platformUserService, type PlatformUserItem } from "@/services/platform.service";
import { RenewSubscriptionDialog } from "@/components/platform/renew-subscription-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const statusConfig: Record<TenantStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Check }> = {
  active: { label: "Activo", variant: "default", icon: Check },
  trial: { label: "Trial", variant: "secondary", icon: Clock },
  suspended: { label: "Suspendido", variant: "destructive", icon: PauseCircle },
  cancelled: { label: "Cancelado", variant: "outline", icon: X },
  pending: { label: "Pendiente", variant: "secondary", icon: Clock },
};

const planConfig: Record<SubscriptionPlan, { label: string; color: string }> = {
  basic: { label: "Basic", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  professional: { label: "Professional", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  custom: { label: "Custom", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

const categoryLabels: Record<string, string> = {
  operations: "Operaciones",
  monitoring: "Monitoreo",
  finance: "Finanzas",
  maintenance: "Mantenimiento",
  master: "Datos Maestros",
  reports: "Reportes",
  support: "Soporte",
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const ROOT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
  const isRootTenant = tenantId === ROOT_TENANT_ID;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [masterUserDetail, setMasterUserDetail] = useState<PlatformUserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [masterUserOpen, setMasterUserOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  // Reset password del Master user
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdValue, setResetPwdValue] = useState("");
  const [resetPwdSendEmail, setResetPwdSendEmail] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ password: string } | null>(null);
  const [editForm, setEditForm] = useState<UpdateTenantDTO>({});

  // Confirmacion generica con AlertDialog (reemplaza window.confirm)
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    variant?: "default" | "destructive";
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [masterForm, setMasterForm] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    forcePasswordChange: true,
  });

  const loadTenant = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantService.getById(tenantId);
      setTenant(data);
      // Si el tenant tiene master user, intentamos cargar su username.
      //
      // 2026-05-14 BUG WORKAROUND: el backend devuelve 404 si pedimos
      //   GET /platform/users/:id  para un user que fue creado como master del
      // tenant (el master vive en `tenant_users`, no en `platform_users`, así
      // que el endpoint de detalle de platform-users no lo encuentra).
      //
      // Antes pedíamos detalle directo → 404 estridente cada vez que se llama
      // loadTenant() (que es DESPUÉS de cada mutación: suspend, reactivate,
      // update, toggle module, etc.).
      //
      // Ahora leemos la LISTA de platform-users (que SÍ devuelve los masters)
      // y filtramos por id en cliente. Si tampoco aparece, no rompe — solo
      // dejamos masterUserDetail = null y el UI usa masterUserName/Email del
      // tenant directamente.
      //
      // Bonus: la lista se cachea 30s en apiClient, así que mutaciones
      // consecutivas no la re-piden.
      if (data.masterUserId) {
        try {
          const all = await platformUserService.getAll({ pageSize: 100 });
          const found = all.items.find((u) => u.id === data.masterUserId) ?? null;
          setMasterUserDetail(found);
        } catch (err) {
          console.warn("No se pudo cargar lista de platform users:", err);
          setMasterUserDetail(null);
        }
      } else {
        setMasterUserDetail(null);
      }
    } catch (err) {
      console.error("Error loading tenant:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  /**
   * Modulos toggleables a nivel de tenant.
   *
   * 2026-05-14 (RE-ALINEADO): el backend dev confirmo via `data_seeds.md`
   * que la tabla `system_modules` tiene EXACTAMENTE estos codigos:
   *   dashboard, orders, scheduling, route_planner, monitoring, maintenance,
   *   finance, reports, notifications, master_data, workflows, bitacora,
   *   settings, platform
   *
   * Decisiones de UX:
   *   - `dashboard`, `settings`, `platform` se EXCLUYEN (siempre-on / internos).
   *   - `master_data` y `finance` son MODULOS AGREGADOS que cubren todos
   *     los maestros y finanzas respectivamente.
   *   - Los codigos granulares (customers, drivers, vehicles, etc.) NO se
   *     incluyen porque el backend no los tiene en system_modules → 500.
   *     Para permisos granulares, ver `permissions-editor.tsx` (mapeo
   *     resource → master_data/finance).
   *
   * Si el backend amplia el catalogo system_modules, agregar aqui los
   * codigos nuevos. Sin cambios adicionales requeridos.
   */
  const FUNCTIONAL_MODULES = new Set<SystemModuleCode>([
    // Operaciones (5 — sin `incidents` porque backend no lo tiene)
    "orders",
    "scheduling",
    "workflows",
    "bitacora",
    "route_planner",
    // Monitoreo (1 — sin `alerts` porque backend no lo tiene)
    "monitoring",
    // Mantenimiento
    "maintenance",
    // Finanzas (1 — modulo agregado, el backend no tiene los individuales)
    "finance",
    // Datos Maestros (1 — modulo agregado: Clientes, Conductores, Vehiculos,
    // Operadores, Productos, Geocercas. Backend no tiene granulares).
    "master_data",
    // Reportes
    "reports",
    // Soporte (1 — sin `integrations` porque backend no lo tiene)
    "notifications",
  ]);

  // Agrupar módulos por categoría (solo los confirmados funcionales)
  const modulesByCategory = useMemo(() => {
    const groups: Record<string, { module: SystemModuleDefinition; config: TenantModuleConfig | undefined }[]> = {};
    const enabledModules = Array.isArray(tenant?.enabledModules) ? tenant.enabledModules : [];
    for (const mod of SYSTEM_MODULES) {
      if (!FUNCTIONAL_MODULES.has(mod.code)) continue; // ocultar modulos no funcionales en backend
      const cat = mod.category;
      if (!groups[cat]) groups[cat] = [];
      const config = enabledModules.find((m) => m.moduleCode === mod.code);
      groups[cat].push({ module: mod, config });
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  /**
   * Resuelve TODAS las dependencias transitivas de un modulo.
   * Ej: si activamos `settlements` → necesita `orders` + `costs`,
   *     y `costs` requiere `orders` → resultado: [orders, costs, settlements].
   */
  function resolveDependencyChain(
    moduleCode: SystemModuleCode,
    alreadyEnabled: SystemModuleCode[],
  ): SystemModuleCode[] {
    const toEnable = new Set<SystemModuleCode>();
    const visit = (code: SystemModuleCode) => {
      if (alreadyEnabled.includes(code) || toEnable.has(code)) return;
      const def = getModuleDefinition(code);
      if (def?.dependencies) {
        for (const dep of def.dependencies) visit(dep);
      }
      toEnable.add(code);
    };
    visit(moduleCode);
    return Array.from(toEnable);
  }

  /**
   * Aplica un toggle optimista en el estado local SIN re-fetch.
   * El switch responde instantaneamente; el PUT va en background.
   * Si el PUT falla, llamamos a esta funcion otra vez con el valor anterior
   * para revertir.
   */
  function applyOptimisticToggle(moduleCode: SystemModuleCode, isEnabled: boolean) {
    setTenant((prev) => {
      if (!prev) return prev;
      const current = Array.isArray(prev.enabledModules) ? prev.enabledModules : [];
      const exists = current.some((m) => m.moduleCode === moduleCode);
      const next = exists
        ? current.map((m) => (m.moduleCode === moduleCode ? { ...m, isEnabled } : m))
        : [
            ...current,
            {
              moduleCode,
              isEnabled,
              enabledAt: new Date().toISOString(),
              enabledBy: "current-user",
            } as TenantModuleConfig,
          ];
      return { ...prev, enabledModules: next };
    });
  }

  /**
   * Envia varios modulos en UNA SOLA peticion PUT /modules.
   * 2026-05-14: la auditoria anterior decia que el backend daba 500 con 2+ items.
   * Si vuelve a fallar, tenemos updateModulesOneByOne como fallback.
   */
  async function updateModulesBatch(items: { moduleCode: SystemModuleCode; isEnabled: boolean }[]) {
    try {
      const result = await tenantModuleService.updateModules(tenantId, { modules: items });
      // El response trae la lista completa actualizada — la usamos para sincronizar
      if (Array.isArray(result) && result.length > 0) {
        setTenant((prev) => (prev ? { ...prev, enabledModules: result } : prev));
      }
      return { success: true, errors: [] as string[] };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      return { success: false, errors: [`HTTP ${status ?? "?"}`] };
    }
  }

  /**
   * Fallback: 1 PUT por modulo (cuando el batch falla con 500).
   */
  async function updateModulesOneByOne(items: { moduleCode: SystemModuleCode; isEnabled: boolean }[]) {
    const errors: string[] = [];
    for (const item of items) {
      try {
        await tenantModuleService.updateModules(tenantId, { modules: [item] });
      } catch (err) {
        const status = (err as { status?: number })?.status;
        const name = getModuleDefinition(item.moduleCode)?.name ?? item.moduleCode;
        errors.push(`${name}: HTTP ${status ?? "?"}`);
      }
    }
    return errors;
  }

  async function handleToggleModule(moduleCode: SystemModuleCode, enable: boolean) {
    if (!tenant) return;

    const enabledModules = Array.isArray(tenant.enabledModules) ? tenant.enabledModules : [];
    const enabledCodes = enabledModules.filter((m) => m.isEnabled).map((m) => m.moduleCode);
    const moduleName = getModuleDefinition(moduleCode)?.name ?? moduleCode;

    if (enable) {
      const { canEnable, missingDependencies } = checkModuleDependencies(moduleCode, enabledCodes);
      if (!canEnable) {
        // Auto-resolver dependencias: ofrecer activarlas juntas via AlertDialog
        const chain = resolveDependencyChain(moduleCode, enabledCodes);
        const depNames = missingDependencies.map((d) => getModuleDefinition(d)?.name ?? d).join(", ");
        setConfirmation({
          title: `Activar "${moduleName}" requiere dependencias`,
          description: (
            <>
              Para activar <span className="font-semibold text-foreground">{moduleName}</span> también se activarán:{" "}
              <span className="font-semibold text-foreground">{depNames}</span>.
              <br />
              <br />
              ¿Continuar y activar los {chain.length} módulos juntos?
            </>
          ),
          confirmLabel: `Activar ${chain.length} módulos`,
          variant: "default",
          onConfirm: async () => {
            chain.forEach((c) => applyOptimisticToggle(c, true));
            const result = await updateModulesBatch(chain.map((c) => ({ moduleCode: c, isEnabled: true })));
            if (result.success) {
              toast.success(`${chain.length} módulo(s) activado(s): ${chain.map((c) => getModuleDefinition(c)?.name ?? c).join(", ")}`);
            } else {
              chain.forEach((c) => applyOptimisticToggle(c, enabledCodes.includes(c)));
              toast.error(`Error al activar: ${result.errors.join(", ")}`, { duration: 8000 });
            }
          },
        });
        return;
      }
      // Toggle optimista inmediato + PUT background
      applyOptimisticToggle(moduleCode, true);
      const result = await updateModulesBatch([{ moduleCode, isEnabled: true }]);
      if (!result.success) {
        applyOptimisticToggle(moduleCode, false);
        toast.error(`"${moduleName}": ${result.errors[0]}`);
      } else {
        toast.success(`Módulo "${moduleName}" activado`);
      }
    } else {
      const { canDisable, dependentModules } = checkModuleDependents(moduleCode, enabledCodes);
      if (!canDisable) {
        const names = dependentModules.map((d) => getModuleDefinition(d)?.name ?? d).join(", ");
        toast.error(
          `No se puede desactivar "${moduleName}": estos módulos dependen de él: ${names}. Desactívalos primero.`,
          { duration: 8000 },
        );
        return;
      }
      // Toggle optimista inmediato + PUT background
      applyOptimisticToggle(moduleCode, false);
      const result = await updateModulesBatch([{ moduleCode, isEnabled: false }]);
      if (!result.success) {
        applyOptimisticToggle(moduleCode, true);
        toast.error(`"${moduleName}": ${result.errors[0]}`);
      } else {
        toast.success(`Módulo "${moduleName}" desactivado`);
      }
    }
  }

  /**
   * Activa TODOS los modulos visibles en la UI (whitelist FUNCTIONAL_MODULES)
   * en UNA sola peticion PUT. Si el backend devuelve 500 por el bug del array,
   * cae al fallback uno-por-uno.
   */
  async function handleEnableAll() {
    if (!tenant) return;
    const enabledModules = Array.isArray(tenant.enabledModules) ? tenant.enabledModules : [];
    const currentlyEnabled = new Set(enabledModules.filter((m) => m.isEnabled).map((m) => m.moduleCode));
    const allModules = SYSTEM_MODULES.filter((m) => FUNCTIONAL_MODULES.has(m.code));
    const toEnable = allModules.filter((m) => !currentlyEnabled.has(m.code));
    if (toEnable.length === 0) {
      toast.info("Todos los módulos ya están activos.");
      return;
    }
    const sample = toEnable.slice(0, 5).map((m) => m.name).join(", ");
    const rest = toEnable.length > 5 ? ` y ${toEnable.length - 5} más` : "";
    setConfirmation({
      title: `Activar ${toEnable.length} módulos`,
      description: (
        <>
          Vas a activar todos los módulos faltantes para{" "}
          <span className="font-semibold text-foreground">{tenant.name}</span>.
          <br />
          <br />
          Incluye: <span className="font-medium text-foreground">{sample}{rest}</span>.
        </>
      ),
      confirmLabel: `Sí, activar ${toEnable.length}`,
      variant: "default",
      onConfirm: async () => {
        toEnable.forEach((m) => applyOptimisticToggle(m.code, true));
        const batchResult = await updateModulesBatch(
          toEnable.map((m) => ({ moduleCode: m.code, isEnabled: true })),
        );
        if (batchResult.success) {
          toast.success(`${toEnable.length} módulos activados correctamente.`);
          return;
        }
        toast.info("Reintentando uno por uno...");
        const errors = await updateModulesOneByOne(
          toEnable.map((m) => ({ moduleCode: m.code, isEnabled: true })),
        );
        if (errors.length === 0) {
          toast.success(`${toEnable.length} módulos activados correctamente.`);
        } else {
          const failedCodes = new Set(errors.map((e) => e.split(":")[0]));
          toEnable.forEach((m) => {
            const name = getModuleDefinition(m.code)?.name ?? m.code;
            if (failedCodes.has(name)) applyOptimisticToggle(m.code, false);
          });
          toast.error(
            `${toEnable.length - errors.length} activados, ${errors.length} con error: ${errors.slice(0, 3).join(", ")}`,
            { duration: 10000 },
          );
        }
      },
    });
  }

  /**
   * Desactiva TODOS los modulos actualmente activos (incluyendo core).
   * El Owner tiene control total. Envia todo en 1 sola peticion PUT.
   */
  async function handleDisableAll() {
    if (!tenant) return;
    const enabledModules = Array.isArray(tenant.enabledModules) ? tenant.enabledModules : [];
    const currentlyEnabled = new Set(enabledModules.filter((m) => m.isEnabled).map((m) => m.moduleCode));
    const toDisable = SYSTEM_MODULES.filter(
      (m) => FUNCTIONAL_MODULES.has(m.code) && currentlyEnabled.has(m.code),
    );
    if (toDisable.length === 0) {
      toast.info("No hay módulos activos para desactivar.");
      return;
    }
    const sample = toDisable.slice(0, 5).map((m) => m.name).join(", ");
    const rest = toDisable.length > 5 ? ` y ${toDisable.length - 5} más` : "";
    setConfirmation({
      title: `Desactivar ${toDisable.length} módulos`,
      description: (
        <>
          Vas a desactivar TODOS los módulos activos de{" "}
          <span className="font-semibold text-foreground">{tenant.name}</span>.
          <br />
          <br />
          Incluye: <span className="font-medium text-foreground">{sample}{rest}</span>.
          <br />
          <br />
          <span className="text-xs text-muted-foreground">
            El tenant se quedará sin módulos hasta que reactives alguno. Los sub-usuarios no podrán operar.
          </span>
        </>
      ),
      confirmLabel: `Sí, desactivar ${toDisable.length}`,
      variant: "destructive",
      onConfirm: async () => {
        toDisable.forEach((m) => applyOptimisticToggle(m.code, false));
        const batchResult = await updateModulesBatch(
          toDisable.map((m) => ({ moduleCode: m.code, isEnabled: false })),
        );
        if (batchResult.success) {
          toast.success(`${toDisable.length} módulos desactivados correctamente.`);
          return;
        }
        toast.info("Reintentando uno por uno...");
        const errors = await updateModulesOneByOne(
          toDisable.map((m) => ({ moduleCode: m.code, isEnabled: false })),
        );
        if (errors.length === 0) {
          toast.success(`${toDisable.length} módulos desactivados correctamente.`);
        } else {
          const failedCodes = new Set(errors.map((e) => e.split(":")[0]));
          toDisable.forEach((m) => {
            const name = getModuleDefinition(m.code)?.name ?? m.code;
            if (failedCodes.has(name)) applyOptimisticToggle(m.code, true);
          });
          toast.error(
            `${toDisable.length - errors.length} desactivados, ${errors.length} con error: ${errors.slice(0, 3).join(", ")}`,
            { duration: 10000 },
          );
        }
      },
    });
  }

  function handleSuspend() {
    if (!tenant) return;
    setSuspendReason("");
    setSuspendOpen(true);
  }

  async function confirmSuspend() {
    if (!tenant || !suspendReason.trim()) return;
    setSuspending(true);
    try {
      await tenantService.suspend(tenantId, { reason: suspendReason.trim() });
      toast.success(`Tenant "${tenant.name}" suspendido`);
      setSuspendOpen(false);
      setSuspendReason("");
      loadTenant();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error suspendiendo tenant";
      toast.error(msg);
      console.error("Error suspending:", err);
    } finally {
      setSuspending(false);
    }
  }

  async function handleReactivate() {
    if (!tenant) return;
    try {
      await tenantService.reactivate(tenantId);
      toast.success(`Tenant "${tenant.name}" reactivado`);
      loadTenant();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error reactivando tenant";
      toast.error(msg);
      console.error("Error reactivating:", err);
    }
  }

  /**
   * 2026-05-14: activación de un tenant `pending`. Misma estrategia que en la
   * lista: intentar `reactivate()` y, si el backend rechaza la transición,
   * fallback a `PUT /platform/tenants/:id` con `{ status: "active" }`.
   */
  async function handleActivate() {
    if (!tenant) return;
    try {
      await tenantService.reactivate(tenantId);
      toast.success(`Tenant "${tenant.name}" activado`);
      loadTenant();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isInvalidTransition =
        msg.includes("INVALID_TRANSITION") || msg.includes("invalid transition");
      if (isInvalidTransition) {
        try {
          await tenantService.update(tenantId, { status: "active" });
          toast.success(`Tenant "${tenant.name}" activado`);
          loadTenant();
          return;
        } catch (err2) {
          const msg2 = err2 instanceof Error ? err2.message : "Error activando tenant";
          toast.error(msg2);
          console.error("Error activating (fallback PUT):", err2);
          return;
        }
      }
      toast.error(msg || "Error activando tenant");
      console.error("Error activating (reactivate):", err);
    }
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      // El doc §4.5.4 declara TODOS los campos como `?: string` (opcionales pero NO nullable).
      // Mandamos los 19 campos del DTO con su valor actual del form, omitiendo solo los
      // que esten null/undefined/vacios (porque el DTO no acepta null, solo undefined).
      const cleanBody: UpdateTenantDTO = {};
      for (const [key, value] of Object.entries(editForm)) {
        if (value === null || value === undefined || value === "") continue;
        (cleanBody as Record<string, unknown>)[key] = value;
      }

      await tenantService.update(tenantId, cleanBody);
      toast.success(`Tenant "${tenant?.name}" actualizado correctamente`);
      setEditOpen(false);
      loadTenant();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "Error actualizando tenant";
      if (status === 500) {
        toast.error(
          "El backend no pudo actualizar (HTTP 500). Bug conocido §4.5.6: el handler PUT crashea con cualquier body. Reportado al equipo backend.",
          { duration: 10000 },
        );
      } else if (status === 400) {
        toast.error(`Validación: ${msg}`);
      } else if (status === 409) {
        toast.error("Conflicto: el RUC o código ya está en uso por otro tenant.");
      } else {
        toast.error(status ? `HTTP ${status}: ${msg}` : msg);
      }
      console.error("Error updating:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateMasterUser() {
    if (!tenant) return;
    setSaving(true);
    try {
      const dto: CreateMasterUserDTO = {
        tenantId: tenant.id,
        username: masterForm.username,
        name: masterForm.name,
        email: masterForm.email,
        password: masterForm.password,
        phone: masterForm.phone || undefined,
        forcePasswordChange: masterForm.forcePasswordChange,
      };
      await masterUserService.createMasterUser(dto);
      toast.success(`Usuario Maestro "${masterForm.username}" creado para ${tenant.name}`);
      setMasterUserOpen(false);
      setMasterForm({ username: "", name: "", email: "", phone: "", password: "", forcePasswordChange: true });
      loadTenant();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "Error creando Usuario Maestro";
      if (status === 404) {
        toast.error(
          "El endpoint POST /platform/tenants/:id/master-users no está implementado en el backend. Bug §6.2.",
          { duration: 10000 },
        );
      } else if (status === 409) {
        toast.error("Ya existe un usuario con ese username o email.");
      } else if (status === 400) {
        toast.error(`Validación: ${msg}`);
      } else {
        toast.error(status ? `HTTP ${status}: ${msg}` : msg);
      }
      console.error("Error creating master user:", err);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Genera una contraseña temporal fuerte: 12 chars, mayus + minus + numero + simbolo.
   */
  function generateStrongPassword(): string {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I, O confusas
    const lower = "abcdefghjkmnpqrstuvwxyz"; // sin i, l, o
    const digits = "23456789"; // sin 0, 1
    const symbols = "!@#$%&*?";
    const all = upper + lower + digits + symbols;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    // Garantizar al menos 1 de cada
    const base = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while (base.length < 12) base.push(pick(all));
    // Shuffle
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base.join("");
  }

  function openResetPwdDialog() {
    setResetPwdValue("");
    setResetPwdSendEmail(false);
    setResetResult(null);
    setResetPwdOpen(true);
  }

  async function confirmResetPwd() {
    if (!tenant?.masterUserId) return;
    setResetting(true);
    try {
      // Si no se escribio una contraseña, generamos una fuerte
      const finalPassword = resetPwdValue.trim() || generateStrongPassword();
      await masterUserService.forcePasswordReset({
        userId: tenant.masterUserId,
        tenantId: tenant.id,
        temporaryPassword: finalPassword,
        sendByEmail: resetPwdSendEmail,
        forceChangeOnLogin: true,
      });
      // Guardar el resultado para mostrar la contraseña al Owner
      setResetResult({ password: finalPassword });
      toast.success(`Contraseña de "${tenant.masterUserName}" restablecida`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "Error al resetear contraseña";
      if (status === 404) {
        toast.error("El endpoint POST /platform/users/:id/force-reset no está implementado en el backend.");
      } else {
        toast.error(status ? `HTTP ${status}: ${msg}` : msg);
      }
      console.error("Error force-reset:", err);
    } finally {
      setResetting(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Contraseña copiada al portapapeles");
    } catch {
      toast.error("No se pudo copiar. Cópiala manualmente.");
    }
  }

  function openEditDialog() {
    if (!tenant) return;
    // Pre-cargar TODOS los 19 campos opcionales del UpdateTenantDTO (segun doc §4.5.4)
    setEditForm({
      name: tenant.name,
      legalName: tenant.legalName,
      taxId: tenant.taxId,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      country: tenant.country,
      postalCode: tenant.postalCode,
      phone: tenant.phone,
      email: tenant.email,
      website: tenant.website,
      logo: tenant.logo,
      plan: tenant.plan,
      maxUsers: tenant.maxUsers,
      maxVehicles: tenant.maxVehicles,
      timezone: tenant.timezone,
      defaultCurrency: tenant.defaultCurrency,
      defaultLanguage: tenant.defaultLanguage,
      internalNotes: tenant.internalNotes,
    });
    setEditOpen(true);
  }

  if (loading) {
    return (
      <PageWrapper title="Detalle de Cliente" description="Cargando...">
        <div className="h-60 flex items-center justify-center text-muted-foreground">
          Cargando información del cliente...
        </div>
      </PageWrapper>
    );
  }

  if (!tenant) {
    return (
      <PageWrapper title="Cliente no encontrado" description="">
        <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p>No se encontró el cliente solicitado</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/platform/tenants")}>
            Volver a la lista
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const status = statusConfig[tenant.status] ?? statusConfig.active;
  const plan = planConfig[tenant.plan] ?? planConfig.basic;
  const safeEnabledModules = Array.isArray(tenant.enabledModules) ? tenant.enabledModules : [];
  const enabledCount = safeEnabledModules.filter((m) => m.isEnabled).length;

  // Workaround bug backend: cuando se crea el master user via POST /platform/tenants/:id/master-users,
  // el backend NO incrementa `current_users_count` (sigue en 0). Lo corregimos visualmente:
  // si tiene master_user_id asignado, el contador es al menos 1.
  const effectiveUsersCount = tenant.masterUserId
    ? Math.max(tenant.currentUsersCount ?? 0, 1)
    : (tenant.currentUsersCount ?? 0);

  return (
    <PageWrapper
      title={tenant.name}
      description={`${tenant.code} · ${tenant.legalName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/platform/tenants">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          {!isRootTenant && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setRenewOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Renovar suscripcion
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          {!isRootTenant && (tenant.status === "active" || tenant.status === "trial") && (
            <Button variant="destructive" size="sm" onClick={handleSuspend}>
              <PauseCircle className="mr-2 h-4 w-4" />
              Suspender
            </Button>
          )}
          {!isRootTenant && tenant.status === "suspended" && (
            <Button variant="default" size="sm" onClick={handleReactivate}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Reactivar
            </Button>
          )}
          {!isRootTenant && tenant.status === "pending" && (
            <Button variant="default" size="sm" onClick={handleActivate}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Activar
            </Button>
          )}
        </div>
      }
    >
      {/* Dialog de renovacion de suscripcion */}
      <RenewSubscriptionDialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        tenant={tenant}
        onRenewed={loadTenant}
      />
      <div className="space-y-6">
        {/* Resumen Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant={status.variant} className="mt-1">
                    {status.label}
                  </Badge>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${plan.color}`}>
                    {plan.label}
                  </span>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                  <p className="text-2xl font-bold">{effectiveUsersCount}<span className="text-sm font-normal text-muted-foreground">/{tenant.maxUsers}</span></p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vehículos</p>
                  <p className="text-2xl font-bold">{tenant.currentVehiclesCount}<span className="text-sm font-normal text-muted-foreground">/{tenant.maxVehicles}</span></p>
                </div>
                <Car className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="modules">Módulos ({enabledCount})</TabsTrigger>
            <TabsTrigger value="master-user">Usuario Maestro</TabsTrigger>
            <TabsTrigger value="subscription">Suscripción</TabsTrigger>
          </TabsList>

          {/* Tab: Información General */}
          <TabsContent value="info">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Datos de la Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Código</p>
                      <p className="font-medium">{tenant.code}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">RUC / NIT</p>
                      <p className="font-medium">{tenant.taxId}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Razón Social</p>
                      <p className="font-medium">{tenant.legalName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.address}, {tenant.city}, {tenant.country}</span>
                  </div>
                  {tenant.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{tenant.website}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Configuración Regional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-muted-foreground">Zona Horaria</p>
                      <p className="font-medium">{tenant.timezone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Moneda</p>
                      <p className="font-medium">{tenant.defaultCurrency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Idioma</p>
                      <p className="font-medium">{tenant.defaultLanguage === "es" ? "Español" : "English"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas Internas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {tenant.internalNotes || "Sin notas internas"}
                  </p>
                  {tenant.suspensionReason && (
                    <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                      <p className="text-sm font-medium text-destructive">Motivo de suspensión:</p>
                      <p className="text-sm">{tenant.suspensionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Módulos */}
          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="h-5 w-5" />
                      Módulos del Sistema
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Active o desactive los módulos disponibles para este cliente.
                      <br />
                      <span className="text-xs">
                        Mostrando <strong>{FUNCTIONAL_MODULES.size} módulos</strong> confirmados funcionales en producción. Si activas uno que depende de otros (ej: Programación → Órdenes), te ofrecerá activarlos juntos.
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleEnableAll}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Activar todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisableAll}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Desactivar todos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(modulesByCategory).map(([category, modules]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                      {categoryLabels[category] ?? category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modules.map(({ module: mod, config }) => {
                        const isEnabled = config?.isEnabled ?? false;
                        return (
                          <div
                            key={mod.code}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isEnabled ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {mod.isCore && <span className="text-amber-500 mr-1">★</span>}
                                  {mod.name}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {mod.description}
                              </p>
                              {mod.dependencies && mod.dependencies.length > 0 && (
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  Depende de: {mod.dependencies.map((d) => getModuleDefinition(d)?.name ?? d).join(", ")}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleToggleModule(mod.code, checked)}
                              // 2026-05-14: el Owner siempre puede activar/desactivar
                              // cualquier modulo. Las dependencias (ej: no se puede
                              // desactivar `orders` si `workflows` esta activo) ya
                              // estan protegidas por `checkModuleDependents` en
                              // `handleToggleModule`. Sin necesidad de disabled.
                            />
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Usuario Maestro */}
          <TabsContent value="master-user">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Usuario Maestro
                </CardTitle>
                <CardDescription>
                  El usuario maestro es el administrador principal de la cuenta del cliente.
                  Puede crear subusuarios, asignar roles y configurar el sistema dentro de su cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tenant.masterUserId ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{tenant.masterUserName}</p>
                        <p className="text-sm text-muted-foreground">{tenant.masterUserEmail}</p>
                        {masterUserDetail?.username && (
                          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md border-2 border-primary/30 bg-primary/5">
                            <Key className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground font-medium">
                                Usuario de login
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <code className="text-sm font-mono font-bold text-primary select-all">
                                  {masterUserDetail.username}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => copyToClipboard(masterUserDetail.username)}
                                  title="Copiar username"
                                >
                                  📋
                                </Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Este es el username que el usuario debe ingresar en el login (NO el email).
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2 font-mono break-all">
                          ID: {tenant.masterUserId}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={openResetPwdDialog} className="shrink-0">
                        <Key className="mr-2 h-4 w-4" />
                        Reset Contraseña
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground mb-4">
                      Este cliente aún no tiene un usuario maestro asignado
                    </p>
                    <Dialog open={masterUserOpen} onOpenChange={setMasterUserOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Crear Usuario Maestro
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crear Usuario Maestro</DialogTitle>
                          <DialogDescription>
                            Cree el administrador principal para {tenant.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Username de login *</Label>
                            <Input
                              value={masterForm.username}
                              onChange={(e) => setMasterForm({ ...masterForm, username: e.target.value })}
                              placeholder="juan.perez"
                              autoComplete="off"
                            />
                            <p className="text-xs text-muted-foreground">
                              El usuario usará este nombre + contraseña para iniciar sesión (NO el email).
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Nombre Completo *</Label>
                            <Input
                              value={masterForm.name}
                              onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                              placeholder="Juan Pérez"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email (para notificaciones)</Label>
                            <Input
                              type="email"
                              value={masterForm.email}
                              onChange={(e) => setMasterForm({ ...masterForm, email: e.target.value })}
                              placeholder="admin@empresa.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                              value={masterForm.phone}
                              onChange={(e) => setMasterForm({ ...masterForm, phone: e.target.value })}
                              placeholder="+51 999 999 999"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contraseña Temporal *</Label>
                            <Input
                              type="password"
                              value={masterForm.password}
                              onChange={(e) => setMasterForm({ ...masterForm, password: e.target.value })}
                              placeholder="••••••••"
                              autoComplete="new-password"
                            />
                            <p className="text-xs text-muted-foreground">
                              Mínimo 8 caracteres. El usuario podrá cambiarla en el primer login.
                            </p>
                          </div>
                          <Label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={masterForm.forcePasswordChange}
                              onChange={(e) => setMasterForm({ ...masterForm, forcePasswordChange: e.target.checked })}
                              className="h-4 w-4 rounded border-input"
                            />
                            Forzar cambio de contraseña en primer login
                          </Label>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setMasterUserOpen(false)}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateMasterUser}
                            disabled={
                              saving ||
                              !masterForm.username ||
                              !masterForm.name ||
                              !masterForm.password ||
                              masterForm.password.length < 8
                            }
                          >
                            Crear Usuario
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Suscripción */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Información de Suscripción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan Actual</p>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${plan.color}`}>
                        {plan.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                      <p className="font-medium">{new Date(tenant.subscriptionStartDate).toLocaleDateString("es")}</p>
                    </div>
                    {tenant.subscriptionEndDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                        <p className="font-medium">{new Date(tenant.subscriptionEndDate).toLocaleDateString("es")}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Periodo de Prueba</p>
                      {tenant.isTrialActive ? (
                        <div>
                          <Badge variant="secondary">Activo</Badge>
                          {tenant.trialEndDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Vence: {new Date(tenant.trialEndDate).toLocaleDateString("es")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">No activo</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Límites</p>
                      <div className="flex gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {effectiveUsersCount}/{tenant.maxUsers} usuarios
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          {tenant.currentVehiclesCount}/{tenant.maxVehicles} vehículos
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Módulos Activos</p>
                      <p className="font-medium">{enabledCount} de {FUNCTIONAL_MODULES.size} disponibles</p>
                    </div>
                  </div>
                </div>
                <Separator className="my-6" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Creado: {new Date(tenant.createdAt).toLocaleString("es")} por {tenant.createdBy}</p>
                  <p>Última actualización: {new Date(tenant.updatedAt).toLocaleString("es")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Actualice los datos de {tenant.name}. Todos los campos son opcionales — solo se enviará lo que cambies.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">

            {/* ── Datos de la empresa ─────────────────────── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Datos de la empresa</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre Comercial</Label>
                  <Input
                    value={editForm.name ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Razón Social</Label>
                  <Input
                    value={editForm.legalName ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RUC / NIT</Label>
                  <Input
                    value={editForm.taxId ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    type="url"
                    value={editForm.website ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://miempresa.com"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Logo (URL o base64)</Label>
                  <Input
                    value={editForm.logo ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                    placeholder="https://... o data:image/png;base64,..."
                  />
                </div>
              </div>
            </div>

            {/* ── Contacto ─────────────────────── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Contacto</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={editForm.phone ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Dirección</Label>
                  <Input
                    value={editForm.address ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={editForm.city ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado / Provincia</Label>
                  <Input
                    value={editForm.state ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>País (código ISO)</Label>
                  <Select
                    value={editForm.country ?? "PE"}
                    onValueChange={(v) => setEditForm({ ...editForm, country: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PE">Perú (PE)</SelectItem>
                      <SelectItem value="CO">Colombia (CO)</SelectItem>
                      <SelectItem value="CL">Chile (CL)</SelectItem>
                      <SelectItem value="EC">Ecuador (EC)</SelectItem>
                      <SelectItem value="MX">México (MX)</SelectItem>
                      <SelectItem value="AR">Argentina (AR)</SelectItem>
                      <SelectItem value="BR">Brasil (BR)</SelectItem>
                      <SelectItem value="US">Estados Unidos (US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input
                    value={editForm.postalCode ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ── Plan y límites ─────────────────────── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Plan y límites</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select
                    value={editForm.plan ?? tenant.plan}
                    onValueChange={(v) => setEditForm({ ...editForm, plan: v as SubscriptionPlan })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Máx. Usuarios</Label>
                  <Input
                    type="number"
                    min={tenant.currentUsersCount}
                    value={editForm.maxUsers ?? tenant.maxUsers}
                    onChange={(e) => setEditForm({ ...editForm, maxUsers: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. Vehículos</Label>
                  <Input
                    type="number"
                    min={tenant.currentVehiclesCount}
                    value={editForm.maxVehicles ?? tenant.maxVehicles}
                    onChange={(e) => setEditForm({ ...editForm, maxVehicles: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* ── Configuración regional ─────────────────────── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Configuración regional</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Input
                    value={editForm.timezone ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                    placeholder="America/Lima"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Input
                    value={editForm.defaultCurrency ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, defaultCurrency: e.target.value.toUpperCase() })}
                    placeholder="PEN"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select
                    value={editForm.defaultLanguage ?? "es"}
                    onValueChange={(v) => setEditForm({ ...editForm, defaultLanguage: v as "es" | "en" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Notas internas ─────────────────────── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Notas internas (no visibles al cliente)</h4>
              <Textarea
                value={editForm.internalNotes ?? ""}
                onChange={(e) => setEditForm({ ...editForm, internalNotes: e.target.value })}
                placeholder="Notas internas del Owner sobre este cliente..."
                rows={3}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: suspender tenant (requiere motivo) */}
      <Dialog
        open={suspendOpen}
        onOpenChange={(open) => {
          if (!open && !suspending) {
            setSuspendOpen(false);
            setSuspendReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender tenant</DialogTitle>
            <DialogDescription>
              El tenant{" "}
              <span className="font-semibold text-foreground">{tenant.name}</span> dejará
              de tener acceso al sistema. Indica el motivo — quedará registrado en el
              historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="suspendReason">Motivo de la suspensión *</Label>
            <Textarea
              id="suspendReason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Ej: Falta de pago de la mensualidad. Reactivar al regularizar."
              rows={4}
              disabled={suspending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendOpen(false);
                setSuspendReason("");
              }}
              disabled={suspending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSuspend}
              disabled={suspending || suspendReason.trim().length === 0}
            >
              {suspending ? "Suspendiendo..." : "Suspender"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Reset contraseña del Master User */}
      <Dialog
        open={resetPwdOpen}
        onOpenChange={(open) => {
          if (!open && !resetting) {
            setResetPwdOpen(false);
            setResetPwdValue("");
            setResetResult(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {!resetResult ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Resetear contraseña
                </DialogTitle>
                <DialogDescription>
                  Restablecer la contraseña de{" "}
                  <span className="font-semibold text-foreground">{tenant.masterUserName}</span>
                  {" "}<span className="font-mono text-xs">({tenant.masterUserEmail})</span>.
                  <br />
                  El usuario tendrá que cambiarla en su próximo login.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="newPwd">Nueva contraseña temporal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newPwd"
                      type="text"
                      value={resetPwdValue}
                      onChange={(e) => setResetPwdValue(e.target.value)}
                      placeholder="Deja vacío para generar automáticamente"
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setResetPwdValue(generateStrongPassword())}
                      title="Generar contraseña fuerte"
                    >
                      🎲
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si dejas el campo vacío, se generará una contraseña aleatoria fuerte de 12 caracteres.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetPwdSendEmail}
                    onChange={(e) => setResetPwdSendEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>
                    Notificar al usuario por email
                    <span className="text-xs text-muted-foreground ml-1">
                      (a {tenant.masterUserEmail})
                    </span>
                  </span>
                </label>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setResetPwdOpen(false)}
                  disabled={resetting}
                >
                  Cancelar
                </Button>
                <Button onClick={confirmResetPwd} disabled={resetting}>
                  {resetting ? "Reseteando..." : "Resetear contraseña"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600">
                  <Check className="h-5 w-5" />
                  Contraseña restablecida
                </DialogTitle>
                <DialogDescription>
                  La nueva contraseña temporal de{" "}
                  <span className="font-semibold text-foreground">{tenant.masterUserName}</span> es:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 select-all break-all">
                      {resetResult.password}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(resetResult.password)}
                    >
                      📋 Copiar
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Importante:</strong> esta contraseña NO se mostrará otra vez.
                    Cópiala ahora y compártela con el usuario por un canal seguro (chat directo, llamada).
                    El usuario deberá cambiarla en su próximo inicio de sesión.
                    {resetPwdSendEmail && (
                      <div className="mt-1">
                        ✉️ Se notificó al usuario por email a <span className="font-mono">{tenant.masterUserEmail}</span>.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-700 dark:text-rose-400">
                    <strong>⚠ Bug del backend pendiente:</strong> aunque el endpoint
                    <code className="mx-1 px-1 rounded bg-rose-100 dark:bg-rose-900/40 font-mono">/force-reset</code>
                    responde 200, las pruebas E2E (2026-05-14) confirman que el
                    backend NO está aplicando la nueva contraseña: el master user no
                    puede hacer login con ninguna contraseña hasta que el equipo
                    backend corrija los bugs de master-users + force-reset
                    (PLATAFORMA.md §16.5 — F2/F3).
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setResetPwdOpen(false);
                    setResetResult(null);
                  }}
                >
                  Entendido, cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog genérico para confirmaciones (reemplaza window.confirm) */}
      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !confirmingAction) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>{confirmation?.description}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmingAction}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmingAction}
              onClick={async (e) => {
                e.preventDefault();
                if (!confirmation) return;
                setConfirmingAction(true);
                try {
                  await confirmation.onConfirm();
                } finally {
                  setConfirmingAction(false);
                  setConfirmation(null);
                }
              }}
              className={
                confirmation?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }
            >
              {confirmingAction ? "Procesando..." : confirmation?.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
