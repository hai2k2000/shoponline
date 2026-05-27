# System Patterns

## Screen Pattern

Admin pages should use:

- Breadcrumb.
- Page title and primary action.
- Search/filter/sort controls.
- Data table.
- Pagination.
- Loading state.
- Empty state.
- Error state.
- Success notification.
- Confirm dialog for delete/destructive actions.

For dense modules, use:

- List-first screen.
- Create/edit in modal or drawer.
- Detail in modal, drawer, or dedicated detail page depending on complexity.

## Data Pattern

Core business records use relational models:

- User and roles.
- Category tree.
- Product and product images.
- Inventory snapshot.
- Inventory transaction ledger.
- Supplier.
- Customer.
- Order and order items.
- Expense.
- Debt.
- Activity log.
- Store settings.

## Inventory Pattern

Inventory updates must be transactional:

1. Read current inventory.
2. Validate stock rule.
3. Apply quantity change.
4. Create `InventoryTransaction`.
5. Write `ActivityLog`.

Order status changes that affect stock must follow this same pattern.

## Order Pattern

Order status:

`NEW -> CONFIRMED -> PACKING -> SHIPPING -> COMPLETED`

Side flows:

- Cancel.
- Return.

Business rules:

- Inventory updates automatically.
- Completed orders generate revenue.
- Customer totals update from order history.

## Finance Pattern

Profit formula:

`Profit = Revenue - Cost Of Goods - Expenses`

Finance modules:

- Revenue.
- Expenses.
- Debts.
- Profit.

Reports must be calculated from order, inventory, expense, and debt records.

## Permission Pattern

Every protected action needs:

- Backend permission guard.
- Frontend route/control visibility or disabled state.
- Useful unauthorized error message.

