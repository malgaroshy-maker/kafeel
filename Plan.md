# Kafeel (كفيل) - Project Plan

## 1. Executive Summary
Kafeel is a B2B SaaS platform for car sales offices operating on an Islamic Murabaha system. It aims to automate financial calculations, manage customers, and prevent guarantor duplication across competing offices.

## 2. Technical Stack
- **Frontend Framework**: React (Vite) + TypeScript ✅
- **Styling**: Vanilla CSS with HSL design tokens, glassmorphism, dark mode, RTL-first ✅
- **State Management**: React useState + localStorage drafting ✅
- **Backend & Database**: Supabase (PostgreSQL) ✅
  - Row Level Security (RLS) for tenant isolation
  - Database Functions for matchmaking (`find_potential_guarantors`, `attempt_auto_match`) ✅
  - Real-time Subscriptions for match notifications (`useRealtimeMatches` hook) ✅
- **Deployment**: Vercel (Frontend) & Supabase (Backend) — Phase 6
- **Authentication**: Supabase Auth (Email/Password, Roles) — Phase 6

## 3. Architecture & Core Modules

### A. Authentication & Authorization (Tenant Isolation)
- **Roles**: Super Admin, Operations Monitor, Tenant Office, Staff.
- **Implementation**: Supabase Auth + RLS. Every office only sees its `customers` and `transactions`. Operations Monitor sees limited fields across tenants.
- **Status**: Schema ready, RLS policies to be enforced in Phase 6.

### B. Matchmaking Engine & Waiting Queue ✅
- **Logic**: Matches based on `National ID`, `Workplace`, and `Salary Difference <= 50 LYD`.
- **Database Functions**: `find_potential_guarantors()` with `override_validation` parameter for Monitor role. `attempt_auto_match()` for automated linking.
- **Real-time**: Supabase Realtime channel subscriptions via `useRealtimeMatches` hook.
- **UI**: `WaitingQueue.tsx` (card-based queue) + `MonitorDashboard.tsx` (table with data masking + manual link mode).

### C. Reactive Financial Calculator ✅ (Phase 6 Updates)
- **Logic**: Client-side (React state) dynamic updates — all 5 equations from `calculater.md` implemented.
- **Inputs**: Car Purchase Cost (Optional), Car Sale Price (Bank Price), Bank Ceiling, Net Salary, Murabaha Margin (16% or 24%), Notary Pledge toggle.
- **Features**: Real-time results, deduction rate badge, localStorage draft saving, keyboard-accessible, **expected profit calculation**.

### D. Post-Delivery Settlements ✅
- **Logic**: 3 settlement types (Personal Use, Cash-out, External Sale) with financial breakdowns.
- **Timer**: 3-day external sale countdown with color-coded urgency (green → red).
- **Dashboard**: Live timer cards with progress bars.
- **Database**: `settlements` table with all types and deadline tracking.
- **Closing Requirement**: Must upload a photo of the check/guarantee (`check_image_url`) to fully close and finalize the transaction.

### E. Document Management ✅
- **Storage**: Supabase Storage ready (client-side compression implemented).
- **Processing**: Canvas API image compression (`imageCompression.ts`) before upload.
- **UI**: Checklist with progress bar, file size display after compression.

### F. Admin Dashboard ✅
- **Tenant Management**: Office subscription plans (Basic/Pro/Enterprise), monthly quotas with progress bars, active/inactive toggle.
- **Workplace Management**: View and add workplaces with chip-based UI.
- **Stats**: 4 KPI cards (active offices, workplaces, quota usage, utilization %).

### G. Financial Reporting & Analytics (Phase 5/6)
- **Logic**: Calculate net office profit based on `(Car Sale Price - Car Purchase Cost) + Processing Commissions`.
- **UI**: Office Manager dashboard to view monthly profit reports and customer acquisition metrics.
- **Privacy**: Hidden from standard Staff and Operations Monitor roles.

### H. External Notifications (Phase 6)
- **Logic**: Send automated alerts to customers and guarantors when a match is found to proceed with paperwork.
- **Integration**: General SMS/WhatsApp API (Provider to be determined in Phase 6).

## 4. UI/UX Design Approach
- **RTL Support**: Built inherently for Arabic (dir="rtl", Cairo font). ✅
- **Aesthetics**: Premium feel with HSL color system, dark mode auto-detection, glassmorphism header, smooth transitions. ✅
- **Accessibility**: Keyboard navigation optimized (Tab flow) for data entry efficiency. ✅
- **Resilience**: `localStorage` drafts on Calculator, CustomerForm, and Settlements. ✅
- **Navigation (Portals Architecture)**:
  - **Office Portal (`/office`)**: For Tenant Offices (Calculator, Beneficiaries, Guarantors, Documents, Waiting Queue, Settlements, **Reports**).
  - **Monitor Portal (`/monitor`)**: For Operations Monitor (Manual Linking & Waiting Queue Oversight).
  - **Admin Portal (`/admin`)**: For Super Admins (Tenant & Workplace Management).
  - Landing Page (`/`): A role-selection entry point.

## 5. Security & Privacy
- **Data Masking**: Monitor Dashboard hides salaries, car prices, and debts by default. ✅
- **RLS Policies**: Enabled on all 6 tables. ✅ Detailed policies to be refined in Phase 6.
- **Environment Variables**: Supabase credentials stored in `.env` (not in source code). ✅

## 6. Database Schema (Current)
| Table | Purpose | RLS | Status |
|-------|---------|-----|--------|
| `workplaces` | Workplace registry + `required_guarantors` | ✅ | ✅ |
| `offices` | Subscriptions, quotas, active status, **max_customers, max_users, trial_ends_at** | ✅ | ✅ |
| `customers` | National ID (unique), salary, workplace_id | ✅ | ✅ |
| `transactions` | Lifecycle + `office_loan`, `car_model`, `is_files_complete`, **purchase_cost** | ✅ | ✅ |
| `transaction_guarantors` | Match linking (Auto/Manual/Override) | ✅ | ✅ |
| `settlements` | 3 settlement types + deadline tracking, **check_image_url** | ✅ | ✅ |

## 7. Current Progress
- **Phases 1-4**: Complete ✅
- **Critical Fixes**: RLS, env vars, schema cleanup ✅
- **Phase 5**: UI/UX Polish + Testing — Next
- **Phase 6**: Production Deployment + Launch — Final
