import NextImage, { type ImageProps } from "next/image";
import { assetPath } from "@/lib/assets";

export default function SiteImage({ src, ...props }: ImageProps) {
  return <NextImage {...props} src={typeof src === "string" ? assetPath(src) : src} />;
}
