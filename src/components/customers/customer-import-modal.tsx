"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertModal } from "@/components/ui/alert-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateCustomerDTO, CustomerType, DocumentType, CustomerCategory } from "@/types/models";

interface ImportRow {
  rowNumber: number;
  data: Partial<CreateCustomerDTO>;
  errors: string[];
  warnings: string[];
  status: "pending" | "valid" | "error" | "warning";
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (customers: CreateCustomerDTO[]) => Promise<ImportResult>;
}

// Plantilla de ejemplo para descarga
const TEMPLATE_HEADERS = [
  "tipo",
  "tipo_documento",
  "numero_documento",
  "nombre",
  "nombre_comercial",
  "email",
  "telefono",
  "telefono_2",
  "sitio_web",
  "categoria",
  "industria",
  "direccion_calle",
  "direccion_ciudad",
  "direccion_departamento",
  "direccion_codigo_postal",
  "direccion_referencia",
  "contacto_nombre",
  "contacto_email",
  "contacto_telefono",
  "contacto_cargo",
  "notas",
  "etiquetas",
];

const EXAMPLE_ROW = [
  "empresa",
  "RUC",
  "20123456789",
  "Transportes ABC S.A.C.",
  "ABC Transport",
  "contacto@abc.com",
  "01-4567890",
  "999888777",
  "https://www.abc.com",
  "premium",
  "Logística",
  "Av. Industrial 123",
  "Lima",
  "Lima",
  "15001",
  "Frente al parque",
  "Juan Pérez",
  "juan.perez@abc.com",
  "999111222",
  "Gerente de Operaciones",
  "Cliente frecuente",
  "logistica,transporte",
];

