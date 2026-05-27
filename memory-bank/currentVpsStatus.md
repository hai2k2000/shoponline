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

## 2026-05-27 Products CRUD Update

- Replaced `/admin/products` placeholder with a real Prisma-backed CRUD screen.
- Added list-first product management with search, category filter, status filter, create/edit modal, and archive action.
- Product create supports category, SKU, slug, prices, status, thumbnail URL, descriptions, min stock, and initial stock.
- Initial stock creates `Inventory` and an `InventoryTransaction`.
- Product mutations write `ActivityLog`.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login.
  - Create product.
  - Search product by SKU.
  - Edit product.
  - Archive product.
  - Verify archived status.

## 2026-05-27 Inventory Module Update

- Replaced `/admin/inventory` placeholder with a real Prisma-backed inventory module.
- Added inventory KPI cards: products, total quantity, inventory value, low stock.
- Added stock table with search and stock filters.
- Added recent `InventoryTransaction` table.
- Added import, export, and adjust stock modal workflows.
- Export prevents negative available stock.
- Every import/export/adjust writes `InventoryTransaction` and `ActivityLog`.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login.
  - Import stock.
  - Export stock.
  - Adjust stock.
  - Verify transaction notes.

## 2026-05-27 Customers CRUD Update

- Replaced `/admin/customers` placeholder with a real Prisma-backed customer module.
- Added `Customer.status`, `Customer.createdAt`, and `Customer.updatedAt` migrations.
- Added list-first customer management with search, source/group/status filters, detail modal, create/edit modal, and archive action.
- Customer mutations write `ActivityLog`.
- Mutation UI now reloads after save/archive so the table reflects database state immediately.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login.
  - Create customer.
  - Search customer by phone.
  - View detail.
  - Edit customer.
  - Archive customer.
  - Verify archived status in the table.

## 2026-05-27 Suppliers CRUD Update

- Added `/admin/suppliers` as a real Prisma-backed supplier module.
- Added `Supplier.status`, `Supplier.createdAt`, and `Supplier.updatedAt` migration.
- Added list-first supplier management with search, status filter, detail modal, create/edit modal, and archive action.
- Supplier mutations write `ActivityLog`.
- Dashboard now links to supplier management.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login.
  - Create supplier.
  - Search supplier by tax code.
  - View detail.
  - Edit supplier.
  - Archive supplier.
  - Verify archived status in the table.

## 2026-05-27 Orders Workflow Update

- Replaced `/admin/orders` placeholder with a real Prisma-backed order workflow.
- Added list-first order management with search, status filter, detail modal, and create order modal.
- Create order validates available stock and increases `Inventory.reservedQuantity`.
- Order status updates support confirm, complete, cancel, and return.
- Completing an order exports stock, writes `InventoryTransaction`, marks payment paid, and updates customer totals.
- Cancelling an order releases reserved stock.
- Returning a completed order restores stock and writes a return transaction.
- Order mutations write `ActivityLog`.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login.
  - Create order.
  - Search order by note.
  - View order detail.
  - Confirm order.
  - Complete order.
  - Verify completed status in the table.

## 2026-05-27 Finance CRUD Update

- Added finance management fields:
  - `Expense.status`
  - `Expense.updatedAt`
  - `Debt.note`
  - `Debt.createdAt`
  - `Debt.updatedAt`
- Replaced `/admin/finance/expenses` placeholder with a real expense CRUD module.
- Expense module supports search, category/status filters, detail modal, create/edit modal, and archive action.
- Replaced `/admin/finance/debts` placeholder with a real debt module.
- Debt module supports customer receivables, supplier payables, partial payment updates, closing debts, search, type/status filters, and detail modal.
- Finance mutations write `ActivityLog`.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login.
  - Create expense.
  - Edit expense.
  - Create customer debt.
  - Record debt payment.
  - Verify paid status in the table.

## 2026-05-27 Dashboard Update

