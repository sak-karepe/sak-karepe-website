"use client";
import { LinkIcon, CloseIcon, GoogleMark } from "@/components/icons";
import Image from "@/components/site-image";
import Link from "next/link";
import { basePath } from "@/lib/assets";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { navigation, runwayPhotos } from "@/lib/content";
import { WhatsappLogoIcon } from "@phosphor-icons/react";
import { SessionProvider } from "next-auth/react";
import { signInWithGoogle } from "@/lib/auth-actions";
import { AccountMenu } from "./account-menu";
import { whatsappUrl } from "@/lib/contact";
import { GalleryLightbox } from "./gallery-lightbox";
import { Checkout, type CheckoutProduct } from "./checkout";
type Modal =
  | { kind: "product"; product: { title: string; src: string; description: string } }
  | { kind: "consult"; message: string }
  | { kind: "gallery"; index: number }
  /** `redirectTo`: tujuan setelah login, mis. kembali ke produk untuk melanjutkan pembelian. */
  | { kind: "login"; notice?: string; redirectTo?: string }
  | { kind: "checkout"; product: CheckoutProduct };
const loginNotices: Record<string, string> = {
  AccessDenied: "Login ditolak. Pastikan email akun Google sudah terverifikasi.",
  SessionRequired: "Masuk dengan akun admin untuk membuka dashboard.",
};
const SiteContext = createContext<{ open: (modal: Modal) => void } | null>(
  null,
);
export function useSite() {
  const value = useContext(SiteContext);
  if (!value) throw new Error("SiteProvider missing");
  return value;
}
const initialMessage =
  "Halo Sak Karepe, saya ingin berkonsultasi tentang produk ecoprint.";
