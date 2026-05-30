# Progress

## Done

- Read source planning documents:
  - `PROJECT_REQUIREMENTS.md`
  - `DATABASE_SCHEMA.md`
  - `SCREEN_FLOW.md`
  - `UI_UX_REQUIREMENTS.md`
  - `ROADMAP.md`
  - `AUTOMATION_PHASE.md`
  - `AI_PHASE.md`
- Created project instructions in `AGENTS.md`.
- Created memory bank.
- VPS folder `/opt/shoponline` was prepared earlier.
- Git remote configured on VPS.
- Reserved ports checked and available.

## In Progress

- Project planning and implementation context preparation.

## Not Started

- Actual application scaffold.
- Database migrations.
- Auth/RBAC implementation.
- Public storefront.
- Admin dashboard.
- CRUD modules.
- Reports.
- Automation.
- AI features.

## Risks

- GitHub push from VPS requires credentials.
- Scope is broad; implementation must follow roadmap order to avoid unstable demo.
- Dashboard/report accuracy depends on correct inventory/order/finance rules.
- Automation and AI should wait until enough reliable operational data exists.

## 2026-05-27 Smoke Data Cleanup

- Added `scripts/cleanup-smoke-data.ts`.
- Added `npm run smoke:cleanup`.
- Cleanup defaults to dry-run and requires `CONFIRM_SMOKE_CLEANUP=yes` for destructive changes.
- Cleanup removes known smoke/UAT orders, payments, shipments, purchases, inventory rows, products, categories, customers, suppliers, debts, expenses, promotions, notifications, timelines, and activity logs.
- Smoke test users are archived instead of deleted to avoid user-related historical constraints.
- Backed up Postgres before the first production cleanup.
- Removed accumulated smoke data from repeated VPS regression runs.
- Verified `npm run check` still passes after adding cleanup tooling.
- Ran cleanup again after regression so the production DB dry-run returns zero matched smoke records.

## 2026-05-27 CI Actions Runtime Update

- GitHub Actions reported the upcoming Node.js 20 actions runtime deprecation.
- Checked current action releases through GitHub API.
- Updated CI to `actions/checkout@v6` and `actions/setup-node@v6`.
- Kept the project runtime check on Node 22 via `actions/setup-node`.


## 2026-05-27 VPS Auth Foundation

- Added admin login/logout.
- Added signed session cookie.
- Protected admin routes with middleware.
- Dashboard now requires current user and reads DB metrics dynamically.
- Rebuilt and redeployed `shoponline-web`.
- Browser auth smoke passed on VPS.

## 2026-05-28 Admin Username Login

- Changed `/admin/login` to show `Tên đăng nhập` instead of email.
- Default admin login is now `admin` / `123456`.
- Kept the existing internal admin email `admin@shoponline.local` and mapped username `admin` to it in the login action to avoid a schema migration and preserve existing scripts.
- Updated seed defaults so future seed runs recreate the same admin credential.
- Updated the live VPS admin user password hash and status.
- Verified `npm run lint`, `npm run build`, `docker compose up -d --build web`, `npm run smoke:prod`, and `npm run smoke:admin-auth`.

## 2026-05-28 Site Login Lock

- Updated `apps/web/src/proxy.ts` so public routes now require the existing session cookie.
- Unauthenticated requests to `/`, `/products`, `/cart`, `/checkout`, `/tracking`, and admin pages redirect to `/admin/login` with a `next` query.
- Left `/admin/login`, `/admin/logout`, `/api/health`, Next.js static assets, and public files accessible so login, logout, and container healthchecks continue to work.
- Rebuilt and redeployed `shoponline-web`.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - `npm run smoke:prod` passed with public routes returning HTTP 307.
  - `https://cargo.io.vn/` returns HTTP 307 to `/admin/login?next=%2F`.

## 2026-05-28 Admin Navigation Login Loop Fix

