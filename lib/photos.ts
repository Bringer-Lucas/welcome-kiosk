import { query } from "@/lib/db";

// A downscaled 480px JPEG from the kiosk is ~40 KB. Anything an order of
// magnitude past that is a bug or an abuse, not a visitor photo.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Checked against the decoded bytes, not the declared type. Whatever we accept
// here eventually gets drawn onto a badge, and a PDF renderer handed junk is a
// failed print at the front desk.
const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.length > 8 && b.subarray(0, 8).equals(PNG_MAGIC),
  "image/webp": (b) =>
    b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" &&
    b.subarray(8, 12).toString("latin1") === "WEBP",
};

/**
 * Decodes a `data:image/jpeg;base64,...` URL from the kiosk camera.
 * Returns null if it isn't a real image, rather than throwing — a malformed
 * photo should never be the reason a visitor can't check in.
 */
export function decodeDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/]+={0,2})$/s.exec(dataUrl);
  if (!match) return null;

  const [, mime, base64] = match;

  const verify = SIGNATURES[mime];
  if (!verify) return null;

  // Node's base64 decoder silently drops characters it doesn't recognise, so
  // "!!!not-base64!!!" would otherwise decode to plausible-looking bytes. The
  // charset is pinned in the pattern above; length is checked here.
  if (base64.length % 4 !== 0) return null;

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return null;
  if (!verify(bytes)) return null;

  return { mime, bytes };
}

export async function storePhoto(
  kind: "visitor" | "employee",
  mime: string,
  bytes: Buffer,
): Promise<number> {
  const rows = await query<{ id: string }>(
    `INSERT INTO photos (kind, mime, bytes) VALUES ($1, $2, $3) RETURNING id`,
    [kind, mime, bytes],
  );
  return Number(rows[0].id);
}

export async function getPhoto(id: number): Promise<{ mime: string; bytes: Buffer } | null> {
  const rows = await query<{ mime: string; bytes: Buffer }>(
    `SELECT mime, bytes FROM photos WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
