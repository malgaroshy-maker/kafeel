# Kafeel (كفيل) - QA Audit & Verification Plan | خطة الفحص والتدقيق البرمجي الشاملة

This document outlines the bilingual verification plan for **Kafeel (منظومة كفيل السحابية)**. During this test, we will systematically capture high-quality screenshots and save them to the project directory for use in your feature showcases and presentations.

تحدد هذه الوثيقة خطة الفحص والتحقق ثنائية اللغة لمنظومة كفيل السحابية. خلال هذا الاختبار، سنقوم بحفظ لقطات شاشة عالية الجودة بشكل منهجي في دليل المشروع لاستخدامها لاحقاً في العروض التقديمية واستعراض الميزات.

---

## 👥 Role Profiles & Test Credentials | حسابات المستخدمين وصلاحيات الأدوار

We will authenticate and test using the following roles | سنقوم بتسجيل الدخول والتحقق باستخدام الأدوار التالية:

1. **Super Admin (مدير النظام العام)**
   - **Email / البريد:** `admin@kafeel.ly`
   - **Password / كلمة المرور:** `KafeelAdmin2026`
   - **Showcase Target / هدف العرض:** Admin Security Control Center, SaaS Packages, and gateways | مركز التحكم الأمني العام، باقات الاشتراك، وبوابات الدفع والرسائل.
2. **Operations Monitor (مراقب العمليات)**
   - **Email / البريد:** `monitor@kafeel.ly`
   - **Password / كلمة المرور:** `MonitorKafeel2026`
   - **Showcase Target / هدف العرض:** Waiting queue, data masking, and logistics staging | طابور الانتظار، تغبيش وحجب البيانات المالية الحساسة، وخط سير الخدمات اللوجستية.
3. **Office Manager (مدير المكتب)**
   - **Email / البريد:** `ahmed@kafeel.ly`
   - **Password / كلمة المرور:** `Ahmed123456.`
   - **Showcase Target / هدف العرض:** Match limit configurations, ledger, unmasked earnings, and document approval | إعدادات قيمة الربط، دفتر الحسابات العام، الأرباح غير المحجوبة، واعتماد المستندات.
4. **Sub-Account (Staff/Accountant) | الموظف / المحاسب**
   - **Method / الطريقة:** Created dynamically using a generated Join Code | إنشاء الحساب تلقائياً باستخدام رمز انضمام مولد.
   - **Showcase Target / هدف العرض:** Golden padlock masking views, customer intake forms, reactive calculator | أقفال حجب الميزات الذهبية، نماذج تسجيل الزبائن، والحاسبة التفاعلية.

---

## 📸 Presentation Showcase & Screenshot Strategy | استراتيجية التقاط الصور للعروض التقديمية

We will systematically save screenshots of key interfaces during testing to `/artifacts/showcase/` or the root folder under descriptive English/Arabic names | سنقوم بشكل منهجي بحفظ لقطات شاشة للواجهات الرئيسية أثناء الاختبار تحت أسماء وصفية باللغتين العربية والإنجليزية:

| # | Target Interface / الواجهة المستهدفة | Arabic File Name / اسم الملف العربي | English File Name / اسم الملف الإنجليزي |
|---|-------------------|------------------|-------------------|
| 1 | Beautiful Lunar/Solar Login Screen | `شاشة_الدخول_الفاخرة.png` | `01_premium_login_screen.png` |
| 2 | Super Admin Unified Dashboard | `لوحة_مدير_النظام.png` | `02_super_admin_dashboard.png` |
| 3 | Admin "Security & Hardening" Console | `مركز_الأمن_والتحصين.png` | `03_cybersecurity_console.png` |
| 4 | Operations Monitor Board | `لوحة_مراقب_العمليات.png` | `04_monitor_dashboard.png` |
| 5 | Office Manager Settings (Match Slider) | `إعدادات_مدير_المكتب.png` | `05_manager_office_settings.png` |
| 6 | Golden Padlock SaaS Locked Banner | `حاجز_باقة_الاشتراك_الذهبي.png` | `06_golden_padlock_gate.png` |
| 7 | Potential Customers Hub & Leads | `منصة_الزبائن_المحتملين.png` | `07_leads_potential_customers.png` |
| 8 | Unified Beneficiary & Guarantor Form | `نموذج_التسجيل_الموحد.png` | `08_unified_registration_form.png` |
| 9 | Reactive Calculator with Down-Payment splits | `الحاسبة_المالية_التفاعلية.png` | `09_reactive_financial_calculator.png` |
| 10 | Manager Document Verification Widget | `اعتماد_مستندات_الزبائن.png` | `10_document_approval_widget.png` |
| 11 | Logistics Staging & Ocean Cargo Board | `الخدمات_اللوجستية_والشحن.png` | `11_logistics_cargo_freight.png` |
| 12 | Post-Delivery Settlement & 3-Day Timer | `تسوية_ما_بعد_التسليم.png` | `12_post_delivery_settlements.png` |

---

## 📋 Comprehensive Test Workflows | مسارات الاختبار التفصيلية

