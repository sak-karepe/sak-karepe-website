"use client";
import { LinkIcon, PreviousIcon, NextIcon, PlaybackIcon } from "@/components/icons";
import Image from "@/components/site-image";
import { useState, useEffect, useRef } from "react";
import { runwayPhotos } from "@/lib/content";
import { useSite } from "./site-shell";
export function RunwayGallery() {
  const [page, setPage] = useState(0);
  const { open } = useSite();
  const [auto, setAuto] = useState(true);
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = region.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false,
      hover = false,
      focused = false;
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    const enter = () => {
        hover = true;
      },
      leave = () => {
        hover = false;
      },
      focus = () => {
        focused = true;
      },
      blur = (event: FocusEvent) => {
        if (!element.contains(event.relatedTarget as Node)) focused = false;
      };
    element.addEventListener("mouseenter", enter);
    element.addEventListener("mouseleave", leave);
    element.addEventListener("focusin", focus);
    element.addEventListener("focusout", blur);
    const timer = window.setInterval(() => {
      if (
        auto &&
        visible &&
        !hover &&
        !focused &&
        !media.matches &&
        !document.hidden &&
        !document.querySelector("dialog[open]")
      )
        setPage((value) => (value + 1) % Math.ceil(runwayPhotos.length / 4));
    }, 5500);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      element.removeEventListener("mouseenter", enter);
      element.removeEventListener("mouseleave", leave);
      element.removeEventListener("focusin", focus);
      element.removeEventListener("focusout", blur);
    };
  }, [auto]);
  const start = page * 4;
  return (
    <div ref={region}>
      <div
        key={page}
        className="switch-enter mt-9 grid grid-cols-2 items-start gap-x-4 gap-y-6 md:grid-cols-4 md:gap-6"
        aria-label="Dokumentasi fashion show"
      >
        {runwayPhotos.slice(start, start + 4).map((photo, offset) => (
          <button
            className="group w-full text-left even:mt-8 md:even:mt-[54px]"
            key={photo.src}
            aria-label={`Perbesar foto ${start + offset + 1}: ${photo.alt}`}
            onClick={() => open({ kind: "gallery", index: start + offset })}
          >
            <div className="photo aspect-[2/3] transition-transform duration-300 group-hover:-translate-y-1">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 45vw, 25vw"
              />
            </div>
            <span className="mt-3 flex justify-between gap-2 text-xs md:text-sm">
              Lihat tampilan <LinkIcon />
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-7">
        <p className="text-sm text-muted" aria-live={auto ? "off" : "polite"}>
          Foto {start + 1}–{Math.min(start + 4, runwayPhotos.length)} dari{" "}
          {runwayPhotos.length}
        </p>
        <div className="flex items-center gap-3">
          <button
            className="square"
            disabled={page === 0}
            aria-label="Foto fashion show sebelumnya"
            onClick={() => {
              setAuto(false);
              setPage(page - 1);
            }}
          >
            <PreviousIcon />
          </button>
          <button
            className="square"
            aria-label={auto ? "Jeda slider" : "Putar slider"}
            aria-pressed={auto}
            onClick={() => setAuto(!auto)}
          >
            <PlaybackIcon playing={auto} />
          </button>
          <button
            className="square"
            disabled={start + 4 >= runwayPhotos.length}
            aria-label="Foto fashion show berikutnya"
            onClick={() => {
              setAuto(false);
              setPage(page + 1);
            }}
          >
            <NextIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
