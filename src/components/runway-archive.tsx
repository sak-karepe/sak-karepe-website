"use client";
import { LinkIcon } from "@/components/icons";
import Image from "@/components/site-image";
import { runwayPhotos } from "@/lib/content";
import { useSite } from "./site-shell";
export function RunwayArchive() {
  const { open } = useSite();
  return (
    <div className="grid grid-cols-2 items-start gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-8 md:gap-y-14">
      {runwayPhotos.map((photo, index) => (
        <button
          key={photo.src}
          aria-label={`Perbesar foto ${index + 1}: ${photo.alt}`}
          onClick={() => open({ kind: "gallery", index })}
          className={`group text-left ${index % 3 === 1 ? "md:mt-16" : ""}`}
        >
          <div className="photo aspect-[2/3] transition-transform duration-300 group-hover:-translate-y-1">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 768px) 45vw, 30vw"
              className="object-cover"
            />
          </div>
          <span className="mt-3 flex justify-between text-xs text-muted md:text-sm">
            Lihat tampilan <LinkIcon />
          </span>
        </button>
      ))}
    </div>
  );
}
