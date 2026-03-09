import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de Tailwind CSS de forma inteligente
 * 
 * Utiliza clsx para combinar clases condicionales y tailwind-merge
 * para resolver conflictos entre clases de Tailwind.
 * 
 * @param {...ClassValue[]} inputs - Clases CSS a combinar
 * @returns {string} String con las clases combinadas y resueltas
 * 
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
