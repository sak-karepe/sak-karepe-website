import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOutIcon, SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import { AdminNav } from "@/components/admin-nav";
import Image from "@/components/site-image";
import { requireAdminPage } from "@/auth";
import { signOutAdmin } from "@/lib/auth-actions";
export const metadata: Metadata = {
  title: { default: "Admin · Sak Karepe", template: "%s · Admin Sak Karepe" },
  robots: { index: false },
};
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminPage();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:px-6 lg:pt-7 lg:pb-8">
          <Link href="/admin" aria-label="Dashboard admin" className="flex items-center gap-3">
            <Image className="brand-logo h-11 w-auto" src="/brand/logo.svg" width={92} height={44} alt="Sak Karepe" />
            <span className="rounded-sm border border-line px-1.5 py-0.5 text-[11px] tracking-wide text-muted uppercase">
              Admin
            </span>
          </Link>
          <form action={signOutAdmin} className="lg:hidden">
            <button className="flex items-center gap-2 text-sm text-muted hover:text-ink">
              <SignOutIcon size={18} aria-hidden="true" /> Keluar
            </button>
          </form>
        </div>
        <AdminNav />
        <div className="mt-auto hidden border-t border-line p-5 lg:block">
          <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <Link href="/" className="flex items-center gap-1.5 hover:text-ink">
              Lihat website <ArrowSquareOutIcon size={15} aria-hidden="true" />
            </Link>
            <form action={signOutAdmin}>
              <button className="flex items-center gap-1.5 hover:text-ink">
                <SignOutIcon size={16} aria-hidden="true" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>
      {children}
    </div>
  );
}
