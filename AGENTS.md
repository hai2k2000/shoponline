# AGENTS.md

## Project

Business Hub / ShopOnline is an online selling and business operations platform.

Primary goals:

- Public ecommerce storefront.
- Admin dashboard for sales, products, inventory, customers, suppliers, orders, finance, reports, users, and settings.
- Real database driven workflows.
- Permission checks on frontend and backend.
- Future automation and AI layers.

Git/VPS context:

- GitHub: `https://github.com/hai2k2000/shoponline.git`
- VPS path: `/opt/shoponline`
- Reserved ports:
  - Web: `3002`
  - API: `4001`
  - Postgres: `5434`
  - Redis: `6381`
- SmartTour already uses `3001/4000/5433/6380`; do not reuse those ports.

## Source Documents

Read these files before major implementation decisions:

- `PROJECT_REQUIREMENTS.md`
- `DATABASE_SCHEMA.md`
- `SCREEN_FLOW.md`
- `UI_UX_REQUIREMENTS.md`
- `ROADMAP.md`
- `AUTOMATION_PHASE.md`
- `AI_PHASE.md`
- `memory-bank/*.md`

## Implementation Priorities

Build in this order:

1. Foundation: project setup, database, Prisma, auth, roles, layout, seed data.
2. Core commerce: categories, products, product images, inventory, inventory transactions.
3. Business workflow: customers, orders, suppliers, expenses, debts.
4. Dashboard and reports using real database values.
5. UAT hardening: validation, permissions, responsive layout, audit logs, import/export.
6. Automation phase.
7. AI phase.

Do not start AI or integrations before the core selling workflow is stable.

## Architecture Rules

- Prefer a conventional full-stack app with a clear frontend/backend boundary.
- Use structured database models instead of ad hoc JSON for core business entities.
- Every critical mutation must write `ActivityLog`.
- Use soft delete for business records unless there is a strong reason for hard delete.
- Inventory must never silently go negative.
- Every inventory change must create an `InventoryTransaction`.
- Orders must automatically affect inventory.
- Completed orders generate revenue.
- Expenses reduce profit.
- Customer statistics must be updated from real order data.
- Dashboard metrics must come from the database, not static placeholders.

## Auth And Roles

Roles:

- `ADMIN`: full system access.
- `MANAGER`: operations and business management.
- `SALES`: customers and orders.
- `WAREHOUSE`: products and inventory.
- `ACCOUNTANT`: finance, debts, expenses, reports.
- `MARKETING`: content and marketing reports.

Permission checks are required in both:

- API/server actions.
- Frontend controls and routes.

## UI Rules

Follow the SaaS design direction from `UI_UX_REQUIREMENTS.md`:

- Modern, clean, minimal, enterprise.
- Sidebar left, top header, centered content.
- Desktop first, responsive for tablet/mobile.
- Reuse shared components: `DataTable`, `Modal`, `Drawer`, `Tabs`, `Card`, `Badge`, `Charts`, `Pagination`, `Select`, `DateRangePicker`, `RichTextEditor`.
- Tables must support search, filter, sort, pagination, and bulk actions.
- Forms must support validation, loading, error state, success state, cancel, save, required indicators, and double-submit prevention.
- Delete/destructive actions require confirm dialog.

All admin screens related to tables/lists must focus on the list as the main workspace:

- The table/list is the primary content, with search, filter, sort, pagination, empty state, and row actions.
- The primary `Create` / `Tạo mới` button opens a popup/modal form for creation.
- Do not place a large create/edit form permanently above, beside, or mixed into the table view.
- Edit/detail should use modal or drawer by default; use a dedicated detail page only when the workflow is too complex for a popup.

## Screen Flow Rules

Public routes:

- `/`
- `/products`
- `/products/[slug]`
- `/cart`
- `/checkout`
- `/tracking`

Admin routes:

- `/admin/login`
- `/admin/dashboard`
- `/admin/categories`
- `/admin/products`
- `/admin/inventory`
- `/admin/suppliers`
- `/admin/customers`
- `/admin/orders`
- `/admin/finance/expenses`
- `/admin/finance/debts`
- `/admin/reports`
- `/admin/users`
- `/admin/settings`

Each admin page must include breadcrumb, search, filter, sort where relevant, pagination, loading state, empty state, error state, success notification, and delete confirmation.

## Database Baseline

Start with these core models:

- `User`
- `Category`
- `Product`
- `ProductImage`
- `Inventory`
- `InventoryTransaction`
- `Supplier`
- `Customer`
- `Order`
- `OrderItem`
- `Expense`
- `Debt`
- `ActivityLog`
- `StoreSetting`

Extend only when a workflow requires it.

## Testing And Verification

Before considering a feature done:

- Build passes.
- Database migration applies cleanly.
- Seed data creates useful demo records.
- Auth and permission checks are tested.
- CRUD screens handle loading, empty, error, and success states.
- Important mutations are smoke tested through the UI or API.
- Dashboard/report numbers are checked against known records.

## Deployment Safety

- Keep ShopOnline deployment separate from SmartTour.
- Do not alter SmartTour containers, ports, Nginx config, or volumes unless explicitly requested.
- Do not use `docker system prune --volumes` on the VPS.
- Safe cleanup commands:
  - `docker builder prune -af --filter until=48h`
  - `docker image prune -f`

## Current Status

- VPS project scaffold exists at `/opt/shoponline`.
- Local commit exists on VPS: `Prepare ShopOnline VPS project scaffold`.
- GitHub push from VPS is blocked until GitHub credentials/token/deploy key are configured.
- GitHub repo appears empty at the time this file was created.

