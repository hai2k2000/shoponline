# ShopOnline Operator Handoff

## Access

- Domain: `https://cargo.io.vn`
- Admin login: `https://cargo.io.vn/admin/login`
- Current default admin: `admin` / `123456`
- Public pages are intentionally locked. Unauthenticated visits redirect to admin login, and authenticated root `/` redirects to `/admin/dashboard`.

## Daily Start Checklist

1. Open `https://cargo.io.vn/admin/login` and sign in.
2. Check `/admin/dashboard` for revenue, orders, stock, receivables, and payables.
3. Open `/admin/inventory` and review low-stock rows.
4. In `/admin/inventory`, review the Inventory risk dashboard for negative available stock, slow-moving stock, reserved value, and SKUs without transaction history.
5. Open `/admin/orders`, filter open orders, and handle payment/shipment status.
6. Open `/admin/finance/payments` and `/admin/shipments` for reconciliation.
7. Use CSV export links on list pages when handing off data to accounting or operations.

## Before Real Usage

Run these on the VPS:

```sh
cd /opt/shoponline
npm run release:readiness
```

`release:readiness` verifies the security audit guard, latest backup restore, locked login behavior, production smoke, all admin CSV exports plus export auth/cache headers, catalog workflows, business UAT, tracking reconciliation, and finishes with `smoke:cleanup` dry-run.

`smoke:cleanup` remains dry-run by default. It only reports matched smoke/UAT rows.

After `release:readiness` passes, open `/admin/system` and walk through the Operator UAT checklist with the person who will run the shop. Use real expected workflows for catalog/stock, order/payment, shipment/tracking, return/refund, finance handoff, and access/audit.

## Cleaning Test Data

Only run destructive cleanup after confirming the dry-run target counts are expected:

```sh
cd /opt/shoponline
npm run smoke:cleanup
CONFIRM_SMOKE_CLEANUP=yes npm run smoke:cleanup
```

Do not run destructive cleanup while real user testing is in progress unless the matched rows are reviewed.

## Deploy

Preferred deploy command:

```sh
cd /opt/shoponline
npm run deploy:prod
```

This performs backup, backup verification, build, Docker restart, health wait, and regression smoke.

## Health And Backup

```sh
cd /opt/shoponline
docker ps --filter name=shoponline
curl http://127.0.0.1:3002/api/health
npm run backup:postgres
npm run backup:verify
```

Never run `docker system prune --volumes`; it can remove database volumes.

## Key Admin Pages

- Products: `/admin/products`
- Inventory: `/admin/inventory`
- Orders: `/admin/orders`
- Payments: `/admin/finance/payments`
- Shipments: `/admin/shipments`
- Customers: `/admin/customers`
- Purchases: `/admin/purchases`
- Suppliers: `/admin/suppliers`
- Reports: `/admin/reports`
- Automation: `/admin/automation`
- System status: `/admin/system`

## CSV Exports

Server-side CSV export is available for:

- Products
- Inventory
- Orders
- Customers
- Payments
- Shipments
- Purchases
- Suppliers
- Debts
- Expenses
- Returns
- Promotions
- Automation runs
- Reports
- Categories
- Users
- Customer timeline
- Audit logs
- Notifications

Use the current list filters first, then click `Tai CSV`.
CSV responses are authenticated, sent as attachments, and marked `Cache-Control: no-store` with `X-Content-Type-Options: nosniff`. The shared CSV response helper is `apps/web/src/lib/csv-export.ts`.
