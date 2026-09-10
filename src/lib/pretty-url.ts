/**
 * A destination URL trimmed to the part that identifies it.
 *
 * `https://shop.example.com/products/x?utm_source=y` -> `shop.example.com/products/x`.
 * The scheme is the same on every row and the query string is tracking, so
 * neither helps tell two destinations apart in a narrow column. The full URL
 * stays on the link's `title` and in its `href`.
 */
export function prettyUrl(url: string | null | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    // Not a parseable URL — show what is there rather than nothing.
    return raw.replace(/^https?:\/\//, "");
  }
}
