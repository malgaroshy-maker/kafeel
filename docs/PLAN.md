# Kafeel (كفيل) - Project Plan

## 1. Executive Summary
Kafeel is a B2B SaaS platform for car sales offices operating on an Islamic Murabaha system. It automates financial calculations, manages customers, and prevents guarantor duplication across competing offices.

## 2. Technical Stack
- **Frontend Framework**: React (Vite) + TypeScript ✅
- **Styling**: Vanilla CSS with HSL design tokens, glassmorphism, dark mode, RTL-first ✅
- **State Management**: React useState + localStorage drafting ✅
- **Backend & Database**: Supabase (PostgreSQL) ✅
  - Row Level Security (RLS) for tenant isolation
  - Database Functions for matchmaking (`find_potential_guarantors`, `attempt_auto_match`) ✅
  - Real-time Subscriptions for match notifications (`useRealtimeMatches` hook) ✅
  - Edge Functions for user management (`join-with-code`, `admin-manage-users`) ✅
- **Deployment**: Vercel (Frontend) & Supabase (Backend)
- **Authentication**: Supabase Auth (Email/Password) + Join Code onboarding ✅

## 3. Architecture & Core Modules

### A. Authentication & Authorization (Join Code System) ✅
- **Roles**: Master Admin (`admin`), Operations Monitor (`monitor`), Office Manager (`manager`), Accountant (`accountant`), Data Entry (`staff`), Car Agent (`car_agent`), Assistant Car Agent (`car_agent_assistant`).
- **Onboarding Flow**:
  1. Master Admin creates an office → system generates a unique 6-char alphanumeric join code.
  2. Admin shares the join code with the office.
  3. New users self-register at `/join` with email + password + join code.
  4. Users land as `staff` by default → Admin can promote to `manager` or `accountant`.
  5. **Car Agent Codes**: Master Admin can generate special, independent registration codes (outside the scope of standard offices) to onboard external partners as "Car Agents" or "Assistant Car Agents".
- **User Limits**: Each office has a `max_users` limit (default: 4 — 1 manager, 1 accountant, 2 data entry).
- **Admin Powers**: Create offices, create/revoke join codes, promote/demote roles, reset passwords, freeze accounts, deactivate users, and delete accounts permanently.

### B. Matchmaking Engine & Waiting Queue ✅
- **Logic**: Matches based on `National ID`, `Workplace`, and `Salary Difference <= 50 LYD`.
- **Database Functions**: `find_potential_guarantors()` with `override_validation` parameter for Monitor role. `attempt_auto_match()` for automated linking.
- **Real-time**: Supabase Realtime channel subscriptions via `useRealtimeMatches` hook.
- **UI**: `WaitingQueue.tsx` (card-based queue) + `MonitorDashboard.tsx` (table with data masking + manual link mode).

### C. Reactive Financial Calculator ✅
- **Logic**: Client-side (React state) dynamic updates — all 5 equations implemented.
- **Inputs**: Car Purchase Cost (Optional), Car Sale Price (Bank Price), Bank Ceiling, Net Salary, Murabaha Margin (16% or 24%), Notary Pledge toggle.
- **Features**: Real-time results, deduction rate badge, localStorage draft saving, keyboard-accessible, expected profit calculation.

### D. Post-Delivery Settlements ✅
- **Logic**: 3 settlement types (Personal Use, Cash-out, External Sale) with financial breakdowns.
- **Timer**: 3-day external sale countdown with color-coded urgency (green → red).
- **Database**: `settlements` table with all types and deadline tracking.
- **Closing Requirement**: Must upload a photo of the check/guarantee (`check_image_url`) to fully close and finalize the transaction.

### E. Document Management ✅
- **Storage**: Supabase Storage (client-side compression implemented).
- **Processing**: Canvas API image compression (`imageCompression.ts`) before upload.
- **UI**: Checklist with progress bar, file size display after compression.
- **Context-Aware**: Can be launched for a specific customer from the Customer List or as part of a new registration.
- **Transaction Submission**: "إرسال المعاملة للمراجعة" button aggregates Calculator + Customer + Guarantor + Documents into a single transaction.

### F. Master Admin Portal Dashboard (14 Tabs) ✅
- **offices**: Create offices, set max users, edit subscription validity, plan types (BASIC, PREMIUM, UNLIMITED).
- **users**: Comprehensive Users Management Hub with advanced controls (reset password, freeze, toggle deactivation, delete).
- **workplaces**: Add/view workplaces with chip-based UI.
- **banks & branches**: Manage hierarchical bank and branch registry with regional tagging.
- **codes**: Card view of office join codes AND independent car partner registration codes.
- **revenues**: SaaS subscription cashflow summaries.
- **resellers**: Manage regional affiliate and sales agents.
- **broadcasts**: Send alerts and system announcements.
- **tickets**: Tech support chat and office ticket resolution.
- **health**: Live database ping, response time metrics, and system load monitoring.
- **saas-plans**: Fully custom subscription package price, user limit, and feature set editor.
- **system-logs**: Server audit log streams and automated JSON database schema backup exporter.
- **white-label**: Dynamic branding configuration (brand name, logo URL, and footer copyright settings).
- **gateways**: Third-party integrations hub (SMS Twilio/BulkSMS configurations, and Libyan Payment SADAD/Tadawul/Edfa3ly portals).

