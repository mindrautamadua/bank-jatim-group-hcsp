import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getActiveTenant } from "@/lib/tenant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  applicationName: "HCSP",
  title: "HCSP - Human Capital Strategic Planning | Bank Jatim Group",
  description:
    "Platform eksekusi strategi human capital Grup Bank Jatim untuk memantau Blueprint HCM 2026-2030: program strategis, kematangan, dan dampak bisnis.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HCSP",
  },
};

export const viewport: Viewport = {
  themeColor: "#6b0a10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Skin the whole app to the active bank's brand by overriding the
  // --bb-green* CSS variables on <html> (inline style beats :root defaults).
  const { brand } = await getActiveTenant();
  const themeVars = {
    "--bb-green": brand.primary,
    "--bb-green-dark": brand.dark,
    "--bb-green-deep": brand.deep,
    "--bb-green-light": brand.light,
  } as React.CSSProperties;

  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      style={themeVars}
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="bb-grain" aria-hidden />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
