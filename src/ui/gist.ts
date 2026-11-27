/**
 * The gist of a text for a one-line row or reason (matrix §13): its first sentence, or its first `max` words and "…".
 * The full text stays one click away (the conversation, the « Why? » panel).
 */
export function gist(text: string, max = 14): string {
  const t = text.trim()
  // A sentence ends on . ! ? followed by a new sentence (capital, quote, @, digit) or the end:
  // "€9.90", "#48213." mid-word or "e.g. this" don't count.
  const end = t.search(/[.!?](?=\s+[A-Z“"@0-9]|\s*$)/)
  const first = end >= 0 ? t.slice(0, end + 1) : t
  const words = first.split(/\s+/)
  if (words.length <= max) return first
  return `${words.slice(0, max).join(' ').replace(/[,;:·–-]+$/, '')}…`
}
