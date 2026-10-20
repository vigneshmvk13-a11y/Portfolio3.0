/**
 * Renders the tiny inline-Markdown subset used in CMS text fields (bio, footer credit):
 * **strong** → emphasis span, *em* → <em>. Everything else is escaped.
 */
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function renderInline(text: string, strongClass = 'font-medium text-fg-strong'): string {
  const escaped = text.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, `<strong class="${strongClass}">$1</strong>`)
    .replace(/(?<!\*)\*(?!\*)(.+?)\*/g, '<em>$1</em>');
}
