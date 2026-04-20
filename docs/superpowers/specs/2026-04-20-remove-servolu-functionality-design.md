# Remove Servolu Functionality — Design Spec

- **Date**: 2026-04-20
- **Author**: Guy Duncan (with Claude)
- **Status**: Draft
- **Supersedes context from**: `2026-04-08-multi-tenant-platform-design.md`

## 1. Summary

Remove the entire Servolu platform tier from the codebase. The product becomes a **single top-level admin platform** (option A1) where IThealth is the root admin company. Admin companies can still have `customer` and `partner` children, but there is no `platform` tier above admin and no super-admin role managing multiple admin companies.

The public marketplace aggregating admin companies (`/src/app/(marketplace)/`) is also removed. Per-company branding and website CMS infrastructure **stays** — admins continue to manage their own brand and marketing pages.

Migrations are rewritten in place (option M2): Servolu-related migration files are deleted, edited, or replaced directly, and everyone runs `supabase db reset` to pick up the new clean history.

## 2. Motivation

The multi-tenant Servolu tier, the super-admin role, and the public marketplace were designed and built but are not needed. Removing them reduces surface area (~1,500+ lines of code, 10+ migrations, 9 UI pages, 80+ RLS policies), simplifies the role model, and focuses the product on the admin-tier experience.

## 3. Scope

### 3.1 In scope

- Delete the `(super-admin)` route group and all super-admin UI components
- Delete the `(marketplace)` public route group and marketplace components
- Remove `super_admin` from the `user_role` enum and `platform` from the `company_type` enum
- Remove the `marketplace_listings` table and its RLS/seed/menu migrations
- Remove the seeded Servolu company, seeded Servolu admin user, and seeded Servolu branding
- Rewrite RLS policies to remove every `super_admin` branch while preserving admin / customer / partner access
- Update TypeScript types, login redirect logic, and `CLAUDE.md`
- Archive the historical design and plan docs for the multi-tenant platform

### 3.2 Out of scope (stays as-is)

- Per-company branding (`company_branding` table, `branding/` storage bucket, `useBranding()`, admin `/growth/brand` editor)
- Website CMS (`website_content` table, `website-content/` storage bucket, admin `/growth/content/website` editor)
- The IThealth public marketing site under `src/app/(public)/`
- Company hierarchy columns (`parent_company_id`, `domain`, `slug`, `tagline`, `support_email`, `contact_email`) — still useful for admin → customer/partner relationships
- Menu system plumbing (`menu_items`, `role_menu_access`, `get_menu_tree()`) — only the super_admin role rows get removed

## 4. End-state hierarchy

Before:

```
platform (Servolu)
  └── admin (IThealth, …)
        └── customer / partner
```

After:

```
admin (IThealth, …)   ← root
  └── customer / partner
```

IThealth's `parent_company_id` becomes `NULL`. No rows exist with `company.type = 'platform'`. No profiles exist with `role = 'super_admin'`.

## 5. Changes by layer

### 5.1 Files to delete

**App routes and components:**

- `src/app/(super-admin)/` — entire directory (layout + 9 pages)
- `src/app/(marketplace)/` — entire directory (home, providers, services, about, contact)
- `src/components/super-admin-guard.tsx`
- `src/components/super-admin-sidebar.tsx`
- `src/components/marketplace/` — entire directory (header, footer)
- `src/lib/auth-utils.ts` — if `isSuperAdmin` was its only reason to exist; otherwise simplify (see §5.2)
- `supabase/setup-super-admin.sh` — Servolu-specific helper script that creates `admin@servolu.com`

**Migrations (deleted because M2 rewrite-in-place):**

- `20260408300001_extend_company_type_enum.sql`
- `20260408300002_extend_user_role_enum.sql`
- `20260408300004_seed_servolu_company.sql`
- `20260408300006_rls_policies_v2.sql`
- `20260408300007_seed_super_admin_menu.sql`
- `20260408300008_seed_super_admin_user.sql`
- `20260408500001_create_marketplace_listings.sql`
- `20260408500002_marketplace_rls.sql`
- `20260408500003_seed_ithealth_marketplace_listing.sql`
- `20260408500004_seed_marketplace_menu_items.sql`

