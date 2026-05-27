# Tech Context

## Deployment Context

VPS:

- ShopOnline path: `/opt/shoponline`
- Git remote: `https://github.com/hai2k2000/shoponline.git`
- Reserved ports:
  - Web: `3002`
  - API: `4001`
  - Postgres: `5434`
  - Redis: `6381`

SmartTour is already running separately and uses:

- Web: `3001`
- API: `4000`
- Postgres: `5433`
- Redis: `6380`

Do not reuse SmartTour ports.

## Expected Stack

Final stack can be adjusted after codebase is created, but the project should support:

- Web/admin frontend.
- API/backend.
- PostgreSQL database.
- Redis for cache/queue/session needs if required.
- Prisma or equivalent migration-driven ORM.
- Docker Compose deployment.
- Nginx reverse proxy.

## Required Engineering Practices

- Use migrations for schema changes.
- Use seed data for demo and smoke testing.
- Keep environment variables in `.env.example`; never commit secrets.
- Keep build/deploy scripts repeatable.
- Add smoke tests for critical workflows.
- Add Docker cleanup policy to avoid build cache growth on VPS.

## Current VPS Status

- `/opt/shoponline` exists.
- Branch: `main`.
- Initial local commit exists.
- GitHub push from VPS requires credentials.
- Reserved ports are currently free.

