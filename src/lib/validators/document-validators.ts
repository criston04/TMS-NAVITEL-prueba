import { DocumentType } from "@/types/models";

/**
 * Resultado de validación de documento
 */
export interface DocumentValidationResult {
  isValid: boolean;
  message: string;
  formattedValue?: string;
}

/**
 * Valida un RUC peruano (11 dígitos)
 * 
 * El RUC tiene un dígito verificador calculado con el algoritmo módulo 11
 * 
 * Estructura:
 * - Posición 1-2: Tipo de contribuyente (10=Persona Natural, 20=Persona Jurídica, etc.)
 * - Posición 3-10: Número secuencial
 * - Posición 11: Dígito verificador
 * 
 * @param ruc - Número de RUC a validar
 * @returns Resultado de la validación
 */
export function validateRUC(ruc: string): DocumentValidationResult {
  // Limpiar espacios y guiones
  const cleanRUC = ruc.replace(/[\s-]/g, "");
  
  // Verificar longitud
  if (cleanRUC.length !== 11) {
    return {
      isValid: false,
      message: `El RUC debe tener 11 dígitos (tiene ${cleanRUC.length})`,
    };
  }

  // Verificar que solo contenga números
  if (!/^\d{11}$/.test(cleanRUC)) {
    return {
      isValid: false,
      message: "El RUC solo debe contener números",
    };
  }

  // Verificar prefijo válido
  const prefix = cleanRUC.substring(0, 2);
  const validPrefixes = ["10", "15", "16", "17", "20"];
  if (!validPrefixes.includes(prefix)) {
    return {
      isValid: false,
      message: "El RUC debe comenzar con 10, 15, 16, 17 o 20",
    };
  }

  // Algoritmo de verificación del dígito de control
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanRUC[i]) * factors[i];
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  const expectedDigit = checkDigit === 10 ? 0 : checkDigit === 11 ? 1 : checkDigit;
  const actualDigit = parseInt(cleanRUC[10]);

  if (expectedDigit !== actualDigit) {
    return {
      isValid: false,
      message: "El dígito verificador del RUC es incorrecto",
    };
  }

  return {
    isValid: true,
    message: "RUC válido",
    formattedValue: cleanRUC,
  };
}

/**
 * Valida un DNI peruano (8 dígitos)
 * 
 * @param dni - Número de DNI a validar
 * @returns Resultado de la validación
 */
export function validateDNI(dni: string): DocumentValidationResult {
  // Limpiar espacios y guiones
  const cleanDNI = dni.replace(/[\s-]/g, "");

  // Verificar longitud
  if (cleanDNI.length !== 8) {
    return {
      isValid: false,
      message: `El DNI debe tener 8 dígitos (tiene ${cleanDNI.length})`,
    };
  }

  // Verificar que solo contenga números
  if (!/^\d{8}$/.test(cleanDNI)) {
    return {
      isValid: false,
      message: "El DNI solo debe contener números",
    };
  }

  // Verificar que no sea un número inválido común
  const invalidPatterns = ["00000000", "11111111", "22222222", "33333333", 
                          "44444444", "55555555", "66666666", "77777777", 
                          "88888888", "99999999", "12345678", "87654321"];
  
  if (invalidPatterns.includes(cleanDNI)) {
    return {
      isValid: false,
      message: "El DNI ingresado no es válido",
    };
  }

  return {
    isValid: true,
    message: "DNI válido",
    formattedValue: cleanDNI,
  };
}

/**
 * Valida un Carné de Extranjería (9 caracteres alfanuméricos)
 * 
 * @param ce - Número de CE a validar
 * @returns Resultado de la validación
 */
export function validateCE(ce: string): DocumentValidationResult {
  // Limpiar espacios y guiones
  const cleanCE = ce.replace(/[\s-]/g, "").toUpperCase();

  // Verificar longitud (generalmente 9 caracteres, pero puede variar)
  if (cleanCE.length < 7 || cleanCE.length > 12) {
    return {
      isValid: false,
      message: "El Carné de Extranjería debe tener entre 7 y 12 caracteres",
    };
  }

  // Verificar formato alfanumérico
  if (!/^[A-Z0-9]+$/.test(cleanCE)) {
    return {
      isValid: false,
      message: "El Carné de Extranjería solo debe contener letras y números",
    };
  }

  return {
    isValid: true,
    message: "Carné de Extranjería válido",
    formattedValue: cleanCE,
  };
}

