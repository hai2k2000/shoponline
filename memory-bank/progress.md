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


## 2026-05-27 VPS Auth Foundation

- Added admin login/logout.
- Added signed session cookie.
- Protected admin routes with middleware.
- Dashboard now requires current user and reads DB metrics dynamically.
- Rebuilt and redeployed `shoponline-web`.
- Browser auth smoke passed on VPS.

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
