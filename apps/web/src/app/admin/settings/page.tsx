import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const setting = await prisma.storeSetting.upsert({
    where: { id: "default" },
    create: { id: "default", storeName: "ShopOnline" },
    update: {},
  });
  return (
    <SettingsClient
      sessionToken={sessionToken}
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
