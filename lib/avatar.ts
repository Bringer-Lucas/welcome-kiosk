// Most people in Entra have no profile photo set. Without a fallback the host
// picker renders as a grid of grey boxes and looks broken, so we draw initials.

export function initials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, " ") // "Dana Reyes (Contractor)"
    .split(/\s+/)
    .filter((p) => /\p{L}/u.test(p));

  if (parts.length === 0) return "?";
  if (parts.length === 1) return firstLetter(parts[0]);

  return firstLetter(parts[0]) + firstLetter(parts[parts.length - 1]);
}

function firstLetter(word: string): string {
  return [...word].find((c) => /\p{L}/u.test(c))?.toUpperCase() ?? "?";
}

/**
 * Stable per-person hue, so the same colleague is always the same colour and
 * visitors can learn to recognise the tile rather than re-reading every name.
 */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360} 45% 42%)`;
}
