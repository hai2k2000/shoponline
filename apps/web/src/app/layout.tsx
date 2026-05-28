import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "ShopOnline",
    template: "%s | ShopOnline",
  },
  description: "ShopOnline - cửa hàng trực tuyến và hệ thống quản trị bán hàng.",
  applicationName: "ShopOnline",
  keywords: ["ShopOnline", "bán hàng online", "quản lý đơn hàng", "ecommerce"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cargo.io.vn"),
  openGraph: {
    title: "ShopOnline",
    description: "Mua hàng nhanh, theo dõi đơn rõ ràng và quản trị bán hàng bằng dữ liệu thật.",
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
