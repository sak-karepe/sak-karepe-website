/** Grafik batang omzet bersih periode ini (SVG murni, tanpa library) dengan garis putus-putus periode pembanding. */
const W = 760;
const H = 280;
const pad = { left: 62, right: 12, top: 14, bottom: 34 };

/** Batas atas sumbu Y yang "bulat": 1, 2, atau 5 kali pangkat sepuluh. */
function niceMax(value: number) {
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
/** 1.500.000 -> "1,5 jt", 750.000 -> "750 rb". */
function compact(value: number) {
  if (value >= 1e9) return `${nf.format(value / 1e9)} M`;
  if (value >= 1e6) return `${nf.format(value / 1e6)} jt`;
  if (value >= 1e3) return `${nf.format(value / 1e3)} rb`;
  return String(value);
}
const rupiah = (value: number) => `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;

export function RevenueChart({
  labels,
  titles,
  current,
  previous,
}: {
  labels: string[];
  titles: string[];
  current: number[];
  previous: number[];
}) {
  const max = niceMax(Math.max(1, ...current, ...previous));
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const step = innerW / Math.max(labels.length, 1);
  const barW = Math.max(2, Math.min(step * 0.62, 38));
  const x = (index: number) => pad.left + step * index + step / 2;
  const y = (value: number) => pad.top + innerH - (value / max) * innerH;
  const every = Math.ceil(labels.length / 12);
  const line = previous.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik omzet bersih periode ini dibandingkan periode sebelumnya" className="h-auto w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction} className="text-muted">
            <line x1={pad.left} x2={W - pad.right} y1={y(max * fraction)} y2={y(max * fraction)} stroke="currentColor" opacity={0.18} />
            <text x={pad.left - 8} y={y(max * fraction) + 4} textAnchor="end" fontSize="11" fill="currentColor">
              {compact(max * fraction)}
            </text>
          </g>
        ))}
        {current.map((value, index) => (
          <g key={index}>
            <title>{`${titles[index]}: ${rupiah(value)}${previous[index] !== undefined ? ` (periode sebelumnya ${rupiah(previous[index])})` : ""}`}</title>
            <rect x={x(index) - barW / 2} y={y(value)} width={barW} height={Math.max(innerH - (y(value) - pad.top), value > 0 ? 1 : 0)} rx={2} style={{ fill: "var(--accent)" }} />
            {/* Area sentuh selebar kolom agar tooltip mudah muncul walau batangnya rendah. */}
            <rect x={x(index) - step / 2} y={pad.top} width={step} height={innerH} fill="transparent" />
          </g>
        ))}
        {previous.length > 1 && <polyline points={line} fill="none" stroke="currentColor" strokeWidth={1.6} strokeDasharray="5 4" className="text-muted" />}
        {previous.map((value, index) => (
          <circle key={index} cx={x(index)} cy={y(value)} r={2.2} fill="currentColor" className="text-muted" />
        ))}
        {labels.map((label, index) =>
          index % every === 0 ? (
            <text key={index} x={x(index)} y={H - 12} textAnchor="middle" fontSize="11" fill="currentColor" className="text-muted">
              {label}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--accent)" }} /> Periode ini
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" x2="22" y1="4" y2="4" stroke="currentColor" strokeWidth="1.6" strokeDasharray="5 4" />
          </svg>
          Periode sebelumnya
        </span>
      </figcaption>
    </figure>
  );
}