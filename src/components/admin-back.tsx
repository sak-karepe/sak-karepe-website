import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
export function AdminBack({ href = "/admin/produk", label = "Semua produk" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
      <ArrowLeftIcon size={16} aria-hidden="true" /> {label}
    </Link>
  );
}
