export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Public assets need the project path when hosted on GitHub Pages. */
export function assetPath(path: string) {
  if (!basePath || !path.startsWith("/") || path.startsWith("//") || path.startsWith(`${basePath}/`)) return path;
  return `${basePath}${path}`;
}
