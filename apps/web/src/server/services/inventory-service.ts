import type { Prisma } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type InventoryMutationInput =
  | { mode: "import"; productId: string; quantity: number; note: string | null }
  | { mode: "export"; productId: string; quantity: number; note: string | null }
  | { mode: "adjust"; productId: string; actualQuantity: number; note: string | null };

export async function mutateInventory(tx: Prisma.TransactionClient, input: InventoryMutationInput, userId: string) {
  const product = await tx.product.findUnique({ where: { id: input.productId } });
  if (!product || product.status === "ARCHIVED") throw new AdminFormError("BUSINESS_RULE_ERROR", "Sản phẩm không hợp lệ.");

  const inventory = await tx.inventory.upsert({
    where: { productId: input.productId },
    update: {},
    create: { productId: input.productId, quantity: 0, reservedQuantity: 0 },
  });
  const note = input.note || (input.mode === "adjust" ? "Điều chỉnh tồn kho" : null);

  if (input.mode === "import") {
    const afterQuantity = inventory.quantity + input.quantity;
    await tx.inventory.update({ where: { productId: input.productId }, data: { quantity: afterQuantity } });
    await tx.inventoryTransaction.create({ data: { productId: input.productId, type: "IMPORT", quantity: input.quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
    await tx.activityLog.create({ data: { userId, action: "IMPORT_STOCK", entityType: "Product", entityId: input.productId, description: `Nhập kho ${input.quantity}` } });
    return;
  }

  if (input.mode === "export") {
    const available = inventory.quantity - inventory.reservedQuantity;
    if (input.quantity > available) throw new AdminFormError("BUSINESS_RULE_ERROR", "Không đủ tồn khả dụng để xuất kho.");
    const afterQuantity = inventory.quantity - input.quantity;
    await tx.inventory.update({ where: { productId: input.productId }, data: { quantity: afterQuantity } });
    await tx.inventoryTransaction.create({ data: { productId: input.productId, type: "EXPORT", quantity: input.quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
    await tx.activityLog.create({ data: { userId, action: "EXPORT_STOCK", entityType: "Product", entityId: input.productId, description: `Xuất kho ${input.quantity}` } });
    return;
  }

  if (input.actualQuantity < inventory.reservedQuantity) {
    throw new AdminFormError("BUSINESS_RULE_ERROR", "Tồn thực tế không được nhỏ hơn số lượng đang giữ.");
  }
  const delta = Math.abs(input.actualQuantity - inventory.quantity);
  await tx.inventory.update({ where: { productId: input.productId }, data: { quantity: input.actualQuantity } });
  await tx.inventoryTransaction.create({ data: { productId: input.productId, type: "ADJUST", quantity: delta, beforeQuantity: inventory.quantity, afterQuantity: input.actualQuantity, note } });
  await tx.activityLog.create({ data: { userId, action: "ADJUST_STOCK", entityType: "Product", entityId: input.productId, description: `Điều chỉnh tồn từ ${inventory.quantity} thành ${input.actualQuantity}` } });
}