### Phase A: Lead Management & Conversion | المرحلة أ: إدارة وتحويل الزبائن المحتملين
* **EN:** Register a new potential buyer with notes, view lead log history, and click "Convert to Active Customer" to automatically fill the registrations page.
* **AR:** تسجيل زبون محتمل جديد مع إضافة ملاحظات، استعراض سجل الأحداث للزبون، والنقر على "تحويل لزبون نشط" لتعبئة بيانات التسجيل تلقائياً.

### Phase B: Customer & Guarantor Intake | المرحلة ب: تسجيل الزبون والضامن
* **EN:** Complete the two-column beneficiary profile (Bank, Branch, Account Number). Based on workplace, verify the dynamic rendering of 1 or 2 required guarantors. Submit and verify active state linking.
* **AR:** إكمال نموذج بيانات المستفيد ذي العمودين المتناسقين (المصرف، الفرع، الحساب). التحقق من الظهور الديناميكي لـ 1 أو 2 ضامنين بناءً على جهة العمل. حفظ البيانات وربطها بنشاط بالخطوة التالية.

### Phase C: Reactive Financial Calculator | المرحلة ج: الحاسبة المالية التفاعلية
* **EN:** Test Murabaha margins (16% for public entities, 24% for standard). Enforce the 120,000 LYD bank ceiling and 50% salary cap. Verify HSL styled down-payment cards splitting excess value and capacity gap. Click "Save & Link to DB" to generate the transaction.
* **AR:** فحص نسب المرابحة (16% للجهات الاستثنائية، 24% للجهات العادية). تطبيق الحد الأقصى للمصرف 120 ألف د.ل وسقف الاستقطاع 50%. التحقق من تفصيل الدفعة مقدمة (فارق قيمة السيارة + فجوة المرتب). النقر على "حفظ الربط بقاعدة البيانات".

### Phase D: Financial Requests & Approvals | المرحلة د: طلب القيم المالية والاعتمادات
* **EN:** Submit a loan request linked to the active transaction. Switch accounts to the Office Manager (`ahmed@kafeel.ly`) to review, accept, or reject the request dynamically.
* **AR:** تقديم طلب قيمة مالية مرتبط بالمعاملة النشطة. تبديل الحساب إلى مدير المكتب لمراجعة وقبول أو رفض الطلب عبر لوحة الاعتمادات.

### Phase E: Document Verification & Uploads | المرحلة هـ: رفع واعتماد المستندات
* **EN:** Upload files contextually for the transaction. Switch to the Manager account to review checklists and approve them.
* **AR:** رفع ملفات المستندات الخمسة المطلوبة بشكل سياقي للمعاملة. الانتقال لحساب المدير لمراجعة واعتماد الملفات.

### Phase F: Waiting Queue & Matchmaking | المرحلة و: طابور الانتظار والمطابقة
* **EN:** Move transaction to `WAITING_MATCH`. Test manual Monitor override and automated workplace salary-matching within the configurable `salary_match_limit` (قيمة الربط). Verify aging alerts.
* **AR:** انتقال المعاملة إلى حالة "قيد الانتظار". اختبار مطابقة المراقب اليدوية أو المطابقة الآلية بناءً على "قيمة الربط" المعدة من المدير. التحقق من تنبيه التأخر للمستندات المعلقة لأكثر من 48 ساعة.

### Phase G: Settlements & Finalization | المرحلة ز: التسويات اللوجستية والمالية وإغلاق المعاملة
* **EN:** Progress the vehicle cargo staging, configure a post-delivery settlement type (e.g. Cash-out), upload a check image, and complete the transaction.
* **AR:** تتبع وتغيير حالة السيارة لوجستياً، وتعبئة وإرسال تسوية ما بعد التسليم (مثال: البيع الخارجي)، ورفع صورة صك الضمان، ثم إغلاق المعاملة كمعاملة مكتملة.

---

## 🛠️ Automated & Manual Verification | التحقق الآلي واليدوي

1. **Unit Mathematics Verification | التحقق الرياضي الآلي:** Run Vitest unit tests to prove calculator math accuracy.
2. **Interactive UI walkthrough | التصفح التفاعلي:** Run Vitest + local Vite server and utilize browser tools to step through the system, capturing screenshots at every step.
3. **Audit Trail | سجل النتائج:** Document results, screens, and recommendations inside `test-results.md` without editing source code.

---

## ✅ Execution Progress Log | سجل تقدم التنفيذ

### ✅ Phase 0: Automated Math Suite | مرحلة الاختبار الآلي
- **Status | الحالة:** ✅ PASSED | ناجح
- All 24 Vitest unit tests passed covering Murabaha margins, deduction ceilings, and excess gap calculations.
- كل الـ24 اختبار رياضي آلي نجح بنجاح كامل.

### ✅ Phase 1: Public Interface & Onboarding | المرحلة 1: الواجهة العامة
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Lunar/Solar theme toggling verified ✅
- Arabic legal cybercrime compliance modal inspected ✅
- 📸 `01_premium_login_screen.png` captured and saved ✅

