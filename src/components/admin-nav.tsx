"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackageIcon, ReceiptIcon, SquaresFourIcon, UsersIcon } from "@phosphor-icons/react";

const menu = [
  { label: "Dashboard", href: "/admin", icon: SquaresFourIcon },
  { label: "Produk", href: "/admin/produk", icon: PackageIcon },
  { label: "Pesanan", href: "/admin/pesanan", icon: ReceiptIcon },
  { label: "Pengguna", href: "/admin/pengguna", icon: UsersIcon },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
      {menu.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors ${active ? "bg-page font-medium" : "text-muted hover:text-ink"}`}
          >
            <Icon size={20} aria-hidden="true" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}