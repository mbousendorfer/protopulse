// Text density of the current page (PROMPT §10, matrix §13). Paste in the console, or pass to the browser's JS tool.
// Counts what a user reads without clicking: words in <main>, words in the first screen, blocks over 2 lines,
// paragraphs over 25 words. Hidden text, the rail, the top bar, network previews (.pv-*) and open overlays don't count.
// Finish animations first: document.getAnimations().forEach(a => { try { a.finish() } catch {} })
;(() => {
  const main = document.querySelector('main') || document.body
  const fold = innerHeight
  const words = t => (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%€:-]*/gu) || []).length
  let total = 0, first = 0, long = 0, para = 0
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
  const blocks = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement
    if (!el || el.closest('.pv, [class^="pv-"], [class*=" pv-"], .sr-only, [aria-hidden="true"], script, style')) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const w = words(n.textContent || '')
    if (!w) continue
    total += w
    if (r.top + scrollY < fold) first += w
    const block = el.closest('p, li, dd, td, label, h1, h2, h3, h4, blockquote') || el
    blocks.add(block)
  }
  for (const b of blocks) {
    const lh = parseFloat(getComputedStyle(b).lineHeight) || 20
    if (b.getBoundingClientRect().height > lh * 2.5) long++
    if (words(b.innerText || '') > 25) para++
  }
  return { route: location.hash, width: innerWidth, words: total, firstScreen: first, over2Lines: long, over25Words: para }
})()