- Login form now carries the `next` query through a hidden field.
- Login action redirects to a validated `next` path after successful login instead of always redirecting to `/admin/dashboard`.
- Removed the `Về website` link from the login screen because the public site is now locked and the link created a confusing loop.
- Adjusted proxy to allow `/api/admin/*` route handlers through; those handlers still enforce auth/RBAC themselves and need access to form `sessionToken`.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-auth` passed.
  - Authenticated requests to `/admin/dashboard`, `/admin/products`, `/admin/orders`, and `/admin/settings` returned HTTP 200.

## 2026-05-27 Categories CRUD

- Implemented real `/admin/categories` module.
- Added server actions for create, update, and archive.
- Added list-first UI with modal create/edit.
- Added category CRUD browser smoke test on VPS.

## 2026-05-27 Products CRUD

- Implemented real `/admin/products` module.
- Added server actions for create, update, and archive.
- Added inventory initialization on product create.
- Added product CRUD browser smoke test on VPS.

## 2026-05-27 Inventory Module

- Implemented real `/admin/inventory` module.
- Added server actions for import, export, and adjust.
- Added transaction ledger display.
- Added inventory browser smoke test on VPS.

## 2026-05-27 Customers CRUD

- Implemented real `/admin/customers` module.
- Added customer status and timestamp migrations.
- Added server actions for create, update, and archive.
- Added list-first UI with filters, detail modal, and create/edit modal.
- Added customer CRUD browser smoke test on VPS.

## 2026-05-27 Suppliers CRUD

- Implemented real `/admin/suppliers` module.
- Added supplier status and timestamp migration.
- Added server actions for create, update, and archive.
- Added list-first UI with status filter, detail modal, and create/edit modal.
- Added supplier CRUD browser smoke test on VPS.

## 2026-05-27 Orders Workflow

- Implemented real `/admin/orders` module.
- Added server actions for create order and update order status.
- Added stock reservation on order creation.
- Added stock export on completed orders and stock release on cancelled orders.
- Added return workflow for completed orders.
- Added order browser smoke test on VPS.

## 2026-05-27 Finance CRUD

- Implemented real `/admin/finance/expenses` module.
- Implemented real `/admin/finance/debts` module.
- Added finance management fields to Prisma schema.
- Added server actions for expense create/update/archive.
- Added server actions for debt create/update/payment/close.
- Added finance browser smoke test on VPS.

## 2026-05-27 Dashboard

- Rebuilt `/admin/dashboard` with clean Vietnamese text.
- Added real metrics for revenue, profit, orders, receivables, payables, expenses, stock, and master data counts.
- Added recent orders and quick navigation.
- Added dashboard browser smoke test on VPS.

## 2026-05-27 Reports

- Implemented real `/admin/reports` module.
- Added summary metrics for revenue, expenses, profit, inventory, orders, receivables, and payables.
- Added sales, product sales, inventory, and debt report tables.
- Added browser-side CSV export.
- Added reports browser smoke test on VPS.

## 2026-05-27 Users/RBAC

- Implemented real `/admin/users` module.
- Added admin/manager guard for user management.
- Added create, update, reset password, and archive actions.
- Added user browser smoke test on VPS.

## 2026-05-27 Settings

- Implemented real `/admin/settings` module.
- Added update action for store name, logo, contact, shipping fee, and inventory strategy.
- Added settings browser smoke test on VPS.

## 2026-05-27 Public Storefront

- Implemented real public home page.
- Implemented real `/products` page.
- Implemented localStorage cart at `/cart`.
- Implemented public checkout at `/checkout`.
- Implemented order tracking at `/tracking`.
- Added storefront browser smoke test on VPS.

## 2026-05-27 Admin Layout And Production Hardening

- Added shared admin shell and sidebar navigation.
- Added responsive smoke across desktop/mobile for key pages.
- Added `/api/health`.
- Added `smoke:prod` script.
- Added `backup:postgres` script.
- Updated deployment documentation with reverse proxy, backup, smoke, and Docker cleanup guidance.

## 2026-05-27 VPS Production Config

- Rotated real VPS `AUTH_SECRET`.
- Added active cron jobs for Postgres backup and healthcheck.
- Verified healthcheck and backup commands manually.

## 2026-05-27 Container Health And Log Rotation

- Added Docker healthchecks for web, Postgres, and Redis.
- Added retry behavior to production smoke script.
- Added logrotate config for ShopOnline cron logs.
- Verified all ShopOnline containers report healthy.

## 2026-05-27 Proxy, Security Headers, Restore Script

- Migrated deprecated middleware convention to Next.js `proxy.ts`.
- Added baseline security headers.
- Added guarded Postgres restore script.
- Verified build, deploy, smoke, security headers, and restore guard.

## 2026-05-27 Automation Foundation

- Added `AutomationRun` model and migration.
- Added automation script and npm command.
- Added low stock, purchase suggestion, debt reminder, order follow-up, and daily report jobs.
- Added `/admin/automation`.
- Added automation cron and log rotation coverage.
- Added automation browser smoke test on VPS.

## 2026-05-27 Domain Switch

- Pointed `cargo.io.vn` Nginx proxy to ShopOnline on `127.0.0.1:3002`.
- Backed up old Nginx config.
- Verified Nginx reload, domain health endpoint, and production smoke through `https://cargo.io.vn`.
## 2026-05-27 Payment Transactions

- Added `PaymentTransaction` model and migration.
- Added payment recording workflow at `/admin/finance/payments`.
- Decoupled order completion from payment status.
- Added and passed a VPS browser smoke for payment creation.

## 2026-05-27 Shipments

- Added `Shipment` model, `ShipmentStatus` enum, and migration.
- Added `/admin/shipments` list-first workflow.
- Added route handler POST flows for shipment creation and status updates.
- Synced `SHIPPED` shipments to order `SHIPPING` status.
- Added and passed a VPS browser smoke for shipment creation.

## 2026-05-27 Purchase Orders

- Added `PurchaseOrder` and `PurchaseOrderItem` models with migration.
- Added `/admin/purchases` list-first workflow.
- Added purchase creation and receive/cancel POST flows.
- Receiving a purchase order imports stock and logs inventory transactions.
- Fixed route redirects behind Nginx proxy and added token fallback for admin POST routes.
- Added and passed a VPS purchase smoke for create and receive.

## 2026-05-27 Notifications

- Added `Notification` model and `NotificationLevel` enum with migration.
- Added `/admin/notifications` list and read/read-all workflows.
- Purchase receiving now writes a success notification.
- Added and passed a VPS notification smoke for marking a notification as read.

## 2026-05-27 Customer Timeline

- Added `CustomerTimeline` model and `CustomerTimelineType` enum with migration.
- Added `/admin/customers/timeline` workflow for CSKH history.
- Order creation for known customers now writes an `ORDER` timeline event.
- Added and passed a VPS customer timeline smoke for manual note creation.

## 2026-05-27 Returns And Refunds

- Added `ReturnRequest` and `RefundTransaction` models with migration.
- Added `/admin/returns` workflow.
- Added return create and status transition POST routes.
- Receiving a completed-order return restores inventory; refunding writes a refund transaction.
- Added and passed a VPS return/refund smoke through approve, receive, and refund.

## 2026-05-27 Promotions

- Added `Promotion` model and `DiscountType` enum with migration.
- Added `/admin/promotions` workflow for coupon creation and toggling.
- Checkout now applies valid coupon codes and writes order discount.
- Coupon usage count increments after checkout.
- Added and passed a VPS promotion smoke for admin coupon creation and public checkout.

## 2026-05-27 Audit Log

## 2026-05-28 Shipments And Purchases UI Detail

- Continued ShopOnline work on VPS `/opt/shoponline` via SSH key.
- Read `AGENTS.md` and `memory-bank`.
- Added `Xem` detail modal workflow to `/admin/shipments`.
- Added `Xem` detail modal workflow to `/admin/purchases`, including full item breakdown table.
- Kept changes UI-only; no database, service, route handler, or migration changes.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-ui` passed for 21 admin routes.

## 2026-05-28 Returns Promotions Audit UI Detail

- Added `Xem` detail modal workflow to `/admin/returns`.
- Added `Xem` detail modal workflow to `/admin/promotions`.
- Added `Xem` detail modal workflow to `/admin/audit`.
- Kept changes UI-only; no route handler, service, database, or migration changes.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-ui` passed for 21 admin routes.

## 2026-05-28 Notifications And Timeline UI Detail