### G. Financial Reporting & Analytics ✅
- **Logic**: Calculate net office profit based on `(Car Sale Price - Car Purchase Cost) + Processing Commissions`.
- **UI**: Office Manager dashboard to view monthly profit reports and customer acquisition metrics.
- **Privacy**: Hidden from standard Staff and Operations Monitor roles.

### H. External Notifications & Gateways ✅
- **Logic**: Send automated alerts to customers and guarantors when a match is found.
- **Integration**: Configurable Twilio, BulkSMS, and Local SMS gateways inside the Admin Dashboard.

## 4. UI/UX Design Approach
- **RTL Support**: Built inherently for Arabic (dir="rtl", Cairo font). ✅
- **Aesthetics**: Premium feel with HSL color system, dark mode auto-detection, lunar/solar switches, glassmorphism header, smooth transitions. ✅
- **Accessibility**: Keyboard navigation optimized (Tab flow) for data entry efficiency. ✅
- **Resilience**: `localStorage` drafts on Calculator, CustomerForm, and Settlements. ✅
- **Navigation (Portals Architecture)**:
  - **Office Portal (`/office`)**: 
    - **Manager**: Full access + Reports + Office Settings.
    - **Accountant**: Settlements, Calculator, Customers, Documents, Waiting Queue, Reports (excluding Settings).
    - **Staff**: Gamified "My Submissions" Dashboard, Calculator (no purchase_cost), Customers, Documents, Waiting Queue (no delete, no settlements).
  - **Monitor Portal (`/monitor`)**: For Operations Monitor (Manual Linking & Waiting Queue Oversight).
  - **Admin Portal (`/admin`)**: For Master Admin (Offices, Users, Workplaces, Join Codes, SaaS Suite).
  - **Join Page (`/join`)**: Self-registration using a join code with dark/light solar toggle.
  - Landing Page (`/`): Entry point with join/login buttons.

## 5. Security & Privacy
- **Data Masking**: Monitor Dashboard hides salaries, car prices, and debts by default. ✅
- **RLS Policies**: Enabled on all tables. ✅
- **Edge Functions**: Admin operations use service_role key server-side (never exposed to frontend). ✅
- **Environment Variables**: Supabase credentials stored in `.env` (not in source code). ✅
- **Account Protection**: Anti-brute force account freezing implemented to block accounts on successive failures. ✅

## 6. Database Schema (Current)
| Table | Purpose | RLS | Status |
|-------|---------|-----|--------|
| `workplaces` | Workplace registry + `required_guarantors` | ✅ | ✅ |
| `offices` | Office management: `max_users`, `join_code`, `join_code_active`, `is_active` | ✅ | ✅ |
| `user_profiles` | User-to-office mapping: `role`, `display_name`, `is_active`, `is_frozen` | ✅ | ✅ |
| `customers` | National ID (unique), salary, workplace_id | ✅ | ✅ |
| `transactions` | Lifecycle + `office_loan`, `car_model`, `is_files_complete`, `purchase_cost` | ✅ | ✅ |
| `transaction_guarantors` | Match linking (Auto/Manual/Override) | ✅ | ✅ |
| `settlements` | 3 settlement types + deadline tracking, `check_image_url` | ✅ | ✅ |
| `banks` | Bank registry (name) | ✅ | ✅ |
| `branches` | Branch registry (name, region, bank_id) | ✅ | ✅ |
| `admin_activity_logs` | Executive staff activity tracking and security audit logs | ✅ | ✅ |

## 7. Edge Functions
| Function | Purpose | Auth |
|----------|---------|------|
| `join-with-code` | Self-registration: validates join code, creates user, links to office | Public (no JWT) |
| `admin-manage-users` | Create offices, manage users, promote/demote, reset passwords | Admin JWT required |

