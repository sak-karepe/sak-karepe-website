"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { SignOutIcon, SquaresFourIcon, UserCircleIcon } from "@phosphor-icons/react";
import Image from "@/components/site-image";

/** Tombol "Masuk" di navbar; setelah login berganti menjadi ikon profil dengan menu. */
export function AccountMenu({ onLogin }: { onLogin: () => void }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // Tahan tempatnya selama sesi dibaca agar navbar tidak bergeser.
  if (status === "loading") return <span className="block size-9" aria-hidden="true" />;
  const user = session?.user;
  if (!user)
    return (
      <button className="whitespace-nowrap text-[13px] md:text-[15px]" onClick={onLogin}>
        Masuk
      </button>
    );

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        className="grid size-9 place-items-center overflow-hidden rounded-full border border-line transition-colors hover:border-accent"
        aria-label={`Akun ${user.name ?? user.email}`}
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen(!open)}
      >
        {user.image ? (
          <Image src={user.image} alt="" width={36} height={36} className="size-full object-cover" />
        ) : (
          <UserCircleIcon size={24} weight="light" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div
          id="account-menu"
          className="switch-enter absolute top-[calc(100%+12px)] right-0 z-40 w-64 rounded-md border border-line bg-page p-2 shadow-[0_12px_32px_rgb(20_36_26/.12)]"
        >
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="truncate text-[15px] font-medium">{user.name ?? user.email}</p>
            {user.name && <p className="truncate text-[13px] text-muted">{user.email}</p>}
          </div>
          {user.isAdmin && (
            <Link
              href="/admin"
              className="mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              <SquaresFourIcon size={18} aria-hidden="true" /> Dashboard admin
            </Link>
          )}
          <button
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] text-muted hover:bg-surface hover:text-ink"
            onClick={() => signOut({ redirectTo: "/" })}
          >
            <SignOutIcon size={18} aria-hidden="true" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
