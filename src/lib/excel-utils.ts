import * as XLSX from 'xlsx';

/**
 * Opciones para exportar a Excel
 */
export interface ExcelExportOptions {
  /** Nombre del archivo (sin extensión) */
  filename: string;
  /** Nombre de la hoja */
  sheetName?: string;
  /** Columnas a incluir con sus etiquetas */
  columns: Array<{
    key: string;
    header: string;
    /** Función para transformar el valor */
    transform?: (value: unknown) => string | number;
  }>;
}

/**
 * Exporta datos a un archivo Excel
 */
export function exportToExcel<T extends object>(
  data: T[],
  options: ExcelExportOptions
): void {
  const { filename, sheetName = 'Datos', columns } = options;

  // Transformar datos según columnas definidas
  const rows = data.map(item => {
    const row: Record<string, unknown> = {};
    columns.forEach(col => {
      const value = getNestedValue(item as Record<string, unknown>, col.key);
      row[col.header] = col.transform ? col.transform(value) : value;
    });
    return row;
  });

  // Crear hoja de cálculo
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Ajustar ancho de columnas
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, 15)
  }));
  worksheet['!cols'] = colWidths;

  // Crear libro
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Descargar archivo
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Lee un archivo Excel y retorna los datos
 */
export async function readExcelFile<T>(
  file: File,
  options?: {
    /** Índice de la hoja a leer (default: 0) */
    sheetIndex?: number;
    /** Mapeo de columnas del Excel a propiedades del objeto */
    columnMapping?: Record<string, string>;
  }
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetIndex = options?.sheetIndex ?? 0;
        const sheetName = workbook.SheetNames[sheetIndex];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        let jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        
        // Aplicar mapeo de columnas si existe
        if (options?.columnMapping) {
          jsonData = jsonData.map(row => {
            const mappedRow: Record<string, unknown> = {};
            Object.entries(options.columnMapping!).forEach(([excelCol, propKey]) => {
              mappedRow[propKey] = row[excelCol];
            });
            return mappedRow;
          });
        }
        
        resolve(jsonData as T[]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Genera una plantilla Excel vacía con las columnas especificadas
 */
export function downloadTemplate(
  filename: string,
  columns: Array<{ header: string; example?: string }>
): void {
  const worksheet = XLSX.utils.json_to_sheet([
    // Fila de ejemplo
    columns.reduce((acc, col) => {
      acc[col.header] = col.example || '';
      return acc;
    }, {} as Record<string, string>)
  ]);

  // Ajustar ancho de columnas
  worksheet['!cols'] = columns.map(col => ({
    wch: Math.max(col.header.length, 20)
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
  XLSX.writeFile(workbook, `${filename}_plantilla.xlsx`);
}

/**
 * Obtiene un valor anidado de un objeto usando notación de punto
 * Ejemplo: getNestedValue(obj, 'specs.brand') => obj.specs.brand
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}

/**
 * Configuraciones predefinidas de exportación
 */
export const EXPORT_CONFIGS: Record<string, ExcelExportOptions> = {
  drivers: {
    filename: 'conductores',
    sheetName: 'Conductores',
    columns: [
      { key: 'firstName', header: 'Nombre' },
      { key: 'lastName', header: 'Apellido' },
      { key: 'documentType', header: 'Tipo Documento' },
      { key: 'documentNumber', header: 'Nro. Documento' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Teléfono' },
      { key: 'license.category', header: 'Categoría Licencia' },
      { key: 'license.number', header: 'Nro. Licencia' },
      { key: 'license.expirationDate', header: 'Vencimiento Licencia' },
      { key: 'status', header: 'Estado' },
      { key: 'availability', header: 'Disponibilidad' },
      { key: 'isEnabled', header: 'Habilitado', transform: (v: unknown) => v ? 'Sí' : 'No' },
    ]
  },
  vehicles: {
    filename: 'vehiculos',
    sheetName: 'Vehículos',
    columns: [
      { key: 'plate', header: 'Placa' },
      { key: 'type', header: 'Tipo' },
      { key: 'specs.brand', header: 'Marca' },
      { key: 'specs.model', header: 'Modelo' },
      { key: 'specs.year', header: 'Año' },
      { key: 'specs.color', header: 'Color' },
      { key: 'specs.vin', header: 'VIN' },
      { key: 'currentMileage', header: 'Kilometraje' },
      { key: 'capacity.maxPayload', header: 'Capacidad Carga (kg)' },
      { key: 'capacity.volumeM3', header: 'Volumen (m³)' },
      { key: 'status', header: 'Estado' },
      { key: 'operationalStatus', header: 'Estado Operacional' },
      { key: 'isEnabled', header: 'Habilitado', transform: (v: unknown) => v ? 'Sí' : 'No' },
    ]
  },
  products: {
    filename: 'productos',
    sheetName: 'Productos',
    columns: [
      { key: 'sku', header: 'SKU' },
      { key: 'name', header: 'Nombre' },
      { key: 'description', header: 'Descripción' },
      { key: 'category', header: 'Categoría' },
      { key: 'unitOfMeasure', header: 'Unidad de Medida' },
      { key: 'dimensions.weight', header: 'Peso (kg)' },
      { key: 'dimensions.volume', header: 'Volumen (m³)' },
      { key: 'unitPrice', header: 'Precio Unitario' },
      { key: 'barcode', header: 'Código de Barras' },
      { key: 'transportConditions.requiresRefrigeration', header: 'Requiere Refrigeración', transform: (v: unknown) => v ? 'Sí' : 'No' },
      { key: 'transportConditions.requiresSpecialHandling', header: 'Manejo Especial', transform: (v: unknown) => v ? 'Sí' : 'No' },
      { key: 'transportConditions.stackable', header: 'Apilable', transform: (v: unknown) => v ? 'Sí' : 'No' },
      { key: 'status', header: 'Estado' },
    ]
  }
};