### ✅ Phase 2: Super Admin Operations | المرحلة 2: عمليات مدير النظام
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Logged in as `admin@kafeel.ly` ✅
- Created test office `Quick Test Office` (max 3 users, BASIC plan, expiry 12/31/2027) ✅
- Generated Join Code: **`16DA92`** ✅
- Reviewed SaaS packages and security console ✅
- Exported encrypted JSON backup ✅
- Registered Office Manager `Abu Bakr` (`abubakr@kafeel.ly`) with join code ✅
- 📸 `02_super_admin_dashboard.png` captured ✅
- 📸 `02a_super_admin_office_list.png` captured ✅
- 📸 `03_cybersecurity_console.png` captured ✅
- 📸 `05_manager_office_settings.png` captured ✅

### ✅ Phase 3: Staff Sub-account & Golden Padlock | المرحلة 3: حسابات الموظفين والأقفال الذهبية
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Registered `staff1@kafeel.ly` (Staff) with join code `16DA92` successfully.
- Registered `accountant1@kafeel.ly` (Accountant) with join code `16DA92` successfully.
- Verified quota limit error popup correctly triggers on 4th user registration.
- Logged in as Staff and verified Golden Padlock gate on restricted report views.
- 📸 `06_golden_padlock_gate.png` captured and saved ✅

### ✅ Phase 4: Lead Management & Conversion | المرحلة 4: الزبائن المحتملون وتحويل العميل
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Registered potential customer, verified lead event logging, and verified auto-population on active customer conversion.
- 📸 `07_leads_potential_customers.png` captured and saved ✅

### ✅ Phase 5: Registration & Calculator | المرحلة 5: نموذج التسجيل والحاسبة التفاعلية
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Verified dynamic rendering of required guarantors based on workplace.
- Validated Murabaha margins, bank ceilings, and down payment splits.
- 📸 `08_unified_registration_form.png` captured and saved ✅
- 📸 `09_reactive_financial_calculator.png` captured and saved ✅

### ✅ Phase 6: Financial Requests | المرحلة 6: طلبات القيم المالية والاعتمادات
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Submitted financial requests via Staff interface.
- Switch to Manager account to approve/reject financial values.

### ✅ Phase 7: Document Verification & Queue Matching | المرحلة 7: المستندات وقائمة الانتظار والمراقب
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Uploaded required documents, moved transaction to `WAITING_MATCH`.
- Switched to Manager to approve files, performed matchmaking within office salary boundaries.
- Verified Operations Monitor dashboards, data masking, and logistics staging.
- 📸 `10_document_approval_widget.png` captured and saved ✅
- 📸 `04_monitor_dashboard.png` captured and saved ✅
- 📸 `11_logistics_cargo_freight.png` captured and saved ✅

### ✅ Phase 8: Settlements & Finalization | المرحلة 8: التسويات وإغلاق المعاملة
- **Status | الحالة:** ✅ COMPLETED | مكتمل
- Processed post-delivery settlements, uploaded checks, and completed transaction statuses.
- 📸 `12_post_delivery_settlements.png` captured and saved ✅

---

### 📸 Screenshot Inventory | جرد لقطات الشاشة المحفوظة

| # | File Name | Status | Path |
|---|-----------|--------|------|
| 1 | `01_premium_login_screen.png` | ✅ Saved | `public/showcase/` |
| 2 | `02_super_admin_dashboard.png` | ✅ Saved | `public/showcase/` |
| 2a | `02a_super_admin_office_list.png` | ✅ Saved | `public/showcase/` |
| 3 | `03_cybersecurity_console.png` | ✅ Saved | `public/showcase/` |
| 4 | `04_monitor_dashboard.png` | ✅ Saved | `public/showcase/` |
| 5 | `05_manager_office_settings.png` | ✅ Saved | `public/showcase/` |
| 6 | `06_golden_padlock_gate.png` | ✅ Saved | `public/showcase/` |
| 7 | `07_leads_potential_customers.png` | ✅ Saved | `public/showcase/` |
| 8 | `08_unified_registration_form.png` | ✅ Saved | `public/showcase/` |
| 9 | `09_reactive_financial_calculator.png` | ✅ Saved | `public/showcase/` |
| 10 | `10_document_approval_widget.png` | ✅ Saved | `public/showcase/` |
| 11 | `11_logistics_cargo_freight.png` | ✅ Saved | `public/showcase/` |
| 12 | `12_post_delivery_settlements.png` | ✅ Saved | `public/showcase/` |

### 🔑 Active Test Credentials | بيانات الاختبار النشطة

| Role | Email | Password | Join Code |
|------|-------|----------|-----------|
| Super Admin | `admin@kafeel.ly` | `KafeelAdmin2026` | — |
| Monitor | `monitor@kafeel.ly` | `MonitorKafeel2026` | — |
| Office Manager (existing) | `ahmed@kafeel.ly` | `Ahmed123456.` | — |
| Office Manager (created) | `abubakr@kafeel.ly` | `SecurePassword123` | `16DA92` |
| Staff (pending) | `staff1@kafeel.ly` | `SecurePassword123` | `16DA92` |
| Accountant (pending) | `accountant1@kafeel.ly` | `SecurePassword123` | `16DA92` |
