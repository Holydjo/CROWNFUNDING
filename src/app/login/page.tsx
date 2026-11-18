import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthForm";
import { getT } from "@/lib/i18n";
import type { SP } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).auth.login };
}

export default function Page({ searchParams }: { searchParams: SP }) {
  return <AuthPage mode="login" searchParams={searchParams} />;
}
