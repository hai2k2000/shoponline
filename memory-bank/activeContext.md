# Active Context

## Current Task

Continue backend completion and hardening for the deployed ShopOnline project on VPS.

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

## Immediate Next Steps

1. Prepare commit grouping for the backend hardening batch.
2. Review dependency audit status when a safe Next.js release is available for the pinned PostCSS advisory.
3. Consider data cleanup/retention strategy for smoke-generated records if test data volume becomes an issue.
4. Add deeper CI services/integration jobs later if GitHub runner secrets/services are approved.

## Open Questions

- Confirm final domain/subdomain for ShopOnline.
- Confirm when to push/commit the current VPS worktree changes.
- Confirm whether to commit/push `.github/workflows/ci.yml` with the current backend hardening batch.
