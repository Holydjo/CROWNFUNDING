import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Crownfunding home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#4a2fe0" />
        <path d="M7 22 L5.5 11 L11.5 15.5 L16 8 L20.5 15.5 L26.5 11 L25 22 Z" fill="#f2b31b" />
        <rect x="7" y="23.5" width="18" height="2.4" rx="1.2" fill="#f2b31b" />
      </svg>
      <span className="display hidden text-xl font-bold tracking-tight text-ink min-[420px]:inline">Crownfunding</span>
    </Link>
  );
}

export async function Header() {
  const user = await currentUser();
  return (
    <header className="border-b border-line bg-white">
      <div className="wrap flex h-16 items-center gap-4">
        <Logo />
        <nav className="hidden items-center gap-5 pl-4 text-sm font-medium text-ink md:flex">
          <Link href="/discover" className="hover:text-royal">Discover</Link>
          <Link href="/start" className="hover:text-royal">Start a project</Link>
          <Link href="/about" className="hover:text-royal">How it works</Link>
        </nav>
        <form action="/discover" method="get" role="search" className="ml-auto hidden w-56 sm:block lg:w-72">
          <input type="hidden" name="state" value="all" />
          <input name="q" type="search" placeholder="Search projects, creators, places" aria-label="Search projects" className="field !rounded-full !py-2" />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost !px-4" data-testid="nav-user">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-royal-tint text-xs font-bold text-royal">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
              </Link>
              <form action="/api/logout" method="post">
                <button className="btn btn-ghost !px-4" type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost !px-4">Log in</Link>
              <Link href="/signup" className="btn btn-primary !px-4">Sign up</Link>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <nav aria-label="Categories" className="wrap flex gap-5 overflow-x-auto py-2.5 text-sm text-ink-soft">
          <Link href="/discover" className="whitespace-nowrap font-semibold text-ink md:hidden">Discover</Link>
          <Link href="/start" className="whitespace-nowrap font-semibold text-ink md:hidden">Start a project</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/discover?category=${c.slug}`} className="whitespace-nowrap hover:text-royal">
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
