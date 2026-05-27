# ShopOnline VPS Deployment

Repository: `git@github.com:hai2k2000/shoponline.git`
VPS path: `/opt/shoponline`

## Ports

- Web: `127.0.0.1:3002 -> 3000`
- Postgres: `127.0.0.1:5434 -> 5432`
- Redis: `127.0.0.1:6381 -> 6379`

SmartTour uses `3001/4000/5433/6380`, so keep ShopOnline on the separate ports above.

## Deploy

```sh
cd /opt/shoponline
git pull
npm run build
docker compose build web
docker compose up -d
npm run smoke:prod
```

`smoke:prod` retries each endpoint by default, so it can be run immediately after a container restart.

## Health Check

```sh
curl http://127.0.0.1:3002/api/health
```

Expected: JSON with `ok: true` and `database: "ok"`.

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
```

Cron files:

- `/etc/cron.d/shoponline-postgres-backup`
- `/etc/cron.d/shoponline-healthcheck`

Logs:

- `/var/log/shoponline-postgres-backup.log`
- `/var/log/shoponline-healthcheck.log`

## Docker Cleanup Policy

Use targeted cleanup only:

```sh
npm run docker:clean
```

Do not run `docker system prune --volumes`; it can remove database volumes.

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
BASE_URL=https://shop.example.com npm run smoke:prod
```

## Required Production Env

Set a strong `AUTH_SECRET` in `/opt/shoponline/.env`. Do not keep `change-this-before-production`.

The VPS `.env` has already been rotated to a generated strong secret. The old env files were copied to timestamped `.env.backup.*` files before rotation.

Current admin seed defaults are only for initial setup:

- `ADMIN_EMAIL=admin@shoponline.local`
- `ADMIN_PASSWORD=ShopOnline@2026`
