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
- **Roles**: Master Admin (`admin`), Operations Monitor (`monitor`), Office Manager (`manager`), Accountant (`accountant`), Data Entry (`staff`).
- **Onboarding Flow**:
  1. Master Admin creates an office → system generates a unique 6-char alphanumeric join code.
  2. Admin shares the join code with the office.
  3. New users self-register at `/join` with email + password + join code.
  4. Users land as `staff` by default → Admin can promote to `manager` or `accountant`.
- **User Limits**: Each office has a `max_users` limit (default: 4 — 1 manager, 1 accountant, 2 data entry).
- **Admin Powers**: Create offices, create/revoke join codes, promote/demote roles, reset passwords, deactivate users.
- **Implementation**: Supabase Auth + `user_profiles` table + Edge Functions for secure admin operations.

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

- **5 Tabs**:
  - **المكاتب (Offices)**: Create offices, set max users, toggle active/inactive.
  - **المستخدمين (Users)**: List all users, promote/demote roles, reset passwords, deactivate accounts.
  - **جهات العمل (Workplaces)**: Add/view workplaces with chip-based UI.
  - **المصارف والفروع (Banks & Branches)**: Manage hierarchical bank and branch registry with regional tagging.
  - **أكواد الانضمام (Join Codes)**: Card view of all codes with copy-to-clipboard, active/revoked status.
- **Stats**: 5 KPI cards (active offices, active users, active codes, workplaces, banks).

### G. Financial Reporting & Analytics ✅
- **Logic**: Calculate net office profit based on `(Car Sale Price - Car Purchase Cost) + Processing Commissions`.
- **UI**: Office Manager dashboard to view monthly profit reports and customer acquisition metrics.
- **Privacy**: Hidden from standard Staff and Operations Monitor roles.

### H. External Notifications (Phase 7)
- **Logic**: Send automated alerts to customers and guarantors when a match is found.
- **Integration**: General SMS/WhatsApp API (Provider to be determined).

## 4. UI/UX Design Approach
- **RTL Support**: Built inherently for Arabic (dir="rtl", Cairo font). ✅
- **Aesthetics**: Premium feel with HSL color system, dark mode auto-detection, glassmorphism header, smooth transitions. ✅
- **Accessibility**: Keyboard navigation optimized (Tab flow) for data entry efficiency. ✅
- **Resilience**: `localStorage` drafts on Calculator, CustomerForm, and Settlements. ✅
- **Navigation (Portals Architecture)**:
  - **Office Portal (`/office`)**: For Manager, Accountant, and Staff (Calculator, Beneficiaries, Guarantors, Documents, Waiting Queue, Settlements, **Reports**).
  - **Monitor Portal (`/monitor`)**: For Operations Monitor (Manual Linking & Waiting Queue Oversight).
  - **Admin Portal (`/admin`)**: For Master Admin (Offices, Users, Workplaces, Join Codes).
  - **Join Page (`/join`)**: Self-registration using a join code.
  - Landing Page (`/`): Entry point with join/login buttons.

## 5. Security & Privacy
- **Data Masking**: Monitor Dashboard hides salaries, car prices, and debts by default. ✅
- **RLS Policies**: Enabled on all tables. ✅
- **Edge Functions**: Admin operations use service_role key server-side (never exposed to frontend). ✅
- **Environment Variables**: Supabase credentials stored in `.env` (not in source code). ✅

## 6. Database Schema (Current)
| Table | Purpose | RLS | Status |
|-------|---------|-----|--------|
| `workplaces` | Workplace registry + `required_guarantors` | ✅ | ✅ |
| `offices` | Office management: `max_users`, `join_code`, `join_code_active`, `is_active` | ✅ | ✅ |
| `user_profiles` | User-to-office mapping: `role`, `display_name`, `is_active` | ✅ | ✅ |
| `customers` | National ID (unique), salary, workplace_id | ✅ | ✅ |
| `transactions` | Lifecycle + `office_loan`, `car_model`, `is_files_complete`, `purchase_cost` | ✅ | ✅ |
| `transaction_guarantors` | Match linking (Auto/Manual/Override) | ✅ | ✅ |
| `settlements` | 3 settlement types + deadline tracking, `check_image_url` | ✅ | ✅ |
| `banks` | Bank registry (name) | ✅ | ✅ |
| `branches` | Branch registry (name, region, bank_id) | ✅ | ✅ |

## 7. Edge Functions
| Function | Purpose | Auth |
|----------|---------|------|
| `join-with-code` | Self-registration: validates join code, creates user, links to office | Public (no JWT) |
| `admin-manage-users` | Create offices, manage users, promote/demote, reset passwords | Admin JWT required |

## 8. Current Progress
- **Phases 1-7**: Complete ✅ (Foundation, Financial Engine, Matchmaking, Settlements, Reporting, Join Code System).
- **Phase 9 (Unified Registration)**: Complete ✅ — Consolidated forms, dynamic guarantors, and enhanced customer management (Edit/Delete/Docs).
- **Phase 10 (Banking Infrastructure)**: Complete ✅ — Hierarchical bank/branch registry, dynamic registration selection, and Admin management interface.
- **Next**: Production Deployment + External Integrations (SMS/WhatsApp).
