export const ORDER_COMMENT_MAX_LENGTH = 1000;

/** Store plain text, not HTML. Views must render this value as escaped text. */
export function normalizeOrderComment(value?: string): string | null {
  const text = (value ?? "").replace(/\r\n?/g, "\n");
  const cleaned = Array.from(text).filter((character) => {
    const code = character.codePointAt(0)!;
    return (code >= 32 && code !== 127) || character === "\n" || character === "\t";
  }).join("").trim();
  return cleaned || null;
}
