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
- [x] Comprehensive Testing:
  - Extracted financial engine to `src/lib/financialEngine.ts`.
  - 23 unit tests covering all 5 equations, margin rates, notary pledge, and edge cases.
  - Vitest framework + `npm test` / `npm test:watch` scripts.
  - TypeScript: 0 errors.

## Phase 6: Production Deployment & Launch
- [ ] Production Deployment (Vercel + Supabase).
- [ ] MVP Launch & Onboarding of initial offices.

