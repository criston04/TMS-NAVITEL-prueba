'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  FileText,
  Trash2,
} from 'lucide-react';

import { useOrderImport } from '@/hooks/useOrderImportExport';
import { useToast } from '@/components/ui/toast';

// UI Components
import { PageWrapper } from '@/components/page-wrapper';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Página de importación de órdenes desde archivo Excel/CSV
 */
export default function OrdersImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const {
    status,
    file,
    preview,
    createdOrders,
    error,
    progress,
    selectFile,
    clearFile,
    executePreview,
    executeImport,
    downloadTemplate,
    reset,
  } = useOrderImport();

  const handleBack = useCallback(() => {
    router.push('/orders');
  }, [router]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        selectFile(selectedFile);
      }
    },
    [selectFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        selectFile(droppedFile);
      }
    },
    [selectFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleImport = useCallback(async () => {
    try {
      await executeImport();
      toastSuccess(
        'Importación completada',
        `Se importaron las órdenes correctamente`
      );
    } catch {
      toastError('Error en importación', 'No se pudieron importar las órdenes');
    }
  }, [executeImport, toastSuccess, toastError]);

  const handleReset = useCallback(() => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [reset]);

  const isProcessing =
    status === 'validating' || status === 'previewing' || status === 'importing';

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Importar Órdenes</h1>
            <p className="text-muted-foreground">
              Carga masiva de órdenes desde archivo Excel o CSV
            </p>
          </div>
        </div>

        {/* Paso 1: Descargar plantilla */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5" />
              Paso 1: Descargar Plantilla
            </CardTitle>
            <CardDescription>
              Descarga la plantilla con el formato correcto para la importación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Descargar plantilla CSV
            </Button>
          </CardContent>
        </Card>

        {/* Paso 2: Subir archivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5" />
              Paso 2: Subir Archivo
            </CardTitle>
            <CardDescription>
              Selecciona o arrastra tu archivo .xlsx, .xls o .csv
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-4 p-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                  'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">
                    Arrastra tu archivo aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formatos aceptados: .xlsx, .xls, .csv
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isProcessing && status !== 'completed' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={clearFile}
                      >
                        <Trash2 className="w-4 h-4" />
                        Quitar
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={executePreview}
                        disabled={isProcessing}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Validar archivo
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Progreso */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {status === 'validating' && 'Validando archivo...'}
                    {status === 'previewing' && 'Generando vista previa...'}
                    {status === 'importing' && 'Importando órdenes...'}
                  </span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paso 3: Preview de datos */}
        {preview && status !== 'completed' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5" />
                Paso 3: Vista Previa
              </CardTitle>
              <CardDescription>
                Revisa los datos antes de confirmar la importación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{preview.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Total filas</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {preview.validRows}
                  </p>
                  <p className="text-xs text-muted-foreground">Válidas</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {preview.errorRows}
                  </p>
                  <p className="text-xs text-muted-foreground">Con errores</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {preview.warningRows}
                  </p>
                  <p className="text-xs text-muted-foreground">Advertencias</p>
                </div>
              </div>

              {/* Errores detallados */}
              {preview.rows.filter(r => r.errors.length > 0).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Errores encontrados:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {preview.rows
                      .filter(r => r.errors.length > 0)
                      .map((row, i) => (
                      <div
                        key={`err-${i}`}
                        className="flex items-start gap-2 text-sm p-2 rounded bg-destructive/5"
                      >
                        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                        <span>
                          Fila {row.rowNumber}: {row.errors.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón de importar */}
              {preview.validRows > 0 && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleReset}>
                    Cancelar
                  </Button>
                  <Button className="gap-2" onClick={handleImport} disabled={isProcessing}>
                    <Upload className="w-4 h-4" />
                    Importar {preview.validRows} órdenes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Paso 4: Resultado */}
        {status === 'completed' && (
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-green-600">
                <CheckCircle className="w-5 h-5" />
                Importación Completada
              </CardTitle>
              <CardDescription>
                Se importaron {createdOrders.length} órdenes correctamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {createdOrders.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {createdOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium font-mono">
                          {order.orderNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer?.name || order.customerId}
                        </p>
                      </div>
                      <Badge variant="secondary">{order.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleReset}>
                  Importar más
                </Button>
                <Button onClick={handleBack}>Ir a órdenes</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
