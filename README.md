<p align="center">
  <img src="public/logo.png" alt="Kafeel Logo" width="200" />
</p>

<h1 align="center">كفيل | Kafeel</h1>

<p align="center">
  <strong>B2B SaaS Platform for Islamic Murabaha Car Sales</strong><br/>
  منصة سحابية لإدارة مكاتب بيع السيارات بنظام المرابحة الإسلامية
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vite-8-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License" />
</p>

---

## 📋 Overview | نظرة عامة

**Kafeel** is a centralized multi-tenant cloud platform that automates Islamic Murabaha financing operations for car sales offices in Libya. It solves critical pain points:

- **Manual calculation errors** → Reactive financial calculator with real-time results
- **Guarantor duplication** → AI-powered matchmaking engine across competing offices
- **Data security** → Row-Level Security (RLS) with role-based access control and account protection
- **Paper-based workflows** → Digital document management with client-side compression
- **Platform Personalization** → White-label branding configurations with customizable SaaS packages

---

## ✨ Features | الميزات

### 🧮 Reactive Financial Calculator
- Real-time Murabaha calculations (16% / 24% margins)
- Bank ceiling enforcement (120,000 LYD max) with scaled down installments for lower priced vehicles
- Capped deduction rate at 50% for all calculations (Notary pledge toggle is reminder only)
- Granular down payment breakdown (Excess vehicle value + capacity gap) and aggregated sum card
- No submit button — instant results on input change

### 🔗 Intelligent Matchmaking Engine
- Auto-matches beneficiaries with guarantors (same workplace + salary diff ≤ office salary_match_limit [default 50 LYD, configurable 0-50])
- Waiting queue with deferred matching
- Manual override for operations monitors
- Real-time notifications via Supabase Realtime

### 👥 Multi-Tenant Architecture & Roles
| Role | Access |
|------|--------|
| **Super Admin** (مدير النظام) | Full platform configurations, white-labeling, SaaS packages, and security controls |
| **Monitor** (مراقب العمليات) | Queue oversight, manual linking (financial data masked) |
| **Car Agent** (وكيل السيارات) | Independent partner vehicle dealers (onboarded via special partner codes) |
| **Assistant Agent** (مساعد الوكيل) | Sub-agent vehicle manager |
| **Manager** (مدير المكتب) | Office operations, reports, settlements |
| **Accountant** (محاسب) | Financial operations within office |
| **Staff** (موظف) | Data entry, customer registration |

### 💰 Post-Delivery Settlements
- 3 types: Personal Use, Cash-out, External Sale
- 3-day countdown timer for external sales
- Check/guarantee image upload for finalization

### 📄 Document Management
- 5-document checklist with progress tracking
- Client-side image compression (Canvas API)
- Supabase Storage integration

### 🏦 Banking Infrastructure
- Hierarchical bank → branch registry
- Regional tagging (Tripoli, Western, etc.)
- Toyota car price presets from official bank rates

### 📊 Potential Customers Hub & Conversion Wizard
- Full CRUD operations for leads and inquiries in a dedicated workspace tab.
- Workplace integrations linking leads directly to employers/companies.
- Complete history logs tracking lead events (creation, updates, deletions).
- One-click "Convert to Active Customer" wizard that exports data straight into registration forms.
- Live SQL migrations copying panel for easy database schema setup.
- Fully simulated client-side `localStorage` fallbacks when database tables are not fully migrated yet.

### 💸 Financial Requests System & Management Board
- Separate trackable financial categories: `LOAN`, `FINANCIAL_VALUE`, and `BILLS`.
- Color-coded workflow states: Gold for `PENDING`, Emerald for `APPROVED`, Red for `REJECTED`.
- Built-in Manager approval/rejection widgets directly inside the unified portal.
- Smart search customer selectors to automatically match requests to registered profiles.
- RLS schema instruction banners to guide developers on configuring Row-Level Security.

### 🚚 Car Dealer Logistics & Vehicle Appraisals
- **Logistics Delivery Pipeline**: Interactive vehicle delivery staging tracker (`🔧 قيد التجهيز الفني`, `📍 جاهزة بالمعرض للزبون`, `🚛 جاري الشحن والتوصيل`, `🔑 تم التسليم النهائي للزبون`) with dynamic filtering.
- **Pre-Booking & Cargo Tracking**: Live ocean freight cargo shipment estimation for early customer vehicle reservations.
- **Real-Time Demand Heatmap**: Real-time counter of queue requests rendering vehicle model demand density.
- **Technical Health Sheets**: Dedicated input forms for mileage, engine health, and detailed vehicle inspection reports.
- **Queue Urgency Alerting**: Red-pulsing aging alerts with `متأخر ⚠️` for items delayed in matching queue > 48 hours.

