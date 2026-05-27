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
