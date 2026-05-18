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
- Bank ceiling enforcement (120,000 LYD max)
- Notary pledge toggle (35% → 50% deduction)
- No submit button — instant results on input change

### 🔗 Intelligent Matchmaking Engine
- Auto-matches beneficiaries with guarantors (same workplace + salary diff ≤ 50 LYD)
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

### ⚙️ SaaS Administration & Security Hub
- **White-Label Configuration**: Dynamic branding updates (Brand name, custom logo, footer copyright)
- **SaaS Packages Builder**: Real-time package pricing, user limits, and features editor
- **SMS & Payments Gateways**: Interactive configurations for Twilio/BulkSMS and local Libyan payment portals (SADAD, Tadawul, Edfa3ly)
- **Database Backups & Audit Trail**: Live system log streams and automated JSON schema database backup exporter
- **Independent Partner Onboarding**: Generate unique partner join codes (outside standard offices) for car agents & assistants
- **Advanced Users Hub**: Robust administrative controls to delete, reset passwords, and freeze/unfreeze accounts to counter brute force attacks

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
│   │   ├── MonitorDashboard.tsx  # Operations monitor (data-masked)
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
│   └── financialEngine.test.ts   # 23 unit tests
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

### Key PostgreSQL Functions

| Function | Purpose |
|----------|---------|
| `find_potential_guarantors()` | Finds matching guarantors (same workplace, salary diff ≤ 50 LYD) |
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
- [ ] **Phase 15**: Live production API testing & SMS integration


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
