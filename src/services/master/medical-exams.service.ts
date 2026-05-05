import { 
  MedicalExam, 
  PsychologicalExam, 
  MedicalExamType,
  ExamResult,
  MedicalRestriction,
} from "@/types/models/driver";

import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * ⚠️ MÓDULO PENDIENTE DE BACKEND (verificado 2026-05-03)
 *
 * Los endpoints `/master/medical-exams/*` NO están en el Excel oficial ni
 * implementados en producción. Son una sub-entidad de Driver que el frontend
 * espera tener pero el backend nunca planificó.
 *
 * El backend debe decidir:
 *   - ¿Endpoints separados como espera el frontend?
 *   - ¿O integrarlos en el detalle del Driver (GET /master/drivers/:id devuelve
 *     `medicalExams[]`, `psychologicalExams[]`)?
 *
 * Ver `otros/docs-backend/...-medical-exams-...` para detalle del contrato.
 */


/**
 * Estadísticas de exámenes
 */
export interface ExamStats {
  totalMedical: number;
  totalPsychological: number;
  approvedMedical: number;
  approvedPsychological: number;
  expiringSoonMedical: number;
  expiringSoonPsychological: number;
  expiredMedical: number;
  expiredPsychological: number;
}

/**
 * Filtros para búsqueda de exámenes
 */
export interface ExamFilters {
  driverId?: string;
  type?: MedicalExamType;
  result?: ExamResult;
  dateFrom?: string;
  dateTo?: string;
  expiringWithinDays?: number;
}

/**
 * Clínicas autorizadas (mock)
 */
export const AUTHORIZED_CLINICS = [
  { id: "clinic-001", name: "Clínica San Pablo", ruc: "20100091896", city: "Lima" },
  { id: "clinic-002", name: "Clínica Javier Prado", ruc: "20101090231", city: "Lima" },
  { id: "clinic-003", name: "Clínica Ricardo Palma", ruc: "20100041953", city: "Lima" },
  { id: "clinic-004", name: "Clínica Internacional", ruc: "20100055237", city: "Lima" },
  { id: "clinic-005", name: "Clínica Delgado", ruc: "20100116635", city: "Lima" },
];

/**
 * Centros psicológicos autorizados (mock)
 */
export const AUTHORIZED_PSYCH_CENTERS = [
  { id: "psych-001", name: "Centro de Evaluación Psicológica CEPP", city: "Lima" },
  { id: "psych-002", name: "Instituto Psicológico Peruano", city: "Lima" },
  { id: "psych-003", name: "Centro de Salud Mental San Juan", city: "Lima" },
];

/**
 * Restricciones médicas comunes
 */
export const COMMON_MEDICAL_RESTRICTIONS: MedicalRestriction[] = [
  { code: "R001", description: "Uso obligatorio de lentes correctivos", isTemporary: false, affectsDriving: true },
  { code: "R002", description: "Uso obligatorio de audífonos", isTemporary: false, affectsDriving: true },
  { code: "R003", description: "Prohibido conducir de noche", isTemporary: false, affectsDriving: true },
  { code: "R004", description: "Solo transmisión automática", isTemporary: false, affectsDriving: true },
  { code: "R005", description: "Máximo 6 horas de conducción diaria", isTemporary: true, affectsDriving: true },
  { code: "R006", description: "Requiere descanso cada 2 horas", isTemporary: true, affectsDriving: true },
  { code: "R007", description: "Control de presión arterial mensual", isTemporary: true, affectsDriving: false },
  { code: "R008", description: "Control de glucosa mensual", isTemporary: true, affectsDriving: false },
];


class MedicalExamsService {
  constructor() {}

  /* --- EXÁMENES MÉDICOS --- */

  /**
   * Obtiene todos los exámenes médicos de un conductor
   */
  async getMedicalExamsByDriver(driverId: string): Promise<MedicalExam[]> {
    return apiClient.get<MedicalExam[]>(`${API_ENDPOINTS.master.medicalExams}/medical/by-driver/${driverId}`);
  }

  /**
   * Obtiene un examen médico por ID
   */
  async getMedicalExamById(id: string): Promise<MedicalExam | null> {
    return apiClient.get<MedicalExam>(`${API_ENDPOINTS.master.medicalExams}/medical/${id}`);
  }

  /**
   * Crea un nuevo examen médico
   */
  async createMedicalExam(
    driverId: string,
    data: Omit<MedicalExam, "id" | "createdAt">
  ): Promise<MedicalExam> {
    return apiClient.post<MedicalExam>(`${API_ENDPOINTS.master.medicalExams}/medical`, { ...data, driverId });
  }

  /**
   * Actualiza un examen médico
   */
  async updateMedicalExam(
    id: string,
    data: Partial<MedicalExam>
  ): Promise<MedicalExam> {
    return apiClient.put<MedicalExam>(`${API_ENDPOINTS.master.medicalExams}/medical/${id}`, data);
  }

