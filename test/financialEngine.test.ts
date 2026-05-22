import { describe, it, expect } from 'vitest'
import { calculateMurabaha, TERM_MONTHS, CalcInput } from '../src/lib/financialEngine'

describe('Financial Engine — calculateMurabaha', () => {
  // ===== Basic validation =====
  it('returns null when carPrice is 0', () => {
    expect(calculateMurabaha({ carPrice: 0, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })).toBeNull()
  })

  it('returns null when bankCeiling is 0', () => {
    expect(calculateMurabaha({ carPrice: 95000, bankCeiling: 0, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })).toBeNull()
  })

  it('returns null when netSalary is 0', () => {
    expect(calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 0, marginRate: 0.16, deductionRate: 0.35 })).toBeNull()
  })

  it('uses fixed term of 96 months', () => {
    expect(TERM_MONTHS).toBe(96)
  })

  // ===== Equation 1: Imax = S × D =====
  describe('Equation 1 — Max Installment (Imax = S × D)', () => {
    it('calculates correctly with 35% deduction', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })
      expect(result!.maxInstallment).toBe(3000 * 0.35)
      expect(result!.maxInstallment).toBe(1050)
    })

    it('calculates correctly with 50% deduction (notary pledge)', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.50 })
      expect(result!.maxInstallment).toBe(3000 * 0.50)
      expect(result!.maxInstallment).toBe(1500)
    })
  })

  // ===== Equation 2: Fmax = Imax × 96 =====
  describe('Equation 2 — Max Funding Capacity (Fmax = Imax × 96)', () => {
    it('calculates correctly', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })
      expect(result!.maxFundingCapacity).toBe(1050 * 96)
      expect(result!.maxFundingCapacity).toBe(100800)
    })
  })

  // ===== Equation 3: Bactual = min(Bcap, Fmax/(1+M)) =====
  describe('Equation 3 — Actual Financed Amount', () => {
    it('uses bank ceiling when it is lower than capacity', () => {
      // Fmax = 1050 × 96 = 100800, Fmax/(1+0.16) = 86896.55
      // Bcap = 80000, so Bactual = min(80000 / 1.16, 86896.55) = 68965.52
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })
      expect(result!.actualFinancedAmount).toBeCloseTo(80000 / 1.16, 2)
    })

    it('uses capacity when bank ceiling is higher', () => {
      // Fmax = 700 × 96 = 67200, Fmax/(1+0.16) = 57931.03...
      // Bcap = 80000, so Bactual = 57931.03 (capacity limited)
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 2000, marginRate: 0.16, deductionRate: 0.35 })
      const expected = (2000 * 0.35 * 96) / (1 + 0.16)
      expect(result!.actualFinancedAmount).toBeCloseTo(expected, 2)
      expect(result!.isOverCapacity).toBe(true)
    })
  })

  // ===== Equation 4: Iactual = (Bactual × (1 + M)) / 96 =====
  describe('Equation 4 — Actual Monthly Installment', () => {
    it('calculates correctly based on financed amount and margin rate', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })
      const expected = 80000 / 96
      expect(result!.actualInstallment).toBeCloseTo(expected, 2)
    })
  })

  // ===== Equation 5: Debt = P - Bactual =====
  describe('Equation 5 — Debt / Down Payment', () => {
    it('calculates correctly when bank ceiling covers less than car price', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })
      expect(result!.debt).toBeCloseTo((95000 * 1.16) - 80000, 2)
    })

    it('debt includes excess value when bank ceiling equals car price', () => {
      const result = calculateMurabaha({ carPrice: 80000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })
      expect(result!.debt).toBeCloseTo((80000 * 1.16) - 80000, 2)
    })

    it('debt is 0 when financed amount equals car price (fully covered)', () => {
      const result = calculateMurabaha({ carPrice: 50000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })
      expect(result!.debt).toBe(0)
    })
  })

  // ===== Margin rates =====
  describe('Margin Rate — 16% vs 24%', () => {
    const base: Omit<CalcInput, 'marginRate'> = {
      carPrice: 100000,
      bankCeiling: 80000,
      netSalary: 1500,
      deductionRate: 0.35,
    }

    it('24% margin yields same total repayment (capacity limited) but lower financed amount', () => {
      const r16 = calculateMurabaha({ ...base, marginRate: 0.16 })!
      const r24 = calculateMurabaha({ ...base, marginRate: 0.24 })!
      expect(r24.totalRepayment).toBeCloseTo(r16.totalRepayment, 2)
      expect(r24.actualFinancedAmount).toBeLessThan(r16.actualFinancedAmount)
    })

    it('24% margin yields higher profit amount than 16% for capacity-limited', () => {
      const r16 = calculateMurabaha({ ...base, marginRate: 0.16 })!
      const r24 = calculateMurabaha({ ...base, marginRate: 0.24 })!
      expect(r24.profitAmount).toBeGreaterThan(r16.profitAmount)
    })

    it('24% margin with same ceiling gives lower Bactual when capacity-limited', () => {
      const r16 = calculateMurabaha({ ...base, marginRate: 0.16 })!
      const r24 = calculateMurabaha({ ...base, marginRate: 0.24 })!
      expect(r24.actualFinancedAmount).toBeLessThan(r16.actualFinancedAmount)
    })
  })

  // ===== Notary Pledge (50% deduction) =====
  describe('Notary Pledge — 50% Deduction', () => {
    it('increases max installment by ~42.8% over 35%', () => {
      const r35 = calculateMurabaha({ carPrice: 100000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })!
      const r50 = calculateMurabaha({ carPrice: 100000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.50 })!
      expect(r50.maxInstallment / r35.maxInstallment).toBeCloseTo(0.50 / 0.35, 2)
    })

    it('increases funding capacity', () => {
      const r35 = calculateMurabaha({ carPrice: 100000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })!
      const r50 = calculateMurabaha({ carPrice: 100000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.50 })!
      expect(r50.maxFundingCapacity).toBeGreaterThan(r35.maxFundingCapacity)
    })
  })

  // ===== Derived values =====
  describe('Derived Values', () => {
    it('totalRepayment = actualInstallment × 96', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })!
      expect(result.totalRepayment).toBeCloseTo(result.actualInstallment * 96, 2)
    })

    it('profitAmount = totalRepayment - Bactual', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })!
      expect(result.profitAmount).toBeCloseTo(result.totalRepayment - result.actualFinancedAmount, 2)
    })

    it('actualInstallment × 96 = totalRepayment', () => {
      const result = calculateMurabaha({ carPrice: 95000, bankCeiling: 80000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.35 })!
      expect(result.actualInstallment * 96).toBeCloseTo(result.totalRepayment, 2)
    })
  })

  // ===== Edge cases =====
  describe('Edge Cases', () => {
    it('handles very small salary', () => {
      const result = calculateMurabaha({ carPrice: 100000, bankCeiling: 80000, netSalary: 100, marginRate: 0.16, deductionRate: 0.35 })!
      expect(result.maxInstallment).toBe(35)
      expect(result.isOverCapacity).toBe(true)
      expect(result.debt).toBeGreaterThan(0)
    })

    it('handles very large salary', () => {
      const result = calculateMurabaha({ carPrice: 100000, bankCeiling: 80000, netSalary: 50000, marginRate: 0.16, deductionRate: 0.35 })!
      expect(result.actualFinancedAmount).toBeCloseTo(80000 / 1.16, 2) // Capped at ceiling repayment capacity principal
      expect(result.isOverCapacity).toBe(false)
    })

    it('handles low-priced car where salary capacity is sufficient for scaled down installment', () => {
      // Car price = 65,000, Margin = 16% => Murabaha = 75,400. Ceiling = 120,000
      // Ideal installment = 75,400 / 96 = 785.42
      // Salary = 3,000, Deduction = 50% => capacity = 1,500
      // Capacity (1,500) > ideal installment (785.42) => no salary gap down payment
      const result = calculateMurabaha({ carPrice: 65000, bankCeiling: 120000, netSalary: 3000, marginRate: 0.16, deductionRate: 0.50 })!
      expect(result.downPayment).toBe(0)
      expect(result.monthlyInstallment).toBeCloseTo(75400 / 96, 2)
    })
  })
})