export function ConsultButton() {
  const { open } = useSite();
  return (
    <button
      className="btn"
      onClick={() => open({ kind: "consult", message: initialMessage })}
    >
      Konsultasi pesanan <LinkIcon />
    </button>
  );
}
export function SiteShell({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname();
  const pathname = basePath && currentPath.startsWith(`${basePath}/`)
    ? currentPath.slice(basePath.length) : currentPath;
  const [modal, setModal] = useState<Modal | null>(null),
    [menu, setMenu] = useState(false),
    [dark, setDark] = useState(false),
    [message, setMessage] = useState(""),
    [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    textarea = useRef<HTMLTextAreaElement>(null),
    animation = useRef<Animation | null>(null),
    opener = useRef<HTMLElement | null>(null);
  const open = useCallback((next: Modal) => {
    if (!dialog.current?.open)
      opener.current = document.activeElement as HTMLElement;
    animation.current?.cancel();
    animation.current = null;
    setStatus("");
    if (next.kind === "consult") setMessage(next.message);
    setModal(next);
  }, []);
  const close = useCallback(() => {
    const element = dialog.current;
    if (!element || animation.current) return;
    const finish = () => {
      element.close();
      setModal(null);
      opener.current?.focus();
      animation.current = null;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    animation.current = element.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(10px)" },
      ],
      { duration: 160, easing: "ease-in" },
    );
    animation.current.onfinish = finish;
  }, []);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
  }, [modal]);
  const modalKind = modal?.kind;
  useEffect(() => {
    if (!modalKind) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalKind]);
  useEffect(() => {
    if (modalKind === "consult") textarea.current?.focus();
    else if (modalKind) dialog.current?.querySelector("button")?.focus();
  }, [modalKind]);
  useEffect(() => () => animation.current?.cancel(), []);
  useEffect(() => {
    // Auth.js mengarahkan error login ke beranda dengan ?error=...
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");
    if (!error) return;
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- membaca URL sekali saat mount
    open({ kind: "login", notice: loginNotices[error] ?? "Login gagal. Silakan coba lagi." });
  }, [open]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  const changePhoto = (delta: number) => {
    if (modal?.kind === "gallery")
      setModal({
        kind: "gallery",
        index:
          (modal.index + delta + runwayPhotos.length) % runwayPhotos.length,
      });
  };
  const copy = async () => {
    if (!message.trim()) {
      setStatus("Tulis pesan terlebih dahulu.");
      textarea.current?.focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(message.trim());
      setStatus("Pesan berhasil disalin.");
    } catch {
      textarea.current?.focus();
      textarea.current?.select();
      setStatus("Pilih teks pesan, lalu salin secara manual.");
    }
  };
  const title =
    modal?.kind === "product"
      ? `${modal.product.title} ecoprint`
      : modal?.kind === "consult"
        ? "Ceritakan kebutuhanmu."
        : modal?.kind === "login"
          ? "Masuk"
          : modal?.kind === "checkout"
            ? "Lengkapi pesanan."
            : "Fashion show Sak Karepe";
  return (
    <SessionProvider basePath={`${basePath}/api/auth`}>
    <SiteContext.Provider value={{ open }}>
      <a
        href="#utama"
        className="fixed -top-24 left-5 z-50 bg-page p-3 focus:top-3"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-page">
        <nav
          className="wrap flex h-20 items-center justify-between gap-3"
          aria-label="Navigasi utama"
        >
          <Link href="/" aria-label="Sak Karepe, beranda">
            <Image
              className="brand-logo h-16 w-[126px] xl:w-[140px] max-[380px]:w-[100px]"
              src="/brand/logo.svg"
              width={150}
              height={72}
              alt="Sak Karepe, Pewarnaan Alami"
            />
          </Link>
          <div
            id="nav-links"
            className={`${menu ? "flex" : "hidden"} absolute top-20 inset-x-0 flex-col items-start gap-5 border-b border-line bg-page px-5 py-6 lg:static lg:flex lg:flex-row lg:items-center lg:gap-6 lg:border-0 lg:p-0 xl:gap-7`}
          >
            {navigation.map((link) => (
              <Link
                key={link.href}
                aria-current={
                  link.href !== "/#pesanan-khusus" &&
                  (pathname === link.href ||
                    pathname.startsWith(link.href + "/"))
                    ? "page"
                    : undefined
                }
                className="nav-link whitespace-nowrap text-[15px] hover:text-accent"
                href={link.href}
                onClick={() => setMenu(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <AccountMenu onLogin={() => open({ kind: "login" })} />
            <button
              className="rounded-md border border-line px-3 py-2 text-sm lg:hidden"
              aria-expanded={menu}
              aria-controls="nav-links"
              onClick={() => setMenu(!menu)}
            >
              Menu
            </button>
          </div>
        </nav>
      </header>
      {children}
      <footer className="wrap mt-14">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-line pt-9 pb-7 xl:flex-row xl:items-center">
          <div className="flex items-center gap-5">
            <Link href="/" aria-label="Kembali ke beranda">
              <Image
                className="brand-logo"
                src="/brand/logo.svg"
                width={130}
                height={64}
                alt="Sak Karepe, Pewarnaan Alami"
              />
            </Link>
            <p className="text-[13px] text-muted">Ecoprint · Surabaya</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <button aria-pressed={dark} onClick={() => setDark(!dark)}>
              {dark ? "Tema terang" : "Tema gelap"}
            </button>
            {navigation.map((link) => (
              <Link
                className="hover:text-accent"
                key={link.href}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="pb-6 text-xs text-muted">Sak Karepe · Pewarnaan Alami</p>
      </footer>
      <a
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Hubungi Sak Karepe lewat WhatsApp"
        className="whatsapp-float group"
      >
        <WhatsappLogoIcon size={27} weight="light" aria-hidden="true" />
        <span className="whatsapp-tooltip">Chat dengan Sak Karepe</span>
      </a>
      <dialog
        className={
          modal?.kind === "gallery"
            ? "gallery-lightbox"
            : modal?.kind === "product"
              ? "product-preview"
              : modal?.kind === "login"
                ? "login-dialog"
                : ""
        }
        ref={dialog}
        aria-labelledby="modal-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setModal(null)}
        onKeyDown={(event) => {
          if (
            modal?.kind === "gallery" &&
            (event.key === "ArrowLeft" || event.key === "ArrowRight")
          ) {
            event.preventDefault();
            changePhoto(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const r = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < r.left ||
              event.clientX > r.right ||
              event.clientY < r.top ||
              event.clientY > r.bottom
            )
              close();
          }
        }}
      >
        <div
          className={
            modal?.kind === "gallery"
              ? "lightbox-header"
              : modal?.kind === "product"
                ? "product-preview-header"
                : modal?.kind === "login"
                  ? "flex flex-col items-center px-8 pt-11 text-center"
                  : "flex items-center justify-between gap-4 border-b border-line p-5 md:px-7"
          }
        >
          {modal?.kind === "login" && (
            <Image
              className="brand-logo h-12 w-auto"
              src="/brand/logo.svg"
              width={100}
              height={48}
              alt=""
            />
          )}
          <h2
            id="modal-title"
            className={
              modal?.kind === "gallery"
                ? "text-base tracking-normal"
                : modal?.kind === "product"
                  ? "sr-only"
                  : modal?.kind === "login"
                    ? "mt-6 text-[28px] tracking-[-.04em]"
                    : "text-[25px] tracking-[-.035em]"
            }
          >
            {title}
          </h2>
          <button
            className={
              modal?.kind === "gallery" || modal?.kind === "product"
                ? "lightbox-close"
                : modal?.kind === "login"
                  ? "square absolute top-3 right-3 size-10 text-muted"
                  : "square size-11"
            }
            aria-label="Tutup dialog"
            onClick={close}
          >
            <CloseIcon />
          </button>
        </div>
        <div
          className={
            modal?.kind === "gallery"
              ? "lightbox-content"
              : modal?.kind === "product"
                ? "product-preview-stage"
                : modal?.kind === "login"
                  ? "px-8 pt-2 pb-9 text-center"
                  : "p-5 md:p-7"
          }
        >
          {modal?.kind === "product" && (
            <Image
              className="object-contain"
              src={modal.product.src}
              fill
              alt={modal.product.description}
              sizes="100vw"
              preload
            />
          )}
          {modal?.kind === "consult" && (
            <>
              <p className="mb-5 text-muted">
                Siapkan pesan untuk membicarakan produk atau pesanan khusus
                dengan Sak Karepe.
              </p>
              <label
                htmlFor="consult-message"
                className="mb-2 block text-[15px] font-medium"
              >
                Pesan kamu
              </label>
              <textarea
                ref={textarea}
                id="consult-message"
                className="mb-5 block min-h-32 w-full rounded-md border border-line bg-page p-3 text-ink"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <a
                className="btn"
                href={whatsappUrl(message.trim() || initialMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Lanjut ke WhatsApp <LinkIcon />
              </a>
              <button className="text-link ml-5" onClick={copy}>
                Salin pesan
              </button>
              <p role="status" className="mt-4 min-h-6 text-sm text-muted">
                {status}
              </p>
              <p className="mt-4 text-sm text-muted">
                Pesan akan dibuka di WhatsApp. Kamu dapat memeriksanya sebelum
                mengirim.
              </p>
            </>
          )}
          {modal?.kind === "login" && (
            <>
              <p className="text-[15px] text-muted">
                Masuk dengan akun Google untuk memesan produk Sak Karepe.
              </p>
              <form action={signInWithGoogle} className="mt-8">
                <input
                  type="hidden"
                  name="redirectTo"
                  value={modal.redirectTo ?? pathname}
                />
                <button className="login-google">
                  <GoogleMark />
                  Masuk dengan Google
                </button>
              </form>
              {modal.notice && (
                <p role="alert" className="mt-4 text-sm text-ink">
                  {modal.notice}
                </p>
              )}
            </>
          )}
          {modal?.kind === "checkout" && <Checkout product={modal.product} />}
          {modal?.kind === "gallery" && (
            <GalleryLightbox
              index={modal.index}
              onChange={(index) => setModal({ kind: "gallery", index })}
            />
          )}
        </div>
      </dialog>
    </SiteContext.Provider>
    </SessionProvider>
  );
}
