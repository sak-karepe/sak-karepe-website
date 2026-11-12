"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLineUpIcon,
  CoinsIcon,
  FoldersIcon,
  ImagesIcon,
  NotePencilIcon,
  PackageIcon,
  ReceiptIcon,
  SquaresFourIcon,
  UsersIcon,
  GearSixIcon,
} from "@phosphor-icons/react";

const menu = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: SquaresFourIcon,
    group: "Overview",
  },
  {
    label: "Produk",
    href: "/admin/produk",
    icon: PackageIcon,
    group: "Manajemen Toko",
  },
  {
    label: "Koleksi",
    href: "/admin/koleksi",
    icon: FoldersIcon,
    group: "Manajemen Toko",
  },
  {
    label: "Pesanan",
    href: "/admin/pesanan",
    icon: ReceiptIcon,
    group: "Manajemen Toko",
  },
  {
    label: "Laporan",
    href: "/admin/laporan",
    icon: ChartLineUpIcon,
    group: "Manajemen Toko",
  },
  {
    label: "Pengeluaran",
    href: "/admin/keuangan/pengeluaran",
    icon: CoinsIcon,
    group: "Manajemen Toko",
  },
  {
    label: "Pengguna",
    href: "/admin/pengguna",
    icon: UsersIcon,
    group: "Manajemen Toko",
  },
  {
    label: "Fashion show",
    href: "/admin/fashion-show",
    icon: ImagesIcon,
    group: "Manajemen Konten",
  },
  {
    label: "Konten",
    href: "/admin/konten",
    icon: NotePencilIcon,
    group: "Manajemen Konten",
  },
  {
    label: "Pengaturan",
    href: "/admin/pengaturan",
    icon: GearSixIcon,
    group: "Preferensi",
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const groups = [...new Set(menu.map((item) => item.group))];

  return (
    <nav
      aria-label="Menu admin"
      className="flex flex-row gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-5 lg:overflow-x-visible lg:pb-0"
    >
      {groups.map((group) => (
        <div
          key={group}
          className="flex shrink-0 flex-row gap-1 lg:w-full lg:flex-col"
        >
          <p className="hidden px-3 pb-1 text-[11px] font-medium tracking-wider text-muted uppercase lg:block">
            {group}
          </p>

          {menu
            .filter((item) => item.group === group)
            .map(({ label, href, icon: Icon }) => {
              const active =
                href === "/admin"
                  ? pathname === href
                  : pathname.startsWith(href);

              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors lg:gap-3 lg:text-[15px] ${
                    active
                      ? "bg-page font-medium text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon size={20} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}