### 📢 Premium Design & Unified Announcements
- **Luxury Gold Header & Typography**: Sleek sticky topmost golden header (52px height) matching premium Alexandria (geometric headings) and Tajawal (fluid body copy) typography.
- **Zero-Click Hover Dropdowns**: Combined 10 admin sections into 4 unified hovering capsules (Subscriptions, Financials, Connections, Configuration).
- **3-Column Login Wrapper**: Split auth screen into Left (Dealer Board), Center (Glassmorphic login form), and Right (System Admin warnings) with RLS guest access bypass.
- **Portal Marquee Banners**: Live layout-wide sliding notification tickers.
- **Unified Guarantor Layout**: Restructured guarantor field panel (inputs on right, results/validation flags on left) mirroring the beneficiary fields for a balanced, clean design.

### 🪪 SaaS Administration & Security Hub
- **White-Label Configuration**: Dynamic branding updates (Brand name, custom logo, footer copyright)
- **SaaS Packages Builder**: Real-time package pricing, user limits, and features editor
- **SMS & Payments Gateways**: Interactive configurations for Twilio/BulkSMS and local Libyan payment portals (SADAD, Tadawul, Edfa3ly)
- **Database Backups & Audit Trail**: Live system log streams and automated JSON schema database backup exporter
- **Independent Partner Onboarding**: Generate unique partner join codes (outside standard offices) for car agents & assistants
- **Advanced Users Hub**: Robust administrative controls to delete, reset passwords, and freeze/unfreeze accounts to counter brute force attacks
- **Cybersecurity Hardening (Phase 17)**: 
  - Safe `SecurityErrorBoundary` preventing stack trace leaks to frontend.
  - Telemetry database registers (`system_runtime_errors` and `auth_failures`).
  - Secure `transactions` view with `security_barrier` masking actual `purchase_cost` from unauthorized staff.
  - SQL calculation validation trigger `prevent_financial_tampering` blocking database tampering.
  - Gorgeous central Admin "الأمن والتحصين" monitoring console for audit traces and logs.

---

## 🛠️ Tech Stack | البنية التقنية

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript 6 |
| **Build Tool** | Vite 8 |
| **Styling** | Vanilla CSS (HSL tokens, Glassmorphism, Lunar/Solar theme toggles, RTL-first) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **Edge Functions** | Deno (join-with-code, admin-manage-users) |
| **Routing** | React Router DOM 7 |
| **Icons** | Lucide React |
| **Testing** | Vitest |
| **Font** | Cairo (Google Fonts) |

---

## 🚀 Getting Started | بداية سريعة

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/your-username/kafeel.git
cd kafeel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set up the database

Run the SQL schema against your Supabase project:

```bash
# Via Supabase Dashboard → SQL Editor
# Paste the contents of supabase/schema.sql
```

See [`supabase/schema.sql`](supabase/schema.sql) for the complete database setup including tables, RLS policies, and functions.

### 5. Deploy Edge Functions

```bash
supabase functions deploy join-with-code
supabase functions deploy admin-manage-users
```

### 6. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 7. Run tests

```bash
npm test
```

---

## 📁 Project Structure | هيكل المشروع

