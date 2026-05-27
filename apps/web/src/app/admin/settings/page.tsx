import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const setting = await prisma.storeSetting.upsert({
    where: { id: "default" },
    create: { id: "default", storeName: "ShopOnline" },
    update: {},
  });
  return (
    <SettingsClient
      setting={{
        storeName: setting.storeName,
        logo: setting.logo,
        phone: setting.phone,
        email: setting.email,
        address: setting.address,
        shippingFee: Number(setting.shippingFee),
        inventoryStrategy: setting.inventoryStrategy,
      }}
    />
  );
}
