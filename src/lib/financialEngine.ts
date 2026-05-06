/**
 * Kafeel Financial Engine — Pure calculation functions
 * Extracted from Calculator.tsx for testability
 */

export const TERM_MONTHS = 96 // Fixed 8 years

export interface CalcInput {
  carPrice: number      // P
  bankCeiling: number   // Bcap
  netSalary: number     // S
  marginRate: number    // M (0.16 or 0.24)
  deductionRate: number // D (0.35 or 0.50)
}

export interface CalcResult {
  maxInstallment: number        // Imax = S × D
  maxFundingCapacity: number    // Fmax = Imax × 96
  actualFinancedAmount: number  // Bactual = min(Bcap, Fmax/(1+M))
  actualInstallment: number     // Iactual = (Bactual × (1+M)) / 96
  debt: number                  // P - Bactual
  totalRepayment: number        // Bactual × (1+M)
  profitAmount: number          // Bactual × M
  isOverCapacity: boolean       // Fmax/(1+M) < Bcap
}

export function calculateMurabaha(input: CalcInput): CalcResult | null {
  const { carPrice: P, bankCeiling: Bcap, netSalary: S, marginRate: M, deductionRate: D } = input

  if (!P || !Bcap || !S) return null

  // Step 1: Max installment the customer can afford
  const maxInstallment = S * D

  // Step 2: Max funding capacity over the term
  const maxFundingCapacity = maxInstallment * TERM_MONTHS

  // Step 3: Actual financed amount — the lower of bank ceiling vs. capacity
  const actualFinancedAmount = Math.min(Bcap, maxFundingCapacity / (1 + M))

  // Step 4: Actual monthly installment
  const actualInstallment = (actualFinancedAmount * (1 + M)) / TERM_MONTHS

  // Step 5: Debt / Down payment
  const debt = P - actualFinancedAmount

  // Total repayment
  const totalRepayment = actualFinancedAmount * (1 + M)

  // Profit amount
  const profitAmount = actualFinancedAmount * M

  return {
    maxInstallment,
    maxFundingCapacity,
    actualFinancedAmount,
    actualInstallment,
    debt,
    totalRepayment,
    profitAmount,
    isOverCapacity: maxFundingCapacity / (1 + M) < Bcap,
  }
}
