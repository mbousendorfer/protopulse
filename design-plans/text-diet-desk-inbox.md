# Text diet — Desk, Chats, Inbox

Lot **desk-inbox** of the « Le texte se mérite » pass (PROMPT §10, matrix §13). Files: `src/features/desk/*`,
`src/features/chats/*`, `src/features/inbox/*`. Captures in `design-plans/previews/text-desk-inbox-{before,after}-*`.

## The two questions

**How much text does it take to decide « Send » on a Needs you row?** Who wrote, the gist of what they asked, the gist
of Nova's answer, how long they have waited, and the group's reason said once in its header (« Ready to send · Nova is
sure of the facts and the tone »). For a passage to check, the doubted passage and Nova's note *are* the decision:
« Send as is » means « I accept this passage »; the rest of the draft is what she is sure of. Everything else (the
whole message, the whole reply, the DM, the translation, the rule) is one click away in the conversation panel, which
opens on the row.

**What should the morning brief say first?** What needs you. It used to open on « Your agents handled 236 things while
you were away. 30 need you. » It now opens on « **30** things need you. Your agents handled **236** on their own. »
The count Sam acts on comes first; the reassurance second.

## Inventory

Levels: **V** visible · **P** popover · **S** side panel (`MoreInfo`) · **—** removed (redundant) · **R** rewritten shorter.

