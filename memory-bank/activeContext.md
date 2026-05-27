# Active Context

## Current Task

Prepare project memory and agent instructions before implementation.

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

## Immediate Next Steps

1. Configure GitHub write access for `hai2k2000/shoponline.git` or push from a local machine with credentials.
2. Choose/confirm stack.
3. Scaffold project.
4. Add Docker Compose for web/API/Postgres/Redis.
5. Add database schema and migrations.
6. Add auth/RBAC.
7. Build dashboard shell and admin layout.
8. Implement categories/products/inventory first.

## Open Questions

- Confirm final domain/subdomain for ShopOnline.
- Confirm whether public storefront and admin are one app or separate apps.
- Confirm preferred frontend/backend stack if not already fixed.
- Confirm initial admin account username/password policy.