export function CustomerImportModal({
  isOpen,
  onClose,
  onImport,
}: CustomerImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "results">("upload");
  const [_file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileTypeAlert, setFileTypeAlert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resetear estado al cerrar
  const handleClose = useCallback(() => {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    setImportProgress(0);
    setImportResult(null);
    onClose();
  }, [onClose]);

  // Descargar plantilla CSV
  const downloadTemplate = useCallback(() => {
    const csvContent = [
      TEMPLATE_HEADERS.join(","),
      EXAMPLE_ROW.map(val => `"${val}"`).join(","),
    ].join("\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_clientes.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  // Parsear archivo CSV
  const parseCSV = useCallback((content: string): ImportRow[] => {
    const lines = content.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/("([^"]*)"|[^,]*)/g)?.map(v => 
        v.replace(/^"|"$/g, "").trim()
      ) || [];

      const rowData: Record<string, string> = {};
      headers.forEach((header, idx) => {
        rowData[header] = values[idx] || "";
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validar campos requeridos
      if (!rowData.tipo || !["empresa", "persona"].includes(rowData.tipo.toLowerCase())) {
        errors.push("Tipo debe ser 'empresa' o 'persona'");
      }
      if (!rowData.tipo_documento || !["RUC", "DNI", "CE", "PASSPORT"].includes(rowData.tipo_documento.toUpperCase())) {
        errors.push("Tipo de documento inválido");
      }
      if (!rowData.numero_documento) {
        errors.push("Número de documento requerido");
      }
      if (!rowData.nombre || rowData.nombre.length < 3) {
        errors.push("Nombre/Razón social requerido (mín. 3 caracteres)");
      }
      if (!rowData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
        errors.push("Email inválido");
      }
      if (!rowData.telefono || rowData.telefono.length < 6) {
        errors.push("Teléfono requerido (mín. 6 dígitos)");
      }
      if (!rowData.direccion_calle || rowData.direccion_calle.length < 5) {
        errors.push("Dirección requerida (mín. 5 caracteres)");
      }
      if (!rowData.direccion_ciudad) {
        errors.push("Ciudad requerida");
      }
      if (!rowData.direccion_departamento) {
        errors.push("Departamento requerido");
      }
      if (!rowData.contacto_nombre) {
        errors.push("Nombre de contacto requerido");
      }
      if (!rowData.contacto_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.contacto_email)) {
        errors.push("Email de contacto inválido");
      }
      if (!rowData.contacto_telefono) {
        errors.push("Teléfono de contacto requerido");
      }

      // Warnings
      if (!rowData.nombre_comercial) {
        warnings.push("Sin nombre comercial");
      }
      if (!rowData.categoria) {
        warnings.push("Sin categoría (se usará 'standard')");
      }

      const customerData: Partial<CreateCustomerDTO> = {
        type: (rowData.tipo?.toLowerCase() || "empresa") as CustomerType,
        documentType: (rowData.tipo_documento?.toUpperCase() || "RUC") as DocumentType,
        documentNumber: rowData.numero_documento || "",
        name: rowData.nombre || "",
        tradeName: rowData.nombre_comercial || undefined,
        email: rowData.email || "",
        phone: rowData.telefono || "",
        phone2: rowData.telefono_2 || undefined,
        website: rowData.sitio_web || undefined,
        category: (rowData.categoria?.toLowerCase() || "standard") as CustomerCategory,
        industry: rowData.industria || undefined,
        notes: rowData.notas || undefined,
        tags: rowData.etiquetas ? rowData.etiquetas.split(",").map(t => t.trim()) : undefined,
        addresses: [{
          label: "Principal",
          street: rowData.direccion_calle || "",
          city: rowData.direccion_ciudad || "",
          state: rowData.direccion_departamento || "",
          country: "Perú",
          zipCode: rowData.direccion_codigo_postal || undefined,
          reference: rowData.direccion_referencia || undefined,
          isDefault: true,
        }],
        contacts: [{
          name: rowData.contacto_nombre || "",
          email: rowData.contacto_email || "",
          phone: rowData.contacto_telefono || "",
          position: rowData.contacto_cargo || undefined,
          isPrimary: true,
          notifyDeliveries: true,
          notifyIncidents: true,
        }],
      };

      rows.push({
        rowNumber: i + 1,
        data: customerData,
        errors,
        warnings,
        status: errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid",
      });
    }

    return rows;
  }, []);

  // Manejar archivo seleccionado
  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile) return;
    
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".csv")) {
      setFileTypeAlert(true);
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      setParsedRows(rows);
      setStep("preview");
    };
    reader.readAsText(selectedFile);
  }, [parseCSV]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  // Ejecutar importación
  const executeImport = useCallback(async () => {
    const validRows = parsedRows.filter(r => r.status !== "error");
    if (validRows.length === 0) return;

    setStep("importing");
    setImportProgress(0);

    const customersToImport = validRows.map(r => r.data as CreateCustomerDTO);
    
    // Simular progreso
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await onImport(customersToImport);
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setStep("results");
    } catch {
      clearInterval(progressInterval);
      setImportResult({
        success: 0,
        failed: validRows.length,
        errors: [{ row: 0, message: "Error en la importación" }],
      });
      setStep("results");
    }
  }, [parsedRows, onImport]);

  // Stats de preview
  const validCount = parsedRows.filter(r => r.status === "valid").length;
  const warningCount = parsedRows.filter(r => r.status === "warning").length;
  const errorCount = parsedRows.filter(r => r.status === "error").length;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Clientes
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Sube un archivo CSV o Excel con los datos de los clientes"}
            {step === "preview" && "Revisa los datos antes de importar"}
            {step === "importing" && "Importando clientes..."}
            {step === "results" && "Resultado de la importación"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Zona de drop */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-primary/10">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Arrastra tu archivo aquí</p>
                    <p className="text-sm text-muted-foreground">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    CSV, XLS, XLSX (máx. 1000 filas)
                  </div>
                </div>
              </div>

              {/* Info y plantilla */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                      ¿Primera vez importando?
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Descarga nuestra plantilla con las columnas correctas y un ejemplo de datos.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                      className="text-blue-600 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Plantilla CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {validCount + warningCount} válidos
                  </span>
                </div>
                {warningCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {warningCount} con advertencias
                    </span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      {errorCount} con errores
                    </span>
                  </div>
                )}
              </div>

              {/* Tabla de preview */}
              <ScrollArea className="h-87.5 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-15">Fila</TableHead>
                      <TableHead className="w-20">Estado</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Errores/Advertencias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow 
                        key={row.rowNumber}
                        className={cn(
                          row.status === "error" && "bg-red-50/50 dark:bg-red-950/10",
                          row.status === "warning" && "bg-amber-50/50 dark:bg-amber-950/10"
                        )}
                      >
                        <TableCell className="font-mono text-sm">{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.status === "valid" && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          )}
                          {row.status === "warning" && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Warn
                            </Badge>
                          )}
                          {row.status === "error" && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              <X className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-37.5 truncate">
                          {row.data.name || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.data.documentType}: {row.data.documentNumber || "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-37.5 truncate">
                          {row.data.email || "-"}
                        </TableCell>
                        <TableCell className="text-xs max-w-50">
                          {row.errors.length > 0 && (
                            <p className="text-red-600 truncate">{row.errors[0]}</p>
                          )}
                          {row.warnings.length > 0 && row.errors.length === 0 && (
                            <p className="text-amber-600 truncate">{row.warnings[0]}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="font-medium">Importando clientes...</p>
              <div className="w-full max-w-xs">
                <Progress value={importProgress} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                {importProgress}% completado
              </p>
            </div>
          )}

          {/* Step: Results */}
          {step === "results" && importResult && (
            <div className="space-y-4">
              <div className="text-center py-6">
                {importResult.success > 0 && importResult.failed === 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <p className="font-semibold text-lg">¡Importación exitosa!</p>
                    <p className="text-muted-foreground">
                      Se importaron {importResult.success} cliente(s) correctamente
                    </p>
                  </div>
                ) : importResult.success > 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <AlertCircle className="h-10 w-10 text-amber-500" />
                    </div>
                    <p className="font-semibold text-lg">Importación parcial</p>
                    <p className="text-muted-foreground">
                      {importResult.success} exitosos, {importResult.failed} fallidos
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                      <X className="h-10 w-10 text-red-500" />
                    </div>
                    <p className="font-semibold text-lg">Error en la importación</p>
                    <p className="text-muted-foreground">
                      No se pudo importar ningún cliente
                    </p>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <ScrollArea className="h-37.5 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {importResult.errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-600 flex items-start gap-2">
                        <X className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Fila {error.row}: {error.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Volver
              </Button>
              <Button 
                onClick={executeImport}
                disabled={validCount + warningCount === 0}
              >
                Importar {validCount + warningCount} cliente(s)
              </Button>
            </>
          )}
          {step === "results" && (
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertModal
      open={fileTypeAlert}
      onOpenChange={setFileTypeAlert}
      title="Archivo inválido"
      description="Por favor seleccione un archivo CSV o Excel válido."
      variant="warning"
    />
    </>
  );
}
