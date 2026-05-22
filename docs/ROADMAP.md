# Kafeel (كفيل) - Project Roadmap

## Phase 1: Foundation & Setup (Weeks 1-2)
- [x] Analyze PRD and finalize project requirements.
- [x] Initialize Git repository.
- [x] Initialize frontend framework (Vite + React + TS) and configure RTL.
- [x] Setup Supabase project and define core database schema (`workplaces`, `offices`, `customers`, `transactions`, `transaction_guarantors`, `settlements`).
- [x] Configure Supabase Authentication and establish Row Level Security (RLS) policies for multi-tenancy.
- [x] Implement foundational CSS Design System (colors, typography, dark mode, glassmorphism utilities).

## Phase 2: Core Workflows & Financial Engine (Weeks 3-4)
- [x] Build the **Reactive Financial Calculator**:
  - Implement dynamic logic for 16%/24% margins.
  - Design an intuitive, keyboard-accessible UI.
  - Implement `localStorage` drafting.
- [x] Develop Customer Management Module:
  - Forms for adding beneficiaries and guarantors.
  - Integration with Document Management (Client-side image compression + Supabase Storage upload).

## Phase 3: The Matchmaking Engine (Weeks 5-6)
- [x] Implement the core matching algorithm (National ID, Workplace, Salary Diff <= 50 LYD).
- [x] Build the Waiting Queue and background job/trigger logic.
- [x] Create the **Monitor Dashboard** for the Operations Monitor:
  - Drag & Drop interface for manual overrides.
  - Data masking to hide sensitive financial info.
- [x] Implement Real-time notifications for successful matches.

## Phase 4: Settlements & Administration (Week 7)
- [x] Build the Post-Delivery Settlements module (Personal Use, Cash-out, External Sale).
- [x] Implement the 3-day external sale timer and dashboard alerts.
- [x] Build the Super Admin Dashboard for tenant management (subscriptions, quotas).

## Critical Fixes (Post Phase 4)
- [x] Enable RLS on `settlements` table + add access policy.
- [x] Move Supabase credentials to `.env` (remove hardcoded keys).
- [x] Drop duplicate `post_delivery_settlements` table.
- [x] Add missing DB columns: `office_loan`, `car_model`, `is_files_complete` in `transactions`.
- [x] Add `required_guarantors` to `workplaces` table.
- [x] Add `.env` to `.gitignore`.

## Phase 5: Polish & Testing (Week 8)
- [x] UI/UX Polish:
  - Micro-animations (fadeInUp, slideInRight, staggered entrances, glowPulse).
  - Verified RTL layouts across all 8 tabs.
  - Premium hover effects (lift, shadow, glow) on cards, buttons, containers.
  - Cubic-bezier tab transitions.
- [x] Architectural Refactor (Portals Separation):
  - Transitioned from state-based tabs to `react-router-dom`.
  - Created 3 independent portals: Office Portal (`/office`), Monitor Portal (`/monitor`), Admin Portal (`/admin`).
  - Added a Landing Page (`/`) for role selection.
- [x] Comprehensive Testing:
  - Extracted financial engine to `src/lib/financialEngine.ts`.
  - 23 unit tests covering all 5 equations, margin rates, notary pledge, and edge cases.
  - Vitest framework + `npm test` / `npm test:watch` scripts.
  - TypeScript: 0 errors.

## Phase 6: Core Features Completion (Audio Analysis Requirements)
- [x] Update Database Schema: Add `purchase_cost` to `transactions` table. Add `check_image_url` to `settlements` table.
- [x] Update Calculator & CustomerForm: Add `purchase_cost` as an optional input to calculate net profit.
- [x] Implement Settlement Finalization: Enforce uploading a photo of the check/guarantee (`check_image_url`) before closing a transaction.
- [x] Develop Financial Reporting Module: Build `ReportsDashboard.tsx` in the Office portal showing monthly profit reports.

