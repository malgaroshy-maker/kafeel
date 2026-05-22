export const TERM_MONTHS = 96 // 8 years
export const IDEAL_SALARY = 2500
export const IDEAL_INSTALLMENT = 1250 // IDEAL_SALARY / 2
export const BANK_CEILING = 120000   // IDEAL_INSTALLMENT * TERM_MONTHS

export interface CalcInput {
  carPrice: number      // P
  bankCeiling: number   // Bcap (Usually 120,000)
  netSalary: number     // S
  marginRate: number    // M (0.16 or 0.24)
  deductionRate: number // D (Usually 0.50)
}

export interface CalcResult {
  totalMurabahaValue: number    // P * (1 + M)
  maxBankCapacity: number       // S * D * 96
  actualBankRepayment: number   // min(totalMurabahaValue, BANK_CEILING, maxBankCapacity)
  downPayment: number           // totalMurabahaValue - actualBankRepayment
  monthlyInstallment: number    // actualBankRepayment / 96
  bankProfit: number            // actualBankRepayment - (actualBankRepayment / (1 + M))
  bankPrincipal: number         // actualBankRepayment / (1 + M)
  salaryGap: number             // max(0, IDEAL_INSTALLMENT - (S * D))
  isOverCeiling: boolean        // totalMurabahaValue > BANK_CEILING

  // Compatibility aliases for Vitest suite and Equation-level assertions
  maxInstallment: number        // S * D
  maxFundingCapacity: number    // maxInstallment * 96
  actualFinancedAmount: number  // bankPrincipal
  actualInstallment: number     // monthlyInstallment
  debt: number                  // downPayment
  totalRepayment: number        // actualBankRepayment
  profitAmount: number          // bankProfit
  isOverCapacity: boolean       // maxFundingCapacity < bankCeiling
}

export function calculateMurabaha(input: CalcInput): CalcResult | null {
  const { carPrice: P, netSalary: S, marginRate: M, deductionRate: D } = input
  const ceiling = input.bankCeiling !== undefined ? input.bankCeiling : BANK_CEILING

  if (P <= 0 || S <= 0 || ceiling <= 0) return null

  // 1. Imax = S * D (Max monthly installment capacity)
  const maxInstallment = S * D
  const maxBankCapacity = maxInstallment * TERM_MONTHS // This is Fmax (Max funding capacity)

  // 2. Iactual = S * D (Actual monthly installment is exactly 50% of net salary, i.e., S * D)
  const actualInstallment = S * D
  const totalRepayment = actualInstallment * TERM_MONTHS

  // 3. Bactual = min(Bcap, totalRepayment / (1 + M)) (Actual financed principal)
  const actualFinancedAmount = Math.min(ceiling, totalRepayment / (1 + M))

  // 4. Debt = P - Bactual (Down payment / difference paid in cash)
  const debt = P - actualFinancedAmount

  // 5. Bank profit (Total repayment minus financed principal)
  const profitAmount = totalRepayment - actualFinancedAmount

  // 6. Total Murabaha Value (P * (1 + M))
  const totalMurabahaValue = P * (1 + M)

  // 7. Over capacity check (if max capacity is less than the ceiling * (1+M))
  const isOverCapacity = maxBankCapacity / (1 + M) < ceiling

  return {
    // Calculator.tsx fields
    totalMurabahaValue,
    maxBankCapacity,
    actualBankRepayment: totalRepayment,
    downPayment: debt,
    monthlyInstallment: actualInstallment,
    bankProfit: profitAmount,
    bankPrincipal: actualFinancedAmount,
    salaryGap: Math.max(0, IDEAL_INSTALLMENT - maxInstallment),
    isOverCeiling: P > ceiling,

    // Vitest suite compatibility aliases
    maxInstallment,
    maxFundingCapacity: maxBankCapacity,
    actualFinancedAmount,
    actualInstallment,
    debt,
    totalRepayment,
    profitAmount,
    isOverCapacity
  }
}
