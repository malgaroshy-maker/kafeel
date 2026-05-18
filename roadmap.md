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

## Phase 11: Production Deployment & External Integrations
- [ ] External Notifications: Integrate SMS/WhatsApp API to notify customers and guarantors when a match is found.
- [ ] Production Deployment (Vercel + Supabase).
- [ ] MVP Launch & Onboarding of initial offices.

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

## Phase 15: Production Deployment & External Integrations
- [ ] External Notifications: Integrate SMS/WhatsApp API to notify customers and guarantors when a match is found.
- [ ] Production Deployment (Vercel + Supabase).
- [ ] MVP Launch & Onboarding of initial offices.

