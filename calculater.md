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

### Step 1: Calculate Maximum Allowed Installment (الحد الأقصى للقسط) ✅
$$I_{max} = S \times D$$

### Step 2: Calculate Maximum Funding Capacity (القدرة التمويلية الإجمالية) ✅
$$F_{max} = I_{max} \times T$$

### Step 3: Calculate Actual Financed Amount (قيمة التمويل الفعلي) ✅
The system must ensure the financed amount does not exceed the `bank_ceiling`.
$$B_{actual} = \min\left(B_{cap}, \frac{F_{max}}{1 + M}\right)$$

### Step 4: Calculate Actual Monthly Installment (القسط الشهري الفعلي) ✅
$$I_{actual} = \frac{B_{actual} \times (1 + M)}{T}$$

### Step 5: Calculate Debt / Down Payment (الفروقات / السلفة) ✅
If the car price exceeds the actual financed amount, the difference is recorded as debt/down payment owed to the office by the customer.
$$Debt = P_{car} - B_{actual}$$

## 3. Dynamic Banking Rules (شروط وضوابط المصارف الليبية) ✅

### A. Salary & Deduction Validations ✅
* **No Hardcoded Minimum Salary:** The validation is purely dynamic based on the math above. ✅
* **Standard Deduction Limit:** Default $D = 0.35$ (35% of net salary). ✅
* **Exception (Jumhouria Bank):** The deduction rate $D$ can be set to $0.50$ (50%) *only if* the UI flag `has_notary_pledge` (تعهد محرر عقود) is set to `true`. ✅

### B. Guarantor Requirements (Workplace Dependent) ✅
* **Public Sector (تعيين عام):** Requires exactly **1** guarantor from the public sector. ✅
* **Classified Contracts (عقود مصنفة):** Requires **2** guarantors (At least one must be a public sector employee). ✅
* **Employment Duration:** Simple checkbox validation `is_salary_continuous` in the UI. ✅

### C. System Overrides (استثناءات النظام) ✅
* **Operations Monitor (مراقب العمليات):** `override_validation` boolean parameter exposed in `find_potential_guarantors()` PostgreSQL function. ✅

## 4. Implementation Details (تفاصيل التنفيذ)

### الملفات ذات الصلة:
| الملف | الوصف |
|-------|-------|
| `src/components/Calculator.tsx` | المكون الأساسي للحاسبة — جميع المعادلات الخمس |
| `src/hooks/useLocalStorage.ts` | Hook لحفظ المسودات في localStorage |
| `src/style.css` | التصميم (أقسام Calculator) |

### القرارات التصميمية:
* **المدة ثابتة 8 سنوات** (96 شهراً) — قرار المستخدم، لا يظهر كحقل إدخال
* **نسبتا المرابحة 16% و 24%** فقط — أزرار تبديل (Toggle)
* **بدون زر إرسال** — النتائج تُحسب لحظياً مع كل تغيير في المدخلات
* **تنبيه تلقائي** عند كون القدرة التمويلية أقل من سقف المصرف