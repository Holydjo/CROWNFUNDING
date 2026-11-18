import { NextResponse } from "next/server";

/** 303 redirect with a relative Location, so it works behind any host/proxy. */
export function seeOther(path: string, flash?: { error?: string; notice?: string }): NextResponse {
  let location = path;
  if (flash?.error || flash?.notice) {
    const [base, hash = ""] = path.split("#");
    const sep = base.includes("?") ? "&" : "?";
    const key = flash.error ? "error" : "notice";
    location = `${base}${sep}${key}=${encodeURIComponent(flash.error ?? flash.notice ?? "")}${hash ? "#" + hash : ""}`;
  }
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

/** Reject cross-site form posts. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type Form = {
  str: (key: string, max?: number) => string;
  int: (key: string) => number | null;
};

export async function readForm(req: Request): Promise<Form> {
  const data = await req.formData();
  return {
    str: (key, max = 20000) => {
      const v = data.get(key);
      return typeof v === "string" ? v.trim().slice(0, max) : "";
    },
    int: (key) => {
      const v = data.get(key);
      if (typeof v !== "string" || !/^\d{1,9}$/.test(v.trim())) return null;
      return Number(v.trim());
    },
  };
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
