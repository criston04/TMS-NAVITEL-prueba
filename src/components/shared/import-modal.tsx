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
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { readExcelFile, downloadTemplate } from "@/lib/excel-utils";

type ImportStep = "upload" | "preview" | "importing" | "results";

interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

interface ColumnMapping {
  excelHeader: string;
  fieldKey: string;
  required?: boolean;
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título del modal */
  title: string;
  /** Descripción del modal */
  description?: string;
  /** Mapeo de columnas Excel a campos del modelo */
  columnMapping: ColumnMapping[];
  /** Plantilla de ejemplo para descargar */
  templateConfig: {
    filename: string;
    columns: Array<{ header: string; example?: string }>;
  };
  /** Función de validación de cada fila */
  validateRow?: (row: Record<string, unknown>, rowIndex: number) => ImportError[];
  /** Función para importar los datos */
  onImport: (data: Record<string, unknown>[]) => Promise<ImportResult>;
}

export function ImportModal({
  open,
  onOpenChange,
  title,
  description,
  columnMapping,
  templateConfig,
  validateRow,
  onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset al cerrar
  const handleClose = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    setImportResult(null);
    setProgress(0);
    onOpenChange(false);
  }, [onOpenChange]);

  // Procesar archivo seleccionado
  const processFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    
    try {
      // Crear mapeo de columnas
      const mapping: Record<string, string> = {};
      columnMapping.forEach(col => {
        mapping[col.excelHeader] = col.fieldKey;
      });

      // Leer archivo
      const data = await readExcelFile<Record<string, unknown>>(selectedFile, {
        columnMapping: mapping,
      });

      setPreviewData(data);

      // Validar datos
      if (validateRow) {
        const errors: ImportError[] = [];
        data.forEach((row, index) => {
          const rowErrors = validateRow(row, index + 1);
          errors.push(...rowErrors);
        });
        setValidationErrors(errors);
      }

      setStep("preview");
    } catch (error) {
      console.error("Error reading file:", error);
      setValidationErrors([{
        row: 0,
        field: "file",
        message: "Error al leer el archivo. Asegúrate de que sea un archivo Excel válido.",
      }]);
    }
  }, [columnMapping, validateRow]);

  // Handlers de drag & drop
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
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      processFile(droppedFile);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  }, [processFile]);

  // Descargar plantilla
  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(templateConfig.filename, templateConfig.columns);
  }, [templateConfig]);

  // Ejecutar importación
  const handleImport = useCallback(async () => {
    setStep("importing");
    setProgress(0);

    // Simular progreso
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await onImport(previewData);
      setImportResult(result);
      setProgress(100);
      setStep("results");
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        totalRows: previewData.length,
        successCount: 0,
        errorCount: previewData.length,
        errors: [{
          row: 0,
          field: "general",
          message: "Error durante la importación",
        }],
      });
      setStep("results");
    } finally {
      clearInterval(progressInterval);
    }
  }, [previewData, onImport]);

  // Renderizar paso de carga
  const renderUploadStep = () => (
    <div className="space-y-4">
      {/* Zona de drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">
          Arrastra tu archivo aquí o haz clic para seleccionar
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Formatos soportados: .xlsx, .xls
        </p>
      </div>

      {/* Plantilla */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium">¿No tienes el formato correcto?</p>
            <p className="text-sm text-muted-foreground">
              Descarga nuestra plantilla de ejemplo
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar Plantilla
        </Button>
      </div>
    </div>
  );

  // Renderizar paso de preview
  const renderPreviewStep = () => {
    const hasErrors = validationErrors.length > 0;
    const visibleColumns = columnMapping.slice(0, 5);

    return (
      <div className="space-y-4">
        {/* Info del archivo */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">{file?.name}</p>
              <p className="text-sm text-muted-foreground">
                {previewData.length} registros encontrados
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
            Cambiar archivo
          </Button>
        </div>

        {/* Errores de validación */}
        {hasErrors && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">
                {validationErrors.length} errores de validación
              </span>
            </div>
            <ScrollArea className="max-h-24">
              <ul className="text-sm space-y-1">
                {validationErrors.slice(0, 5).map((error, idx) => (
                  <li key={idx} className="text-destructive">
                    Fila {error.row}: {error.field} - {error.message}
                  </li>
                ))}
                {validationErrors.length > 5 && (
                  <li className="text-muted-foreground">
                    ... y {validationErrors.length - 5} errores más
                  </li>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}

        {/* Preview de datos */}
        <div>
          <p className="text-sm font-medium mb-2">Vista previa (primeras 5 filas):</p>
          <ScrollArea className="h-48 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {visibleColumns.map(col => (
                    <TableHead key={col.fieldKey}>{col.excelHeader}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 5).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    {visibleColumns.map(col => (
                      <TableCell key={col.fieldKey}>
                        {String(row[col.fieldKey] ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Renderizar paso de importación
  const renderImportingStep = () => (
    <div className="py-8 text-center">
      <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
      <p className="text-lg font-medium mb-2">Importando datos...</p>
      <p className="text-sm text-muted-foreground mb-4">
        Procesando {previewData.length} registros
      </p>
      <Progress value={progress} className="w-full max-w-xs mx-auto" />
      <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
    </div>
  );

  // Renderizar paso de resultados
  const renderResultsStep = () => {
    if (!importResult) return null;

    const { totalRows, successCount, errorCount, errors } = importResult;
    const successRate = totalRows > 0 ? Math.round((successCount / totalRows) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Resumen */}
        <div className={`p-4 rounded-lg ${errorCount === 0 ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
          <div className="flex items-center gap-3 mb-3">
            {errorCount === 0 ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            )}
            <span className="text-lg font-medium">
              {errorCount === 0 ? "Importación completada" : "Importación con errores"}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{totalRows}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{successCount}</p>
              <p className="text-sm text-muted-foreground">Exitosos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{errorCount}</p>
              <p className="text-sm text-muted-foreground">Errores</p>
            </div>
          </div>

          <Progress value={successRate} className="mt-4" />
          <p className="text-sm text-center mt-1">{successRate}% de éxito</p>
        </div>

        {/* Lista de errores */}
        {errors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Detalle de errores:</p>
            <ScrollArea className="h-32 border rounded-lg p-3">
              <ul className="space-y-2 text-sm">
                {errors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span>
                      <strong>Fila {error.row}</strong> - {error.field}: {error.message}
                      {error.value && <Badge variant="outline" className="ml-2">{error.value}</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };

  // Renderizar contenido según paso
  const renderContent = () => {
    switch (step) {
      case "upload": return renderUploadStep();
      case "preview": return renderPreviewStep();
      case "importing": return renderImportingStep();
      case "results": return renderResultsStep();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {renderContent()}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Volver
              </Button>
              <Button 
                onClick={handleImport}
                disabled={previewData.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar {previewData.length} registros
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
  );
}
