# Active Context

## Current Task

Continue list/table workflow polish for the deployed ShopOnline project on VPS while preserving backend regression discipline.

## Latest Decisions

- Project will be implemented as ShopOnline / Business Hub.
- Keep deployment separate from SmartTour.
- Use dedicated ShopOnline ports:
  - Web `3002`
  - API `4001`
  - Postgres `5434`
  - Redis `6381`
- All admin screens related to tables/lists must be list-first: the table is the main workspace and the primary `Create` / `Tạo mới` action opens a popup/modal form instead of showing a large form permanently on the page.
- Core data and reports must be real database values.
- Admin mutation flows should use `/api/admin/*` route handlers plus service-layer functions instead of Server Action mutations.
- Admin POST routes should use shared auth/RBAC helpers, Zod form parsing, and typed redirect error handling.
- `npm run smoke:regression` is the standard backend verification command after backend changes. It now includes catalog workflow coverage through `npm run smoke:catalog-workflows` and business end-to-end UAT through `npm run smoke:business-uat`.
- `npm run smoke:cleanup` is the standard cleanup command for accumulated smoke/UAT data. It runs as a dry-run by default; set `CONFIRM_SMOKE_CLEANUP=yes` to delete smoke records and archive smoke test users.
- UI work has started with shared admin primitives, grouped admin navigation, `/admin/orders` flow polish with order-item product/inventory/payment/shipment cross-links, query deep links, and server CSV export, `/admin/products` catalog polish with query-based quick filters, product inventory/purchase shortcuts, selection bulk bar, client CSV export, and server CSV export, `/admin/categories` product drilldown and cross-links, `/admin/inventory` stock workflow polish with per-SKU detail modal, transaction detail modal, query-based quick filters, low-stock action workflow, inventory risk dashboard for negative availability/slow-moving/no-history stock, reserved value tracking, restock links into `/admin/purchases`, selection bulk bar, client CSV export, and server CSV export, purchase/supplier cross-links, purchase query deep links, purchase server CSV export, supplier purchase drilldown, and supplier server CSV export, `/admin/customers` CRM polish with query deep links and server CSV export, `/admin/reports` reporting polish, `/admin/finance/payments` payment workflow polish with query deep links, order back-links, payment detail modal actions, and server CSV export, `/admin/finance/debts` and `/admin/finance/expenses` query deep links plus server CSV export, detail modal coverage for `/admin/shipments` with query deep links, server CSV export, plus order/payment row and detail back-links, `/admin/purchases`, `/admin/returns`, `/admin/promotions`, `/admin/audit`, `/admin/notifications`, `/admin/customers/timeline`, and `/admin/users`, automation run JSON detail disclosure, public product detail route `/products/[slug]`, tracking order total/payment/shipment reconciliation, cart summary polish, checkout summary polish, settings storefront preview, and home product links to detail pages.
- Current direction changed by user: stop focusing on hero/card polish and prioritize product-related list/table workflows.
- Admin login is now username-first for the default admin: use `admin` / `123456`. Internally this maps to the existing `admin@shoponline.local` user to preserve current schema and smoke scripts.
- Public access is currently locked: page routes require the session cookie and redirect unauthenticated users to `/admin/login`; root `/` uses admin dashboard as its target. `/admin/login`, `/admin/login/submit`, `/admin/logout`, `/api/health`, static assets, and `/api/admin/*` handlers remain reachable so login, logout, healthchecks, and API-level auth continue to work.
- `npm run release:readiness` is now the single pre-handoff command for security audit guard, backup restore verification, readiness smoke, production smoke, admin CSV export/auth/cache-header checks, catalog workflow checks, business UAT, tracking reconciliation, and cleanup dry-run. Latest VPS run passed and cleanup dry-run matched 281 smoke/UAT rows/actions.
- `/admin/system` now provides an operator-facing system status page with database health, business counters, low-stock/unpaid/notification/automation warnings, smoke/UAT residue estimate, latest automation/activity logs, and readiness/cleanup commands.
- `/admin/system` now includes an Operator UAT checklist for manual handoff checks after automated readiness passes.
- Server-side CSV export now also covers `/admin/audit` and `/admin/notifications` through `/api/admin/audit/export` and `/api/admin/notifications/export`.
- Server-side CSV export now also covers `/admin/returns`, `/admin/promotions`, and `/admin/automation` through `/api/admin/returns/export`, `/api/admin/promotions/export`, and `/api/admin/automation/export`.
- Server-side CSV export now also covers `/admin/categories`, `/admin/users`, and `/admin/customers/timeline` through `/api/admin/categories/export`, `/api/admin/users/export`, and `/api/admin/customers/timeline/export`.
- Server-side CSV export now also covers `/admin/reports` through `/api/admin/reports/export?tab=sales|products|inventory|debts`.
- `npm run smoke:admin-exports` now verifies all 22 admin CSV export endpoints return `text/csv`, `attachment`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and expected data/header content; it also rejects anonymous export access and rejects a limited-role user from `/api/admin/users/export`.
- Admin CSV response generation is centralized in `apps/web/src/lib/csv-export.ts`; export routes should use `csvExportResponse(...)` so attachment/cache/security headers stay consistent.
- `npm run audit:security` fails on high/critical vulnerabilities and any unreviewed moderate vulnerability. It currently allows only the known transitive Next.js/PostCSS moderate advisory because Next `16.2.6` is still latest and still depends on the affected PostCSS range.
- GitHub Actions CI now provisions a clean PostgreSQL 16 service, runs `npm run prisma:migrate`, then runs `npm run check:ci`.

## Immediate Next Steps

1. Continue production-readiness work, next best targets: run manual operator UAT against the `/admin/system` checklist and capture any missing business acceptance checks.
2. Review dependency audit status when a safe Next.js release is available for the pinned PostCSS advisory.
3. Add deeper CI browser/API integration jobs later if GitHub runner runtime budget and secrets/services are approved.
4. Continue manual business UAT with real users on top of automated UAT page smoke.

## Open Questions

- Confirm final domain/subdomain for ShopOnline.
- Confirm final UAT acceptance criteria before handing off to real users.
