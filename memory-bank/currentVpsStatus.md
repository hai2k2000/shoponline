# Current VPS Status

Updated: 2026-05-27

## Done On VPS

- Project created directly at `/opt/shoponline`.
- Git remote configured: `https://github.com/hai2k2000/shoponline.git`.
- Next.js app created in `apps/web`.
- Root npm workspace configured.
- Docker Compose configured for:
  - Web: `127.0.0.1:3002`
  - Postgres: `127.0.0.1:5434`
  - Redis: `127.0.0.1:6381`
- Prisma pinned to `6.19.3` for stable `PrismaClient` behavior.
- Initial Prisma schema created from planning docs.
- Initial migration applied to VPS Postgres.
- Seed data inserted:
  - Admin user: `admin@shoponline.local`
  - Password from env: `ShopOnline@2026`
  - Demo category/product/inventory transaction/store setting.
- Next.js production build passes.
- Docker deployment passes.
- Smoke checks:
  - `http://127.0.0.1:3002/` returns `200`
  - `http://127.0.0.1:3002/admin/dashboard` returns `200`

## Running Containers

- `shoponline-web`
- `shoponline-postgres`
- `shoponline-redis`

## Next Work

- Configure GitHub write credentials on VPS or push from another machine.
- Add real auth/session for `/admin/login`.
- Build reusable admin layout and DataTable.
- Implement category/product/inventory CRUD first.

## 2026-05-27 Auth Foundation Update

- Added signed cookie session for admin login.
- Added `/admin/login` server action using seeded admin user.
- Added `/admin/logout` route.
- Added middleware guard for `/admin/*` except `/admin/login`.
- `/admin/dashboard` now reads current user and dynamic database metrics at runtime.
- Docker redeployed successfully.
- Auth smoke passed:
  - Anonymous `/admin/dashboard` redirects to `/admin/login`.
  - `admin@shoponline.local` / `ShopOnline@2026` logs in.
  - Logout returns to login.

## 2026-05-27 Categories CRUD Update

- Replaced `/admin/categories` placeholder with a real Prisma-backed CRUD screen.
- Added list-first category management with search, status filter, create/edit modal, and archive action.
- Category mutations write `ActivityLog`.
- Archive is used instead of hard delete.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login.
  - Create category.
  - Search category.
  - Archive category.
  - Verify archived status.
