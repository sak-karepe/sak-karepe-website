"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwiseIcon,
  ArrowsOutLineHorizontalIcon,
  ArrowsVerticalIcon,
  BookOpenTextIcon,
  CircleHalfIcon,
  CursorIcon,
  DropIcon,
  ImageBrokenIcon,
  MoonIcon,
  PauseCircleIcon,
  PersonArmsSpreadIcon,
  SpeakerHighIcon,
  TextAaIcon,
  TextAlignLeftIcon,
  type Icon,
} from "@phosphor-icons/react";
import { CloseIcon } from "./icons";
import { displayKey } from "@/lib/content";

/** Tiap pilihan menjadi atribut `data-<key>` di <html>; gayanya ada di globals.css. Nilai pertama = mati. */
const options: { key: string; label: string; icon: Icon; levels: [string, string][] }[] = [
  { key: "speech", label: "Moda Suara", icon: SpeakerHighIcon, levels: [["", "Mati"], ["on", "Klik untuk dibacakan"]] },
  { key: "text", label: "Ukuran Teks", icon: TextAaIcon, levels: [["", "Normal"], ["large", "Besar"], ["larger", "Sangat besar"]] },
  { key: "theme", label: "Tema Gelap", icon: MoonIcon, levels: [["", "Mati"], ["dark", "Aktif"]] },
  { key: "contrast", label: "Kontras+", icon: CircleHalfIcon, levels: [["", "Mati"], ["high", "Aktif"]] },
  { key: "saturation", label: "Kejenuhan", icon: DropIcon, levels: [["", "Normal"], ["low", "Rendah"], ["none", "Hitam putih"]] },
  { key: "images", label: "Sembunyikan Gambar", icon: ImageBrokenIcon, levels: [["", "Mati"], ["hidden", "Aktif"]] },
  { key: "font", label: "Ramah Disleksia", icon: BookOpenTextIcon, levels: [["", "Mati"], ["dyslexia", "Aktif"]] },
  { key: "spacing", label: "Spasi Teks", icon: ArrowsOutLineHorizontalIcon, levels: [["", "Normal"], ["wide", "Lebar"]] },
  { key: "leading", label: "Tinggi Garis", icon: ArrowsVerticalIcon, levels: [["", "Normal"], ["loose", "Renggang"]] },
  { key: "align", label: "Rata Kiri", icon: TextAlignLeftIcon, levels: [["", "Mati"], ["left", "Aktif"]] },
  { key: "motion", label: "Animasi Dijeda", icon: PauseCircleIcon, levels: [["", "Mati"], ["paused", "Aktif"]] },
  { key: "cursor", label: "Kursor Besar", icon: CursorIcon, levels: [["", "Mati"], ["large", "Aktif"]] },
];

function speak(event: Event) {
  const target = (event.target as Element | null)?.closest?.(
    "a, button, h1, h2, h3, h4, p, li, label, figcaption, img",
  );
  const text = target instanceof HTMLImageElement ? target.alt : (target as HTMLElement | null)?.innerText;
  if (!text?.trim()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim().slice(0, 600));
  utterance.lang = "id-ID";
  speechSynthesis.speak(utterance);
}

export function DisplayMenu() {
  const [display, setDisplay] = useState<Record<string, string>>({});
  const [canSpeak, setCanSpeak] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fitur browser, baru diketahui setelah mount
    setCanSpeak("speechSynthesis" in window);
    try {
      setDisplay(JSON.parse(localStorage.getItem(displayKey) ?? "{}"));
    } catch {}
  }, []);
  useEffect(() => {
    if (display.speech !== "on" || !("speechSynthesis" in window)) return;
    document.addEventListener("click", speak);
    document.addEventListener("focusin", speak);
    return () => {
      document.removeEventListener("click", speak);
      document.removeEventListener("focusin", speak);
      speechSynthesis.cancel();
    };
  }, [display.speech]);
  const save = (change: (current: Record<string, string>) => Record<string, string>) =>
    setDisplay((current) => {
      const next = change(current);
      for (const { key } of options) {
        if (next[key]) document.documentElement.setAttribute(`data-${key}`, next[key]);
        else document.documentElement.removeAttribute(`data-${key}`);
      }
      try {
        localStorage.setItem(displayKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  const cycle = (key: string, levels: [string, string][]) =>
    save((current) => {
      const index = levels.findIndex(([value]) => value === (current[key] ?? ""));
      return { ...current, [key]: levels[(index + 1) % levels.length][0] };
    });
  const active = options.some(({ key }) => display[key]);
  return (
    <>
      <button
        className="display-float"
        style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}
        aria-label="Menu aksesibilitas"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <PersonArmsSpreadIcon size={28} weight="bold" aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        className="display-drawer"
        aria-labelledby="display-title"
        onClick={(event) => event.target === dialog.current && dialog.current.close()}
      >
        <div className="flex items-center justify-between gap-3 bg-accent px-5 py-5 text-button-ink">
          <h2 id="display-title" className="font-heading text-xl tracking-normal">
            Menu Aksesibilitas
          </h2>
          <button
            className="grid size-10 place-items-center rounded-full bg-button-ink/15"
            aria-label="Tutup menu aksesibilitas"
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {options
            .filter(({ key }) => key !== "speech" || canSpeak)
            .map(({ key, label, icon: OptionIcon, levels }) => {
              const index = Math.max(0, levels.findIndex(([value]) => value === (display[key] ?? "")));
              return (
                <button
                  key={key}
                  aria-pressed={index > 0}
                  onClick={() => cycle(key, levels)}
                  className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border border-line bg-page px-2 py-3 text-center hover:border-accent aria-pressed:border-2 aria-pressed:border-accent aria-pressed:bg-surface"
                >
                  <OptionIcon size={36} aria-hidden="true" />
                  <span className="text-[15px] leading-tight font-medium">{label}</span>
                  <span className="text-[13px] text-muted">{levels[index][1]}</span>
                  {levels.length > 2 && (
                    <span className="flex gap-1" aria-hidden="true">
                      {levels.slice(1).map(([value], dot) => (
                        <span key={value} className={`h-1.5 w-5 rounded-full ${dot < index ? "bg-accent" : "bg-line"}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        <div className="px-4 pb-6">
          <button
            disabled={!active}
            onClick={() => save(() => ({}))}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-ink font-medium disabled:opacity-40"
          >
            <ArrowCounterClockwiseIcon size={20} aria-hidden="true" />
            Atur ulang semua
          </button>
        </div>
      </dialog>
    </>
  );
}
