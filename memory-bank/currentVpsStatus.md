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
