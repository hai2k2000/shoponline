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
