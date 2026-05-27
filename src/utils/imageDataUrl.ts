export function ensureImageDataUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.startsWith('data:') ? value : `data:image/webp;base64,${value}`;
}