- Rebuilt `/admin/dashboard` with readable Vietnamese text.
- Dashboard now reads real runtime metrics:
  - Completed revenue.
  - Estimated profit.
  - Today/month order counts.
  - Receivables and payables.
  - Monthly active expenses.
  - Low stock count.
  - Product/category/customer/supplier/order totals.
- Added recent order table and quick navigation.
- Build and Docker redeploy passed.
- Browser dashboard smoke passed.

## 2026-05-27 Reports Update

- Replaced `/admin/reports` placeholder with a real report page.
- Added report summary metrics:
  - Revenue.
  - Expenses.
  - Estimated profit.
  - Inventory value.
  - Order counts.
  - Receivables and payables.
- Added report tables:
  - Sales report.
  - Product sales report.
  - Inventory report.
  - Debt report.
- Added CSV export buttons in the browser.
- Build and Docker redeploy passed.
- Browser reports smoke passed, including CSV button click.

## 2026-05-27 Users/RBAC Update

- Replaced `/admin/users` placeholder with a real user management module.
- Added admin/manager guard for user management page and actions.
- User module supports:
  - Create user.
  - Update name/email/role/status.
  - Reset password.
  - Archive user.
- Prevented current user from archiving their own account through the UI/action.
- User mutations write `ActivityLog`.
- Build and Docker redeploy passed.
- Browser smoke passed:
  - Login as admin.
  - Create a sales user.
  - Reset password.
  - Logout.
  - Login as the new user.

## 2026-05-27 Settings Update

- Replaced `/admin/settings` placeholder with a real store settings module.
- Settings supports:
  - Store name.
  - Logo URL.
  - Phone.
  - Email.
  - Address.
  - Default shipping fee.
  - Inventory strategy.
- Settings mutation writes `ActivityLog`.
- Build and Docker redeploy passed.
- Browser settings smoke passed.

## 2026-05-27 Public Storefront Update

- Rebuilt public home page with real store settings and latest products.
- Replaced `/products` placeholder with real public product listing from active products and available inventory.
- Added localStorage cart at `/cart`.
- Added public checkout at `/checkout`.
- Public checkout creates a customer, creates an order, reserves stock, and writes `ActivityLog`.
- Added `/tracking?code=...` order lookup.
- Build and Docker redeploy passed.
- Browser storefront smoke passed:
  - Open products.
  - Add product to cart.
  - Checkout.
  - Receive order code.
  - Track order by code.

## 2026-05-27 Admin Layout And Production Hardening

- Added shared admin shell with sidebar/top navigation at `/admin/layout.tsx`.
- Login page is excluded from the admin shell automatically.
- Added responsive smoke across desktop and mobile viewports for key public/admin pages.
- Added `/api/health` endpoint with database check.
- Added production smoke script: `npm run smoke:prod`.
- Added Postgres backup script: `npm run backup:postgres`.
- Added backup retention default of 14 days.
- Updated `DEPLOYMENT.md` with deploy, health check, backup, Docker cleanup, and reverse proxy guidance.
- Verified:
  - Web build passed.
  - Docker redeploy passed.
  - Production smoke passed.
  - Manual Postgres backup produced a `.sql.gz` file.

## 2026-05-27 VPS Production Config Update

- Rotated `/opt/shoponline/.env` and `/opt/shoponline/apps/web/.env` `AUTH_SECRET` to a generated strong secret.
- Backed up old env files to timestamped `.env.backup.*` files.
- Restarted `shoponline-web` and verified production smoke passes after secret rotation.
- Added active cron jobs:
  - `/etc/cron.d/shoponline-postgres-backup`
  - `/etc/cron.d/shoponline-healthcheck`
- Verified cron commands manually:
  - Healthcheck logs pass.
  - Postgres backup created a `.sql.gz` file.

## 2026-05-27 Container Health And Log Rotation

- Added Docker healthchecks in `compose.yaml`:
  - `shoponline-web` checks `/api/health`.
  - `shoponline-postgres` checks `pg_isready`.
  - `shoponline-redis` checks `redis-cli ping`.
