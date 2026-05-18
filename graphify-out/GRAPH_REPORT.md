# Graph Report - منظومة كفيل  (2026-05-19)

## Corpus Check
- 59 files · ~128,602 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 430 nodes · 515 edges · 32 communities (31 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1c24d63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 33 edges
2. `supabase` - 18 edges
3. `Kafeel (كفيل) - Project Roadmap` - 17 edges
4. `compilerOptions` - 16 edges
5. `☀️ سجل تعديلات جلسة "شمس" - منظومة كفيل السحابية للمرابحة الإسلامية للسيارات` - 12 edges
6. `Kafeel (كفيل) - Project Roadmap` - 12 edges
7. `Agent Instructions — Kafeel (كفيل)` - 10 edges
8. `Kafeel (كفيل) - Project Plan` - 9 edges
9. `3. Architecture & Core Modules` - 9 edges
10. `🚀 Getting Started | بداية سريعة` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AdminDashboard()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/AdminDashboard.tsx → src/contexts/AuthContext.tsx
- `DocumentUploader()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/DocumentUploader.tsx → src/contexts/AuthContext.tsx
- `OfficeTeamManagement()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/OfficeTeamManagement.tsx → src/contexts/AuthContext.tsx
- `ReportsDashboard()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ReportsDashboard.tsx → src/contexts/AuthContext.tsx
- `Settlements()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Settlements.tsx → src/contexts/AuthContext.tsx

## Communities (32 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (13): Customer, CustomerList(), Props, RecentCustomer, StaffDashboard(), StaffDashboardProps, useAuth(), AdminLayout() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (18): CalcState, CAR_PRESETS, defaultState, FinancialCalculator(), Props, CustomerDraft, CustomerForm(), emptyDraft (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (25): dependencies, lucide-react, react, react-dom, react-router-dom, @supabase/supabase-js, devDependencies, @types/react (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (20): 🏦 Banking Infrastructure, code:bash (# Run all tests), code:block9 (kafeel/), 🤝 Contributing | المساهمة, 🗄️ Database Schema | قاعدة البيانات, 📄 Document Management, ✨ Features | الميزات, 🔗 Intelligent Matchmaking Engine (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): Agent Instructions — Kafeel (كفيل), code:block1 (PENDING → WAITING_MATCH → MATCHED → ACTIVE → COMPLETED), code:block2 (PERSONAL_USE | CASH_OUT | EXTERNAL_SALE), code:block3 (src/), code:block4 (feat: <description>      # New feature), 📝 Commit Messages, 🗄️ Database Rules (Supabase PostgreSQL), 📚 Documentation Files (Read & Keep Updated) (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): 1. Executive Summary, 2. Technical Stack, 3. Architecture & Core Modules, 4. UI/UX Design Approach, 5. Security & Privacy, 6. Database Schema (Current), 7. Edge Functions, 8. Current Progress (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): 1. Executive Summary, 2. Technical Stack, 3. Architecture & Core Modules, 4. UI/UX Design Approach, 5. Security & Privacy, 6. Database Schema (Current), 7. Edge Functions, 8. Current Progress (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (17): 1. Clone the repository, 2. Install dependencies, 3. Configure environment variables, 4. Set up the database, 5. Deploy Edge Functions, 6. Start the development server, 7. Run tests, code:bash (git clone https://github.com/your-username/kafeel.git) (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (15): 1. Core Variables (المدخلات والمتغيرات الأساسية), 2. Mathematical Equations & Algorithms (العمليات الحسابية) ✅, 3. Dynamic Banking Rules (شروط وضوابط المصارف الليبية) ✅, 4. Implementation Details (تفاصيل التنفيذ), A. Salary & Deduction Validations ✅, B. Guarantor Requirements (Workplace Dependent) ✅, C. System Overrides (استثناءات النظام) ✅, Kafeel Platform - Financial Calculator Logic & Banking Rules (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): 1. Core Variables (المدخلات والمتغيرات الأساسية), 2. Mathematical Equations & Algorithms (العمليات الحسابية) ✅, 3. Dynamic Banking Rules (شروط وضوابط المصارف الليبية) ✅, 4. Implementation Details (تفاصيل التنفيذ), A. Salary & Deduction Validations ✅, B. Guarantor Requirements (Workplace Dependent) ✅, C. System Overrides (استثناءات النظام) ✅, Kafeel Platform - Financial Calculator Logic & Banking Rules (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (17): Critical Fixes (Post Phase 4), Kafeel (كفيل) - Project Roadmap, Phase 10: Banking Infrastructure & Regional Management ✅, Phase 11: Production Deployment & External Integrations, Phase 12: Premium Design System & Global Styling ✅, Phase 13: SaaS Admin Suite & Security Control ✅, Phase 14: Role Optimization & Dashboard Gamification, Phase 14: Role Optimization, Premium Remuneration & Reusable Padlocks ✅ (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (14): 1. نظرة عامة على المنتج (Product Overview) 🎯, 2. المستخدمون والصلاحيات (User Roles & Permissions) 👥, 3. الميزات الأساسية ومنطق العمل (Core Features & Business Logic) 🚀, 4. الهيكلية التقنية وقاعدة البيانات (Technical Architecture & Schema) 🗄️, 5. تجربة المستخدم والواجهات (UX/UI Requirements) 🎨, أ. محرك المطابقة وخوارزمية الضمان (Matchmaking Engine) ✅, ب. الحاسبة المالية التفاعلية (Reactive Financial Calculator) ✅, ج. تسويات ما بعد التسليم (Post-Delivery Settlements) ✅ (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): 🎨 1. لوحة الألوان الرئيسية (Visual Color Palette), ✨ 2. عناصر التصميم الفاخرة (Premium UI Elements), 🏛️ 3. هيكلة القوائم المنسدلة الذكية (Smart Hover Dropdowns), 🔒 4. الضوابط الأمنية وقواعد البيانات, 🔐 5. نظام التغبيش وقفل الميزات الفاخر (SaaS Premium Padlock & Glass Lock System), 👥 6. بطاقات الزبائن الفاخرة وعناصر التحكم التفاعلية (Premium Customer Cards & Interactive Actions), code:css (border: 1px solid #bf953f; /* لون ذهبي معدني فاتح للمحيط */), code:css (border-color: #fef08a;) (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (12): Critical Fixes (Post Phase 4), Kafeel (كفيل) - Project Roadmap, Phase 10: Banking Infrastructure & Regional Management ✅, Phase 11: Production Deployment & External Integrations, Phase 1: Foundation & Setup (Weeks 1-2), Phase 2: Core Workflows & Financial Engine (Weeks 3-4), Phase 3: The Matchmaking Engine (Weeks 5-6), Phase 4: Settlements & Administration (Week 7) (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (12): 🏗️ Architecture Notes, Branch Naming, Code Style, code:block1 (feat: add customer search filter), code:bash (npm test), Commit Messages, Contributing to Kafeel | المساهمة في كفيل, 📋 Development Workflow (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (12): 1. نظرة عامة على المنتج (Product Overview) 🎯, 2. المستخدمون والصلاحيات (User Roles & Permissions) 👥, 3. الميزات الأساسية ومنطق العمل (Core Features & Business Logic) 🚀, 4. الهيكلية التقنية وقاعدة البيانات (Technical Architecture) 🗄️, 5. متطلبات تجربة المستخدم والتصميم (UI/UX Requirements) 🎨, أ. محرك المطابقة وخوارزمية الضمان (Matchmaking Engine) ✅, ب. الحاسبة المالية التفاعلية (Reactive Financial Calculator) ✅, ج. البنية التحتية للمصارف والفروع (Banking Infrastructure) ✅ (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): 📈 10. استقرار وتماسك كامل بيئة المنظومة, 🚀 11. الترقية الشاملة والذكية لبوابة وكيل السيارات (Monitor/Car Dealer Portal), 🎨 1. الهوية البصرية والعلامة المائية الفاخرة لـ "كفيل", 👑 2. هندسة المربع الذهبي العلوي الأقصى (Topmost Compact Gold Header), ⚡ 3. قوائم التحويم التلقائية الذكية (Hover Dropdowns Navigation), 🛡️ 4. إصلاح تباين حقول الإدخال والتعديل (Contrast Input Fix), 📢 5. الإعلانات التفاعلية المزدوجة وموقع البث الجديد, 🔑 6. ترقية أذونات قاعدة البيانات وحل مشكلة بث وكيل السيارات (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (7): SettingsPanelProps, WaitingQueue(), WaitingTransaction, MatchEvent, supabase, supabaseAnonKey, supabaseUrl

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (10): 1. 💼 مدير المكتب (Manager), 1. هيكل الرواتب والتعويضات:, 2. 🧮 المحاسب (Accountant), 2. مكونات القفل وإعادة الاستخدام لـ SaaS (PremiumLock System):, 3. ⌨️ موظف إدخال بيانات (Data Entry / Staff), 🌟 الاستراتيجية الأساسية, 🚀 تحسينات إضافية وتجربة المستخدم (UI/UX), 👥 تعريف الأدوار والصلاحيات (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): authHeader, corsHeaders, join_code, new_code, supabaseClient

### Community 23 - "Community 23"
Cohesion: 0.40
Nodes (4): allowedRoles, corsHeaders, roleNames, supabaseClient

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (7): ProtectedRoute(), ProtectedRouteProps, AuthContext, AuthProvider(), AuthState, UserRole, MonitorTab

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): DocItem, DocumentUploader(), initialDocs, Props, ExternalSaleTimer, SettlementData, Settlements(), SettlementType (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): AdminDashboard(), Bank, Branch, Office, ROLE_LABELS, Tab, UserProfile, Workplace

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (3): OfficeTeamManagement(), ROLE_LABELS, UserProfile

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (7): BroadcastItem, CarInventoryItem, IncomingShipment, MonitorDashboard(), MonitorDashboardProps, MonitorEntry, useRealtimeMatches()

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (12): PremiumLockBanner(), PremiumLockBannerProps, PremiumLockOverlay(), PremiumLockOverlayProps, ARABIC_MONTHS, MonthlyReport, ReportsDashboard(), SettlementReport (+4 more)

## Knowledge Gaps
- **279 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+274 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 0` to `Community 32`, `Community 1`, `Community 18`, `Community 26`, `Community 27`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 18` to `Community 0`, `Community 1`, `Community 32`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `🚀 Getting Started | بداية سريعة` connect `Community 8` to `Community 3`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _279 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._