import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { safeNext } from "@/lib/http";
import { first, Flash, type SP } from "@/components/ui";

export async function AuthPage({ mode, searchParams }: { mode: "login" | "signup"; searchParams: SP }) {
  const sp = await searchParams;
  const next = safeNext(first(sp.next));
  const [user, t] = await Promise.all([currentUser(), getT()]);
  if (user) redirect(next);
  const A = t.auth;
  const signup = mode === "signup";
  return (
    <>
      <Flash sp={sp} />
      <div className="wrap max-w-md pt-12">
        <div className="card p-8">
          <h1 className="display text-3xl font-bold">{signup ? A.signup : A.login}</h1>
          <form action={`/api/${mode}`} method="post" className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            {signup && (
              <div><label className="label" htmlFor="name">{A.name}</label><input id="name" name="name" required minLength={2} maxLength={60} autoComplete="name" className="field" /></div>
            )}
            <div><label className="label" htmlFor="email">{A.email}</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
            <div>
              <label className="label" htmlFor="password">{A.password}</label>
              <input id="password" name="password" type="password" required minLength={signup ? 8 : 1} autoComplete={signup ? "new-password" : "current-password"} className="field" />
              {signup && <p className="mt-1 text-xs text-ink-soft">{A.pwHint}</p>}
            </div>
            <button type="submit" className="btn btn-primary w-full !py-3">{signup ? A.create : A.login}</button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-soft">
            {signup ? A.haveAccount : A.newHere}
            <Link href={`/${signup ? "login" : "signup"}?next=${encodeURIComponent(next)}`} className="font-semibold text-royal hover:underline">
              {signup ? A.login : A.signup}
            </Link>
          </p>
        </div>
        {!signup && <p className="mt-4 text-center text-xs text-ink-soft">{A.demo}</p>}
      </div>
    </>
  );
}