- Improved `scripts/smoke-production.sh` with retry/wait behavior for post-restart checks.
- Added `/etc/logrotate.d/shoponline` for:
  - `/var/log/shoponline-healthcheck.log`
  - `/var/log/shoponline-postgres-backup.log`
- Verified:
  - `docker compose config` passes.
  - Web build passes.
  - Docker redeploy passes.
  - Production smoke passes.
  - All ShopOnline containers report `healthy`.

## 2026-05-27 Proxy, Security Headers, Restore Script

- Replaced deprecated `apps/web/src/middleware.ts` with `apps/web/src/proxy.ts`.
- Verified Next.js build no longer shows the middleware deprecation warning.
- Added baseline security headers in `apps/web/next.config.ts`:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Added `scripts/restore-postgres.sh`.
- Added `npm run restore:postgres`.
- Restore script requires `CONFIRM_RESTORE=yes` and refuses accidental restores.
- Verified:
  - Web build passes.
  - Docker redeploy passes.
  - Production smoke passes.
  - Headers are present.
  - Restore guard works.

## 2026-05-27 Automation Foundation

- Added `AutomationRun` Prisma model and migration.
- Added `npm run automation:run`.
- Added automation jobs:
  - Low stock alert.
  - Purchase suggestions.
  - Debt reminders and overdue marking.
  - New order follow-up after 24 hours.
  - Daily operational report.
- Added `/admin/automation` page to review latest automation runs and history.
- Added Automation link to admin navigation.
- Added active cron:
  - `/etc/cron.d/shoponline-automation`
- Added `/var/log/shoponline-automation.log` to ShopOnline logrotate config.
- Verified:
  - Migration applied.
  - Automation command runs.
  - Web build passes.
  - Docker redeploy passes.
  - Production smoke passes.
  - `/admin/automation` browser smoke passes.

## 2026-05-27 Domain Switch

- Switched `https://cargo.io.vn` from the old cargo proxy target to ShopOnline.
- Changed only `/etc/nginx/sites-available/cargo.io.vn.conf`.
- Previous target was `http://127.0.0.1:3100`.
- New target is `http://127.0.0.1:3002`.
- Backup created:
  - `/etc/nginx/sites-available/cargo.io.vn.conf.backup.20260527-131838`
- Verified:
  - `nginx -t` passes.
  - Nginx reload succeeded.
  - `https://cargo.io.vn` returns ShopOnline HTML.
  - `https://cargo.io.vn/api/health` returns `ok: true`.
  - `BASE_URL=https://cargo.io.vn npm run smoke:prod` passes.
  - Diff confirms only the `proxy_pass` line changed.
## 2026-05-27 Payment Transactions Update

- Added `PaymentTransaction` Prisma model and migration.
- Linked payments to `Order` and optional receiving `User`.
- Added `/admin/finance/payments` for recording real payment receipts.
- Payment records store amount, method, reference, note, receiver, and timestamp.
- Order payment status now updates from actual payment totals instead of order completion.
- Build, Docker redeploy, production smoke, and browser payment smoke passed.

## 2026-05-27 Shipment Update

- Added `Shipment` Prisma model, `ShipmentStatus` enum, and migration.
- Linked shipments to `Order` and optional creating `User`.
- Added `/admin/shipments` for carrier, service, tracking code, shipping fee, status, and delivery notes.
- Added POST route handlers for creating shipments and updating shipment status.
- Marking a shipment as `SHIPPED` syncs the order to `SHIPPING`; inventory completion remains in the order workflow.
- Build, Docker redeploy, production smoke, and browser shipment smoke passed.

## 2026-05-27 Purchase Order Update

