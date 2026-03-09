import { describe, it, expect } from "vitest";
import {
  driverSchema,
  medicalExamSchema,
  validateDriverEligibility,
  validateLicenseVehicleCompatibility,
  validateDailyDrivingHours,
  validateWeeklyDrivingHours,
  getDaysUntilExpiry,
  getExpiryAlertLevel,
  LICENSE_CATEGORIES,
  LICENSE_VEHICLE_COMPATIBILITY,
} from "@/lib/validators/driver-validators";

import {
  vehicleSchema,
  vehicleSpecsSchema,
  insurancePolicySchema,
  technicalInspectionSchema,
  validateVehicleEligibility,
  validateDriverVehicleCompatibility,
  calculateNextMaintenance,
  calculateFuelEfficiency,
  isValidPeruvianPlate,
  formatPlate,
  VEHICLE_TYPES,
  MAINTENANCE_INTERVALS,
} from "@/lib/validators/vehicle-validators";


describe("Driver Validators", () => {
  it("LICENSE_CATEGORIES tiene categorías válidas", () => {
    expect(LICENSE_CATEGORIES.length).toBeGreaterThan(0);
    expect(LICENSE_CATEGORIES).toContain("A-IIb");
  });

  it("LICENSE_VEHICLE_COMPATIBILITY tiene mapeo para cada categoría", () => {
    for (const cat of LICENSE_CATEGORIES) {
      expect(LICENSE_VEHICLE_COMPATIBILITY[cat]).toBeDefined();
      expect(Array.isArray(LICENSE_VEHICLE_COMPATIBILITY[cat])).toBe(true);
    }
  });

  it("getDaysUntilExpiry calcula días correctamente", () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const days = getDaysUntilExpiry(futureDate);
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThanOrEqual(11);
  });

  it("getExpiryAlertLevel devuelve nivel correcto", () => {
    expect(getExpiryAlertLevel(-1)).toBe("expired");
    expect(getExpiryAlertLevel(10)).toBe("urgent");
    expect(getExpiryAlertLevel(25)).toBe("warning");
    expect(getExpiryAlertLevel(60)).toBe("ok");
  });

  it("validateDailyDrivingHours valida horas", () => {
    expect(validateDailyDrivingHours(8, 12).isValid).toBe(true);
    expect(validateDailyDrivingHours(15, 12).isValid).toBe(false);
  });

  it("validateWeeklyDrivingHours valida horas semanales", () => {
    expect(validateWeeklyDrivingHours(40, 60).isValid).toBe(true);
    expect(validateWeeklyDrivingHours(80, 60).isValid).toBe(false);
  });

  it("validateLicenseVehicleCompatibility valida compatibilidad", () => {
    const result = validateLicenseVehicleCompatibility("A-IIb", "truck");
    expect(result).toHaveProperty("isCompatible");
  });
});

describe("Vehicle Validators", () => {
  it("VEHICLE_TYPES tiene tipos válidos", () => {
    expect(VEHICLE_TYPES.length).toBeGreaterThan(0);
  });

  it("MAINTENANCE_INTERVALS tiene intervalos", () => {
    expect(Object.keys(MAINTENANCE_INTERVALS).length).toBeGreaterThan(0);
  });

  it("isValidPeruvianPlate valida placas peruanas", () => {
    expect(isValidPeruvianPlate("ABC-123")).toBe(true);
    expect(isValidPeruvianPlate("invalid")).toBe(false);
  });

  it("formatPlate formatea correctamente", () => {
    const formatted = formatPlate("abc123");
    expect(formatted).toMatch(/[A-Z]/);
  });

  it("calculateFuelEfficiency calcula eficiencia", () => {
    const efficiency = calculateFuelEfficiency(100, 10, "gallons");
    expect(efficiency).toBeCloseTo(10, 1);
  });

  it("calculateNextMaintenance devuelve datos de mantenimiento", () => {
    const result = calculateNextMaintenance(50000, 45000, 10000);
    expect(result).toHaveProperty("dueMileage");
    expect(result).toHaveProperty("kmRemaining");
    expect(result.dueMileage).toBe(55000);
    expect(result.isOverdue).toBe(false);
  });
});
