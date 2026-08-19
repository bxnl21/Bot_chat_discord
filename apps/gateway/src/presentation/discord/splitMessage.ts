export function splitMessage(text: string, maxLength = 1_900): string[] {
  let remaining = text.trim(); const chunks: string[] = [];
  while (remaining.length > maxLength) {
    const view = remaining.slice(0, maxLength + 1);
    const natural = Math.max(view.lastIndexOf('\n'), view.lastIndexOf(' '));
    const at = natural > 0 ? natural : maxLength;
    chunks.push(remaining.slice(0, at).trim()); remaining = remaining.slice(at).trimStart();
  }
  if (remaining) chunks.push(remaining); return chunks;
}
