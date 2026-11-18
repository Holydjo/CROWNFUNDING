import Link from "next/link";
import { getT } from "@/lib/i18n";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="wrap py-24 text-center">
      <p className="display text-6xl font-bold text-royal">404</p>
      <h1 className="display mt-4 text-3xl font-bold">{t.notFound.title}</h1>
      <p className="mt-2 text-ink-soft">{t.notFound.text}</p>
      <Link href="/discover" className="btn btn-primary mt-8">{t.notFound.cta}</Link>
    </div>
  );
}
