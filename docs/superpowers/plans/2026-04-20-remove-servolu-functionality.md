# Remove Servolu Functionality — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the entire Servolu platform tier (super-admin shell, marketplace, `super_admin` role, `platform` company type, Servolu seed data) from the codebase, leaving a single top-level admin platform where IThealth is the root admin company.

**Architecture:** Top-down removal. (1) Delete UI that references the platform tier so TypeScript compiles against narrower types. (2) Delete or edit migration files in place (rewrite-in-place strategy, M2) and the seed file. (3) Verify with `supabase db reset`, grep passes, and manual login tests.

**Tech Stack:** Next.js (App Router), TypeScript, Supabase (Postgres + GoTrue), pnpm/npm.

**Spec:** `docs/superpowers/specs/2026-04-20-remove-servolu-functionality-design.md`

---

## Context for the Implementer

**What Servolu was:** A platform tier above admin. The company hierarchy was `platform (Servolu) → admin (IThealth, …) → customer/partner`. Servolu staff had a `super_admin` role and used a dedicated shell at `/platform/…` to manage admin companies and curate a public marketplace. None of this is wanted any more.

**End state:** `admin → customer/partner`. IThealth's `parent_company_id` is `NULL`. No `super_admin` role. No `platform` company type. No marketplace. Per-company branding, website CMS, company hierarchy columns (`parent_company_id`, `domain`, `slug`, `tagline`, etc.), and the `(public)` IThealth marketing site all stay intact.

**Strategy:** Migrations are rewritten in place — delete the Servolu migration files directly and update `seed.sql`. Everyone runs `npx supabase db reset` to pick up the clean history. No forward "drop" migrations needed.

**Key insight on RLS:** The migration `20260408300006_rls_policies_v2.sql` drops the original admin-only policies (e.g. "Admins can do everything with phases") and replaces them with `super_admin + admin` pairs. If we simply delete the v2 file, the original admin policies from each feature's own RLS migration take effect again. That's exactly what we want. No replacement RLS file is needed unless verification reveals a table whose only RLS source was v2.

---

## File Structure After Removal

**Deleted:**
- `src/app/(super-admin)/` (entire directory)
- `src/app/(marketplace)/` (entire directory)
- `src/components/super-admin-guard.tsx`, `src/components/super-admin-sidebar.tsx`, `src/components/marketplace/`
- 10 migration files (listed in Task 9 and Task 10)
- `supabase/setup-super-admin.sh`

**Edited:**
- `src/lib/types.ts`, `src/lib/auth-utils.ts`, `src/app/(auth)/login/page.tsx`, `CLAUDE.md`
- `supabase/migrations/20260408300003_add_company_hierarchy.sql`
- `supabase/seed.sql`

**Archived:**
- `docs/superpowers/specs/2026-04-08-multi-tenant-platform-design.md` → `docs/superpowers/specs/archived/`
- `docs/superpowers/plans/2026-04-08-multi-tenant-platform.md` → `docs/superpowers/plans/archived/`

---

## Task 1: Archive the historical multi-tenant docs

**Files:**
- Move: `docs/superpowers/specs/2026-04-08-multi-tenant-platform-design.md` → `docs/superpowers/specs/archived/2026-04-08-multi-tenant-platform-design.md`
- Move: `docs/superpowers/plans/2026-04-08-multi-tenant-platform.md` → `docs/superpowers/plans/archived/2026-04-08-multi-tenant-platform.md`

- [ ] **Step 1: Create archive directories**

```bash
mkdir -p docs/superpowers/specs/archived docs/superpowers/plans/archived
```

- [ ] **Step 2: Move the two historical docs**

```bash
git mv docs/superpowers/specs/2026-04-08-multi-tenant-platform-design.md docs/superpowers/specs/archived/2026-04-08-multi-tenant-platform-design.md
git mv docs/superpowers/plans/2026-04-08-multi-tenant-platform.md docs/superpowers/plans/archived/2026-04-08-multi-tenant-platform.md
```

- [ ] **Step 3: Verify**

```bash
ls docs/superpowers/specs/archived/ docs/superpowers/plans/archived/
```

Expected: both files listed in the archived directories.

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "chore: archive multi-tenant platform docs superseded by Servolu removal"
```

---

## Task 2: Delete the public marketplace route group and components

**Files:**
- Delete: `src/app/(marketplace)/` (entire directory — home, providers, services, about, contact, plus any layout/components)
- Delete: `src/components/marketplace/` (entire directory — `marketplace-header.tsx`, `marketplace-footer.tsx`)

- [ ] **Step 1: Confirm what's in the directories before deleting**

```bash
ls -la src/app/\(marketplace\)/
ls -la src/components/marketplace/
```

- [ ] **Step 2: Delete the directories**

```bash
rm -rf "src/app/(marketplace)" src/components/marketplace
```

- [ ] **Step 3: Confirm nothing else imports from these paths**

Use the Grep tool with pattern `(marketplace)|components/marketplace|marketplace-header|marketplace-footer` across `src/`. Expect zero matches.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove public marketplace routes and components"
```

