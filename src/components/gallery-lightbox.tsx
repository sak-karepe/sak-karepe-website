"use client";
import { PreviousIcon, NextIcon, PlaybackIcon } from "@/components/icons";
import Image from "@/components/site-image";
import { useEffect, useState } from "react";
import type { RunwayPhoto } from "@/lib/runway";
export function GalleryLightbox({
  photos,
  index,
  onChange,
}: {
  photos: RunwayPhoto[];
  index: number;
  onChange: (index: number) => void;
}) {
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!auto || media.matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) onChange((index + 1) % photos.length);
    }, 4500);
    const stop = () => window.clearInterval(timer);
    media.addEventListener("change", stop);
    return () => {
      stop();
      media.removeEventListener("change", stop);
    };
  }, [auto, index, onChange, photos.length]);
  return (
    <>
      <div className="lightbox-stage">
        <Image
          key={index}
          src={photos[index].src}
          alt={photos[index].alt}
          width={1066}
          height={1600}
          sizes="(max-width: 768px) 95vw, 70vw"
          className="lightbox-photo switch-enter"
        />
      </div>
      <div className="lightbox-footer">
        <div>
          <p className="text-sm" aria-live={auto ? "off" : "polite"}>
            {String(index + 1).padStart(2, "0")} / {photos.length}
          </p>
          <p className="mt-1 max-w-[600px] text-xs text-white/70 md:text-sm">
            {photos[index].alt}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
        <button
          className="lightbox-control"
          aria-label="Foto sebelumnya"
          onClick={() => {
            setAuto(false);
            onChange((index - 1 + photos.length) % photos.length);
          }}
        >
          <PreviousIcon />
        </button>
        <button className="lightbox-control"
          aria-label={auto ? "Jeda slider" : "Putar slider"}
          aria-pressed={auto} onClick={() => setAuto(!auto)}>
          <PlaybackIcon playing={auto} />
        </button>
        <button
          className="lightbox-control"
          aria-label="Foto berikutnya"
          onClick={() => {
            setAuto(false);
            onChange((index + 1) % photos.length);
          }}
        >
          <NextIcon />
        </button>
        </div>
      </div>
    </>
  );
}