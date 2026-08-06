const DEFAULT_MAX_LENGTH = 1_900;

/** Split a response without ever exceeding Discord's message limit. */
export function splitMessage(text: string, maxLength = DEFAULT_MAX_LENGTH): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  if (maxLength < 1) throw new Error('maxLength phải lớn hơn 0');

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength + 1);
    const newlineIndex = window.lastIndexOf('\n');
    const spaceIndex = window.lastIndexOf(' ');
    const naturalBreak = Math.max(newlineIndex, spaceIndex);
    const splitAt = naturalBreak > 0 ? naturalBreak : maxLength;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
