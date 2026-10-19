/** Only same-origin relative paths — blocks open redirects after login. */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/dashboard") {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return fallback;
  }
  return raw;
}
