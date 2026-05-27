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

## Health Check

```sh
curl http://127.0.0.1:3002/api/health
```

Expected: JSON with `ok: true` and `database: "ok"`.

## Backups

Manual backup:

```sh
cd /opt/shoponline
npm run backup:postgres
```

Default backup folder: `/opt/shoponline/backups/postgres`.

Suggested cron:

```cron
15 2 * * * cd /opt/shoponline && /usr/bin/npm run backup:postgres >/var/log/shoponline-backup.log 2>&1
```

## Docker Cleanup Policy

Use targeted cleanup only:

```sh
npm run docker:clean
```

Do not run `docker system prune --volumes`; it can remove database volumes.

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

Current admin seed defaults are only for initial setup:

- `ADMIN_EMAIL=admin@shoponline.local`
- `ADMIN_PASSWORD=ShopOnline@2026`
