# ShopOnline VPS Deployment

Repository: `git@github.com:hai2k2000/shoponline.git`
VPS path: `/opt/shoponline`
Public domain: `https://cargo.io.vn`

## Ports

- Web: `127.0.0.1:3002 -> 3000`
- Postgres: `127.0.0.1:5434 -> 5432`
- Redis: `127.0.0.1:6381 -> 6379`

SmartTour uses `3001/4000/5433/6380`, so keep ShopOnline on the separate ports above.

## Deploy

Operator handoff and daily production checklist: see `OPERATOR_HANDOFF.md`.

## CI Checks

GitHub Actions runs `npm run check:ci` on pull requests and pushes to `main`.

The CI workflow also starts a clean PostgreSQL service and runs `npm run prisma:migrate` before `check:ci`, so migration drift is caught before merge.

`check:ci` performs:

- `npm run lint`
- `npm run build`
- `npm run audit:security`

`audit:security` fails on high/critical vulnerabilities and on any unreviewed moderate vulnerability. The current known moderate advisory is the transitive Next.js/PostCSS advisory; Next `16.2.6` is still the latest package release and still depends on the affected PostCSS range, so the guard allows only that specific advisory until a safe Next.js release is available.

The VPS-only `npm run check` remains stricter because it also verifies Postgres backups and runs the full smoke regression against the deployed service.

Standard production deploy:

```sh
cd /opt/shoponline
npm run deploy:prod
```

`deploy:prod` performs:

- Postgres backup via `backup:postgres`.
- Backup restore verification via `backup:verify`.
- Next.js production build.
- Docker rebuild/restart for `shoponline-web`.
- Docker health wait for `shoponline-web`.
- Full `npm run smoke:regression`.

Optional environment switches:

```sh
SKIP_BACKUP=yes npm run deploy:prod
SKIP_BACKUP_VERIFY=yes npm run deploy:prod
SKIP_BUILD=yes npm run deploy:prod
SKIP_REGRESSION=yes npm run deploy:prod
```

Manual deploy path:

```sh
cd /opt/shoponline
git pull
npm run build
docker compose build web
docker compose up -d
npm run smoke:regression
```

`smoke:prod` retries each public endpoint by default, so it can be run immediately after a container restart. `smoke:regression` also covers admin, checkout, reporting, tracking, catalog workflow checks, and business UAT.

Because public pages are currently locked, unauthenticated `/`, `/products`, `/cart`, `/checkout`, and `/tracking` should return redirects to `/admin/login`. This is expected.

## Health Check

```sh
curl http://127.0.0.1:3002/api/health
```

Expected: JSON with `ok: true` and `database: "ok"`.

Readiness smoke:

```sh
cd /opt/shoponline
npm run smoke:readiness
```

This confirms the root route is locked, login renders, health responds, and obvious login mojibake strings are absent.

Release readiness before handing the site to operators:

```sh
cd /opt/shoponline
npm run release:readiness
```

This runs the security audit guard, backup restore verification, readiness smoke, production smoke, catalog workflow checks, business UAT, tracking reconciliation, and a smoke/UAT cleanup dry-run. It does not destructively remove smoke data.

The same operational checklist is also visible in the admin UI at `/admin/system`.

## Security Headers

The Next.js config sets baseline response headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Backups

Manual backup:

```sh
cd /opt/shoponline
npm run backup:postgres
```

Default backup folder: `/opt/shoponline/backups/postgres`.

Verify latest backup by restoring it into a temporary database and dropping it afterward:

```sh
cd /opt/shoponline
npm run backup:verify
```

Verify a specific backup:

```sh
cd /opt/shoponline
npm run backup:verify -- /opt/shoponline/backups/postgres/shoponline-YYYYMMDD-HHMMSS.sql.gz
```

Restore from backup:

```sh
cd /opt/shoponline
CONFIRM_RESTORE=yes npm run restore:postgres -- /opt/shoponline/backups/postgres/shoponline-YYYYMMDD-HHMMSS.sql.gz
```

The restore script refuses to run unless `CONFIRM_RESTORE=yes` is set.

Active cron on the VPS:

```cron
27 2 * * * root cd /opt/shoponline && /opt/shoponline/scripts/backup-postgres.sh >> /var/log/shoponline-postgres-backup.log 2>&1
*/5 * * * * root cd /opt/shoponline && /opt/shoponline/scripts/smoke-production.sh >> /var/log/shoponline-healthcheck.log 2>&1
35 7 * * * root cd /opt/shoponline && /usr/bin/npm run automation:run >> /var/log/shoponline-automation.log 2>&1
```

Cron files:

- `/etc/cron.d/shoponline-postgres-backup`
- `/etc/cron.d/shoponline-healthcheck`
- `/etc/cron.d/shoponline-automation`

Logs:

- `/var/log/shoponline-postgres-backup.log`
- `/var/log/shoponline-automation.log`

## Automation

Run manually:

```sh
cd /opt/shoponline
npm run automation:run
```

Automation writes records to `AutomationRun`, visible in `/admin/automation`.

Current jobs:

- Low stock alert.
- Purchase suggestions.
- Debt reminders and overdue marking.
- New order follow-up after 24 hours.
- Daily operational report.
- `/var/log/shoponline-healthcheck.log`

## Docker Cleanup Policy

Use targeted cleanup only:

```sh
npm run docker:clean
```

Do not run `docker system prune --volumes`; it can remove database volumes.

Smoke/UAT data cleanup is separate from Docker cleanup:

```sh
cd /opt/shoponline
npm run smoke:cleanup
CONFIRM_SMOKE_CLEANUP=yes npm run smoke:cleanup
```

The first command is dry-run and should be reviewed before running the confirmed cleanup.

## Container Health

`compose.yaml` defines Docker healthchecks for:

- `shoponline-web`: checks `/api/health`
- `shoponline-postgres`: checks `pg_isready`
- `shoponline-redis`: checks `redis-cli ping`

Inspect status:

```sh
docker ps --filter name=shoponline
docker inspect --format='{{json .State.Health}}' shoponline-web
```

## Reverse Proxy Example

Use this behind an existing Nginx/SSL setup:

```nginx
server {
    server_name shop.example.com;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After changing domain/proxy, run:

```sh
BASE_URL=https://cargo.io.vn npm run smoke:prod
```

Current Nginx mapping:

- Config: `/etc/nginx/sites-available/cargo.io.vn.conf`
- Enabled symlink: `/etc/nginx/sites-enabled/cargo.io.vn.conf`
- Proxy target: `http://127.0.0.1:3002`
- Previous config backup: `/etc/nginx/sites-available/cargo.io.vn.conf.backup.20260527-131838`

## Required Production Env

Set a strong `AUTH_SECRET` in `/opt/shoponline/.env`. Do not keep `change-this-before-production`.

The VPS `.env` has already been rotated to a generated strong secret. The old env files were copied to timestamped `.env.backup.*` files before rotation.

Current admin seed defaults are only for initial setup:

- `ADMIN_EMAIL=admin@shoponline.local`
- `ADMIN_PASSWORD=ShopOnline@2026`
