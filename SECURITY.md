# 🛡️ Security Hardening & Threat Telemetry Documentation | وثيقة الأمن والتحصين السيبراني
**Version / الإصدار:** `1.3.3 (security fix)`
**Last Updated / آخر تحديث:** May 2026

---

## 🇺🇸 English Version

This document outlines the security architecture, threat logging, and data masking mechanisms implemented in the Kafeel multi-tenant financial application as of version `1.3.3 (security fix)`. 

The security suite guarantees absolute protection against data leaks, client-side financial parameter tampering, structural crash path leaks, and unauthorized ledger queries.

### 📋 Overview of Security Components & Files

#### 1. 🗄️ Database Shield & Schema Hardening
* **File Path:** [`supabase/migrations/07_security_hardening.sql`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/supabase/migrations/07_security_hardening.sql)
* **Mechanisms Implemented:**
  * **Brute-Force & Credential Attack Logging (`auth_failures`):** Tracks suspicious authentication attempts, capture user-agents, IP records, and active threat states.
  * **Error Stack Telemetry (`system_runtime_errors`):** Stores system crashes caught by client components securely in the database for instant debugging by system administrators.
  * **Purchase Cost Masking via View (`secure_transactions_view`):** Utilizes `security_barrier` on PostgreSQL to automatically mask the highly sensitive `purchase_cost` field, returning `NULL` for unauthorized user roles (`staff`, `monitor`), while maintaining access for `manager` and `accountant` roles.
  * **Anti-Tampering Trigger (`prevent_financial_tampering`):** Enforces a database-level math verification trigger that intercepts edits on the `transactions` table. It recalculates the Murabaha parameters (16% and 24% profit margins, 120,000 LYD bank ceiling) and rejects changes where the client tries to alter prices or rates.

#### 2. 💻 Silent Crash Interceptor & Safe Shield (React Boundary)
* **File Path:** [`src/components/SecurityErrorBoundary.tsx`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/src/components/SecurityErrorBoundary.tsx)
* **Mechanisms Implemented:**
  * **Zero-Information Leakage Policy:** Intercepts frontend crashes and strips internal file paths, API routing schemas, database connections, and environment variables from the user display.
  * **Automated Telemetry dispatch:** Proactively calls the Supabase API to log the exact crash message, user ID, browser data, and context under `system_runtime_errors`.
  * **Luxury Glassmorphic UI:** Features a high-fidelity visual interface matching the deep dark-mode and golden glow accents of Kafeel with an intuitive "Hot-Restart" recovery button.

#### 3. 👥 Central Security Command Room
* **File Path:** [`src/components/AdminDashboard.tsx`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/src/components/AdminDashboard.tsx)
* **Mechanisms Implemented:**
  * **"الأمن والتحصين" (Security Hub) Tab:** A dedicated console visible strictly to administrators.
  * **Real-time Auditing:** Lists active brute-force threat vectors, authentication anomalies, and IP locations.
  * **Telemetry Reader:** Allows administrators to view detailed exception stacks, query trace logs, and clear system logs safely.

#### 4. 🧮 Tamper-Proof Financial Calculation Core
* **File Path:** [`src/lib/financialEngine.ts`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/src/lib/financialEngine.ts)
* **Mechanisms Implemented:**
  * Enforces banking calculations in full compliance with Jumhouria Bank and the Central Bank of Libya.
  * Completely covered by an extensive 23-scenario Vitest test suite (`npm test`) validating edge-cases, double guarantors, public/classified salary differences, and correct profit accumulation.

---

## 🇱🇾 النسخة العربية (Arabic Version)

توثق هذه الصفحة البنية التحتية للحماية والأمن السيبراني، ومراقبة محاولات الاختراق وحجب البيانات الحساسة المطبقة في منظومة **كفيل** المالية ابتداءً من الإصدار الآمن `1.3.3 (security fix)`.

توفر هذه الحزمة الأمنية حصانة كاملة ضد تسريب معلومات الشراء الفعلي، ومكافحة التلاعب بنسب المرابحة، وحجب تفاصيل الأخطاء الفنية عن المستخدمين لمنع الهندسة العكسية.

