export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Public assets need the project path when hosted on GitHub Pages. */
export function assetPath(path: string) {
  if (!basePath || !path.startsWith("/") || path.startsWith("//") || path.startsWith(`${basePath}/`)) return path;
  return `${basePath}${path}`;
}

export const productImage = (name: string) => `/images/products/${name}.jpeg`;
export const runwayImage = (name: string) => `/images/runway/${name}.jpeg`;

/** URL publik lengkap (origin AUTH_URL + basePath) untuk sitemap, robots, dan metadata Open Graph. */
export const siteUrl = `${(process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "")}${basePath}`;