## Phase 7: Join Code System & User Management
- [x] Database Migration: Remove billing columns (`subscription_plan`, `monthly_quota`, `used_quota`, `subscription_expires_at`).
- [x] Database Migration: Add `max_users`, `join_code`, `join_code_active` to `offices`.
- [x] Database Migration: Create `user_profiles` table with RLS policies.
- [x] Edge Function: `join-with-code` — public self-registration with code validation and max_users enforcement.
- [x] Edge Function: `admin-manage-users` — create offices, manage users, promote/demote roles, reset passwords, deactivate.
- [x] New Role: Added `accountant` (محاسب) to the role system.
- [x] AuthContext: Updated to read from `user_profiles` table with `app_metadata` fallback.
- [x] JoinPage (`/join`): Self-registration page with prominent join code input.
- [x] AdminDashboard: Complete overhaul with 4 tabs (Offices, Users, Workplaces, Join Codes).
- [x] LandingPage: Added "Join with Code" and "Login" buttons.
- [x] Documentation: Updated `Plan.md` and `roadmap.md`.

## Phase 9: Unified Registration & Customer Management ✅
- [x] Consolidate Beneficiary & Guarantor forms into a single unified workflow.
- [x] Implement dynamic conditional rendering for 1 or 2 guarantors based on workplace type.
- [x] Implement programmatic "Active Linking" between registered entities and the Financial Calculator.
- [x] Enhance `CustomerList.tsx` with Edit, Delete, and Document Management actions.
- [x] Link `DocumentUploader.tsx` contextually to specific customers.
- [x] Update `CustomerForm.tsx` to support "Edit Mode" with ID-based persistence.

## Phase 10: Banking Infrastructure & Regional Management ✅
- [x] Create `banks` and `branches` database tables with hierarchical relationships.
- [x] Seed initial data for Jumhouria Bank and its regional branches.
- [x] Implement "المصارف والفروع" (Banks & Branches) management tab in the Admin Dashboard.
- [x] Integrate dynamic bank/branch selection in `CustomerForm.tsx` with automatic filtering.
- [x] Add car price presets for Toyota models based on official bank rates.

## Phase 11: Production Deployment & External Integrations ✅
- [x] External Notifications: Integrate SMS/WhatsApp API to notify customers and guarantors when a match is found.
- [x] Production Deployment (Vercel + Supabase).
- [x] MVP Launch & Onboarding of initial offices.

## Phase 12: Premium Design System & Global Styling ✅
- [x] Stateful Dark/Light Mode on the Landing Page.
- [x] Crescent (Moon) and Sun icons next to the logo for smooth theme switching.
- [x] Fixed Hero text clipping and background gradient glitches.
- [x] Redesigned all primary actions/important buttons globally with the premium blue-grey-gold gradient.
- [x] Watermark logo centered perfectly (`top: 50%`) with customized clear translucency (`0.4` in light mode, `0.6` in dark mode) for perfect branding.

## Phase 14: Role Optimization, Premium Remuneration & Reusable Padlocks ✅
- [x] Strict Role Separation (`manager`, `accountant`, `staff`) with exclusive dashboard portals and layouts.
- [x] Implement `purchase_cost` and Net Profit masking for `staff` (limited to manager/accountant only).
- [x] RLS Policy Updates: Restrict customer deletion actions to `manager` only.
- [x] Office Settings Tab: Exclusive to `manager` for configuring default bank and managing staff join limit.
- [x] Gamified Staff Dashboard: "إنجازاتي" (My Achievements) view with Quick Actions, Status Tracking, and dynamic submission quotas.
- [x] Advanced Murabaha Remuneration Model:
  - Wagers engine (Salary only, Salary+Commission, Commission only).
  - 30-day absent salary docking system.
  - Standardized administrative agency fees and showroom resale margins.
- [x] Reusable Golden Padlock System (`PremiumLock.tsx`):
  - Local content blur overlay `PremiumLockOverlay` for hiding cost cards and net profits.
  - Golden dashed banner overlay `PremiumLockBanner` with package badge details.
  - Complete gating of the Reports dashboard (Audit tab, Ledger tab, actual purchase cost cards, and net profit cards) to encourage upgrade to PREMIUM or UNLIMITED plans.

## Phase 15: Arabic Legal Terms Agreement & Compliance (شروط الاستخدام والامتثال القانوني) ✅
- [x] Draft 8 robust legal clauses aligning with Libyan Cybercrime Law No. 5 of 2022, Central Bank of Libya interest-free Murabaha directives (Law No. 1 of 2013), force majeure liabilities, and approximate calculation disclaimers.
- [x] Integrate interactive signup gate checkbox forcing user verification before submitting registration.
- [x] Design beautiful theme-adaptive Glassmorphic modal displaying legal clauses dynamically for Light and Dark modes.

