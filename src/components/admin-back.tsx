import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
export function AdminBack() {
  return (
    <Link href="/admin/produk" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
      <ArrowLeftIcon size={16} aria-hidden="true" /> Semua produk
    </Link>
  );
}