| Surface | Block | Before → after | Why |
|---|---|---|---|
| Inbox | PageHead lede (2 lines) | V → R, 1 line « Nova answers what she can. The rest waits here. » | One lede, one sentence (§13). The views say the rest. |
| Inbox › Needs you | Row: customer's whole first message | V → R, first sentence or 14 words; full text in the conversation | The row only needs the gist to decide; the line was ellipsed at 1440 anyway, and wrapped to 2 full lines at 375. |
| Inbox › Needs you | Row « Ready »: Nova's whole reply | V → R, first sentence + attachments | Same: the gist is enough when Nova is sure (group reason). |
| Inbox › Needs you | Row « Check »: check line + whole draft line (3 lines per row) | V → R, one line « Check “passage” · note gist »; draft line removed from the row | The passage is what « Send as is » decides. Rows go from 3 lines to 2. The draft is one click away. |
| Inbox › Needs you | Row « Your call »: holding reply in full | V → R, gist of the holding reply (10 words) | The rule (the reason) stays visible; the holding reply is a standard text, readable in full on open. |
| Inbox › Needs you | Row « You're replying »: « You took this over. Nova stays out until you reply. » | V → — | Said once by the group header (« You took these over. Nova stays out. »), §12. |
| Inbox › Needs you | Row « Waiting on Claire »: « Asked 3 min ago. She usually answers within a minute. » | V → R « Asked 3 min ago » | The promise was on every row; Claire's answer arrives on the row. |
| Inbox › Needs you | Row « With your team »: « Has Nova's draft and will send it. » / « Is replying. Wholesale and B2B. » | V → R « Sends Nova's draft » / « Replying · Wholesale and B2B » | Shorter, same facts. |
| Inbox › Needs you | Group hints « Your call », « Waiting on Claire », « With your team » | V → R | « Locked topics Nova never answers herself » → « Topics Nova never answers herself »; « You asked her. Nothing to do until she answers » → « Nothing to do until she answers »; « Assigned to Léo or Yanis. They answer; you don't have to » → « Léo or Yanis answer these ». |
| Inbox | Empty states Needs you / To review | V → R | One line + what Nova watches (§12). |
| Inbox › conversation | Product link: 4 lines « Product · Not · Link (utm) · Offer » above the draft | V → V « Storm Jacket · €220 · 92% match » + S « More info » (runner-up ruled out, tracked link, offer) | The product is what Sam checks before Send; the runner-up and the tracking are proof. |
| Inbox › conversation | Escalation note « Escalated · rule “…” » under the thread | V → — when the draft card has « Why? » | The same rule sits behind « Why? » on the draft (the exemplar). Kept for every other note. |
| Inbox › conversation | « Waiting on Claire. She usually replies in about a minute. » | V → R « Waiting on Claire. » | Same as the row. |
| Inbox › composer | « Only your team sees notes. » under the note field | V → — | The placeholder already says « Claire sees it, the customer doesn't ». |
| Inbox › conversation | Escalation « Rule · Why · Who · Never » | S (exemplar) → unchanged | Already behind « Why? ». |
| Inbox › Contact, Saved replies, Rules | Lede, rows | unchanged | Already one level down (a tab or a sheet); each row is one line of name + one of content. |
| Desk › brief | « Your agents handled 236 things while you were away. 30 need you. » | V → R « 30 things need you. Your agents handled 236 on their own. » | What needs you first. |
| Desk › brief | Competitor highlight: avatar + context sentence (« Announced on Instagram at 06:50. Three of your followers… ») | V → — | The title says the move; the context is on the card one click away (Review). |
| Desk | « Shift board · what your agents did in the last 24 h » | V → R « Shift board · last 24 h » | The board's title says the rest when open. |
| Desk › detail | « Why you're seeing this: <whole reason> » + « Playbook: » chips on their own line | V → V one line (first sentence, 18 words) + confidence, then S « Why? » (full reason, confidence, Playbook rules applied, sources), shown only when the panel adds something | Matrix §13: one line of reason; the cited rule and the proofs go to the panel. |
| Desk › detail | Sources (2–3 lines) on every card | V → V on replies and posts only, S on the others | Facts that go out in public stay under the draft (they're part of the decision); an alert's or a plan's sources are proof. |
| Desk › detail | Flags hint « Marked passages are where Nova is unsure. Hover them, or press Tab to reach each note. » | V → R « Marked: where Nova is unsure. Hover or Tab for the note. » | Same instruction, half the words. |
| Desk › batch | « 4 ready to send. Nova sorted them: buying questions first, then the replies she's sure of, then the ones to check. » | V → R « 4 ready to send. » | The group headers right below show the order. |
| Desk › batch | « 4 of 6 selected · click a row to see it in full » | V → R « 4 of 6 selected » | The chevron on each row says it opens. |
| Desk › batch | « Nova also hid 5 spam on her own (set to Act). » | V → R « Nova hid 5 spam on her own. » | The autonomy level is in her profile. |
| Desk › Live | Long log lines (up to 5 lines) | V → V clamped to 2 lines, full line on hover and in Activity (« See all activity ») | A glance at what agents did; Activity is the record. |
| Desk › All clear | « N items still worth a look in the list, whenever you have a minute. » | V → R « N still worth a look in the list. » | PROMPT's All clear sentence kept word for word. |
| Desk Day 1 › welcome | « Your team started at 08:12. Atlas wrote your first drafts and your history is importing. 5 things need you. » | V → R « 5 things need you. Your team started at 08:12. » | Same rule as the brief; the tiles right below say what each agent did. |
| Desk Day 1 › checklist | Detail line under a done step (« Fernway Outdoor (Facebook), @fernway (Instagram)… connected », 4 lines) | V → — on done steps | A done step only needs its name and its check. Open steps keep what they take and what they unlock. |
| Focus | Same detail card | as Desk › detail | Shares `Detail`. |
| Chats | PageHead lede « Talk to your agents. Ask, brief, decide: whatever they prepare waits for your OK in the conversation. » | V → R « Ask, brief, decide. Nothing goes out without your OK. » | One sentence; the trust line stays. |
| Chats | Chart sources, rule cards, boost confirmation | unchanged | Sources are required on every answer (PROMPT §6.13); the boost line is a money confirmation. |

Never moved down: urgency pills, « Held / Escalated » labels, waiting times and « over 1 h », « Nothing goes out until
you confirm », « Can't be undone », the boost spend confirmation, every metric with its name, network previews.

## References

Mobbin, web: Expensify Inbox and Home, Quo, Klaviyo Helpdesk, Fresha Connect, hilos, Attio, Plane, Pi.

- **Inbox rows** (Expensify, Quo, Klaviyo, Fresha): name + **one** line of preview, time on the right. Nobody shows
  the whole message or the whole drafted reply in the list; the conversation opens beside it. We keep two lines
  (their message, Nova's answer) because Sam decides from the row, but each is the gist.
- **Home** (Expensify « Good morning » + to-dos, hilos, Attio, Plane): greeting, then the counts that need you as
  named numbers (« Unread 1 · On your plate 0 »), then a list of one-line to-dos with one action each
  (« Approve 1 report · Begin »). No narrative sentence about what happened overnight before the to-dos.
- **Disclosure**: details are a click away in a side panel (Quo's contact panel, Klaviyo's thread), never inline
  under the row.

What we take: one line per fact in a list, counts that need you first, proof and rules in a side panel. Not their
style.

## Density, before → after

`design-plans/text-density.js` at 1440 × 900, light, same filled Day 30 fixture before and after (W2 events: legal
threat, injury, « which jacket », compliments, send window, hook trial, flop, Echo spike, TikTok audience; queues
filled by Atlas). My « before » differs a little from `text-density-before.md` because the fixture was rebuilt and
the clock had moved (more cards on the Desk); before and after below share the same fixture.

| Route | words | first screen | > 2 lines | > 25 words |
|---|---:|---:|---:|---:|
| `#/` Desk (Nova's batch open) | 659 → 607 | 240 → **192** | 32 → 32 | 0 → 0 |
| `#/` Desk (PFAS card open) | 722 → 617 | 259 → **232** | 35 → 32 | 1 → 0 |
| `#/` Desk Day 1 | 446 → 388 | 275 → **237** | 23 → 20 | 1 → 1 |
| `#/focus` | 427 → 415 | 367 → 364 | 0 → 0 | 0 → 0 |
| `#/chats` | 160 → 152 | 160 → 152 | 0 → 0 | 1 → 1 |
| `#/inbox` Needs you | 801 → **469** | 465 → **365** | 11 → 10 | 21 → **9** |
| `#/inbox/<escalation>` | 704 → 426 | 446 → 321 | 10 → 10 | 18 → 6 |
| `#/inbox/<which jacket>` | 739 → 410 | 450 → 305 | 11 → 10 | 20 → 6 |
| `#/inbox/<Sophie>` Contact tab | 778 → 415 | 502 → 314 | 13 → 12 | 22 → 7 |

What stays and why it earns its place:
- Desk « > 2 lines » are list items by design: Your day rows (a title on two lines + its meta line, PROMPT §6.1),
  the six agent tiles, the Live feed (now two lines + its time) and the Team list. None is a paragraph.
- Inbox « > 25 words » are whole Needs you rows counted as one `li` (author, two gists, wait, two buttons).
- Focus barely moves: its first screen is one decision card (the customer's message, the draft, the options); the
  only text that left is the reason's second sentence and the flags hint.
- Chats: the one block over 25 words is an agent's answer in the conversation, which is the content of the page.

« > 2 lines » that remain are list rows by design: a Needs you row is two lines plus padding, and Your day titles wrap
on two lines (PROMPT §6.1). « > 25 words » that remain on the Inbox are whole rows counted as one block (author, two
gists, wait, buttons), not paragraphs.

## Checks

- Detectors (out of card, text cut without ellipsis) at 1440 × 900, 1000 × 800, 375 × 812, light and dark: none, before or after, on every route and panel above (`detect.js`: element out of its card without a scroll container; text cut without ellipsis; page scrolling sideways).
- `MoreInfo` « Why? » on the Desk card and « More info » on the product link: open with Enter, close with Esc, focus
  back on the link (checked in the browser).
- Every decision still taken without opening a panel: Send / Send as is / Send holding reply on the rows, Approve,
  options, Snooze, Ask Claire on the Desk card.
- `npx tsc --noEmit`, `npm run build`, `npm test` green.

## Open

- `MoreInfo` inside a `Sheet` (the batch « Review » sheet shows `HandoffCard`s with « Why? ») stacks a second sheet.
  It works (Radix nests dialogs) but a popover could fit better there. Not changed.
- The Saved replies sheet shows each reply in full; it is already the panel level, so it stays.
- The Contact tab « About » note is shown in full; it's a tab one click away.
- Matrix proposal: say in §13 that a list row's quote and draft are **gists** (first sentence or ~14 words) and that
  a sentence repeated on every row of a group belongs to the group header.
- Matrix proposal: « Sources » under a reply or a post stay visible (they're facts going out); on alerts, plans and
  proposals they go behind « Why? ».