## Phase 17: Security Hardening & Threat Telemetry (الأمن والتحصين السيبراني) ✅
- [x] Apply comprehensive security migration (`supabase/migrations/07_security_hardening.sql`) defining custom tracking tables (`system_runtime_errors`, `auth_failures`).
- [x] Protect actual car purchase cost (`purchase_cost`) using a custom PostgreSQL `VIEW` with `security_barrier` that masks values for restricted roles (`staff`, `monitor`) while allowing access for `manager` and `accountant`.
- [x] Implement robust database triggers to prevent financial calculation tampering and enforce the maximum bank ceiling (120,000 LYD) (modified to bypass validation for draft `PENDING` transactions to support instant document uploads).
- [x] Develop a luxury `SecurityErrorBoundary` React component that filters stack traces from leaking to standard users and automatically records runtime crashes to the telemetry logs.
- [x] Construct a stunning "الأمن والتحصين" (Security & Hardening) tab inside the Master Admin Dashboard for real-time threat auditing, brute-force logs, and safe error trace analysis.

## Phase 18: Production Deployment & External Integrations ✅
- [x] External Notifications: Integrate SMS/WhatsApp API to notify customers and guarantors when a match is found.
- [x] Production Deployment (Vercel + Supabase).
- [x] MVP Launch & Onboarding of initial offices.

## Phase 19: Unified Workflow Integration & Core Module Interlinking (ترابط وتكامل تدفق العمليات) ✅
- [x] Remove Data Entry Staff lockout tab redirect in `OfficeLayout.tsx`.
- [x] Implement "Save Calculation & Link to DB" in `Calculator.tsx` to replace `localStorage` drafts with Supabase transaction records.
- [x] Adapt `DocumentUploader.tsx` to read the pre-existing transaction created during the Calculator step.
- [x] Fix the silent matchmaking bug in `WaitingQueue.tsx` by inspecting the correct RPC response status.
- [x] Import and trigger `notificationService.sendMatchAlert` inside the matchmaking flow for active WhatsApp/SMS alerts.
- [x] Fully repair `Settlements.tsx` post-delivery settlement submissions:
  - [x] Integrate active transactions dropdown list selector.
  - [x] Fix Supabase schema mismatches (map correct database fields).
  - [x] Solve foreign key violation by inserting `transaction_id`.
  - [x] Fix countdown timer queries in `loadData` to prevent empty reports or crashes.

## Phase 20: Document Verification & Transaction State Machine (التحقق من المستندات وآلة حالة المعاملات)
- [x] Implement Manager/Accountant document verification workflow with `verification_status` field.
- [x] Build transaction state machine: PENDING → VERIFIED → MATCHED → ACTIVE → COMPLETED.
- [x] Add verification dashboard for Manager to approve/reject documents.
- [x] Implement `activeTransactionId` state propagation across Calculator → DocumentUploader flow.
- [x] Add real-time status indicators on customer cards showing transaction progress.
- [x] Production deployment preparation and testing.

## Phase 21: Configurable Link Limits (قيمة الربط) for Office Managers ✅
- [x] Database Migration: Add `salary_match_limit` (0-50 LYD) column to `offices` table.
- [x] Database Function: Recreate `find_potential_guarantors` to dynamically read and enforce the office's salary match limit.
- [x] Settings Panel: Implement a settings configuration card for managers to adjust the salary match limit (قيمة الربط) between 0 and 50 Dinars using a premium HSL slider control.