```
kafeel/
├── public/                  # Static assets (logo, favicon)
├── src/
│   ├── components/          # UI Components
│   │   ├── AdminDashboard.tsx    # Admin portal (offices, users, workplaces, SaaS configs)
│   │   ├── Calculator.tsx        # Reactive financial calculator
│   │   ├── CustomerForm.tsx      # Unified beneficiary + guarantor registration
│   │   ├── CustomerList.tsx      # Customer browser with queue actions
│   │   ├── DocumentUploader.tsx  # Document management with compression
│   │   ├── FinancialRequest.tsx  # Financial requests tracking & manager approval
│   │   ├── MonitorDashboard.tsx  # Operations monitor (data-masked)
│   │   ├── PotentialCustomers.tsx # Potential Customers CRUD & conversion wizard
│   │   ├── ReportsDashboard.tsx  # Financial reporting
│   │   ├── Settlements.tsx       # Post-delivery settlements
│   │   └── WaitingQueue.tsx      # Guarantor matching queue
│   ├── contexts/
│   │   └── AuthContext.tsx       # Supabase Auth + role management
│   ├── hooks/
│   │   └── useLocalStorage.ts    # Draft persistence hook
│   ├── layouts/
│   │   ├── OfficeLayout.tsx      # Office portal shell
│   │   ├── AdminLayout.tsx       # Admin portal shell
│   │   └── MonitorLayout.tsx     # Monitor portal shell
│   ├── lib/
│   │   ├── financialEngine.ts    # Pure financial calculation functions
│   │   └── supabase.ts           # Supabase client initialization
│   ├── pages/
│   │   ├── LandingPage.tsx       # Entry page
│   │   ├── Login.tsx             # Authentication with Lunar/Solar themes
│   │   └── JoinPage.tsx          # Self-registration with join code and theme switches
│   ├── utils/
│   │   └── imageCompression.ts   # Canvas API image compression
│   ├── App.tsx                   # Router + protected routes
│   ├── main.tsx                  # React entry point
│   └── style.css                 # Global design system (51KB)
├── supabase/
│   ├── schema.sql                # Complete database schema
│   └── functions/
│       ├── join-with-code/       # Public self-registration
│       └── admin-manage-users/   # Admin user management
├── test/
│   └── financialEngine.test.ts   # 24 unit tests
├── docs/
│   ├── PRD.md                    # Product Requirements (Arabic)
│   ├── PLAN.md                   # Technical Architecture
│   ├── ROADMAP.md                # Development Roadmap
│   └── CALCULATOR.md             # Financial Engine Documentation
├── .env.example                  # Environment template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🗄️ Database Schema | قاعدة البيانات

| Table | Purpose | RLS |
|-------|---------|:---:|
| `offices` | Office management (join codes, max users) | ✅ |
| `user_profiles` | User → office mapping with roles and freeze states | ✅ |
| `workplaces` | Employer registry + guarantor requirements | ✅ |
| `customers` | National ID (unique), salary, workplace | ✅ |
| `transactions` | Financial lifecycle + matching status | ✅ |
| `transaction_guarantors` | Match linking (Auto/Manual/Override) | ✅ |
| `settlements` | Post-delivery financial settlements | ✅ |
| `banks` | Bank registry | ✅ |
| `branches` | Branch registry with regional tags | ✅ |
| `potential_customers` | Leads tracking & workplace links | ✅ |
| `potential_customer_logs` | Event history logs for leads | ✅ |
| `financial_requests` | Loans, financial values & bills requests | ✅ |

### Key PostgreSQL Functions

| Function | Purpose |
|----------|---------|
| `find_potential_guarantors()` | Finds matching guarantors (same workplace, salary diff ≤ office salary_match_limit) |
| `attempt_auto_match()` | Auto-links guarantors and updates transaction status |
| `generate_join_code()` | Creates unique 6-char alphanumeric office codes |

---

## 🔐 Security | الأمان

- **Row-Level Security (RLS)** on all tables — tenant isolation enforced at the database level
- **Role-based access** — Admin, Monitor, Car Agent, Assistant Agent, Manager, Accountant, Staff
- **Account Protection** — Brute-force anti-intrusion account freezing from the Admin hub
- **Data masking** — Monitor portal hides salaries, car prices, and debts
- **Edge Functions** — Service-role key used server-side only
- **Environment variables** — No credentials in source code

---

## 🧪 Testing | الاختبارات

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

The test suite covers:
- All 5 financial equations
- 16% and 24% margin rates
- Notary pledge deduction override
- Edge cases (zero salary, max ceiling)

---

## 🗺️ Roadmap | خارطة الطريق

- [x] **Phase 1-4**: Foundation, Financial Engine, Matchmaking, Settlements
- [x] **Phase 5**: UI/UX Polish, Portal Architecture, Unit Tests
- [x] **Phase 6**: Purchase Cost Tracking, Settlement Finalization, Reports
- [x] **Phase 7**: Join Code System, User Management, Edge Functions
- [x] **Phase 9**: Unified Registration, Customer Management (Redesigned Cards)
- [x] **Phase 10**: Banking Infrastructure, Regional Branch Management
- [x] **Phase 12**: Premium Visual Design & Lunar/Solar Theme Swapping
- [x] **Phase 13**: SaaS Admin Hub, Custom Packages, Gateways, Audit logs & Anti-Brute-Force security configurations
- [x] **Phase 14**: Role Separation, Murabaha Compensation Models, and Reusable Gold Padlock SaaS Gates
- [x] **Phase 15**: Arabic Legal Terms Agreement & Compliance (شروط الاستخدام والامتثال القانوني)
- [x] **Phase 17**: Security Hardening, Threat Telemetry Logs, Safe Error boundaries, Purchase cost masking views, and Admin Security Control Center 🛡️
- [x] **Phase 19**: Live production API testing & SMS integration
- [x] **Phase 20**: Document Verification & Transaction State Machine
- [x] **Phase 21**: Configurable Link Limits (قيمة الربط) for Office Managers (0-50 LYD threshold)
- [x] **Phase 22**: Premium Visual Upgrades, Logistics Hub & Form Layouts ("Shams" Session)
- [x] **Phase 23**: Potential Customers Hub & Financial Requests System (Leads tracking, logs, conversions, loans/bills management, approval widgets)
- [x] **Phase 24**: Advanced Murabaha Calculations & Multi-Factor Down Payments (Realistic bank ceiling formulas, salary deduction rules, automatic excess & gap down payment splits)


---

## 🤝 Contributing | المساهمة

Contributions are welcome! Please see [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

---

## 📄 License | الرخصة

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Built with ❤️ for the Libyan car sales market</sub><br/>
  <sub>صُنع بحب لسوق السيارات الليبي 🇱🇾</sub>
</p>
