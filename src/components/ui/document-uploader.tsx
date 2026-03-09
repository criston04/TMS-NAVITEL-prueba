"use client";

import * as React from "react";
import NextImage from "next/image";
import { useDropzone, Accept } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Upload,
  File,
  FileText,
  Image,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Download,
  Trash2,
} from "lucide-react";


/**
 * Archivo con metadata
 */
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  previewUrl?: string;
  uploadProgress?: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

/**
 * Tipos de documentos permitidos
 */
export type DocumentType = 
  | "pdf"
  | "image"
  | "document"
  | "all";

/**
 * Props del componente
 */
export interface DocumentUploaderProps {
  /** Tipo de documentos permitidos */
  documentType?: DocumentType;
  /** Tamaño máximo en bytes (default: 5MB) */
  maxSize?: number;
  /** Permitir múltiples archivos */
  multiple?: boolean;
  /** Número máximo de archivos */
  maxFiles?: number;
  /** Archivos ya cargados */
  existingFiles?: UploadedFile[];
  /** Callback cuando se agregan archivos */
  onFilesAdded?: (files: File[]) => void;
  /** Callback cuando se elimina un archivo */
  onFileRemove?: (fileId: string) => void;
  /** Callback cuando se hace clic en preview */
  onFilePreview?: (file: UploadedFile) => void;
  /** Callback cuando se hace clic en descargar */
  onFileDownload?: (file: UploadedFile) => void;
  /** Función de upload personalizada */
  uploadHandler?: (file: File) => Promise<string>;
  /** Texto de ayuda */
  helperText?: string;
  /** Deshabilitado */
  disabled?: boolean;
  /** Clase CSS adicional */
  className?: string;
  /** Etiqueta */
  label?: string;
  /** Requerido */
  required?: boolean;
}


const ACCEPT_TYPES: Record<DocumentType, Accept> = {
  pdf: { "application/pdf": [".pdf"] },
  image: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
  document: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  },
  all: {
    "application/pdf": [".pdf"],
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
};


export function DocumentUploader({
  documentType = "all",
  maxSize = 5 * 1024 * 1024, // 5MB
  multiple = false,
  maxFiles = 5,
  existingFiles = [],
  onFilesAdded,
  onFileRemove,
  onFilePreview,
  onFileDownload,
  uploadHandler,
  helperText,
  disabled = false,
  className,
  label,
  required = false,
}: DocumentUploaderProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>(existingFiles);
  const [isDragActive, setIsDragActive] = React.useState(false);

  // Sincronizar con archivos existentes
  React.useEffect(() => {
    setFiles(existingFiles);
  }, [existingFiles]);

  const handleDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      // Limitar cantidad de archivos
      const availableSlots = maxFiles - files.length;
      const filesToAdd = acceptedFiles.slice(0, availableSlots);

      if (filesToAdd.length === 0) return;

      // Crear entries para nuevos archivos
      const newFiles: UploadedFile[] = filesToAdd.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: file.type.startsWith("image/") 
          ? URL.createObjectURL(file) 
          : undefined,
        uploadProgress: 0,
        status: "pending" as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Notificar archivos agregados
      if (onFilesAdded) {
        onFilesAdded(filesToAdd);
      }

      // Si hay handler de upload, ejecutar
      if (uploadHandler) {
        for (let i = 0; i < filesToAdd.length; i++) {
          const file = filesToAdd[i];
          const uploadedFile = newFiles[i];

          try {
            // Marcar como uploading
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id
                  ? { ...f, status: "uploading" as const, uploadProgress: 30 }
                  : f
              )
            );

            // Simular progreso
            const progressInterval = setInterval(() => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadedFile.id && f.uploadProgress && f.uploadProgress < 90
                    ? { ...f, uploadProgress: f.uploadProgress + 10 }
                    : f
                )
              );
            }, 200);

            // Ejecutar upload
            const url = await uploadHandler(file);

            clearInterval(progressInterval);

            // Marcar como success
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id
                  ? { ...f, status: "success" as const, uploadProgress: 100, url }
                  : f
              )
            );
          } catch (error) {
            // Marcar como error
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id
                  ? {
                      ...f,
                      status: "error" as const,
                      errorMessage: error instanceof Error ? error.message : "Error al subir",
                    }
                  : f
              )
            );
          }
        }
      } else {
        // Sin handler, marcar como success directamente
        setFiles((prev) =>
          prev.map((f) =>
            newFiles.find((nf) => nf.id === f.id)
              ? { ...f, status: "success" as const, uploadProgress: 100 }
              : f
          )
        );
      }
    },
    [files.length, maxFiles, onFilesAdded, uploadHandler]
  );

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPT_TYPES[documentType],
    maxSize,
    multiple,
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const handleRemove = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file?.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (onFileRemove) {
      onFileRemove(fileId);
    }
  };

  const getAcceptedTypesText = () => {
    switch (documentType) {
      case "pdf":
        return "PDF";
      case "image":
        return "PNG, JPG, GIF, WEBP";
      case "document":
        return "PDF, DOC, DOCX, XLS, XLSX";
      default:
        return "PDF, imágenes, documentos";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-muted/50",
          isDragActive && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          disabled && "opacity-50 cursor-not-allowed",
          files.length >= maxFiles && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mb-4",
              isDragActive ? "bg-primary/10" : "bg-muted"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          
          <p className="text-sm font-medium">
            {isDragActive
              ? "Suelta el archivo aquí..."
              : "Arrastra y suelta archivos aquí"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            o haz clic para seleccionar
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {getAcceptedTypesText()} • Máximo {formatFileSize(maxSize)}
            {multiple && ` • Hasta ${maxFiles} archivos`}
          </p>
        </div>

        {isDragReject && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              Tipo de archivo no permitido
            </p>
          </div>
        )}
      </div>

      {/* Helper text */}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            
            return (
              <Card key={file.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Preview o icono */}
                    {file.previewUrl ? (
                      <div className="w-10 h-10 rounded overflow-hidden shrink-0 relative">
                        <NextImage
                          src={file.previewUrl}
                          alt={file.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    {/* Info del archivo */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        {file.status === "success" && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5 bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Cargado
                          </Badge>
                        )}
                        {file.status === "error" && (
                          <Badge variant="destructive" className="text-xs py-0 px-1.5">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                        {file.status === "uploading" && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Subiendo...
                          </Badge>
                        )}
                      </div>
                      
                      {/* Barra de progreso */}
                      {file.status === "uploading" && file.uploadProgress !== undefined && (
                        <Progress value={file.uploadProgress} className="h-1 mt-2" />
                      )}
                      
                      {/* Mensaje de error */}
                      {file.status === "error" && file.errorMessage && (
                        <p className="text-xs text-destructive mt-1">{file.errorMessage}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1">
                      {file.status === "success" && onFilePreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onFilePreview(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {file.status === "success" && file.url && onFileDownload && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onFileDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(file.id)}
                        disabled={file.status === "uploading"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contador de archivos */}
      {multiple && (
        <p className="text-xs text-muted-foreground text-right">
          {files.length} de {maxFiles} archivos
        </p>
      )}
    </div>
  );
}

export default DocumentUploader;