### 📋 نظرة عامة على الملفات والأنظمة الأمنية المضافة

#### 1. 🗄️ تحصين وحماية قاعدة البيانات والـ RLS
* **مسار الملف:** [`supabase/migrations/07_security_hardening.sql`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/supabase/migrations/07_security_hardening.sql)
* **آليات الحماية المطبقة:**
  * **تتبع هجمات التخمين والولوج العشوائي (`auth_failures`):** تسجيل محاولات الدخول الفاشلة فوراً والتقاط الأجهزة وعناوين الـ IP لرصد أي هجوم تسلل.
  * **سجلات كراشات النظام المأمنة (`system_runtime_errors`):** استقبال وحفظ تفاصيل الانهيارات التقنية لمساعدة المطورين في الصيانة الفورية دون كشف الكود للمخترقين.
  * **حجب سعر الشراء الفعلي (`secure_transactions_view`):** إدراج `VIEW` بقاعدة البيانات محمي بخاصية `security_barrier` لتصفير وحجب حقل تكلفة السيارة (`purchase_cost`) لجميع المستخدمين ذوي الرتب المحدودة مثل الموظفين (`staff`) والمراقبين (`monitor`) وإتاحته فقط للمدراء والمحاسبين.
  * **مُشغل منع التلاعب المالي المباشر (`prevent_financial_tampering`):** زناد برمجي بقاعدة البيانات يعيد تكرار الحسابات الرياضية للمرابحة (هامش 16% و 24%، سقف مصرف الجمهورية 120,000 د.ل) ويرفض إدراج أي عملية تم تعديل قيمها يدوياً من واجهة العميل.

#### 2. 💻 معترض الانهيارات الآمن والدرع الزجاجي (React Security Boundary)
* **مسار الملف:** [`src/components/SecurityErrorBoundary.tsx`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/src/components/SecurityErrorBoundary.tsx)
* **آليات الحماية المطبقة:**
  * **سياسة التصفية والتعتيم:** التقاط الكراشات وحذف مسارات الملفات الحساسة وعناوين الـ APIs من الواجهة لحماية النظام من الهندسة العكسية.
  * **الحفظ التلقائي الفوري للأخطاء:** إرسال تفاصيل الكراش والأجهزة تلقائياً لجدول الأمان بقاعدة البيانات بشكل صامت.
  * **الواجهة الزجاجية الفاخرة:** تصميم واجهة اعتذار واستعادة مرنة ذات توهج ذهبي متناغم مع الوضع المظلم لمنظومة كفيل مع زر إعادة تشغيل تفاعلي سريع.

#### 3. 👥 غرفة التحكم والمراقبة الأمنية المركزية
* **مسار الملف:** [`src/components/AdminDashboard.tsx`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/src/components/AdminDashboard.tsx)
* **آليات الحماية المطبقة:**
  * **تبويب "الأمن والتحصين" باللوحة الإدارية:** شاشة أمنية خاصة لا تظهر إلا لمدراء المنظومة لرصد ومكافحة التهديدات.
  * **أدوات المراقبة الحية:** عرض سجلات الدخول المشبوهة، عناوين الأجهزة والبلدان المرتبطة بالـ IP.
  * **قارئ ومحلل التهديدات:** يتيح للمدراء فحص تفاصيل الانهيارات التقنية وحلها بشكل سريع ومنظم.

#### 4. 🧮 محرك الحسابات المالية غير القابل للتلاعب
* **مسار الملف:** [`src/lib/financialEngine.ts`](file:///c:/Users/masal/OneDrive/Documents/opencode/kafeel/src/lib/financialEngine.ts)
* **آليات الحماية المطبقة:**
  * صياغة معادلات المرابحة والحدود القصوى والضمانات بشكل مغلق ومحمي.
  * مغطى بالكامل بـ **23 سيناريو فحص واختبار تلقائي** بمحرك Vitest لضمان الدقة الرياضية وتوافقها مع قوانين الجمهورية والمصرف المركزي الليبي.
