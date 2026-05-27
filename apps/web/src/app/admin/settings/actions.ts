"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function money(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) || 0) || 0);
}

export async function updateStoreSettingAction(formData: FormData) {
  const user = await requireUser();
  const setting = await prisma.storeSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      storeName: text(formData, "storeName") || "ShopOnline",
      logo: text(formData, "logo") || null,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      shippingFee: money(formData, "shippingFee"),
      inventoryStrategy: text(formData, "inventoryStrategy") || "PREVENT_NEGATIVE",
    },
    update: {
      storeName: text(formData, "storeName") || "ShopOnline",
      logo: text(formData, "logo") || null,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      shippingFee: money(formData, "shippingFee"),
      inventoryStrategy: text(formData, "inventoryStrategy") || "PREVENT_NEGATIVE",
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "StoreSetting", entityId: setting.id, description: "Cập nhật cấu hình cửa hàng" } });
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/products");
}
