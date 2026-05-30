import type { Prisma } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type InventoryMutationInput =
  | { mode: "import"; productId: string; quantity: number; note: string | null }
  | { mode: "export"; productId: string; quantity: number; note: string | null }
  | { mode: "adjust"; productId: string; actualQuantity: number; note: string | null };

export async function mutateInventory(tx: Prisma.TransactionClient, input: InventoryMutationInput, userId: string) {
  const product = await tx.product.findUnique({ where: { id: input.productId } });
  if (!product || product.status === "ARCHIVED") throw new AdminFormError("BUSINESS_RULE_ERROR", "S\u1ea3n ph\u1ea9m kh\u00f4ng h\u1ee3p l\u1ec7.");

  const inventory = await tx.inventory.upsert({
    where: { productId: input.productId },
    update: {},
    create: { productId: input.productId, quantity: 0, reservedQuantity: 0 },
  });
  const note = input.note || (input.mode === "adjust" ? "\u0110i\u1ec1u ch\u1ec9nh t\u1ed3n kho" : null);

  if (input.mode === "import") {
    const afterQuantity = inventory.quantity + input.quantity;
    await tx.inventory.update({ where: { productId: input.productId }, data: { quantity: afterQuantity } });
    await tx.inventoryTransaction.create({ data: { productId: input.productId, type: "IMPORT", quantity: input.quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
    await tx.activityLog.create({ data: { userId, action: "IMPORT_STOCK", entityType: "Product", entityId: input.productId, description: `Nh\u1eadp kho ${input.quantity}` } });
    return;
  }

  if (input.mode === "export") {
    // Atomic check-and-decrement: ch\u1ec9 update n\u1ebfu available >= quantity, tr\u00e1nh race condition
    const result = await tx.$executeRaw`
      UPDATE "Inventory"
      SET quantity = quantity - ${input.quantity}
      WHERE "productId" = ${input.productId}
        AND (quantity - "reservedQuantity") >= ${input.quantity}
    `;
    if (result === 0) throw new AdminFormError("BUSINESS_RULE_ERROR", "Kh\u00f4ng \u0111\u1ee7 t\u1ed3n kh\u1ea3 d\u1ee5ng \u0111\u1ec3 xu\u1ea5t kho.");
    const afterQuantity = inventory.quantity - input.quantity;
    await tx.inventoryTransaction.create({ data: { productId: input.productId, type: "EXPORT", quantity: input.quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
    await tx.activityLog.create({ data: { userId, action: "EXPORT_STOCK", entityType: "Product", entityId: input.productId, description: `Xu\u1ea5t kho ${input.quantity}` } });
    return;
  }

  if (input.actualQuantity < inventory.reservedQuantity) {
    throw new AdminFormError("BUSINESS_RULE_ERROR", "T\u1ed3n th\u1ef1c t\u1ebf kh\u00f4ng \u0111\u01b0\u1ee3c nh\u1ecf h\u01a1n s\u1ed1 l\u01b0\u1ee3ng \u0111ang gi\u1eef.");
  }
  const delta = Math.abs(input.actualQuantity - inventory.quantity);
  await tx.inventory.update({ where: { productId: input.productId }, data: { quantity: input.actualQuantity } });
  await tx.inventoryTransaction.create({ data: { productId: input.productId, type: "ADJUST", quantity: delta, beforeQuantity: inventory.quantity, afterQuantity: input.actualQuantity, note } });
  await tx.activityLog.create({ data: { userId, action: "ADJUST_STOCK", entityType: "Product", entityId: input.productId, description: `\u0110i\u1ec1u ch\u1ec9nh t\u1ed3n t\u1eeb ${inventory.quantity} th\u00e0nh ${input.actualQuantity}` } });
}
