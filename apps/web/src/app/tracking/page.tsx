import { EmptyPanel, Field, inputClass, money, PageIntro, StatusPill, StoreButton, StoreShell } from "@/components/public/ui";
import { prisma } from "@/lib/prisma";
import { findTrackingOrder } from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = "" } = await searchParams;
  const [setting, order] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    findTrackingOrder(prisma, code),
  ]);

  return (
    <StoreShell storeName={setting?.storeName || "ShopOnline"} compact>
      <PageIntro
        eyebrow="Cua hang"
        title="Tra cuu don hang"
        description="Nhap ma don de xem trang thai xu ly, thanh toan, van don va danh sach san pham da dat."
      />

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <Field label="Ma don">
          <input className={inputClass} name="code" defaultValue={code} placeholder="Nhap ma don" />
        </Field>
        <div className="flex items-end">
          <StoreButton type="submit">Tra cuu</StoreButton>
        </div>
      </form>

      {code && !order ? (
        <EmptyPanel
          title="Khong tim thay don hang"
          description="Kiem tra lai ma don hoac lien he cua hang neu ban can ho tro."
          action={<StoreButton href="/products" variant="outline">Tiep tuc mua hang</StoreButton>}
        />
      ) : null}

      {order ? (
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{order.orderCode}</h2>
              <p className="text-sm text-slate-500">{order.customerName} - {dateText(order.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill>{viOrderStatus(order.orderStatus)}</StatusPill>
              <StatusPill>{viPaymentStatus(order.paymentStatus)}</StatusPill>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryBox label="Da thanh toan" value={money(order.paid)} tone="emerald" />
            <SummaryBox label="Con phai thu" value={money(order.remaining)} tone="amber" />
            <SummaryBox label="Van don" value={order.latestShipment ? viShipmentStatus(order.latestShipment.status) : "Chua co"} tone="slate" />
          </div>

          {order.latestShipment ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-semibold">Thong tin giao hang</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Info label="Don vi giao" value={order.latestShipment.carrier} />
                <Info label="Dich vu" value={order.latestShipment.service || "-"} />
                <Info label="Ma van don" value={order.latestShipment.trackingCode || "-"} />
                <Info label="Ngay gui" value={order.latestShipment.shippedAt ? dateText(order.latestShipment.shippedAt) : "-"} />
                <Info label="Ngay giao" value={order.latestShipment.deliveredAt ? dateText(order.latestShipment.deliveredAt) : "-"} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <span>{item.productName} x{item.quantity}</span>
                <strong>{money(item.total)}</strong>
              </div>
            ))}
          </div>

          <div className="grid gap-2 border-t border-slate-100 pt-4 text-sm">
            <Line label="Tam tinh" value={money(order.subtotal)} />
            <Line label="Phi giao hang" value={money(order.shippingFee)} />
            {order.discount > 0 ? <Line label="Giam gia" value={`-${money(order.discount)}`} className="text-emerald-700" /> : null}
            <Line label="Da thanh toan" value={money(order.paid)} />
            <Line label="Con phai thu" value={money(order.remaining)} />
            <Line label="Tong tien" value={money(order.total)} className="text-base" />
          </div>
        </section>
      ) : null}

      <StoreButton href="/products" variant="outline">Tiep tuc mua hang</StoreButton>
    </StoreShell>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" | "slate" }) {
  const toneClass = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-900";
  return (
    <div className={`rounded-lg p-3 text-sm ${toneClass}`}>
      <span className="text-slate-600">{label}</span>
      <strong className="mt-1 block text-lg">{value}</strong>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="block">{value}</strong>
    </div>
  );
}

function Line({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function viOrderStatus(status: string) {
  return ({ NEW: "Moi", CONFIRMED: "Da xac nhan", PACKING: "Dang dong goi", SHIPPING: "Dang giao", COMPLETED: "Hoan tat", CANCELLED: "Da huy", RETURNED: "Da tra hang" } as Record<string, string>)[status] || status;
}

function viPaymentStatus(status: string) {
  return ({ UNPAID: "Chua thanh toan", PARTIAL: "Thanh toan mot phan", PAID: "Da thanh toan", REFUNDED: "Da hoan tien" } as Record<string, string>)[status] || status;
}

function viShipmentStatus(status: string) {
  return ({ PENDING: "Cho xu ly", PACKED: "Da dong goi", SHIPPED: "Dang giao", DELIVERED: "Da giao", FAILED: "Giao loi", RETURNED: "Hoan ve" } as Record<string, string>)[status] || status;
}

function dateText(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