---

## Task 3: Delete the super-admin shell

**Files:**
- Delete: `src/app/(super-admin)/` (entire directory — layout, platform page, platform/companies/*, platform/marketplace/*, platform/settings)
- Delete: `src/components/super-admin-guard.tsx`
- Delete: `src/components/super-admin-sidebar.tsx`

- [ ] **Step 1: Confirm contents**

```bash
ls -la "src/app/(super-admin)/"
ls src/components/super-admin-*.tsx
```

- [ ] **Step 2: Delete**

```bash
rm -rf "src/app/(super-admin)"
rm src/components/super-admin-guard.tsx src/components/super-admin-sidebar.tsx
```

- [ ] **Step 3: Confirm nothing else imports**

Use Grep for `SuperAdminGuard|super-admin-sidebar|super-admin-guard|\(super-admin\)` across `src/`. Expect zero matches.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove super-admin shell, guard, and sidebar"
```

---

## Task 4: Remove the super_admin branch from the login redirect

**Files:**
- Modify: `src/app/(auth)/login/page.tsx:46-47`

- [ ] **Step 1: Edit the login page**

Use the Edit tool to change this block:

```tsx
        if (profileData?.role === 'super_admin') {
          router.replace('/platform')
        } else if (profileData?.role === 'customer') {
          router.replace('/home')
        } else {
          router.replace('/dashboard')
        }
```

To:

```tsx
        if (profileData?.role === 'customer') {
          router.replace('/home')
        } else {
          router.replace('/dashboard')
        }
```

- [ ] **Step 2: Verify no remaining super_admin literal in the file**

Use Grep for `super_admin` in `src/app/(auth)/login/page.tsx`. Expect zero matches.

- [ ] **Step 3: Commit** (deferred — bundle with Task 5/6 as one auth-layer cleanup commit)

---

## Task 4b: Drop the super_admin branch from customer-guard

**Files:**
- Modify: `src/components/customer-guard.tsx` (lines 12 and 25)

**Why:** `customer-guard.tsx` currently allows `super_admin` to bypass the customer-only check (two `profile.role !== 'super_admin'` comparisons). Once `UserRole` is narrowed in Task 6, these comparisons become TS type errors and `npx tsc --noEmit` will fail. Remove them now, before the types change.

- [ ] **Step 1: Read the file**

```bash
cat src/components/customer-guard.tsx
```

- [ ] **Step 2: Edit both lines**

Use the Edit tool twice (once per occurrence). Change:

```ts
if (!loading && (!profile || (profile.role !== 'customer' && profile.role !== 'super_admin'))) {
```

To:

```ts
if (!loading && (!profile || profile.role !== 'customer')) {
```

And change:

```ts
if (!profile || (profile.role !== 'customer' && profile.role !== 'super_admin')) {
```

To:

```ts
if (!profile || profile.role !== 'customer') {
```

- [ ] **Step 3: Verify no `super_admin` literals remain in the file**

Use Grep for `super_admin` in `src/components/customer-guard.tsx`. Expect zero matches.

- [ ] **Step 4: Commit** (bundled with Task 4 / 5 / 6 as the auth-layer cleanup commit)

---

## Task 5: Simplify auth-utils

**Files:**
- Modify: `src/lib/auth-utils.ts`

**Callers check (already done during planning):** `isAdminOrAbove` has 28 callers (API routes + `auth-guard`). Keep it, but drop the `super_admin` branch. `isSuperAdmin` has no remaining callers after Task 3. Remove it.

- [ ] **Step 1: Rewrite the file**

Use the Edit tool. Change:

```ts
export function isAdminOrAbove(role: string): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function isSuperAdmin(role: string): boolean {
  return role === 'super_admin'
}
```

To:

```ts
export function isAdminOrAbove(role: string): boolean {
  return role === 'admin'
}
```

- [ ] **Step 2: Verify no callers reference `isSuperAdmin`**

Use Grep for `isSuperAdmin` across `src/`. Expect zero matches.

- [ ] **Step 3: Commit** (bundled with Task 4 and 6)

---

## Task 6: Narrow TypeScript role and company-type unions

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Edit the unions**

Use the Edit tool to change:

```ts
export type UserRole = 'super_admin' | 'admin' | 'customer' | 'partner'
export type CompanyType = 'platform' | 'admin' | 'customer' | 'partner'
```

To:

```ts
export type UserRole = 'admin' | 'customer' | 'partner'
export type CompanyType = 'admin' | 'customer' | 'partner'
```

(Preserve existing formatting and surrounding code.)

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean exit (no errors). If there are errors referencing `super_admin` or `platform`, resolve them — the tasks above should have removed every consumer.

- [ ] **Step 3: Commit the auth-layer cleanup**

```bash
git add "src/app/(auth)/login/page.tsx" src/components/customer-guard.tsx src/lib/auth-utils.ts src/lib/types.ts
git commit -m "refactor: drop super_admin role and platform company type from client code"
```

---

## Task 7: Delete the Servolu helper script

**Files:**
- Delete: `supabase/setup-super-admin.sh`

- [ ] **Step 1: Delete**

```bash
rm supabase/setup-super-admin.sh
```

- [ ] **Step 2: Commit** (bundled with Task 8)

---

## Task 8: Delete the Servolu/platform/super-admin migration files

**Files to delete:**
- `supabase/migrations/20260408300001_extend_company_type_enum.sql`
- `supabase/migrations/20260408300002_extend_user_role_enum.sql`
- `supabase/migrations/20260408300004_seed_servolu_company.sql`
- `supabase/migrations/20260408300005_auth_helper_functions_v2.sql`
- `supabase/migrations/20260408300006_rls_policies_v2.sql`
- `supabase/migrations/20260408300007_seed_super_admin_menu.sql`
- `supabase/migrations/20260408300008_seed_super_admin_user.sql`

- [ ] **Step 1: Delete**

```bash
rm supabase/migrations/20260408300001_extend_company_type_enum.sql \
   supabase/migrations/20260408300002_extend_user_role_enum.sql \
   supabase/migrations/20260408300004_seed_servolu_company.sql \
   supabase/migrations/20260408300005_auth_helper_functions_v2.sql \
   supabase/migrations/20260408300006_rls_policies_v2.sql \
   supabase/migrations/20260408300007_seed_super_admin_menu.sql \
   supabase/migrations/20260408300008_seed_super_admin_user.sql
```

- [ ] **Step 2: Verify**

```bash
ls supabase/migrations/ | grep -E "20260408300001|20260408300002|20260408300004|20260408300005|20260408300006|20260408300007|20260408300008" || echo "all deleted"
```

Expected: `all deleted`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove super_admin / platform tier migrations and helper script"
```

---

## Task 9: Delete the marketplace migration files

**Files to delete:**
- `supabase/migrations/20260408500001_create_marketplace_listings.sql`
- `supabase/migrations/20260408500002_marketplace_rls.sql`
- `supabase/migrations/20260408500003_seed_ithealth_marketplace_listing.sql`
- `supabase/migrations/20260408500004_seed_marketplace_menu_items.sql`

- [ ] **Step 1: Delete**

```bash
rm supabase/migrations/20260408500001_create_marketplace_listings.sql \
   supabase/migrations/20260408500002_marketplace_rls.sql \
   supabase/migrations/20260408500003_seed_ithealth_marketplace_listing.sql \
   supabase/migrations/20260408500004_seed_marketplace_menu_items.sql
```

- [ ] **Step 2: Verify**

```bash
ls supabase/migrations/ | grep 20260408500 || echo "all deleted"
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove marketplace migrations"
```

---

## Task 10: Simplify the company hierarchy trigger

**Files:**
- Modify: `supabase/migrations/20260408300003_add_company_hierarchy.sql`

**Why:** The current trigger auto-parents `admin` companies to whatever company the creating user belongs to. That only made sense when a super_admin (in the Servolu company) was creating admin companies. With no super_admin tier, admin companies are root — so remove that branch. Keep the `customer/partner` branch (admins still create customer/partner companies under themselves).

- [ ] **Step 1: Read the current file to confirm content**

```bash
cat supabase/migrations/20260408300003_add_company_hierarchy.sql
```

- [ ] **Step 2: Edit the trigger function**

Use the Edit tool to change:

```sql
CREATE OR REPLACE FUNCTION public.set_parent_company_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_company_id IS NULL AND NEW.type IN ('customer', 'partner') THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  IF NEW.parent_company_id IS NULL AND NEW.type = 'admin' THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

To:

```sql
CREATE OR REPLACE FUNCTION public.set_parent_company_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_company_id IS NULL AND NEW.type IN ('customer', 'partner') THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 3: Commit** (bundled with Task 11)

---

## Task 11: Clean Servolu references out of the seed file

**Files:**
- Modify: `supabase/seed.sql`

**What to remove:** (approximate line numbers from the spec review)
- The `INSERT INTO companies (…) VALUES ('00000000-0000-0000-0000-000000000000', 'Servolu', 'platform', …)` row
- Any `UPDATE companies SET parent_company_id = '00000000-0000-0000-0000-000000000000' WHERE …` — IThealth becomes root (`parent_company_id = NULL`)
- Any `INSERT INTO profiles (…)` that creates the Servolu super_admin user (email `admin@servolu.com`)
- Any `INSERT INTO auth.users (…)` creating the Servolu admin auth user
- Any `INSERT INTO company_branding` row keyed to the Servolu company UUID
- Any `INSERT INTO marketplace_listings` rows
- Any `INSERT INTO role_menu_access` row that grants menu access to the `super_admin` role
- Any `INSERT INTO menu_items` row that was part of the super-admin menu tree (L1 `/platform`, `/platform/companies`, `/platform/marketplace`, `/platform/settings`, plus their L2 children)

- [ ] **Step 1: Locate the Servolu-related blocks**

Use the Grep tool with pattern `Servolu|servolu\.com|super_admin|marketplace_listings` in `supabase/seed.sql` with `-n` and `-C 2`. Capture all matching line ranges.

**Caveat — do NOT grep for the UUID `00000000-0000-0000-0000-000000000000` directly.** That UUID is also GoTrue's default `instance_id` column value in every `auth.users` insert (not just Servolu's). Instead: find the *one* `INSERT INTO public.companies` row where that UUID is used as the primary key for the Servolu company, and the *one* `INSERT INTO public.profiles` row that references it as `company_id`. Do not delete legitimate `auth.users` rows (guy.duncan, customer, partner, etc.) just because they share the `instance_id`.

- [ ] **Step 2: Remove each Servolu-specific block**

For each of the following, use the Edit tool (keeping `old_string` large enough to be unique):

1. The `INSERT INTO public.companies (…) VALUES ('00000000-0000-0000-0000-000000000000', 'Servolu', 'platform', …)` row.
2. Any `UPDATE public.companies SET parent_company_id = '00000000-0000-0000-0000-000000000000' WHERE id = <IThealth UUID>` statement — delete it entirely (IThealth stays with `parent_company_id = NULL`).
3. The `INSERT INTO auth.users` row whose email matches `admin@servolu.com` (identified by email, not by `instance_id`).
4. The `INSERT INTO public.profiles` row whose `id` matches that Servolu auth user, or whose `role = 'super_admin'`, or whose `company_id = '00000000-0000-0000-0000-000000000000'`.
5. Any `INSERT INTO public.company_branding` row whose `company_id = '00000000-0000-0000-0000-000000000000'`.
6. Any `INSERT INTO public.marketplace_listings` statement.
7. Any `INSERT INTO public.role_menu_access` row where `role = 'super_admin'`.
8. Any `INSERT INTO public.menu_items` row that was part of the super-admin menu tree (routes starting `/platform`).

- [ ] **Step 3: Verify**

Use Grep for `Servolu|servolu\.com|super_admin|marketplace_listings` in `supabase/seed.sql`. Expect zero matches. Do NOT grep for the bare UUID — legitimate `instance_id` references will remain.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260408300003_add_company_hierarchy.sql supabase/seed.sql
git commit -m "chore: remove Servolu company, super_admin user, and marketplace seed data"
```

---

## Task 12: Run db reset and confirm clean apply

- [ ] **Step 1: Make sure local Supabase is running**

```bash
npx supabase status
```

If not running: `npx supabase start`.

- [ ] **Step 2: Reset the database**

```bash
npx supabase db reset
```

Expected: all remaining migrations apply cleanly, seed runs without error, no mention of missing enum values (`super_admin`, `platform`), no FK violations.

- [ ] **Step 3: Spot-check the DB state**

From the Supabase Studio SQL editor (or `psql` against the local DB), run:

```sql
SELECT id, name, type, parent_company_id FROM public.companies ORDER BY created_at;
SELECT role, count(*) FROM public.profiles GROUP BY role;
SELECT enum_range(NULL::user_role);
SELECT enum_range(NULL::company_type);
```

Expected:
- `companies` has no row with `type = 'platform'` and no row named Servolu; IThealth has `parent_company_id = NULL`.
- `profiles.role` has no `super_admin` rows.
- `user_role` enum does not contain `super_admin`.
- `company_type` enum does not contain `platform`.

If any of these fail, investigate which migration/seed entry still references the dropped concept and fix it before continuing.

- [ ] **Step 4: No commit** — nothing to commit at this step.

---

## Task 13: Repo-wide grep pass

- [ ] **Step 1: Grep for the forbidden words**

Run each of these Grep searches across the repo (excluding `docs/superpowers/specs/archived/`, `docs/superpowers/plans/archived/`, and `.git/`):

1. `Servolu` (case-insensitive) — expect zero matches except in the `archived/` docs and in the removal spec/plan.
2. `super_admin` — expect zero matches except in archived docs and the removal spec/plan.
3. `super-admin` — expect zero matches except archived docs and the removal spec/plan.
4. `SuperAdminGuard` — zero matches anywhere.
5. `marketplace_listings` — zero matches anywhere.
6. `\(marketplace\)` (literal, as a path fragment) — zero matches anywhere.
7. `'platform'` (string literal, with the quotes) — inspect each hit. Any match where the meaning is "platform company type" must be fixed. Matches unrelated to the company-type concept (e.g. `navigator.platform`) are fine.

- [ ] **Step 2: Fix any lingering hits**

For each unexpected hit, remove or rewrite the reference. Most likely sources: stale comments, dead imports, JSON fixtures, test files.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: clean up straggler references to Servolu / super_admin / platform"
```

If there were no straggler hits, skip the commit.

---

## Task 14: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**What to change:**
- Remove the phrase `codenamed Servolu` from the Project section.
- Update the hierarchy description so it reads `admin (resellers/MSPs) → customer/partner (end clients)` (drop the `platform (Servolu)` branch).
- Update the roles list to `admin`, `partner`, `customer` (drop `super_admin`).
- Remove `(super-admin)/` from the "Route Groups" list.
- Remove the line `Super admin guard wraps (super-admin) layout; requires super_admin role`.
- Remove the line `super_admin has cross-company access` from the RLS section.
- Remove the line `resolveCompanyId() resolves the default company for public pages (supports ?company=slug param)` if `resolveCompanyId` was marketplace-specific. (Grep for `resolveCompanyId` first — if it's still used by `(public)`, keep the line.)

- [ ] **Step 1: Check whether `resolveCompanyId` is still used**

Use Grep for `resolveCompanyId` across `src/`. Note the remaining callers.

- [ ] **Step 2: Edit `CLAUDE.md` using targeted Edit tool calls**

Make each change listed above as a discrete `Edit` operation with a unique `old_string`.

- [ ] **Step 3: Read the file back and sanity-check**

```bash
cat CLAUDE.md
```

Confirm all Servolu/platform/super_admin mentions are gone and the document still reads cleanly.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect single-tier admin platform"
```

---

## Task 15: End-to-end verification in the browser

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: compiles cleanly, no TypeScript or runtime errors.

- [ ] **Step 2: Log in as an IThealth admin**

- Navigate to `http://localhost:3000/login`.
- Sign in with a seeded admin account (check `supabase/seed.sql` for the email; likely something like `admin@ithealth.co.za`).
- Expected: redirected to `/dashboard` (or `/admin`). Sidebar loads, mega menu works, branding (logo + colours) renders from the `company_branding` row for IThealth.

- [ ] **Step 3: Log in as an IThealth customer**

- Sign out, then sign in as a seeded customer account.
- Expected: redirected to `/home`. Customer portal renders.

- [ ] **Step 4: Confirm the `/platform` route is gone**

- In the browser, navigate directly to `http://localhost:3000/platform`.
- Expected: Next.js 404.

- [ ] **Step 5: Confirm the public marketplace is gone**

- Navigate to `http://localhost:3000/` (or whatever the marketplace root was — try `/providers`, `/services`).
- Expected: either 404, or the IThealth public site from `(public)` loads (if that route group serves `/`). Either is acceptable as long as there's no Servolu marketplace shell.

- [ ] **Step 6: No commit** — verification step only.

---

## Task 16: Final sweep

- [ ] **Step 1: Run TypeScript check once more**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 2: Run the build (catches issues `tsc` alone won't)**

```bash
npm run build
```

Expected: successful build, no errors, no warnings about missing routes or imports tied to the removed code.

- [ ] **Step 3: If the build surfaces anything, fix it and commit**

```bash
git add -A
git commit -m "fix: resolve lingering build issues after Servolu removal"
```

- [ ] **Step 4: Review the git log**

```bash
git log --oneline main..HEAD
```

Confirm the commit history reads as a clean, coherent removal story.

- [ ] **Step 5: Done.** The branch is ready for the normal code-review / merge workflow (covered by `superpowers:finishing-a-development-branch`, not this plan).
