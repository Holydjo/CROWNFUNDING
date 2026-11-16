import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap py-24 text-center">
      <p className="display text-6xl font-bold text-royal">404</p>
      <h1 className="display mt-4 text-3xl font-bold">We couldn&apos;t find that page.</h1>
      <p className="mt-2 text-ink-soft">The project may have been removed, or the link may be wrong.</p>
      <Link href="/discover" className="btn btn-primary mt-8">Discover projects</Link>
    </div>
  );
}
