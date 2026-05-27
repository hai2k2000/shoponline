# Active Context

## Current Task

Continue UI/UX implementation for the deployed ShopOnline project on VPS while preserving backend regression discipline.

## Latest Decisions

- Project will be implemented as ShopOnline / Business Hub.
- Keep deployment separate from SmartTour.
- Use dedicated ShopOnline ports:
  - Web `3002`
  - API `4001`
  - Postgres `5434`
  - Redis `6381`
- Use list-first admin UI patterns where forms and lists would otherwise create unbalanced layouts.
- Core data and reports must be real database values.
- Admin mutation flows should use `/api/admin/*` route handlers plus service-layer functions instead of Server Action mutations.
- Admin POST routes should use shared auth/RBAC helpers, Zod form parsing, and typed redirect error handling.
- `npm run smoke:regression` is the standard backend verification command after backend changes.
- `npm run smoke:cleanup` is the standard cleanup command for accumulated smoke/UAT data. It runs as a dry-run by default; set `CONFIRM_SMOKE_CLEANUP=yes` to delete smoke records and archive smoke test users.
- UI work has started with shared admin primitives, grouped admin navigation, and the `/admin/orders` flow polish.

## Immediate Next Steps

1. Continue UI polish module-by-module following screen flow, next best targets: Products, Inventory, Customers, Reports.
2. Review dependency audit status when a safe Next.js release is available for the pinned PostCSS advisory.
3. Add deeper CI services/integration jobs later if GitHub runner secrets/services are approved.
4. Continue manual business UAT with real users on top of automated UAT page smoke.

## Open Questions

- Confirm final domain/subdomain for ShopOnline.
- Confirm final UAT acceptance criteria before handing off to real users.
