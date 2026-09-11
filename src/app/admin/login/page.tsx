import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy-900 px-5 py-12">
      <div className="w-full max-w-[26rem]">
        <div className="text-center">
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="DreamFly Consultancy"
            width={442}
            height={160}
            priority
            className="mx-auto h-11 w-auto"
          />
          <p className="mt-6 text-[0.8125rem] uppercase tracking-[0.2em] text-gold-200">
            Website Admin
          </p>
        </div>

        <div className="mt-9 rounded-lg bg-surface p-7 shadow-lg sm:p-9">
          <h1 className="text-h3 font-semibold">Sign in</h1>
          <p className="mt-1.5 text-[0.875rem] text-ink-muted">
            Manage the DreamFly Consultancy website.
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
        </div>

        <p className="mt-7 text-center text-[0.8125rem] text-white/45">
          This panel manages the website only. It is separate from the DreamFly CRM.
        </p>
      </div>
    </main>
  );
}
