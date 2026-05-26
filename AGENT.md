# Agent Instructions — Kafeel (كفيل)

> This file is the primary context for Antigravity / OpenCode agents working on this project.
> Read this BEFORE making any changes. Follow every rule strictly.

---

## 📚 Documentation Files (Read & Keep Updated)

| File | Purpose | Update When |
|------|---------|-------------|
| `docs/PRD.md` | وثيقة متطلبات المنتج — features, roles, business rules (Arabic) | Adding/changing features or roles |
| `docs/PLAN.md` | Technical architecture — modules, schema summary, edge functions | Adding tables, functions, or components |
| `docs/ROADMAP.md` | Phase-based progress tracker | Completing tasks or starting new phases |
| `docs/CALCULATOR.md` | Financial engine equations and banking rules | Changing calculator logic |
| `supabase/schema.sql` | **Single source of truth** for all DB objects | ANY database change |
| `README.md` | Public GitHub docs | Major features, setup changes, new dependencies |

### ⚡ Mandatory: After Every Feature or Fix
1. Update the relevant docs above — do NOT skip this
2. If you changed the DB, update `supabase/schema.sql` to match
3. If you added a component, update `docs/PLAN.md` architecture section
4. If you completed a roadmap item, mark it `[x]` in `docs/ROADMAP.md`

---

## 🗄️ Database Rules (Supabase PostgreSQL)

- Use the **Supabase MCP tools** (`apply_migration`, `execute_sql`, `list_tables`) for DB operations
- **RLS on every table** — no exceptions. Always add policies for admin, monitor, and office roles
- Primary keys: `UUID DEFAULT gen_random_uuid()`
- Financial columns: `DEFAULT 0` (not NULL) — allows creating WAITING_MATCH transactions without calculator data
- `customers.national_id` is globally UNIQUE (prevents cross-office duplication)
- After any DDL change, run `list_tables` with `verbose: true` to verify, then update `supabase/schema.sql`

### Transaction Status Flow
```
PENDING → WAITING_MATCH → MATCHED → ACTIVE → COMPLETED
```

### Settlement Types (strict enum)
```
PERSONAL_USE | CASH_OUT | EXTERNAL_SALE
```

---

## 🧮 Financial Engine

- **Reactive** — no submit button; results update on every input change
- Fixed term: **96 months** (hardcoded, not user-configurable)
- Margins: **16%** or **24%** only (toggle buttons)
- Bank ceiling max: **120,000 LYD**
- Deduction Limit: Toggled between **35%** (0.35) as a default and **50%** (0.50) when the Notary Pledge checkbox is checked.
- Pure functions in `src/lib/financialEngine.ts` — zero side effects
- **Always run `npm test` after modifying financial logic**
- 25 unit tests in `test/financialEngine.test.ts`

---

## 🔗 Matchmaking Engine

- Auto-match criteria: **Exempt workplace mismatch** (same workplace is no longer required for matchmaking, allowing different employers to pair based purely on salary compatibility and dynamic office limits).
- Matching is **deferred** — saving a customer does NOT trigger matching
- User clicks "Send to Queue" → creates `WAITING_MATCH` transaction
- `attempt_auto_match()` RPC is called from Waiting Queue UI only
- Operations Monitor can override via `override_validation = true`

---

## 🔐 Security Model

| Role | Sees | Cannot See |
|------|------|------------|
| admin | Everything | — |
| monitor | Names, workplaces, queue | Salaries, car prices, debts, purchase costs |
| manager | Own office data + reports | Other offices |
| accountant | Own office financial data | Other offices |
| staff | Own office data entry | Purchase cost, profit reports |

- RLS policies use `auth.jwt() -> 'app_metadata' ->> 'role'` and `'office_id'`
- Edge Functions use `service_role` key server-side — **never expose in frontend**
- `.env` is gitignored; `.env.example` is the safe template

---

## 🏗️ Project Structure

```
src/
├── components/     # One component per feature module
│   ├── Calculator.tsx, CustomerForm.tsx, CustomerList.tsx
│   ├── WaitingQueue.tsx, Settlements.tsx, DocumentUploader.tsx
│   ├── AdminDashboard.tsx, MonitorDashboard.tsx, ReportsDashboard.tsx
│   ├── ProtectedRoute.tsx, ErrorBoundary.tsx
├── contexts/       # AuthContext (Supabase Auth + role from user_profiles)
├── hooks/          # useLocalStorage, useRealtimeMatches
├── layouts/        # OfficeLayout, AdminLayout, MonitorLayout
├── lib/            # financialEngine.ts, supabase.ts
├── pages/          # LandingPage, Login, JoinPage
├── utils/          # imageCompression.ts
├── App.tsx         # React Router + ProtectedRoute wrappers
├── main.tsx        # Entry point
└── style.css       # Full design system (HSL tokens, glassmorphism, RTL)
supabase/
├── schema.sql      # Complete DB schema (tables + RLS + functions)
└── functions/      # Edge Functions (join-with-code, admin-manage-users)
```

### Route → Role Mapping
| Path | Roles | Layout |
|------|-------|--------|
| `/office` | manager, staff, accountant | OfficeLayout |
| `/admin` | admin | AdminLayout |
| `/monitor` | monitor | MonitorLayout |
| `/join` | public | JoinPage |

---

## 🎨 UI/UX Rules

- **Arabic RTL** — `dir="rtl"`, font: Cairo (Google Fonts)
- **Vanilla CSS only** — no Tailwind. All styles in `src/style.css`
- **Dark mode** with HSL color tokens, glassmorphism, navy/blue palette
- **Lucide React** for all icons (don't mix icon libraries)
- **localStorage drafts** on Calculator, CustomerForm, Settlements
- **Keyboard-first** — Tab order optimized for data entry speed

---

## ⚠️ Known Gotchas

1. **Supabase `!inner` joins** — TypeScript infers arrays instead of objects. Cast to `any` when mapping
2. **Customer upsert** — Use `national_id` as conflict column, do NOT include `id` in the insert payload
3. **Financial columns default to 0** — WAITING_MATCH transactions have no financial data yet; handle `0` gracefully in UI (show "لم يُحدد" not "0")
4. **RLS policy pattern** — Offices use `office_id = jwt.app_metadata.office_id`, admins use `jwt.app_metadata.role = 'admin'`
5. **Edge Function auth** — `join-with-code` is public (no JWT); `admin-manage-users` requires admin JWT

---

## 📝 Commit Messages

```
feat: <description>      # New feature
fix: <description>       # Bug fix
docs: <description>      # Documentation only
refactor: <description>  # Code restructuring
chore: <description>     # Config, deps, cleanup
test: <description>      # Tests
```
