# ShopOnline VPS deployment notes

Repository: https://github.com/hai2k2000/shoponline.git
VPS path: /opt/shoponline

Reserved local ports:
- Web: 127.0.0.1:3002
- API: 127.0.0.1:4001
- Postgres: 127.0.0.1:5434
- Redis: 127.0.0.1:6381

SmartTour is using 3001/4000/5433/6380, so keep ShopOnline on separate ports.

Current GitHub repo appears empty: `git ls-remote` returns no refs.
When code is pushed, pull it here and add Docker Compose/Nginx config.