- Added `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseOrderStatus`, and migration.
- Added `/admin/purchases` for supplier purchase orders and receiving goods into inventory.
- Receiving a purchase order increases stock and writes `InventoryTransaction` records with type `IMPORT`.
- Added admin POST route handlers for purchase creation and status updates.
- Fixed admin POST route redirects to respect forwarded HTTPS host.
- Build, Docker redeploy, production smoke, shipment smoke, and purchase smoke passed.

## 2026-05-27 Notification Update

- Added `Notification` Prisma model, `NotificationLevel` enum, and migration.
- Added `/admin/notifications` for unread/read system notifications.
- Added read and read-all admin POST routes.
- Purchase receiving now creates a success notification for the receiving admin.
- Build, Docker redeploy, production smoke, purchase smoke, and notification smoke passed.

## 2026-05-27 Customer Timeline Update

- Added `CustomerTimeline` Prisma model, `CustomerTimelineType` enum, and migration.
- Added `/admin/customers/timeline` for customer care notes, calls, messages, support, and order events.
- Added admin POST route for creating customer timeline entries.
- Creating an order for a known customer now writes an `ORDER` timeline event.
- Build, Docker redeploy, production smoke, and customer timeline smoke passed.

## 2026-05-27 Return and Refund Update

- Added `ReturnRequest`, `RefundTransaction`, `ReturnStatus`, and migration.
- Added `/admin/returns` for return requests, approval, receiving returned goods, and refunding.
- Receiving a return restores inventory only for completed orders to avoid double-counting stock.
- Refunding creates `RefundTransaction`, updates the order to `RETURNED`, and marks payment as `REFUNDED`.
- Build, Docker redeploy, production smoke, and return/refund smoke passed.

## 2026-05-27 Promotion Update

- Added `Promotion` Prisma model, `DiscountType` enum, and migration.
- Added `/admin/promotions` for creating and toggling coupon codes.
- Checkout now accepts coupon codes, validates active dates, usage limits, minimum order, and calculates fixed or percent discounts.
- Coupon usage increments after successful checkout.
- Build, Docker redeploy, production smoke, and promotion checkout smoke passed.

## 2026-05-27 Audit Log Update

- Added `/admin/audit` to inspect existing `ActivityLog` records.
- Audit page includes search, entity type filter, operational metrics, and the latest 500 activity entries.
- Build, Docker redeploy, production smoke, and audit page smoke passed.

## 2026-05-27 Backend Hardening Update

- Converted admin payment recording from Server Action form submit to `/api/admin/payments` POST route.
- Payment POST route verifies cookie session and falls back to the signed hidden session token used by server-rendered admin pages.
- Payment form now redirects through the production host correctly and no longer depends on flaky Server Action POST cookies.
- Build, Docker redeploy, production smoke, and payment browser smoke passed.
- Converted admin order creation and order status transitions to `/api/admin/orders` and `/api/admin/orders/status` POST routes.
- Order POST routes use the same cookie/session-token fallback and production-host redirects.
- Admin order creation and status transition smoke passed.
- Converted inventory import/export/adjust to `/api/admin/inventory` POST route.
- Inventory route validates archived products, available stock for export, and reserved stock constraints for adjustment.
- Inventory import smoke passed with stock increase and `IMPORT` transaction verification.

## 2026-05-27 Customers And Suppliers Hardening Update

- Converted customer create/update to `/api/admin/customers`.
- Converted customer archive to `/api/admin/customers/archive`.
- Converted supplier create/update to `/api/admin/suppliers`.
- Converted supplier archive to `/api/admin/suppliers/archive`.
- Customer and supplier pages now pass `SESSION_COOKIE` token into client forms.
- Route handlers use cookie auth first, then `sessionToken` fallback for proxied/admin POST flows.
- Redirects use `x-forwarded-proto` and `x-forwarded-host`.
- Added `/tmp/shoponline-customers-suppliers-smoke.js`.
- Build, Docker redeploy, customers/suppliers smoke, and `npm run smoke:prod` passed.

## 2026-05-27 Products And Categories Hardening Update

