import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { safeNext } from "@/lib/http";
import { first, Flash, type SP } from "@/components/ui";

export async function AuthPage({ mode, searchParams }: { mode: "login" | "signup"; searchParams: SP }) {
  const sp = await searchParams;
  const next = safeNext(first(sp.next));
  if (await currentUser()) redirect(next);
  const signup = mode === "signup";
  return (
    <>
      <Flash sp={sp} />
      <div className="wrap max-w-md pt-12">
        <div className="card p-8">
          <h1 className="display text-3xl font-bold">{signup ? "Sign up" : "Log in"}</h1>
          <form action={`/api/${mode}`} method="post" className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            {signup && (
              <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required minLength={2} maxLength={60} autoComplete="name" className="field" /></div>
            )}
            <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required minLength={signup ? 8 : 1} autoComplete={signup ? "new-password" : "current-password"} className="field" />
              {signup && <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>}
            </div>
            <button type="submit" className="btn btn-primary w-full !py-3">{signup ? "Create account" : "Log in"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-soft">
            {signup ? "Already have an account? " : "New to Crownfunding? "}
            <Link href={`/${signup ? "login" : "signup"}?next=${encodeURIComponent(next)}`} className="font-semibold text-royal hover:underline">
              {signup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </div>
        {!signup && <p className="mt-4 text-center text-xs text-ink-soft">A demo account is described in the README.</p>}
      </div>
    </>
  );
}
