import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { AdminFormError } from "@/lib/admin-form";

const addImageSchema = z.object({
  productId: requiredText,
  imageUrl: requiredText,
  sortOrder: z.preprocess((v) => Math.floor(Number(v || 0)), z.number().int().min(0)).default(0),
});

const deleteImageSchema = z.object({
  id: requiredText,
  productId: requiredText,
});

const reorderSchema = z.object({
  productId: requiredText,
  ids: z.preprocess(
    (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean),
    z.array(z.string()).min(1),
  ),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "products:write", "/admin/products");
    if (!user) return response;

    const mode = String(formData.get("mode") || "");

    if (mode === "delete") {
      const input = parseAdminForm(deleteImageSchema, formData);
      const image = await prisma.productImage.findUnique({ where: { id: input.id } });
      if (!image || image.productId !== input.productId) throw new AdminFormError("NOT_FOUND", "Không tìm thấy ảnh.");
      await prisma.productImage.delete({ where: { id: input.id } });
      return redirectTo(request, "/admin/products");
    }

    if (mode === "reorder") {
      const input = parseAdminForm(reorderSchema, formData);
      await prisma.$transaction(
        input.ids.map((id, index) =>
          prisma.productImage.updateMany({ where: { id, productId: input.productId }, data: { sortOrder: index } }),
        ),
      );
      return redirectTo(request, "/admin/products");
    }

    // default: add image
    const input = parseAdminForm(addImageSchema, formData);
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new AdminFormError("NOT_FOUND", "Không tìm thấy sản phẩm.");
    const maxOrder = await prisma.productImage.aggregate({
      where: { productId: input.productId },
      _max: { sortOrder: true },
    });
    await prisma.productImage.create({
      data: {
        productId: input.productId,
        imageUrl: input.imageUrl,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "Product",
        entityId: input.productId,
        description: `Thêm ảnh gallery cho sản phẩm ${product.name}`,
      },
    });
    return redirectTo(request, "/admin/products");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/products", error);
  }
}
