# Decision Log

## 2026-05-27

- Created project implementation memory from the 7 planning documents.
- Decided to treat the project as a real ShopOnline / Business Hub system, not a static demo.
- Reserved ports separate from SmartTour:
  - Web `3002`
  - API `4001`
  - Postgres `5434`
  - Redis `6381`
- Initial implementation order follows roadmap:
  1. Foundation.
  2. Catalog and inventory.
  3. Business workflow.
  4. Dashboard and reports.
  5. UAT and production.
  6. Automation.
  7. AI.
- UI should be modern SaaS with reusable components.
- Admin screens related to tables/lists must be list-first: focus on the table/list, and open create forms from the `Create` / `Tạo mới` button in a popup/modal.
- Reports and dashboard must use real database values.

