/**
 * Cache persistente de detalles de operador logístico.
 *
 * Razón (2026-05-16):
 *   Según `operator.transformer.ts` (línea 15), el backend IGNORA
 *   silenciosamente en POST/PUT estos sub-objetos:
 *     - contacts[]
 *     - checklist (items[])
 *     - documents[]
 *
 *   El form los captura pero el backend no los persiste. Al editar, aparecen
 *   vacíos. Workaround: cachear localmente al guardar.
 *
 * Almacenamiento: localStorage con prefijo `tms-operator-cache-{operatorId}`.
 *   - Sobrevive cierre de navegador / PC.
 *   - Se limpia al logout (auth-storage barre `tms-*`).
 *   - TTL 30 días con autopruning.
 */

import type {
  Operator,
  OperatorContact,
  OperatorValidationChecklist,
  OperatorDocument,
} from "@/types/models/operator";

const PREFIX = "tms-operator-cache-";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CachedOperatorDetails {
  contacts?: OperatorContact[];
  checklist?: OperatorValidationChecklist;
  documents?: OperatorDocument[];
  notes?: string;
  cachedAt: string;
  expiresAt: number;
}

const hasWindow = (): boolean => typeof globalThis.window !== "undefined";

export function saveOperatorCache(operatorId: string, operator: Partial<Operator>): void {
  if (!hasWindow() || !operatorId) return;
  try {
    const now = Date.now();
    const data: CachedOperatorDetails = {
      contacts: operator.contacts,
      checklist: operator.checklist,
      documents: operator.documents,
      notes: operator.notes,
      cachedAt: new Date(now).toISOString(),
      expiresAt: now + TTL_MS,
    };
    localStorage.setItem(`${PREFIX}${operatorId}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadOperatorCache(operatorId: string): CachedOperatorDetails | null {
  if (!hasWindow() || !operatorId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${operatorId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedOperatorDetails;
    if (typeof data.expiresAt === "number" && Date.now() > data.expiresAt) {
      localStorage.removeItem(`${PREFIX}${operatorId}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function mergeOperatorWithCache(backendOperator: Operator): Operator {
  const cache = loadOperatorCache(backendOperator.id);
  if (!cache) return backendOperator;

  const contactsEmpty =
    !Array.isArray(backendOperator.contacts) || backendOperator.contacts.length === 0;
  const documentsEmpty =
    !Array.isArray(backendOperator.documents) || backendOperator.documents.length === 0;
  const checklistEmpty =
    !backendOperator.checklist ||
    !Array.isArray(backendOperator.checklist.items) ||
    backendOperator.checklist.items.length === 0;

  return {
    ...backendOperator,
    contacts: contactsEmpty && cache.contacts ? cache.contacts : backendOperator.contacts,
    checklist:
      checklistEmpty && cache.checklist ? cache.checklist : backendOperator.checklist,
    documents:
      documentsEmpty && cache.documents ? cache.documents : backendOperator.documents,
    notes: backendOperator.notes || cache.notes || undefined,
  };
}

export function clearOperatorCache(operatorId: string): void {
  if (!hasWindow() || !operatorId) return;
  try {
    localStorage.removeItem(`${PREFIX}${operatorId}`);
  } catch {
    // ignore
  }
}

export function pruneExpiredOperatorCaches(): void {
  if (!hasWindow()) return;
  try {
    const now = Date.now();
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw) as CachedOperatorDetails;
        if (typeof data.expiresAt === "number" && now > data.expiresAt) {
          toRemove.push(key);
        }
      } catch {
        toRemove.push(key);
      }
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
