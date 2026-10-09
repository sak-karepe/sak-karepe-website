import Link from "next/link";
export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav
      aria-label="Jejak halaman"
      className="flex flex-wrap gap-3 text-sm text-muted"
    >
      <Link href="/" className="hover:text-accent">
        Beranda
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex gap-3">
          <span aria-hidden="true">/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-accent">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
export function PageIntro({
  title,
  accent,
  copy,
  label,
}: {
  title: string;
  accent: string;
  copy: string;
  label: string;
}) {
  return (
    <div className="wrap pt-8 pb-10 md:pt-10 md:pb-14">
      <Breadcrumb items={[{ label }]} />
      <h1 className="page-title mt-9">
        <span className="hero-title-line">
          <span>{title}</span>
        </span>
        <span className="hero-title-line text-accent">
          <span>{accent}</span>
        </span>
      </h1>
      <p className="hero-enter mt-6 max-w-[560px] text-muted md:text-lg">
        {copy}
      </p>
    </div>
  );
}
