import { ArrowUpRight, ArrowLeft, ArrowRight, X, ArrowsOutSimple, Pause, Play } from "@phosphor-icons/react/dist/ssr";

export function LinkIcon() {
  return <ArrowUpRight size={18} weight="light" aria-hidden="true" className="shrink-0" />;
}
export function PreviousIcon() {
  return <ArrowLeft size={22} weight="light" aria-hidden="true" />;
}
export function NextIcon() {
  return <ArrowRight size={22} weight="light" aria-hidden="true" />;
}
export function CloseIcon() {
  return <X size={22} weight="light" aria-hidden="true" />;
}
export function ExpandIcon() {
  return <ArrowsOutSimple size={18} weight="light" aria-hidden="true" />;
}

export function PlaybackIcon({ playing }: { playing: boolean }) {
  const Icon = playing ? Pause : Play;
  return <Icon size={20} weight="light" aria-hidden="true" />;
}
