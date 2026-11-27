/**
 * The gist of a text for a one-line row or reason (matrix §13): its first sentence, or its first `max` words and "…".
 * The full text stays one click away (the conversation, the « Why? » panel).
 */
export function gist(text: string, max = 14): string {
  const t = text.trim()
  // A sentence ends on . ! ? followed by a space; "€9.90" or "#48213." mid-word don't count.
  const end = t.search(/[.!?](\s|$)/)
  const first = end >= 0 ? t.slice(0, end + 1) : t
  const words = first.split(/\s+/)
  if (words.length <= max) return first
  return `${words.slice(0, max).join(' ').replace(/[,;:·–-]+$/, '')}…`
}