- Converted category create/update to `/api/admin/categories`.
- Converted category archive to `/api/admin/categories/archive`.
- Converted product create/update to `/api/admin/products`.
- Converted product archive to `/api/admin/products/archive`.
- Product/category pages now pass `SESSION_COOKIE` token into client forms.
- Route handlers use cookie auth first, then `sessionToken` fallback for proxied/admin POST flows.
- Product create still initializes inventory and writes an initial `IMPORT` transaction when stock is provided.
- Added `/tmp/shoponline-products-categories-smoke.js`.
- Build, Docker redeploy, products/categories smoke, and `npm run smoke:prod` passed.

## 2026-05-27 Finance Hardening Update

- Converted expense create/update to `/api/admin/expenses`.
- Converted expense archive to `/api/admin/expenses/archive`.
- Converted debt create/update to `/api/admin/debts`.
- Converted debt payment recording to `/api/admin/debts/payment`.
- Converted debt close to `/api/admin/debts/close`.
- Expense/debt pages now pass `SESSION_COOKIE` token into client forms.
- Route handlers use cookie auth first, then `sessionToken` fallback for proxied/admin POST flows.
- Added `/tmp/shoponline-finance-hardening-smoke.js`.
- Build, Docker redeploy, finance smoke, and `npm run smoke:prod` passed.

## 2026-05-27 Admin API RBAC Consolidation

- Added shared `apps/web/src/lib/admin-api.ts` helper for admin route auth, session-token fallback, proxy-aware redirects, and backend permission checks.
- Consolidated duplicated admin `getCurrentUserFromForm` and proxy URL helper logic into the shared helper.
- Applied backend RBAC checks to category, product, customer, supplier, inventory, order, finance, shipment, purchase, return, promotion, notification, and customer timeline POST routes.
- Build passed on VPS after the refactor.

## 2026-05-27 Users And Settings Route Handler Update

- Added `/api/admin/users`, `/api/admin/users/archive`, and `/api/admin/users/reset-password` route handlers.
- Added `/api/admin/settings` route handler.
- Updated users and settings admin pages to submit to API routes with `sessionToken` fallback instead of direct Server Actions.
- Build passed on VPS after the update.

## 2026-05-27 Core Backend Service Layer

- Added `apps/web/src/lib/admin-form.ts` with Zod-based `FormData` parsing helpers and typed admin form errors.
- Added service layer modules:
  - `inventory-service.ts`
  - `order-service.ts`
  - `payment-service.ts`
  - `purchase-service.ts`
  - `return-service.ts`
- Refactored inventory, order, payment, purchase, and return route handlers so routes handle auth/validation/redirect while services handle transactions and business rules.
- Added `scripts/smoke-admin-core.ts` and `npm run smoke:admin-core` for HTTP smoke coverage of inventory import, order creation/completion, payment recording, purchase creation, and purchase receiving.
- Docker redeploy passed.
- `npm run smoke:prod` and `npm run smoke:admin-core` passed on VPS.

## 2026-05-27 CRM And Finance Service Layer

- Added service modules:
  - `customer-service.ts`
  - `supplier-service.ts`
  - `expense-service.ts`
  - `debt-service.ts`
- Refactored customer, supplier, expense, and debt route handlers to use Zod form validation and service-layer mutations.
- Added `scripts/smoke-admin-crm-finance.ts` and `npm run smoke:admin-crm-finance`.
- Smoke covers customer create/update/archive, supplier create/update/archive, expense create/update/archive, debt create/payment/close.
- Docker redeploy passed.
- `npm run smoke:prod`, `npm run smoke:admin-core`, and `npm run smoke:admin-crm-finance` passed on VPS.

## 2026-05-27 Catalog And Admin System Service Layer

- Added service modules:
  - `catalog-service.ts`
  - `promotion-service.ts`
  - `shipment-service.ts`
  - `admin-system-service.ts`