/**
 * Valida un Pasaporte
 * 
 * @param passport - Número de pasaporte a validar
 * @returns Resultado de la validación
 */
export function validatePassport(passport: string): DocumentValidationResult {
  // Limpiar espacios
  const cleanPassport = passport.replace(/\s/g, "").toUpperCase();

  // Verificar longitud (generalmente entre 6 y 9 caracteres)
  if (cleanPassport.length < 6 || cleanPassport.length > 12) {
    return {
      isValid: false,
      message: "El Pasaporte debe tener entre 6 y 12 caracteres",
    };
  }

  // Verificar formato alfanumérico
  if (!/^[A-Z0-9]+$/.test(cleanPassport)) {
    return {
      isValid: false,
      message: "El Pasaporte solo debe contener letras y números",
    };
  }

  return {
    isValid: true,
    message: "Pasaporte válido",
    formattedValue: cleanPassport,
  };
}

/**
 * Valida un documento según su tipo
 * 
 * @param documentType - Tipo de documento
 * @param documentNumber - Número del documento
 * @returns Resultado de la validación
 */
export function validateDocument(
  documentType: DocumentType,
  documentNumber: string
): DocumentValidationResult {
  if (!documentNumber || documentNumber.trim() === "") {
    return {
      isValid: false,
      message: "El número de documento es requerido",
    };
  }

  switch (documentType) {
    case "RUC":
      return validateRUC(documentNumber);
    case "DNI":
      return validateDNI(documentNumber);
    case "CE":
      return validateCE(documentNumber);
    case "PASSPORT":
      return validatePassport(documentNumber);
    default:
      return {
        isValid: false,
        message: "Tipo de documento no reconocido",
      };
  }
}

/**
 * Obtiene el tipo de documento recomendado según el tipo de cliente
 * 
 * @param customerType - Tipo de cliente (empresa o persona)
 * @returns Tipo de documento recomendado
 */
export function getRecommendedDocumentType(
  customerType: "empresa" | "persona"
): DocumentType {
  return customerType === "empresa" ? "RUC" : "DNI";
}

/**
 * Obtiene la longitud esperada del documento según su tipo
 * 
 * @param documentType - Tipo de documento
 * @returns Longitud esperada o rango
 */
export function getDocumentLength(documentType: DocumentType): { min: number; max: number } {
  switch (documentType) {
    case "RUC":
      return { min: 11, max: 11 };
    case "DNI":
      return { min: 8, max: 8 };
    case "CE":
      return { min: 7, max: 12 };
    case "PASSPORT":
      return { min: 6, max: 12 };
    default:
      return { min: 1, max: 20 };
  }
}

/**
 * Obtiene el placeholder para el input según el tipo de documento
 * 
 * @param documentType - Tipo de documento
 * @returns Placeholder text
 */
export function getDocumentPlaceholder(documentType: DocumentType): string {
  switch (documentType) {
    case "RUC":
      return "Ej: 20123456789";
    case "DNI":
      return "Ej: 12345678";
    case "CE":
      return "Ej: CE123456789";
    case "PASSPORT":
      return "Ej: AB1234567";
    default:
      return "Ingrese número de documento";
  }
}

/**
 * Formatea un documento para mostrar
 * 
 * @param documentType - Tipo de documento
 * @param documentNumber - Número del documento
 * @returns Documento formateado
 */
export function formatDocument(documentType: DocumentType, documentNumber: string): string {
  const clean = documentNumber.replace(/[\s-]/g, "");
  
  switch (documentType) {
    case "RUC":
      // Formato: 20-12345678-9
      if (clean.length === 11) {
        return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
      }
      return clean;
    case "DNI":
      // Sin formato especial
      return clean;
    default:
      return clean.toUpperCase();
  }
}
