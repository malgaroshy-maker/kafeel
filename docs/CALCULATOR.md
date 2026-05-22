# Kafeel Platform - Financial Calculator Logic & Banking Rules
**Target:** AI Coding Agent Context
**Module:** Reactive Financial Calculator & Loan Rules Engine
**الحالة:** مُنفَّذ بالكامل ✅ — `src/components/Calculator.tsx`

## 1. Core Variables (المدخلات والمتغيرات الأساسية)
* `car_price` ($P_{car}$): Vehicle price from the dealership. ✅
* `bank_ceiling` ($B_{cap}$): Maximum allowed bank funding (e.g., 120,000 LYD). ✅
* `profit_margin` ($M$): Applied Murabaha margin (e.g., 0.16 for 16% or 0.24 for 24%). ✅
* `net_salary` ($S$): Customer's net monthly salary. ✅
* `term_months` ($T$): Installment period — **Fixed at 96 months (8 years)** per business decision. ✅
* `deduction_rate` ($D$): Max allowed salary deduction percentage (Default: 0.35, Exception: up to 0.50). ✅

## 2. Mathematical Equations & Algorithms (العمليات الحسابية) ✅

### Step 1: Calculate Maximum Allowed Installment (الحد الأقصى لقسم الراتب المسموح) ✅
$$I_{capacity} = S \times D$$
*حيث $D$ مثبتة دائماً عند 50% (0.50) كحد أقصى للمصرف.*

### Step 2: Calculate Total Murabaha Value (إجمالي قيمة المرابحة) ✅
$$V_{murabaha} = P_{car} \times (1 + M)$$

### Step 3: Calculate Ideal/Target Monthly Installment (القسط المثالي المقدر للمعاملة) ✅
If the total Murabaha value is less than the bank ceiling (120,000 LYD), the target installment is scaled down to cover the actual transaction over 96 months. Otherwise, it is capped at the maximum ideal installment of 1250 LYD.
$$I_{ideal} = \min\left(1250, \frac{V_{murabaha}}{96}\right)$$

### Step 4: Calculate Down Payment Components (تفاصيل الدفعة الأولى) ✅
The down payment consists of two distinct components:
1. **Excess Vehicle Value (الزيادة عن السقف):** Any amount of the car value exceeding the bank's maximum ceiling (120,000 LYD).
   $$Excess = \max(0, V_{murabaha} - 120,000)$$
2. **Salary Capacity Gap (عجز القدرة):** If the customer's salary capacity ($I_{capacity}$) is less than the ideal installment ($I_{ideal}$), the capacity gap is multiplied by the term duration to be paid upfront.
   $$I_{gap} = \max(0, I_{ideal} - I_{capacity})$$
   $$Gap_{total} = I_{gap} \times 96$$

$$DownPayment_{total} = Excess + Gap_{total}$$

### Step 5: Calculate Actual Financed Amount & Repayment (التمويل الفعلي للمصرف) ✅
$$Repayment_{bank} = V_{murabaha} - DownPayment_{total}$$
$$I_{actual} = \frac{Repayment_{bank}}{96}$$

---

## 3. Dynamic Banking Rules (شروط وضوابط المصارف الليبية) ✅

### A. Salary & Deduction Validations ✅
* **No Hardcoded Minimum Salary:** The validation is purely dynamic based on the math above.
* **Deduction Limit:** Fixed at **50% (0.50)** of net salary for all calculations.
* **Notary Pledge Checkbox (تعهد محرر عقود):** Acts as a **reminder flag only** and does not alter the mathematical execution, ensuring consistency.

### B. Guarantor Requirements (Workplace Dependent) ✅
* **Public Sector (تعيين عام):** Requires exactly **1** guarantor from the public sector.
* **Classified Contracts (عقود مصنفة):** Requires **2** guarantors (At least one must be a public sector employee).
* **Employment Duration:** Simple checkbox validation `is_salary_continuous` in the UI.

### C. System Overrides (استثناءات النظام) ✅
* **Operations Monitor (مراقب العمليات):** `override_validation` boolean parameter exposed in `find_potential_guarantors()` PostgreSQL function.

## 4. Implementation Details (تفاصيل التنفيذ)

### الملفات ذات الصلة:
| الملف | الوصف |
|-------|-------|
| `src/lib/financialEngine.ts` | المحرك الحسابي الأساسي للمنظومة |
| `src/components/Calculator.tsx` | واجهة المستخدم لعرض المدخلات والنتائج بالتنسيق المفصل الجديد |
| `test/financialEngine.test.ts` | اختبارات الوحدة الآلية (24 اختبار) |

### القرارات التصميمية:
* **تقسيم الدفعة الأولى:** عرض بطاقتين منفصلتين توضحان أسباب استحقاق الدفعة الأولى لزيادة الشفافية للزبائن والموظفين.
* **بطاقة المجموع:** بطاقة عريضة مبرزة باللون الأحمر/الأخضر لعرض إجمالي الدفعة الأولى المستحقة.
* **بدون زر إرسال:** النتائج تُحسب لحظياً مع كل تغيير في المدخلات.