## 8. Current Progress
- **Phases 1-7**: Complete ✅ (Foundation, Financial Engine, Matchmaking, Settlements, Reporting, Join Code System).
- **Phase 9 (Unified Registration)**: Complete ✅ — Consolidated forms, dynamic guarantors, and enhanced customer management (Edit/Delete/Docs). Fully redesigned the **Customer List component (`CustomerList.tsx`)** with a luxury glassmorphic card layout, fine gold interactive borders, custom styled metadata chips (ID, phone, workplace), glowing gradient buttons, and seamless light/dark mode compliance.
- **Phase 10 (Banking Infrastructure)**: Complete ✅ — Hierarchical bank/branch registry, dynamic registration selection, and Admin management interface.
- **Phase 12 (Premium Design System & Global Styling)**: Complete ✅ — Added stateful theme switcher (Crescent/Sun toggles next to Logo, pure black and white background settings), centered watermark perfectly.
- **Phase 13 (SaaS Admin Suite & Security Hub)**: Complete ✅ — Fully built white-label branding configurations, dynamic packages builder, Gateway integrations (SMS/Payments), JSON schema automated database backup exporter, independent partner registration codes, advanced Users hub controls (delete, reset password, freeze accounts), **"طاقم الإدارة العليا" (Executive Staff / System Owners) tab** with visual Crown indicators, **Security Audit Logs** auto-recording system actions, **Welcome Profile Block** on left, **Theme Switcher** next to it, and **Light Gold Borders** (`#d4af37`) enforced globally.
- **Phase 14 (Premium Remuneration & Reusable Padlock Systems)**: Complete ✅ — Fully built the advanced Murabaha compensation and profit-sharing model (Wagers: Salary only, Salary+Commission, Commission only; 30-day absent docking; standardized agency fees; and showroom resale margins). Refactored lock overlays and premium gold glass banners into a highly reusable, glowing React component `./PremiumLock.tsx` (blurs backgrounds and centers golden padlocks), governed by the office SaaS `planType` ('BASIC' | 'PREMIUM' | 'UNLIMITED') to drive package upgrades. Gated Reports dashboard (Audit and Ledger tabs, purchase costs, and net profit cards) to entice BASIC users to upgrade to PREMIUM or UNLIMITED.
- **Phase 15 (Arabic Legal Terms & Compliance)**: Complete ✅ — Integrated a robust Legal Agreement (8 clauses) protecting developers and operators under Libyan Cybercrime Law No. 5/2022, CBL mandates (Law No. 1/2013), force majeure liability, and approximate calculator disclaimers. Developed a gorgeous theme-adaptive Glassmorphic RTL signup gate modal.
- **Phase 17 (Security Hardening and Threat Telemetry)**: Complete ✅ — Deployed advanced database security controls, applied schema migration (`supabase/migrations/07_security_hardening.sql`), built dynamic `transactions` view with `security_barrier` to hide actual car purchase cost (`purchase_cost`) from restricted roles (`staff`, `monitor`) while retaining it for `admin` and `accountant`, created trigger `prevent_financial_tampering` to enforce max bank ceiling (120,000 LYD) and prevent calculator manipulation (modified to bypass checks for PENDING transactions to allow immediate document uploads on new/draft customer transactions), implemented a luxury `SecurityErrorBoundary` React component that filters technical stacks and automatically logs system errors into `system_runtime_errors`, logged authentication failures to table `auth_failures` for brute-force monitoring, and built a stunning, dedicated "الأمن والتحصين السيبراني" (Security & Cyber Hardening) tab inside the Master Admin Dashboard for real-time telemetry, crash trace debugging, and active threat auditing.
- **Phase 19 (Unified Workflow Integration & Core Module Interlinking)**: Complete ✅ — Removed Data Entry Staff lockout, enabled "Save Calculation & Link to DB" directly from Calculator.tsx to replace loose browser local drafts, adapted DocumentUploader.tsx to read existing transactions, fixed the silent matchmaking UI bug in WaitingQueue.tsx, integrated SMS/WhatsApp matchmaking alerts via notificationService.sendMatchAlert, and fully repaired the Settlements.tsx post-delivery database mismatch by mapping correct columns and adding active transactions dropdown.
- **Phase 20 (Document Verification Workflow & Transaction State Machine)**: Complete ✅ — Propagated `activeTransactionId` through OfficeLayout from Calculator to DocumentUploader. Implemented a premium, color-coded, animated status badge system (PENDING, WAITING_MATCH with pulse, REJECTED, MATCHED, ACTIVE, and COMPLETED) on customer cards in `CustomerList.tsx`. Added a comprehensive document verification/rejection workflow in `WaitingQueue.tsx` with a luxurious glassmorphic rejection modal, a custom database migration for `rejection_reason` addressing security views (`transactions` view/trigger), disabled matching logic, and status badges. Tested and compiled with zero TypeScript errors.
- **Phase 18 & Phase 11 (Production Deployment & External Gateways Setup)**: Complete ✅ — Prepared complete final production deployment guidelines (`docs/DEPLOYMENT.md`) covering database migration, hosting setups on Vercel, Local Libyan payment gateways configuration (SADAD, Tadawul, Edfa3ly), and SMS providers (Twilio & BulkSMS API) credentials integration, ensuring 100% readiness for production launch.