## Phase 22: Premium Visual Upgrades, Logistics Hub & Form Layouts ("Shams" Session) ✅
- [x] **Topmost Gold Header**: Removed double margins, created a sleek sticky topmost gold header with a compact logo (52px height).
- [x] **Arabic Premium Typography**: Integrated Alexandria geometric font for headings and Tajawal for high-readability body copy.
- [x] **High-Contrast Inputs**: Overhauled standard text inputs to use a crisp white background, black text, and 1.5px gold borders to guarantee perfect readability.
- [x] **Hover Dropdowns Navigation (Admin)**: Consolidated 10 separate sections into 4 logical hovering dropdown capsules (Subscriptions, Financials, Connections, Configuration) with zero-click CSS transitions.
- [x] **Announcements Side-by-Side (Login)**: Restructured login page into 3 glassmorphic columns: Right (Admin alerts), Center (Login credentials), and Left (Dealer notifications) with an RLS bypass for public/guest reading.
- [x] **Interactive Office Marquee**: Designed a sleek, sliding marquee banner directly below the golden header inside portal layouts for active notifications.
- [x] **Integrated Logistics Delivery Pipeline**: Added interactive vehicle delivery staging (`قيد التجهيز الفني`, `جاهزة بالمعرض للزبون`, `جاري الشحن والتوصيل`, `تم التسليم النهائي للزبون`) within `MonitorDashboard.tsx`.
- [x] **Incoming Fleets Pre-Booking Board**: Enabled tracking of ocean freight cargo shipments and estimated delivery dates to allow early customer reservations.
- [x] **Auto-Calculated Model Heatmap**: Real-time queue-counter scanning customer requests to plot a visual car model demand heatmap.
- [x] **Matchmaking Delay Alerts**: Programmed "Aging Urgency Alerts" that highlight transaction cards delayed in queue > 48 hours in pulsing warning red with an warning icon.
- [x] **Appraisal Technical Cards**: Added input sheets for vehicle health, mileage parameters, engine diagnostics, and inspection notes.
- [x] **Context-Aware Document Selector**: Integrated real-time customer search switcher inside `DocumentUploader` to view, compress, and upload files without tab-switching.
- [x] **Guarantor Form Layout Restructuring**: Reorganized the guarantor inputs within `CustomerFields` to match the beneficiary two-column panel layout (primary required data on the right, secondary metadata on the left) with full validation error indicators.

## Phase 23: Potential Customers Hub & Financial Requests System ✅
- [x] **Database Migration (Potential Customers)**: Created table `potential_customers` and `potential_customer_logs` with row-level security (RLS) policies.
- [x] **Database Migration (Financial Requests)**: Created table `financial_requests` supporting types (`LOAN`, `FINANCIAL_VALUE`, `BILLS`) and statuses (`PENDING`, `APPROVED`, `REJECTED`).
- [x] **Interactive Potential Customers Component**: Built `PotentialCustomers.tsx` supporting complete CRUD and custom follow-up notes for prospective buyers.
- [x] **Convert-to-Active Customer Wizard**: Programmed a seamless "Convert to Active Customer" wizard that passes draft info directly into the active registration forms.
- [x] **Interactive Financial Request Component**: Built `FinancialRequest.tsx` enabling data entry staff to request cash advances or submit guarantees/bills contextually linked to active transactions.
- [x] **Simulated Offline Fallbacks**: Designed automated `localStorage` fallbacks for both components, displaying an operational reminder box and live SQL schema code generators to assist deployment.
- [x] **Manager Approval Workflow**: Implemented real-time request review tables with instant accept/reject buttons for managers.
- [x] **Unified Workflow Redirections**: Configured active transitions: successful Calculator save redirects users directly to Financial Requests, which then guides them to the Document Uploader.

## Phase 24: Realistic Murabaha Calculations & Multi-Factor Down Payments ✅
- [x] **Mathematical Core Redesign**: Re-engineered `src/lib/financialEngine.ts` to scale down actual monthly installments for lower-priced cars rather than hardcoding them to full net salary capacity.
- [x] **Multi-Factor Down Payment Engine**: Redesigned calculator to compute down payments dynamically based on two distinct factors: vehicle value exceeding bank ceiling ($V_{murabaha} - B_{cap}$) and salary capacity gap ($I_{ideal} - I_{capacity}$).
- [x] **Real-Time Financial Dashboard**: Updated `Calculator.tsx` to display separate cards detailing the excess value and salary gap breakdown, culminating in a beautiful premium gold/red aggregated down payment card.
- [x] **Robust Vitest Integration**: Rewrote `test/financialEngine.test.ts` to assert against realistic bank behaviors, including edge cases like zero down payment for cheap vehicles and perfect profit calculations.
- [x] **Calculator Documentation Update**: Updated `docs/CALCULATOR.md` to reflect the formal mathematical formulas and Libyan banking rules implemented in the project.

