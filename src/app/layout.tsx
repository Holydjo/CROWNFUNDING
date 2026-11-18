import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t.meta.title, template: "%s — Crownfunding" },
    description: t.meta.description,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getT();
  return (
    <html lang={t.locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
