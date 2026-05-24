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
  excessValue: number           // max(0, totalMurabahaValue - BANK_CEILING)
  salaryGapTotal: number        // salaryGap * 96

  // Compatibility aliases for Vitest suite and Equation-level assertions
  maxInstallment: number        // S * D
  maxFundingCapacity: number    // maxInstallment * 96
  actualFinancedAmount: number  // bankPrincipal
  actualInstallment: number     // monthlyInstallment
  debt: number                  // downPayment
  totalRepayment: number        // actualBankRepayment
  profitAmount: number          // bankProfit
  isOverCapacity: boolean       // maxFundingCapacity < bankCeiling
  accountingNote: string        // Note about downpayment rounding
}

export function calculateMurabaha(input: CalcInput): CalcResult | null {
  const { carPrice: P, netSalary: S, marginRate: M, deductionRate: D } = input
  const ceiling = input.bankCeiling !== undefined ? input.bankCeiling : BANK_CEILING

  if (P <= 0 || S <= 0 || ceiling <= 0) return null

  // 1. Max monthly installment capacity based on salary and deduction rate (e.g. 50% or 35%)
  const maxInstallment = S * D
  const rawMaxBankCapacity = maxInstallment * TERM_MONTHS // Fmax
  const maxBankCapacity = Math.min(ceiling, rawMaxBankCapacity) // Capped at ceiling (120,000 => 1250 limit)

  // 2. Total Murabaha Value (P * (1 + M))
  const totalMurabahaValue = P * (1 + M)

  // 3. Ideal monthly installment and total ceiling repayment for this transaction
  const idealInstallment = Math.min(ceiling / TERM_MONTHS, totalMurabahaValue / TERM_MONTHS)

  // 4. Salary gap: difference between ideal installment and customer's capacity
  const salaryGapInstallment = Math.max(0, idealInstallment - maxInstallment)
  const salaryGapTotal = salaryGapInstallment * TERM_MONTHS

  // 5. Excess value over the bank ceiling repayment
  const excessValue = Math.max(0, totalMurabahaValue - ceiling)

  // 6. Down Payment = Excess over ceiling + Salary gap total (capped at total value)
  const rawDownPayment = excessValue + salaryGapTotal
  const debtRaw = Math.min(totalMurabahaValue, rawDownPayment)

  // Rounding down payment up to the nearest 50 LYD
  const roundedDownPayment = Math.ceil(debtRaw / 50) * 50
  const debt = Math.min(totalMurabahaValue, roundedDownPayment)
  const roundingDifference = debt - debtRaw

  const accountingNote = roundingDifference > 0
    ? `تم تقريب الدفعة لأقرب 50 د.ل بمقدار زيادة قدرها ${roundingDifference.toFixed(2)} د.ل لتسهيل المعاملة.`
    : 'الدفعة مسجلة بدون تقريب إضافي.';

  // 7. Actual bank repayment (total repayment including profit)
  const totalRepayment = totalMurabahaValue - debt

  // 8. Actual monthly installment
  const actualInstallment = totalRepayment / TERM_MONTHS

  // 9. Financed principal and profit breakdown
  const actualFinancedAmount = totalRepayment / (1 + M)
  const profitAmount = totalRepayment - actualFinancedAmount

  // 10. Over capacity check (customer's capacity is less than the bank ceiling or total deal value)
  const isOverCapacity = rawMaxBankCapacity < Math.min(totalMurabahaValue, ceiling)

  return {
    // Calculator.tsx fields
    totalMurabahaValue,
    maxBankCapacity,
    actualBankRepayment: totalRepayment,
    downPayment: debt,
    monthlyInstallment: actualInstallment,
    bankProfit: profitAmount,
    bankPrincipal: actualFinancedAmount,
    salaryGap: salaryGapInstallment,
    isOverCeiling: totalMurabahaValue > ceiling,
    excessValue,
    salaryGapTotal,

    // Vitest suite compatibility aliases
    maxInstallment,
    maxFundingCapacity: rawMaxBankCapacity,
    actualFinancedAmount,
    actualInstallment,
    debt,
    totalRepayment,
    profitAmount,
    isOverCapacity,
    accountingNote
  }
}
