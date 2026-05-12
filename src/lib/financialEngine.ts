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
}

export function calculateMurabaha(input: CalcInput): CalcResult | null {
  const { carPrice: P, netSalary: S, marginRate: M, deductionRate: D } = input

  if (!P || !S) return null

  // 1. Total value including bank profit if the bank were to finance 100%
  const totalMurabahaValue = P * (1 + M)

  // 2. Customer's max monthly installment capacity
  const customerMaxMonthly = S * D

  // 3. Max total repayment the bank can take over for this customer
  // It's the minimum of the global 120k ceiling and the customer's total capacity over 96 months
  const maxBankCapacity = Math.min(BANK_CEILING, customerMaxMonthly * TERM_MONTHS)

  // 4. Actual repayment amount handled by the bank
  // Cannot exceed the total value of the deal
  const actualBankRepayment = Math.min(totalMurabahaValue, maxBankCapacity)

  // 5. Down Payment (The difference the customer pays)
  // This covers both the amount over 120k and the gap due to low salary
  const downPayment = totalMurabahaValue - actualBankRepayment

  // 6. Monthly Installment
  const monthlyInstallment = actualBankRepayment / TERM_MONTHS

  // 7. Principal and Profit breakdown for the portion financed by the bank
  const bankPrincipal = actualBankRepayment / (1 + M)
  const bankProfit = actualBankRepayment - bankPrincipal

  return {
    totalMurabahaValue,
    maxBankCapacity,
    actualBankRepayment,
    downPayment,
    monthlyInstallment,
    bankProfit,
    bankPrincipal,
    salaryGap: Math.max(0, IDEAL_INSTALLMENT - customerMaxMonthly),
    isOverCeiling: totalMurabahaValue > BANK_CEILING
  }
}