- Refactored category, product, promotion, shipment, notification, customer timeline, settings, and user route handlers to use Zod validation and service-layer mutations.
- Added `scripts/smoke-admin-catalog-system.ts` and `npm run smoke:admin-catalog-system`.
- Smoke covers category/product create/archive, promotion create/toggle, settings update, notification read, customer timeline note, shipment create/status.
- Docker redeploy passed.
- `npm run smoke:prod`, `npm run smoke:admin-core`, `npm run smoke:admin-crm-finance`, and `npm run smoke:admin-catalog-system` passed on VPS.

## 2026-05-27 Admin Error Handling And Regression Smoke

- Added shared admin route error redirects for typed validation, business-rule, and not-found failures.
- Refactored admin POST routes to redirect with consistent `error` and `message` query params instead of returning HTTP 500 for expected failures.
- Added `scripts/smoke-admin-negative.ts` and `npm run smoke:admin-negative`.
- Negative smoke covers RBAC denial, validation failure, and not-found handling.
- Added aggregate smoke scripts:
  - `npm run smoke:admin`
  - `npm run smoke:regression`
- Removed legacy admin Server Action mutation files that were replaced by `/api/admin/*` route handlers.
- Remaining Server Actions are admin login and public checkout only.
- Build, Docker redeploy, `npm run smoke:regression`, and container health check passed.

## 2026-05-27 Admin Auth Smoke

- Added `scripts/smoke-admin-auth.ts` and `npm run smoke:admin-auth`.
- Added it to the aggregate `npm run smoke:admin` chain.
- Smoke covers unauthenticated admin dashboard redirect, authenticated dashboard access, tampered cookie rejection, unauthenticated admin POST rejection, inactive session-token rejection, and role denial for settings.
- `npm run smoke:admin-auth` and `npm run smoke:regression` passed on VPS.
- `npm audit` still reports 2 moderate findings from `next@16.2.6` depending on `postcss@8.4.31`; `next@latest` is still `16.2.6`, so this remains an upstream dependency issue rather than a safe local upgrade.

## 2026-05-27 Admin Error Coverage Completion

- Wrapped remaining catalog, CRM, finance, promotion, notification, shipment, user, and settings admin route handlers with `redirectWithAdminError`.
- Confirmed every `/api/admin/*` route that calls `parseAdminForm` now also imports/uses `redirectWithAdminError`.
- Expanded `scripts/smoke-admin-negative.ts` to cover category missing ID, customer archive missing ID, debt missing customer, and short user password validation.
- Build, Docker redeploy, `npm run smoke:regression`, and container health check passed.

## 2026-05-27 Public Checkout Service Layer

- Added `apps/web/src/server/services/checkout-service.ts`.
- Refactored public `checkoutAction` to parse form data, call `createPublicCheckoutOrder`, and return controlled user-facing errors.
- Checkout transaction logic now lives in the service layer: customer creation, inventory reservation, promotion validation/usage increment, order creation, and activity logging.
- Added `scripts/smoke-checkout.ts` and `npm run smoke:checkout`.
- `npm run smoke:regression` now includes checkout smoke after production and admin smoke.
- Checkout smoke covers successful checkout totals, inventory reservation, promotion usage, activity log creation, low-stock failure, and exhausted-coupon failure.
- Build, Docker redeploy, `npm run smoke:regression`, and container health check passed.

## 2026-05-27 Reporting Service Layer

- Added `apps/web/src/server/services/reporting-service.ts`.
- Moved admin reports aggregation out of `admin/reports/page.tsx` into `getReportsData`.
- Moved admin dashboard metrics/recent-orders aggregation out of `admin/dashboard/page.tsx` into `getDashboardData`.
- Added `scripts/smoke-reporting.ts` and `npm run smoke:reporting`.
- Added reporting smoke to `npm run smoke:regression`.
- Reporting smoke covers revenue, expenses, receivable/payable, inventory valuation/availability, product-sales revenue/profit, low-stock dashboard count, and recent dashboard order presence.
- Build, Docker redeploy, `npm run smoke:regression`, and container health check passed.

