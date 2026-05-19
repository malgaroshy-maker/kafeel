# 🔀 Revised Merge Plan (v2)

## Situation Summary

| | Commit | Branch | Description |
|---|---|---|---|
| **Base** | `b861a20` | - | v1.3.1 — last shared starting point |
| **Your changes** | `461b7ac` | `my-local-backup` | Broadcasts, dual-login banners, marquee, subscription dates |
| **Friend's changes** | `dd4e5aa` | `shams` (current HEAD) | v1.2.0 → v1.3.1 + Accountant, PremiumLock, StaffStats, massive rewrites |

> [!IMPORTANT]
> **Priority: Friend's changes take full precedence.** Only adding missing broadcast features on top.

---

## What to Do (Revised)

### ✅ Phase 1: Copy New Files (Safe — no conflict)

These files don't exist on `shams` at all. They need to be copied from backup branch:

| File | Action | Why |
|---|---|---|
| `src/components/BroadcastManager.tsx` | **COPY from backup** | Full broadcast CRUD — doesn't exist on shams |
| `supabase/migrations/05_broadcasts_enhancements.sql` | **COPY from backup** | `created_by_role`, `target_role` columns — doesn't exist on shams |

> ~~`src/components/design.md`~~ — **SKIP** (friend already has `Design.md` in root)

---

### ✅ Phase 2: Add Broadcast Columns to Login Screen

**File:** `src/pages/Login.tsx` (162 lines, friend's version)

**What friend already has:**
- Theme toggle (Sun/Moon button)
- `global-watermark` div
- `accountant` case in role redirect
- Theme persistence in localStorage

**What to add (from your backup):**
1. Add `broadcasts` state + `useEffect` to fetch active broadcasts
2. Add `ShieldCheck`, `Store` icons to imports
3. Restructure layout to 3-column side-by-side:
   - **Right column:** Admin broadcasts (red/glowing border)
   - **Center:** Login card (friend's existing card, untouched)
   - **Left column:** Dealer/monitor broadcasts (gold border)
4. Wrap `.glass-container` in a new `.login-wrapper` flex div

**What stays exactly as friend wrote it:**
- Theme toggle logic & button
- Form fields, validation, error handling
- `accountant` role redirect
- `global-watermark`

---

### ✅ Phase 3: Add Broadcast Banner to OfficeLayout

**File:** `src/layouts/OfficeLayout.tsx` (247 lines, friend's version)

**What friend already has:**
- `global-watermark` div
- Golden gradient header with accountant theme toggle
- StaffStats tab + import
- Tab reordering for accountant role

**What to add (from your backup):**
1. Add `Megaphone` icon to imports
2. Add `broadcasts` state + `useEffect` to fetch broadcasts (filtered by `target_role IN ['all', 'office']`)
3. Add `isBannerClosed` state
4. Add broadcast marquee banner **between header and tab nav** (not inside header, not inside content)

**What stays exactly as friend wrote it:**
- Header design, brand text, office badge
- Theme toggle (accountant-only)
- Tab system with StaffStats
- All content rendering

---

### ❌ SKIP — Not Doing

| Item | Reason |
|---|---|
| `design.md` | Friend already has `Design.md` |
| `AdminDashboard.tsx` | Subscription dates + broadcasts tabs already exist in friend's version |
| `style.css` | Keeping friend's styling entirely |
| `AdminLayout.tsx` | Skipping for now (per user request) |
| `StaffDashboard.tsx` | Friend rewrote entirely — no changes needed |
| `Settlements.tsx` | Friend already fixed |
| `WaitingQueue.tsx` | Friend already fixed |
| `LandingPage.tsx` | No changes needed |

---

## 📋 Execution Steps

```
Step 1: git checkout my-local-backup -- src/components/BroadcastManager.tsx
Step 2: git checkout my-local-backup -- supabase/migrations/05_broadcasts_enhancements.sql
Step 3: Manually edit Login.tsx — add broadcasts fetch + 3-column layout
Step 4: Manually edit OfficeLayout.tsx — add broadcasts marquee banner
Step 5: npm run build — verify no TypeScript errors
Step 6: npm run dev — visual test with all 3 login accounts
```

### Estimated Changes
- **2 files copied** (BroadcastManager + SQL migration)
- **2 files edited** (Login.tsx + OfficeLayout.tsx)
- **0 files deleted**
- **0 style changes**