  /**
   * Elimina un examen médico
   */
  async deleteMedicalExam(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.master.medicalExams}/medical/${id}`);
  }

  /* --- EXÁMENES PSICOLÓGICOS --- */

  /**
   * Obtiene todos los exámenes psicológicos de un conductor
   */
  async getPsychologicalExamsByDriver(driverId: string): Promise<PsychologicalExam[]> {
    return apiClient.get<PsychologicalExam[]>(`${API_ENDPOINTS.master.medicalExams}/psychological/by-driver/${driverId}`);
  }

  /**
   * Obtiene un examen psicológico por ID
   */
  async getPsychologicalExamById(id: string): Promise<PsychologicalExam | null> {
    return apiClient.get<PsychologicalExam>(`${API_ENDPOINTS.master.medicalExams}/psychological/${id}`);
  }

  /**
   * Crea un nuevo examen psicológico
   */
  async createPsychologicalExam(
    driverId: string,
    data: Omit<PsychologicalExam, "id" | "createdAt">
  ): Promise<PsychologicalExam> {
    return apiClient.post<PsychologicalExam>(`${API_ENDPOINTS.master.medicalExams}/psychological`, { ...data, driverId });
  }

  /**
   * Actualiza un examen psicológico
   */
  async updatePsychologicalExam(
    id: string,
    data: Partial<PsychologicalExam>
  ): Promise<PsychologicalExam> {
    return apiClient.put<PsychologicalExam>(`${API_ENDPOINTS.master.medicalExams}/psychological/${id}`, data);
  }

  /**
   * Elimina un examen psicológico
   */
  async deletePsychologicalExam(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.master.medicalExams}/psychological/${id}`);
  }

  /* --- ESTADÍSTICAS Y ALERTAS --- */

  /**
   * Obtiene estadísticas de exámenes
   */
  async getExamStats(): Promise<ExamStats> {
    // BUG #1 backend: /stats devuelve 404 porque el router resuelve /:id antes.
    // Adicionalmente /master/medical-exams puede no estar implementado todavía.
    try {
      return await apiClient.get<ExamStats>(`${API_ENDPOINTS.master.medicalExams}/stats`);
    } catch (err) {
      if ((err as { status?: number })?.status === 404) {
        console.warn("[medicalExamsService.getExamStats] backend 404. Retornando stats vacios.");
        return {
          totalMedical: 0,
          totalPsychological: 0,
          approvedMedical: 0,
          approvedPsychological: 0,
          expiringSoonMedical: 0,
          expiringSoonPsychological: 0,
          expiredMedical: 0,
          expiredPsychological: 0,
        };
      }
      throw err;
    }
  }

  /**
   * Obtiene exámenes próximos a vencer
   */
  async getExpiringExams(daysAhead: number = 30): Promise<{
    medical: MedicalExam[];
    psychological: PsychologicalExam[];
  }> {
    return apiClient.get<{ medical: MedicalExam[]; psychological: PsychologicalExam[] }>(`${API_ENDPOINTS.master.medicalExams}/expiring`, { params: daysAhead ? { daysAhead } : undefined });
  }

  /**
   * Obtiene exámenes vencidos
   */
  async getExpiredExams(): Promise<{
    medical: MedicalExam[];
    psychological: PsychologicalExam[];
  }> {
    return apiClient.get<{ medical: MedicalExam[]; psychological: PsychologicalExam[] }>(`${API_ENDPOINTS.master.medicalExams}/expired`);
  }

  /* --- VALIDACIONES --- */

  /**
   * Verifica si un conductor tiene exámenes vigentes
   */
  async hasValidExams(driverId: string): Promise<{
    hasMedical: boolean;
    hasPsychological: boolean;
    medicalExpiry?: string;
    psychologicalExpiry?: string;
    issues: string[];
  }> {
    return apiClient.get<{ hasMedical: boolean; hasPsychological: boolean; medicalExpiry?: string; psychologicalExpiry?: string; issues: string[] }>(`${API_ENDPOINTS.master.medicalExams}/validate/${driverId}`);
  }

  /**
   * Obtiene restricciones médicas activas de un conductor
   */
  async getActiveRestrictions(driverId: string): Promise<MedicalRestriction[]> {
    return apiClient.get<MedicalRestriction[]>(`${API_ENDPOINTS.master.medicalExams}/restrictions/${driverId}`);
  }

  /* --- CATÁLOGOS --- */

  /**
   * Obtiene lista de clínicas autorizadas
   */
  getAuthorizedClinics() {
    return AUTHORIZED_CLINICS;
  }

  /**
   * Obtiene lista de centros psicológicos autorizados
   */
  getAuthorizedPsychCenters() {
    return AUTHORIZED_PSYCH_CENTERS;
  }

  /**
   * Obtiene lista de restricciones médicas comunes
   */
  getCommonRestrictions() {
    return COMMON_MEDICAL_RESTRICTIONS;
  }
}

/** Instancia singleton del servicio */
export const medicalExamsService = new MedicalExamsService();