- Added `Xem` detail modal workflow to `/admin/notifications`.
- Added `Xem` detail modal workflow to `/admin/customers/timeline`.
- Kept changes UI-only; no route handler, service, database, or migration changes.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-ui` passed for 21 admin routes.

## 2026-05-28 Users UI Detail

- Added `Xem` detail modal workflow to `/admin/users`.
- Detail modal shows email, role, status, current-account flag, created/updated timestamps, and user ID.
- Kept changes UI-only; no route handler, service, database, or migration changes.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-ui` passed for 21 admin routes.

## 2026-05-28 Automation UI Detail

- Added per-run JSON detail disclosure to `/admin/automation` history table.
- Kept page as a server-rendered admin page and avoided route/API changes.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-ui` passed for 21 admin routes.

## 2026-05-28 Public Product Detail

- Added public product detail route `/products/[slug]`.
- Product detail reads active product, category, store settings, and inventory from Prisma.
- Detail page shows image, category, SKU, sale/promotion price, available stock, order availability, description, and cart actions.
- Product listing now includes `Xem chi tiết` for each product.
- Updated `scripts/smoke-public-flow.ts` to verify product detail pages.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:public-ui` passed.
  - `npm run smoke:public-flow` passed including `/products/[slug]`.

## 2026-05-28 Public Tracking Breakdown

- Updated `/tracking` order result UI to show:
  - Order created time.
  - Payment status.
  - Subtotal.
  - Shipping fee.
  - Discount when present.
  - Final total.
- Updated `scripts/smoke-public-flow.ts` to verify tracking payment status and shipping fee text.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:public-flow` passed.

## 2026-05-28 Public Cart Summary

- Updated `/cart` summary to label totals as `Tạm tính`.
- Added helper text that shipping fee and coupon discount are calculated during checkout.
- Added `Xóa giỏ` action when cart has items.
- Updated `scripts/smoke-public-ui.ts` to verify cart summary text.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:public-ui` passed.
  - `npm run smoke:public-flow` passed.

## 2026-05-28 Public Checkout Summary

- Updated `/checkout` order summary with item count.
- Shows entered coupon code as a badge in the summary.
- Added helper text that shipping fee and coupon discount are confirmed when creating the order.
- Updated `scripts/smoke-public-ui.ts` to verify checkout summary text.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:public-ui` passed.
  - `npm run smoke:public-flow` passed.

## 2026-05-28 Settings Storefront Preview

- Updated `/admin/settings` with a storefront preview panel.
- Preview shows configured logo/initials, store name, phone, email, address, and default shipping fee.
- Kept settings form and `/api/admin/settings` behavior unchanged.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-ui` passed for 21 admin routes.

## 2026-05-28 Public Home Detail Links

