import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthForm";
import type { SP } from "@/components/ui";

export const metadata: Metadata = { title: "Sign up" };

export default function Page({ searchParams }: { searchParams: SP }) {
  return <AuthPage mode="signup" searchParams={searchParams} />;
}
