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
