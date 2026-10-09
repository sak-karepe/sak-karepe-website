"use client";
import { LinkIcon, CloseIcon } from "@/components/icons";
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
import { navigation, runwayPhotos, type Product } from "@/lib/content";
import { WhatsappLogo } from "@phosphor-icons/react";
import { whatsappUrl } from "@/lib/contact";
import { GalleryLightbox } from "./gallery-lightbox";
type Modal =
  | { kind: "product"; product: Product }
  | { kind: "consult"; message: string }
  | { kind: "gallery"; index: number };
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
        : "Fashion show Sak Karepe";
  return (
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
            <Link href="/masuk" className="whitespace-nowrap text-[13px] md:text-[15px]">Masuk</Link>
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
        <WhatsappLogo size={27} weight="light" aria-hidden="true" />
        <span className="whatsapp-tooltip">Chat dengan Sak Karepe</span>
      </a>
      <dialog
        className={
          modal?.kind === "gallery"
            ? "gallery-lightbox"
            : modal?.kind === "product"
              ? "product-preview"
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
                : "flex items-center justify-between gap-4 border-b border-line p-5 md:px-7"
          }
        >
          <h2
            id="modal-title"
            className={
              modal?.kind === "gallery"
                ? "text-base tracking-normal"
                : modal?.kind === "product" ? "sr-only" : "text-[25px] tracking-[-.035em]"
            }
          >
            {title}
          </h2>
          <button
            className={
              modal?.kind === "gallery" || modal?.kind === "product" ? "lightbox-close" : "square size-11"
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
          {modal?.kind === "gallery" && (
            <GalleryLightbox
              index={modal.index}
              onChange={(index) => setModal({ kind: "gallery", index })}
            />
          )}
        </div>
      </dialog>
    </SiteContext.Provider>
  );
}