## 2026-05-27 Public Tracking Service Layer

- Added `apps/web/src/server/services/tracking-service.ts`.
- Refactored `/tracking` page to use `findTrackingOrder` DTO output instead of querying Prisma directly in the page.
- Tracking lookup now normalizes order codes to uppercase and returns only customer/order/item fields needed by the public page.
- Added `scripts/smoke-tracking.ts` and `npm run smoke:tracking`.
- Added tracking smoke to `npm run smoke:regression`.
- Tracking smoke covers service lookup with lowercase code, missing-order null result, HTTP render for an existing order, and HTTP render for the missing-order state.
- Build, Docker redeploy, `npm run smoke:regression`, and container health check passed.

## 2026-05-27 Production Deploy Runbook Script

- Added `scripts/deploy-production.sh`.
- Added `npm run deploy:prod`.
- Deploy script performs Postgres backup, app build, Docker rebuild/restart for `shoponline-web`, health wait, and full `npm run smoke:regression`.
- Added optional switches:
  - `SKIP_BACKUP=yes`
  - `SKIP_BUILD=yes`
  - `SKIP_REGRESSION=yes`
- Updated `DEPLOYMENT.md` to make `npm run deploy:prod` the standard production deploy path.
- Ran `npm run deploy:prod` successfully on the VPS.
- Verified a non-empty backup was created at `/opt/shoponline/backups/postgres/shoponline-20260527-200434.sql.gz`.
- Container health check passed after deploy.

## 2026-05-27 Backup Restore Verification

- Added `scripts/verify-postgres-backup.sh`.
- Added `npm run backup:verify`.
- Backup verification checks gzip integrity, creates a temporary Postgres database, restores the backup into it, verifies public tables exist, and drops the temporary database on exit.
- `deploy:prod` now runs `backup:verify` after creating a backup unless `SKIP_BACKUP_VERIFY=yes` is set.
- Updated `DEPLOYMENT.md` with backup verification commands.
- Verified latest backup manually with `npm run backup:verify`; restore passed with 25 public tables.
- Ran `npm run deploy:prod` successfully with backup verification included.
- Latest verified deploy backup: `/opt/shoponline/backups/postgres/shoponline-20260527-200845.sql.gz`.
- Confirmed no `shoponline_verify_*` temporary databases remain and `shoponline-web` is healthy.

## 2026-05-27 CI Check Command And Lint Baseline

- Added root `npm run check`.
- `check` runs:
  - `npm run lint`
  - `npm run build`
  - `npm run backup:verify`
  - `npm run smoke:regression`
- Fixed lint errors in:
  - `apps/web/src/app/admin/audit/AuditClient.tsx`
  - `apps/web/src/app/cart/page.tsx`
  - `apps/web/src/app/checkout/page.tsx`
- Silenced the intentional raw `<img>` usage warning in `PublicProductsClient` to keep lint output clean while avoiding Next image domain config risks for arbitrary admin thumbnail URLs.
- Ran `npm run check` successfully with clean lint, build, backup verify, and full regression smoke.
- Ran `npm run deploy:prod` successfully after the lint/check update.
- Latest deploy-created backup: `/opt/shoponline/backups/postgres/shoponline-20260527-201620.sql.gz`.
- `shoponline-web` is healthy.

## 2026-05-27 GitHub Actions CI Workflow

- Added `.github/workflows/ci.yml`.
- Added root `npm run check:ci`.
- Added root `npm run audit:high`.
- GitHub Actions workflow runs on pull requests and pushes to `main`.
- CI steps:
  - checkout
  - setup Node 22 with npm cache
  - `npm ci`
  - `npm run check:ci`
- `check:ci` runs lint, build, and high/critical audit gate.
- Verified `npm run check:ci` passes on the VPS.
- Current npm audit still reports only the known 2 moderate Next/PostCSS findings, so the high/critical gate passes.