### 5.2 Files to edit

**Code:**

- `src/lib/types.ts`
  - `UserRole = 'admin' | 'customer' | 'partner'` (remove `'super_admin'`)
  - `CompanyType = 'admin' | 'customer' | 'partner'` (remove `'platform'`)
- `src/app/(auth)/login/page.tsx` — remove the `super_admin` → `/platform` redirect branch
- `src/lib/auth-utils.ts` — remove `isSuperAdmin`; simplify or remove `isAdminOrAbove` depending on remaining callers
- `CLAUDE.md` — remove "codenamed Servolu", remove `platform` from hierarchy description, remove `super_admin` from role list, remove `(super-admin)` from route groups, remove super-admin guard mention, remove any marketplace references

**Migrations (edited in place):**

- `20260408300003_add_company_hierarchy.sql` — keep the columns (`parent_company_id`, `domain`, `slug`, `tagline`, `support_email`, `contact_email`), but remove any trigger branch that referenced the `platform` company type
- `20260408300005_auth_helper_functions_v2.sql` — remove `is_admin_or_above()` if unused after cleanup; keep `get_my_company_type()` if still referenced anywhere

**Seed (`supabase/seed.sql`):**

- Remove the Servolu company INSERT (`id = '00000000-0000-0000-0000-000000000000'`)
- Remove the Servolu admin user seed (`admin@servolu.com`)
- Remove the Servolu `company_branding` row
- Remove the `UPDATE companies SET parent_company_id = '<servolu>' WHERE id = <ithealth>` — IThealth stays with `parent_company_id = NULL`
- Remove any marketplace_listings inserts
- Remove any super_admin role_menu_access inserts

### 5.3 Files to add

- `supabase/migrations/20260408300006_rls_policies.sql` — a rewritten RLS file that recreates admin / customer / partner policies for the same set of tables the old v2 file covered, minus every `super_admin` branch. Same tables, narrower scope.

### 5.4 Docs to archive

Rename (preserve history, don't delete):

- `docs/superpowers/specs/2026-04-08-multi-tenant-platform-design.md` → `docs/superpowers/specs/archived/2026-04-08-multi-tenant-platform-design.md`
- `docs/superpowers/plans/2026-04-08-multi-tenant-platform.md` → `docs/superpowers/plans/archived/2026-04-08-multi-tenant-platform.md`

## 6. Verification

After implementation, confirm:

1. `npx supabase db reset` applies all migrations and seeds with no errors
2. `npm run dev` compiles with no TypeScript errors
3. Login as IThealth admin → lands on `/admin`, sidebar and mega menu render correctly, branding loads
4. Login as IThealth customer → lands on the customer portal
5. Grep across the repo returns zero matches for: `Servolu` (case-insensitive), `super_admin`, `super-admin`, `SuperAdminGuard`, `marketplace_listings`, `(marketplace)`, `'platform'` (as company type literal)
6. `menu_items` and `role_menu_access` contain no rows referencing the removed super_admin role
7. No broken imports

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| `supabase db reset` fails on another dev's machine because they have locally-modified Servolu data | Migration rewrite is M2 by explicit choice — everyone runs `db reset`. Communicate clearly. |
| Deleting `is_admin_or_above()` breaks an unrelated caller | Grep every call site before deleting; simplify instead of removing if callers exist |
| RLS rewrite subtly changes permissions for non-super-admin roles | New policy file should mirror the old policies exactly for admin/customer/partner and only drop super_admin branches; verify with manual role-based access tests |
| `parent_company_id` on IThealth currently points to Servolu UUID; deleting Servolu row hits FK | Seed order: insert IThealth with `parent_company_id = NULL`; no Servolu row exists to FK-violate |
| Hidden references to `super_admin` or `platform` in unseen spots (hooks, middleware, docs) | Verification step 5 (grep pass) catches these |

## 8. Non-goals

- Not renaming or re-branding Servolu to something else — it's removed, not replaced
- Not removing the per-company branding/CMS feature — these remain for admin tenants
- Not collapsing the `companies.type` enum to a single value — `admin`/`customer`/`partner` all remain