- Updated public home hero `Mua ngay` to link directly to `/products/[slug]`.
- Added `Xem chi tiết` buttons to product cards on the home page.
- Updated `scripts/smoke-public-ui.ts` to verify the home detail-link text.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:public-ui` passed.
  - `npm run smoke:public-flow` passed.

## 2026-05-28 Product Table Focus

- User redirected work away from hero/card polish and toward product-related table/list workflows.
- Updated `/admin/products` table:
  - Added `Cập nhật` sortable column.
  - Added `Xem` row action.
  - Added product detail modal for SKU, slug, category, pricing, stock totals, reserved stock, available stock, min stock, status, updated time, thumbnail URL, and descriptions.
- Kept product create/update/archive behavior unchanged.
- Verified:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Docker web redeploy passed.
  - `npm run smoke:prod` passed.
  - `npm run smoke:admin-ui` passed for 21 admin routes.

- Added `/admin/audit` for browsing `ActivityLog`.
- Added search, entity filter, metrics, and latest log table.
- Added and passed a VPS audit page smoke.

## 2026-05-27 Backend Hardening

- Converted payment recording to `/api/admin/payments` route handler.
- Added session token fallback for payment POST submissions.
- Re-tested payment creation through the production UI.
- Converted admin order creation and status changes to route handlers.
- Added and passed an admin order hardening smoke for create plus status update.
- Converted inventory import/export/adjust to a route handler.
- Added and passed an inventory hardening smoke for import and transaction logging.

## 2026-05-27 Customers And Suppliers Hardening

- Converted customer create/update/archive flows from Server Action submissions to admin route handlers.
- Converted supplier create/update/archive flows from Server Action submissions to admin route handlers.
- Added cookie auth plus `sessionToken` fallback for these POST flows.
- Added and passed `/tmp/shoponline-customers-suppliers-smoke.js` for create, update, and archive on both modules.
- Rebuilt, redeployed, and passed `npm run smoke:prod` on VPS.

## 2026-05-27 Products And Categories Hardening

- Converted category create/update/archive flows from Server Action submissions to admin route handlers.
- Converted product create/update/archive flows from Server Action submissions to admin route handlers.
- Preserved unique slug/SKU generation and product initial inventory transaction behavior.
- Added cookie auth plus `sessionToken` fallback for these POST flows.
- Added and passed `/tmp/shoponline-products-categories-smoke.js` for create, update, and archive on both modules.
- Rebuilt, redeployed, and passed `npm run smoke:prod` on VPS.

## 2026-05-27 Finance Hardening

- Converted expense create/update/archive flows from Server Action submissions to admin route handlers.
- Converted debt create/update/payment/close flows from Server Action submissions to admin route handlers.
- Added cookie auth plus `sessionToken` fallback for these POST flows.
- Added and passed `/tmp/shoponline-finance-hardening-smoke.js` for expense and debt workflows.
- Rebuilt, redeployed, and passed `npm run smoke:prod` on VPS.

## 2026-05-27 Admin API RBAC Consolidation

- Added shared admin API helper for cookie auth, `sessionToken` fallback, proxy-aware redirects, and backend permission checks.
- Replaced duplicated admin route auth helpers across all current `/api/admin/*` POST route handlers.
- Added permission mapping for catalog, inventory, orders, customers, suppliers, finance, shipments, purchases, returns, promotions, notifications, users, and settings.
- Build passed on VPS.

## 2026-05-27 Users And Settings Route Handlers

- Converted admin user create/update/archive/reset-password flows to `/api/admin/users` route handlers.
- Converted store settings update flow to `/api/admin/settings`.
- Updated users and settings forms to use route-handler POST submissions with `sessionToken` fallback.
- Build passed on VPS.

## 2026-05-27 Core Backend Service Layer

- Added Zod-based admin form parsing helper.
- Moved core business logic for inventory, orders, payments, purchases, and returns into service modules.
- Kept route handlers focused on auth, validation, calling services, and redirects.
- Added `smoke:admin-core` to exercise the main backend money/stock/order routes through HTTP.
- Rebuilt and redeployed `shoponline-web`.
- Passed `npm run smoke:prod` and `npm run smoke:admin-core`.

## 2026-05-27 CRM And Finance Service Layer

- Moved customer, supplier, expense, and debt mutations into service modules.
- Added Zod validation to the related admin route handlers.
- Added `smoke:admin-crm-finance` for CRUD/finance HTTP coverage.
- Rebuilt and redeployed `shoponline-web`.
- Passed `npm run smoke:prod`, `npm run smoke:admin-core`, and `npm run smoke:admin-crm-finance`.

## 2026-05-27 Catalog And Admin System Service Layer

- Moved category, product, promotion, shipment, notification, customer timeline, settings, and user mutations into service modules.
- Added Zod validation to the related admin route handlers.
- Added `smoke:admin-catalog-system` for catalog/admin-system HTTP coverage.
- Rebuilt and redeployed `shoponline-web`.
- Passed `npm run smoke:prod`, `npm run smoke:admin-core`, `npm run smoke:admin-crm-finance`, and `npm run smoke:admin-catalog-system`.

## 2026-05-27 Admin Error Handling And Regression Smoke

- Centralized expected admin POST failures through typed redirect handling.
- Added negative admin smoke coverage for RBAC denial, validation failure, and not-found cases.
- Added aggregate `smoke:admin` and `smoke:regression` scripts so a full backend regression can be run with one command.
- Removed stale admin Server Action mutation files after verifying they were no longer imported.
- Confirmed only admin login and public checkout still use Server Actions.
- Rebuilt, redeployed, passed `npm run smoke:regression`, and confirmed `shoponline-web` is healthy.

## 2026-05-27 Admin Auth Smoke

- Added auth/security smoke coverage for admin route protection and admin POST authorization behavior.
- Covered valid admin cookie, tampered cookie, missing auth, inactive session token, and insufficient-role settings mutation.
- Added `smoke:admin-auth` to the aggregate admin regression chain.
- Passed `npm run smoke:admin-auth` and `npm run smoke:regression`.
- Reviewed npm audit; the remaining moderate findings are tied to Next's pinned internal PostCSS version while `next@16.2.6` is the current latest version.

## 2026-05-27 Admin Error Coverage Completion

- Standardized typed error redirects across all admin route handlers using `parseAdminForm`.
- Removed the last shipment-specific redirect helper and routed shipment failures through shared admin error handling.
- Expanded negative smoke coverage for validation/business-rule paths outside the original core order/payment/inventory flows.
- Verified there are no remaining admin form route handlers missing `redirectWithAdminError`.
- Rebuilt, redeployed, passed `npm run smoke:regression`, and confirmed `shoponline-web` is healthy.

## 2026-05-27 Public Checkout Service Layer

- Moved public checkout business logic from the Server Action into `checkout-service.ts`.
- Kept the checkout page API stable while returning controlled errors for validation, invalid cart JSON, stock failures, and coupon failures.
- Added `smoke:checkout` for the public order path and included it in `smoke:regression`.
- Covered successful checkout totals, reserved inventory, coupon usage count, checkout activity log, low-stock failure, and exhausted-coupon failure.
- Rebuilt, redeployed, passed `npm run smoke:regression`, and confirmed `shoponline-web` is healthy.

## 2026-05-27 Reporting Service Layer

- Moved admin reports and dashboard aggregation logic into `reporting-service.ts`.
- Refactored reports/dashboard pages to consume service outputs instead of calculating metrics inline.
- Added `smoke:reporting` and included it in the full regression chain.
- Covered financial summaries, debt summaries, inventory valuation, product sales/profit, dashboard low-stock count, and recent order output.
- Rebuilt, redeployed, passed `npm run smoke:regression`, and confirmed `shoponline-web` is healthy.

## 2026-05-27 Public Tracking Service Layer

- Moved public order tracking lookup into `tracking-service.ts`.
- Refactored `/tracking` page to consume a public-safe tracking DTO.
- Added `smoke:tracking` and included it in the full regression chain.
- Covered service lookup, case-insensitive order code input, missing order result, and HTTP rendering of found/missing tracking pages.
- Rebuilt, redeployed, passed `npm run smoke:regression`, and confirmed `shoponline-web` is healthy.

## 2026-05-27 Production Deploy Runbook Script

- Added a single-command production deploy script that backs up Postgres, builds, redeploys web, waits for Docker health, and runs full regression smoke.
- Added `deploy:prod` npm script and documented it in `DEPLOYMENT.md`.
- Ran `npm run deploy:prod` on the VPS successfully.
- Confirmed the deploy-created Postgres backup is present and non-empty.
- Confirmed `shoponline-web` is healthy after the scripted deploy.

## 2026-05-27 Backup Restore Verification

- Added a backup verification script that restores a `.sql.gz` backup into a temporary Postgres database and removes it afterward.
- Added `backup:verify` npm script.
- Integrated backup verification into `deploy:prod` by default, with `SKIP_BACKUP_VERIFY=yes` available for emergency/manual bypass.
- Updated deployment documentation with verify commands.
- Passed standalone backup verification and a full `deploy:prod` run including backup verification, build, redeploy, health wait, and regression smoke.
- Confirmed no temporary verification database remains after cleanup.

## 2026-05-27 CI Check Command And Lint Baseline

- Added a root `check` script that chains lint, build, backup restore verification, and full regression smoke.
- Fixed the current lint baseline so `npm run lint` exits cleanly.
- Deployed the lint/check changes through `npm run deploy:prod`.
- Passed `npm run check` and `npm run deploy:prod`.
- Confirmed `shoponline-web` is healthy after deployment.

## 2026-05-27 GitHub Actions CI Workflow

- Added a GitHub Actions workflow for pull requests and pushes to `main`.
- Added `check:ci` for CI-safe checks that do not depend on VPS-only backup files or a running production service.
- Added `audit:high` so high/critical dependency findings fail CI while the current moderate upstream Next/PostCSS advisory remains tracked separately.
- Passed `npm run check:ci` on the VPS.

## 2026-05-27 Backend Hardening Commits And GitHub CI

- Committed and pushed the backend hardening batch to GitHub.
- Fixed CI by adding Prisma client generation to `check:ci`.
- Confirmed GitHub Actions CI passed on push to `main`.

## 2026-05-27 Automated UAT Page Smoke

- Added automated page-render UAT smoke for public pages and authenticated admin pages.
- Included `smoke:uat-pages` in full regression.
- Passed standalone UAT page smoke, full `npm run check`, and GitHub Actions CI after push.

## 2026-05-27 Admin UI Foundation Pass

- Started UI work after backend hardening reached a stable checkpoint.
- Added shared admin UI primitives in `apps/web/src/components/admin/ui.tsx` for page shells, headers, buttons, KPI cards, filters, badges, modals, empty states, and pagination.
- Reworked `AdminFrame` into grouped business navigation with lucide icons and clearer desktop/mobile behavior.
- Refactored `/admin/orders` to follow the screen flow more closely: breadcrumb, KPI cards, search, status/payment filters, sortable columns, pagination, empty state, status badges, and cleaner create/detail modal layout.
- Deployed the updated UI to the VPS production container.
- Verified lint, build, production deploy, full regression smoke, UAT page smoke, container health, and post-regression smoke cleanup.

## 2026-05-27 Products UI Flow Pass

- Refactored `/admin/products` to use the shared admin UI primitives.
- Added catalog KPI cards for total products, active products, low stock, reserved stock, and inventory value.
- Added search plus category, status, and stock filters.
- Added sortable table columns, pagination, stock/status badges, and empty state.
- Reworked create/edit product modal to match the new admin form shell and controls.
- Deployed the updated products UI to the VPS production container.
- Verified lint, build, UAT page smoke, production deploy, full regression smoke, container health, and post-regression smoke cleanup.

## 2026-05-27 Inventory UI Flow Pass

- Refactored `/admin/inventory` to use the shared admin UI primitives.
- Added inventory KPI cards for total products, total stock, reserved stock, low stock, out-of-available stock, and inventory value.
- Added search, stock condition filter, sort selector, sortable table columns, pagination, stock badges, and empty state.
- Reworked import/export/adjust inventory modal to match the new admin form shell and show selected SKU context.
- Cleaned a BOM from the inventory page file.
- Deployed the updated inventory UI to the VPS production container.
- Verified lint, build, UAT page smoke, production deploy, full regression smoke, container health, and post-regression smoke cleanup.

## 2026-05-27 Customers UI Flow Pass

- Refactored `/admin/customers` to use the shared admin UI primitives.
- Added CRM KPI cards for total customers, active customers, customers with purchase history, total orders, and total spent.
- Added search plus source, group, and status filters.
- Added sortable table columns, pagination, status badges, and empty state.
- Reworked customer create/edit/detail modals to match the new admin form shell and detail presentation.
- Added `updatedAt` to the customers page payload for recency sorting and detail display.
- Deployed the updated customers UI to the VPS production container.
- Verified lint, build, UAT page smoke, production deploy, full regression smoke, container health, and post-regression smoke cleanup.

## 2026-05-27 Reports UI Flow Pass

- Refactored `/admin/reports` to use the shared admin UI primitives.
- Added report KPI cards with contextual tones and hints for revenue, expenses, estimated profit, inventory value, order completion, receivables, and payables.
- Added report tabs for sales, product sales, inventory, and debts to reduce vertical scanning.
- Reworked report tables with status badges, empty states, row counts, and one active CSV export action.
- Deployed the updated reports UI to the VPS production container.
- Verified lint, build, UAT page smoke, production deploy, full regression smoke, container health, and post-regression smoke cleanup.

## 2026-05-27 Payments UI Flow Pass

- Refactored `/admin/finance/payments` to use the shared admin UI primitives.
- Added payment KPI cards for total transactions, collected amount, remaining receivables, and partial-payment orders.
- Added search, payment method filter, sort selector, sortable table columns, pagination, method badges, and empty state.
- Reworked the payment recording modal to match the new admin form shell and show an empty-order state when all orders are fully paid.
- Deployed the updated payments UI to the VPS production container.
- Verified lint, build, UAT page smoke, production deploy, full regression smoke, container health, and post-regression smoke cleanup.

## 2026-05-28 Root Login Target Fix

- Fixed the root-login loop where visiting `cargo.io.vn/` produced `next=/` and login returned to the public home page.
- Proxy now maps unauthenticated `/` to `/admin/login?next=/admin/dashboard`.
- Proxy now maps authenticated `/` directly to `/admin/dashboard`.
- Login uses a normal POST form to `/admin/login/submit`; the route sets `shoponline.session` and redirects using `Host` / `X-Forwarded-Proto` so it stays on `https://cargo.io.vn`.
- Tightened `/api/admin/settings` auth so inactive users supplied through `sessionToken` are rejected.
- Verified on `https://cargo.io.vn`:
  - No cookie on `/` returns `307 /admin/login?next=%2Fadmin%2Fdashboard`.
  - POST login returns `303 Location: https://cargo.io.vn/admin/dashboard`.
  - With cookie, `/` returns `307 /admin/dashboard`.
  - `/admin/dashboard`, `/admin/products`, `/admin/orders`, and `/admin/settings` return HTTP 200.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-auth`.

## 2026-05-28 Admin Sidebar Navigation Hard Reload

- User still saw menu clicks redirecting back to login even though authenticated page requests returned HTTP 200 with the session cookie.
- Changed admin sidebar navigation in `AdminFrame` from Next client `Link` components to normal `<a href>` anchors.
- This forces each menu click to make a fresh document request with the current `shoponline.session` cookie and avoids stale client-router redirect cache.
- Verified dashboard HTML renders sidebar items as normal anchors for `/admin/products`, `/admin/orders`, and `/admin/settings`.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, `npm run smoke:admin-auth`, and `npm run smoke:admin-ui`.

## 2026-05-28 Inventory Detail Workflow

- Continued product/inventory table workflow polish.
- Added `Xem` row action to `/admin/inventory`.
- Added per-SKU inventory detail modal with:
  - Category, status, last update, min stock.
  - Total stock, reserved stock, available stock.
  - Stock value, cost price, sale price, gross profit per item, gross margin.
  - Recent transactions filtered to the selected SKU.
- Kept import/export/adjust flows unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.

## 2026-05-28 Category Product Drilldown

- Continued product/category table workflow polish.
- Extended `/admin/categories` page query to include products for each category with SKU, status, pricing, inventory, reserved stock, and updated timestamp.
- Added `Xem` row action to the categories table.
- Added category detail modal with:
  - Status, parent category, sort order, last update, description.
  - Total products, active products, available products, and stock availability summary.
  - Product list for that category with SKU, price/promotion price, total stock, reserved stock, available stock, status, and update time.
- Kept create/edit/archive category flows unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.

## 2026-05-28 Catalog Cross Links

- Added query-based quick filters:
  - `/admin/products?search=...`
  - `/admin/products?categoryId=...`
  - `/admin/inventory?search=...`
  - `/admin/categories?search=...`
- Product detail modal now links to the matching inventory row and category search.
- Inventory detail modal now links back to the matching product row.
- Category detail product table now includes `Mở sản phẩm` and `Mở tồn kho` links for each SKU.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified on `https://cargo.io.vn` with a real session cookie that products, inventory, and categories query URLs return HTTP 200.

## 2026-05-28 Low Stock Action Workflow

- Added a `Cần xử lý tồn thấp` panel to `/admin/inventory`.
- The panel lists low/out-of-available SKUs, category, available stock, min stock, and suggested import quantity.
- Added `Lọc tồn thấp` shortcut to set the stock filter and sort by available stock ascending.
- Added `Nhập đề xuất` row action that opens the import modal with suggested quantity and default note `Nhập bổ sung tồn thấp`.
- Low-stock metrics now use available stock (`quantity - reservedQuantity`) compared to `minStock`.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `https://cargo.io.vn/admin/inventory` returns HTTP 200 with a real session cookie and expected inventory text.

## 2026-05-28 Purchase Restock Integration

- Connected the low-stock panel on `/admin/inventory` to the purchase-order workflow.
- Added `Tao don nhap` action per low-stock SKU, linking to `/admin/purchases?productId=...&quantity=...&note=...`.
- Updated `/admin/purchases` to read `productId`, `quantity`, and `note` query params and open the create purchase modal prefilled from the low-stock alert.
- Added product and inventory cross-links inside the purchase detail modal for each purchased SKU.
- Added supplier cross-links from purchase rows and purchase detail modal into `/admin/suppliers?search=...`.
- Added `/admin/suppliers?search=...` quick filter support.
- Added clearer receive guidance and a confirmation prompt before receiving a purchase order because receiving writes inventory transactions and increases stock.
- Kept direct stock import available through the existing `Nhap de xuat` action.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and `https://cargo.io.vn/admin/purchases` plus `https://cargo.io.vn/admin/suppliers?search=test` return HTTP 200 with a real session cookie.

## 2026-05-28 Supplier Purchase Drilldown

- Extended `/admin/suppliers` data with the 5 most recent purchase orders per supplier.
- Reworked the supplier detail modal to show purchase summary metrics:
  - Recent purchase count.
  - Ordered purchases still waiting to receive.
  - Received purchase value.
- Added a purchase history table inside the supplier detail modal with purchase code, status, quantity, total, and handling date.
- Linked each purchase code back to `/admin/purchases?search=...`.
- Kept supplier create/update/archive behavior unchanged.
- Rewrote the supplier client file with clean UTF-8 Vietnamese text to avoid smoke failures from encoding drift.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and `https://cargo.io.vn/admin/suppliers?search=test` plus `https://cargo.io.vn/admin/purchases?search=test` return HTTP 200 with a real session cookie.

## 2026-05-28 Product Table Action Shortcuts

- Added direct row actions on `/admin/products`:
  - `Ton kho` opens `/admin/inventory?search=SKU`.
  - `Nhap` opens `/admin/purchases?productId=...&quantity=...&note=...`.
- Added `Tao don nhap` to the product detail modal next to inventory/category quick links.
- Suggested purchase quantity uses available stock (`quantity - reservedQuantity`) against `minStock`, with a minimum of 1.
- Kept product create/update/archive behavior unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and `https://cargo.io.vn/admin/products`, `/admin/inventory?search=test`, and `/admin/purchases?productId=test&quantity=1&note=from-products` return HTTP 200 with a real session cookie.

## 2026-05-28 Inventory Transaction Drilldown

- Extended inventory transaction payload with `productId`.
- Added `Xem` action to the recent inventory transaction table.
- Added transaction detail modal showing product, SKU, transaction type, recorded quantity, before/after stock, stock delta, timestamp, and note.
- Added quick links from the transaction detail modal back to the matching product and inventory search.
- Kept inventory import/export/adjust backend behavior unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and `https://cargo.io.vn/admin/inventory` plus `https://cargo.io.vn/admin/products?search=test` return HTTP 200 with a real session cookie.

## 2026-05-28 Order Item Cross Links

- Extended `/admin/orders` item payload with `productId`.
- Added product and inventory links under each item in the order detail modal.
- Links use SKU when present and fall back to product name.
- Kept order create/status workflows unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and domain routes `/admin/orders`, `/admin/products?search=test`, and `/admin/inventory?search=test` return HTTP 200 with a real session cookie.

## 2026-05-28 Product Table Bulk Bar

- Added checkbox selection to `/admin/products` rows and the current page header.
- Added a product bulk bar above the table that summarizes selected rows, or the current filtered result when nothing is selected.
- Added quick actions from the bulk bar:
  - Open inventory for the first selected/filtered SKU.
  - Create a purchase order for the first selected/filtered SKU.
  - Export selected/filtered products to CSV with stock and pricing columns.
- Kept product create/update/archive backend behavior unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and domain routes `/admin/products`, `/admin/inventory?search=test`, and `/admin/purchases?productId=test&quantity=1&note=from-products-bulk` return HTTP 200 with a real session cookie.

## 2026-05-28 Inventory Table Bulk Bar

- Added checkbox selection to `/admin/inventory` rows and the current page header.
- Added an inventory bulk bar above the table that summarizes selected rows, or the current filtered result when nothing is selected.
- Added quick actions from the bulk bar:
  - Open product search for the first selected/filtered SKU.
  - Create a purchase order for the first selected/filtered SKU with suggested quantity.
  - Open quick import modal for the first selected/filtered SKU.
  - Export selected/filtered inventory rows to CSV with stock, reserved, available, pricing, and value columns.
- Kept inventory import/export/adjust backend behavior unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and domain routes `/admin/inventory`, `/admin/products?search=test`, and `/admin/purchases?productId=test&quantity=1&note=from-inventory-bulk` return HTTP 200 with a real session cookie.

## 2026-05-28 Order Payment Shipment Links

- Extended `/admin/orders` payload with paid amount and shipment summaries.
- Order detail modal now shows paid, remaining receivable, shipment count, latest shipment carrier/status, and tracking code.
- Added quick links from order detail to:
  - `/admin/finance/payments?search=ORDER_CODE`
  - `/admin/shipments?search=ORDER_CODE`
- Added `search` query support and visible quick-link banners to `/admin/finance/payments` and `/admin/shipments`.
- Kept order, payment, and shipment mutation behavior unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and domain routes `/admin/orders`, `/admin/finance/payments?search=test`, and `/admin/shipments?search=test` return HTTP 200 with a real session cookie.

## 2026-05-28 Payment Shipment Back Links

- Added `search` query support and quick-link banner to `/admin/orders`.
- Added `Mở đơn hàng` quick link under each payment transaction row, pointing to `/admin/orders?search=ORDER_CODE`.
- Added `Mở đơn hàng` and `Mở thanh toán` quick links under each shipment row.
- Kept payment/shipment/order mutation behavior unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and domain routes `/admin/orders?search=test`, `/admin/finance/payments?search=test`, and `/admin/shipments?search=test` return HTTP 200 with a real session cookie.

## 2026-05-28 Payment Shipment Detail Actions

- Added `Xem chi tiết` action to each `/admin/finance/payments` transaction row.
- Added payment detail modal with amount, method, reference, receiver, recorded time, note, and links back to order and shipment searches.
- Added order/payment quick links inside the shipment detail modal.
- Kept payment and shipment mutation behavior unchanged.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, and `npm run smoke:admin-ui`.
- Verified `shoponline-web` is healthy and domain routes `/admin/finance/payments?search=test`, `/admin/shipments?search=test`, and `/admin/orders?search=test` return HTTP 200 with a real session cookie.

## 2026-05-28 Catalog Workflow Smoke

- Added `scripts/smoke-catalog-workflows.ts`.
- The smoke logs in with a generated admin session and verifies:
  - `/admin/products?search=SKU` renders the SKU, CSV action, inventory link, and purchase link.
  - `/admin/inventory?search=SKU` renders the SKU, CSV action, product link, and purchase link.
  - `/admin/orders?search=ORDER_CODE` renders the order code when order data exists.
  - `/admin/finance/payments?search=ORDER_CODE` renders payment rows and order back-links when payment data exists.
  - `/admin/shipments?search=ORDER_CODE` renders shipment rows plus order/payment back-links when shipment data exists.
- Added `smoke:catalog-workflows` to `package.json` and included it in `smoke:regression`.
- No runtime app code changed in this pass, so production container rebuild was not required.
- Verified `npm run smoke:catalog-workflows`, `npm run lint`, `npm run build`, and `npm run smoke:admin-ui`.

## 2026-05-28 Product Inventory Server CSV Export

- Added authenticated server CSV export endpoints:
  - `/api/admin/products/export`
  - `/api/admin/inventory/export`
- Product export supports current table filters through `search`, `categoryId`, `status`, and `stock` query params.
- Inventory export supports current table filters through `search` and `stock` query params.
- Added `Tải CSV` links to the product and inventory bulk bars while keeping the existing client-side selected-row `Xuất CSV` action.
- Extended `smoke:catalog-workflows` to verify the CSV endpoints return `text/csv` and include the expected SKU.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, `npm run smoke:admin-ui`, and `npm run smoke:catalog-workflows`.
- Verified `shoponline-web` is healthy and domain CSV endpoints `/api/admin/products/export` plus `/api/admin/inventory/export` return HTTP 200 with `text/csv`.

## 2026-05-28 Purchase Supplier Server CSV Export

- Added authenticated server CSV export endpoints:
  - `/api/admin/purchases/export`
  - `/api/admin/suppliers/export`
- Purchase export supports `search` and `status`, flattening purchase items into CSV rows.
- Supplier export supports `search` and `status`, including open debt, debt count, and purchase count.
- Added `Tai CSV` links to `/admin/purchases` and `/admin/suppliers` list pages.
- Added `/admin/purchases?search=...` initial quick filter support.
- Extended `smoke:catalog-workflows` to verify purchase/supplier pages and CSV endpoints.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, `npm run smoke:admin-ui`, and `npm run smoke:catalog-workflows`.
- Verified `shoponline-web` is healthy and domain routes `/api/admin/purchases/export`, `/api/admin/suppliers/export`, `/admin/purchases?search=test`, and `/admin/suppliers?search=test` return HTTP 200 with a real session cookie; CSV endpoints return `text/csv`.

## 2026-05-28 Finance Server CSV Export

- Added authenticated server CSV export endpoints:
  - `/api/admin/finance/debts/export`
  - `/api/admin/finance/expenses/export`
- Debt export supports `search`, `type`, and `status`, including party name/phone, amount, paid amount, remaining amount, due date, and note.
- Expense export supports `search`, `category`, and `status`, including title, category, amount, created/updated time, and note.
- Added `Tai CSV` links to `/admin/finance/debts` and `/admin/finance/expenses` list pages.
- Added `/admin/finance/debts?search=...` and `/admin/finance/expenses?search=...` initial quick filter support.
- Extended `smoke:catalog-workflows` to verify finance debt/expense pages and CSV endpoints.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, `npm run smoke:admin-ui`, and `npm run smoke:catalog-workflows`.
- Verified `shoponline-web` is healthy and domain routes `/api/admin/finance/debts/export`, `/api/admin/finance/expenses/export`, `/admin/finance/debts?search=test`, and `/admin/finance/expenses?search=test` return HTTP 200 with a real session cookie; CSV endpoints return `text/csv`.

## 2026-05-29 Payment Shipment Server CSV Export

- Added authenticated server CSV export endpoints:
  - `/api/admin/finance/payments/export`
  - `/api/admin/shipments/export`
- Payment export supports `search` and `method`, including order code, customer, order total, payment status, payment amount, method, reference, receiver, timestamp, and note.
- Shipment export supports `search` and `status`, including order code, customer, order status, carrier, service, tracking code, shipping fee, status, shipping/delivery timestamps, creator, and note.
- Added `Tai CSV` links to `/admin/finance/payments` and `/admin/shipments` list pages.
- Extended `smoke:catalog-workflows` to verify payment/shipment pages show CSV actions and both CSV endpoints return matching order data.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, `npm run smoke:admin-ui`, and `npm run smoke:catalog-workflows`.
- Verified `shoponline-web` is healthy and domain routes `/api/admin/finance/payments/export`, `/api/admin/shipments/export`, `/admin/finance/payments?search=test`, and `/admin/shipments?search=test` return HTTP 200 with a real session cookie; CSV endpoints return `text/csv`.

## 2026-05-29 Orders Customers Server CSV Export

- Added authenticated server CSV export endpoints:
  - `/api/admin/orders/export`
  - `/api/admin/customers/export`
- Order export supports `search`, `status`, and `payment`, including order code, customer contact, order/payment status, total, paid, remaining, item summary, latest shipment summary, timestamps, and note.
- Customer export supports `search`, `source`, `group`, and `status`, including contact, address, source/group, order count, total spent, updated time, and notes.
- Added `Tai CSV` links to `/admin/orders` and `/admin/customers` list pages.
- Added `/admin/customers?search=...` initial quick filter support.
- Extended `smoke:catalog-workflows` to verify order/customer pages show CSV actions and both CSV endpoints return matching data.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, `npm run smoke:admin-ui`, and `npm run smoke:catalog-workflows`.
- Verified `shoponline-web` is healthy and domain routes `/api/admin/orders/export`, `/api/admin/customers/export`, `/admin/orders?search=test`, and `/admin/customers?search=test` return HTTP 200 with a real session cookie; CSV endpoints return `text/csv`.

## 2026-05-29 Business UAT Smoke

- Added `scripts/smoke-business-uat.ts`.
- Added `npm run smoke:business-uat`.
- Included `smoke:business-uat` in `npm run smoke:regression`.
- The business UAT smoke creates a real end-to-end admin workflow:
  - Create category and product with inventory through admin APIs.
  - Create a customer and admin order.
  - Verify reserved inventory after order creation.
  - Record partial payment and verify `PARTIAL` payment status.
  - Record final payment and verify `PAID` payment status.
  - Create shipment, transition it to `SHIPPED`, and verify shipment status.
  - Complete the order and verify `COMPLETED` order status.
  - Verify order/customer/product/inventory/payment/shipment admin pages by query deep links.
  - Verify order/customer/product/inventory/payment/shipment CSV exports include the created UAT data.
- Verified standalone `npm run smoke:business-uat`.
- Verified `npm run lint`, `npm run build`, `npm run smoke:prod`, `npm run smoke:admin-ui`, `npm run smoke:catalog-workflows`, and `npm run smoke:business-uat`.
- Verified `shoponline-web` is healthy after the UAT smoke run.

## 2026-05-29 UAT Cleanup Coverage

- Extended `scripts/cleanup-smoke-data.ts` to explicitly match Business UAT markers:
  - Product SKU prefix `UAT-SKU-`
  - Product slug prefix `uat-product-`
  - Category slug prefix `uat-cat-`
  - Customer name prefix `UAT Customer`
  - Customer email prefix `uat-`
  - Customer source `UAT`
  - Order/purchase/payment/inventory notes containing `uat`
  - Payment reference prefix `UAT-`
  - Shipment tracking prefix `UATTRK`
- Kept cleanup guarded as before: default is dry-run, destructive cleanup still requires `CONFIRM_SMOKE_CLEANUP=yes`.
- Verified `npm run smoke:cleanup` dry-run on VPS after the matcher update.
- Dry-run matched 74 rows/actions, up from 60 before the explicit UAT matchers, confirming the new UAT product/category/inventory records are covered.

## 2026-05-29 Tracking Reconciliation

- Extended `findTrackingOrder` to return:
  - Paid amount.
  - Remaining amount.
  - Latest shipment carrier/service/tracking/status/shipped/delivered timestamps.
- Rebuilt `/tracking` so a searched order shows:
  - Order status and payment status.
  - Paid amount.
  - Remaining receivable.
  - Latest shipment summary.
  - Shipment details when present.
  - Item and total breakdown.
- Updated `smoke:tracking` to create a payment and shipment, then verify tracking-service and tracking page reconciliation fields.
- Updated `smoke:public-flow` to use an authenticated session cookie because public routes are intentionally locked, and removed the old root-home storefront assumption.
- Verified `npm run lint`, `npm run build`, Docker web redeploy, `npm run smoke:prod`, `npm run smoke:tracking`, and `npm run smoke:public-flow`.
- Verified `shoponline-web` is healthy and `https://cargo.io.vn/tracking?code=missing-smoke-check` returns HTTP 200 with a real session cookie.

## 2026-05-29 Operator Handoff And Readiness

- Added `OPERATOR_HANDOFF.md` with:
  - Access URL and current admin login.
  - Daily operator checklist.
  - Before-real-usage smoke checklist.
  - Dry-run and confirmed smoke/UAT data cleanup instructions.
  - Deploy, health, backup, and key admin page references.
  - CSV export coverage summary.
- Updated `scripts/smoke-readiness.ts` to match current production behavior:
  - Root `/` should redirect to `/admin/login?next=/admin/dashboard`.
  - `/admin/login` should render the admin login and should not include the removed public-site loop link.
  - `/api/health` should return ok.
  - Basic mojibake guard remains.
- Updated `DEPLOYMENT.md` to link the operator handoff, document public route locking, readiness smoke, and smoke/UAT data cleanup.
- Verified `npm run smoke:readiness`, `npm run smoke:prod`, and `npm run smoke:cleanup` dry-run on VPS.
- Latest dry-run matched 97 smoke/UAT rows/actions after recent UAT/tracking smoke runs; no destructive cleanup was run.
