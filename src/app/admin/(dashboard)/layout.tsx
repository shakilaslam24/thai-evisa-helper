import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { signOutAction } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · DreamFly Admin" },
  robots: { index: false, follow: false },
};

// The admin panel is per-user and always current: never cached, never static.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const newEnquiryCount = await db.enquiry.count({ where: { status: "new", archived: false } });

  return (
    <AdminShell user={user} newEnquiryCount={newEnquiryCount} signOut={signOutAction}>
      {children}
    </AdminShell>
  );
}
