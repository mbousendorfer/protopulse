# Surface review — lot « desk »

Phase 2 of the UI quality pass, lot desk (2026-11-25): Desk (brief, Your day, detail, batches, Done), Focus,
Chats and the chat drawer, ⌘K, shell (rail, top bar, notifications, shortcut help), moderator panel (⇧D).
Files: `src/features/{desk,chats,command,moderator}/*`, `src/app/Shell.tsx`.

## Method

Every surface rendered with Playwright (Chromium) at 1440 × 900, 1000 × 800 and 375 × 812, light and dark,
29 scenarios: Desk default, batch, batch row open, Worth a look, Good news, selection + bulk bar, Shift board,
folded brief, Done view, reject mode, Busy morning preset, Day 1 Desk, card thread with a sent message, Focus,
Focus at the end of the queue, Chats, Chats with post / chart cards, empty chat, chat drawer, ⌘K, ⌘K answer,
⌘K rule answer, moderator, notifications, Claire popover, shortcut help, mobile rail, collapsed rail.
Data was filled first (Day 30 seed, Busy preset, chats with cards, a thread message, a decision in Done).

Two detectors run in the page on every capture:
1. an element that leaves its card, sheet, dialog or bulk bar with no scroll container in between;
2. text cut by its container without an ellipsis (`scrollWidth > clientWidth`, overflow not
   visible/auto/scroll, no `text-overflow: ellipsis`, no line clamp, outside `.sr-only`).

Before: 168 captures. Detector hits: the Your day bulk bar (4 elements out of the bar by 58–330 px, every
size and theme). Everything else came from looking at the captures.

## Findings

Severity 1 cosmetic → 4 blocking. Every finding has a rule, a rendered proof and one fix; all are fixed in this
branch unless marked open.

| # | Finding | Rule / heuristic | Proof | Fix | Sev |
|---|---|---|---|---|---|
| 1 | The brief fills the first screen. At 1440 × 900 Your day starts at ~930 px (below the fold); at 375 the brief is 1,450 px tall. The work Sam came for is invisible on arrival. | PROMPT §6.1 (« liste + détail : on voit toute la journée »), §3.2 Desk replaces the routine | `previews/pass-desk-brief-before-1440-light.jpg`, `-375-` | Brief redesign: agent rows → 3-column tiles, highlights one target each and sideways scroll under 1100 px. Your day header, tabs and first row now on the first screen at 1440 × 900 (Day 30 and Day 1) | 3 |
| 2 | Six sparklines in the brief: no axis, no label, aria-hidden. | House rule: a metric is named in text | same | Removed; the line of text says what each agent did | 2 |
| 3 | The plan highlight draws seven bars of made-up heights (`8 + ((i*7+3)%5)*5`) for a week where every day has 2 posts. | Data honesty; a metric is named in text | same | Shows the plan's own numbers: « 14 posts next week », then posts per network (`planCounts`, tested) | 3 |
| 4 | Each highlight had two targets doing the same thing (the body and a secondary button), and a 16 px radius inside a card. | Matrix §5 (inner box 10, card hover = blue border, one target) | same | One `<button class="hl-card">`, radius `--r-ctl`, blue border on hover, « Review → » | 2 |
| 5 | Your day bulk bar: in the 340–400 px column the actions scroll sideways out of sight (« Snooze to tomorro », Ask Claire, Reject, Cancel hidden), the bar is 120 px tall. | Nothing hidden without a visible way to it; detector 1 | detector: 4 elements out by 58–330 px at 1440, 1000, 375 | `.day-list .bulk-bar` wraps (count, actions, note, Cancel) | 3 |
| 6 | Day 1 reset with the Nova batch open: « 0 of 4 selected » although 3 are ready, and the footer action disappears, so the batch has no way to finish. | Batch spec (ready items start selected) | `desk-day1` capture | Re-seed the ready items when none of the shown items is selected; the footer action stays, disabled at 0 | 3 |
| 7 | Done view used its own green `done-box` with Undo. | Matrix §7: one `UndoBar` | `desk-done` | `UndoBar` with « Next item » as its action | 2 |
| 8 | Discussing a card (Desk thread) and chatting (Chats, drawer) looked like two products: bordered full-width bubbles, avatar left for you, composer without a frame. | One concept, one appearance (brief, mission) | `desk-thread` vs `chats-cards` | The card thread uses the chat look: your messages right, agent bubble with its name, rule as a chat card, composer and suggestions at the bottom | 2 |
| 9 | Your chat bubbles were tinted blue (`--brand-soft`). | House rule: blue is interactive only | `chats-*` | Neutral `--lift-2` | 2 |
| 10 | Chat drawer: the composer floats under the last message, mid-sheet; « New » sits before the title (the `head` slot is for an icon). | Chat convention; footer actions grouped right (house rule) | `drawer-1440-dark` | `.chat.compact` fills the sheet body; « New chat » moves to the footer next to « Open in Chats » | 2 |
| 11 | Prompt chips at 375: two-line text overflows the 28 px pill. | No text outside its shape | `drawer-375` | Chips grow with their text in chats | 2 |
| 12 | At 375 the six @mention chips stack on three rows above the field (~100 px). | Density on a phone | `chats-cards-375` | The row scrolls sideways under 600 px | 2 |
| 13 | Focus at 375: the decision « Forward to Claire with a holding reply » is cut to « Forward to Clai… ». | A decision is never ambiguous; detector would miss it (ellipsis) | `focus-375-light` | Option labels wrap (`.choice-label`), Desk and batch sheet | 3 |
| 14 | Sources: « fact · origin » chips joined with the same « · », wrapping so a line starts with « · Press always… ». Two sources read as one. | Grouping by structure (house rule) | `focus-1440-light` | One source per line, origin after it | 2 |
| 15 | ⌘K: your question shows « SR » initials (Sam's photo everywhere else); the input's focus ring is drawn inside the bar and cut by the modal's top edge; 13 examples push Actions and Go to below the fold. | Consistency; visible, unbroken focus | `cmdk-*` | Sam's avatar; the bar is the field (no inner ring); 6 examples on an empty bar, all searchable | 2 |
| 16 | Moderator: Nova's triggers read « Nova · warning before… » next to Nova's mark, the others have no prefix. | Consistency | `moderator-1440-light` | Every label drops its agent prefix | 1 |
| 17 | Moderator disclosure links in `--signal` (#178DFE on white, 3.4:1 as 13 px text). | AA; matrix (`--action-ink` for blue text) | `moderator-*` | `--action-ink` | 2 |
| 18 | Vocabulary: « Sent to Claire » (stamp, bulk summary, moderator counter), « All activity » next to « See all activity », « Review one by one » (matrix §1), « Has urgent ». | Matrix §11 glossary | code + captures | « Asked Claire », « See all activity », « Review », « Includes urgent » | 1 |
| 19 | Focus queue used `--lift` / `--lift-2` for hover and current. | Matrix §4 | `focus-*` | `--row-hover` / `--brand-soft` | 1 |
| 20 | Inline styles that are not dynamic (5), a 10 px label outside a chart, ~60 lines of dead CSS (old desk/queue/lane/tally layout, Focus stamp). | Definition of done | measures | Classes, `--t-xs`, deleted | 1 |
| 21 | After the redesign, at 375 the brief byline wrapped with Iris's mark alone on its line. | Alignment | `vp-after desk-375` | Byline row does not wrap | 1 |
| 22 | Focus at 375: « 1 of 18 » wraps on two lines in the top bar; the 32 px title takes three lines before the message. | Density on a phone | `focus-375-light` (after pass 2) | Count never wraps; the Focus title steps down to 24 under 900 px | 2 |
| 23 | Dark: the agent's bubble in the card thread (a sheet on `--deck`) is `--sunk`, the sheet's own colour: no shape. | Dark legibility | `desk-thread-375-dark` | `--lift` in dark | 1 |
| 24 | The rail's « Collapse » shows inside the phone drawer, where it only shrinks the drawer. | Each control does something | `rail-mobile-375` | Hidden while the drawer is open | 1 |

## Open, and why

| Finding | Why it stays |
|---|---|
| At 1000 × 800 the brief still fills the first screen (Your day starts just below). | Three tiles per row would leave ~100 px for the agent's line at that width. Folding the highlights under 1240 px is the next step; it changes what Sam sees on a laptop, so it is a call for Matt. |
| « Sent to Claire » remains in `app/reducer.ts` (thread reply) and in Publishing's approvals. | Other lots / engine. Listed for the matrix owner. |
| `.rec-tag` (« Recommended ») is blue text on a choice. | Shared `base.css`, used by other lots; it sits inside a button, so it reads as part of the control. |
| On a phone the top bar has no page name (`.crumbs` hidden at ≤ 820 px). | Every page has its own h1 right below; a decision of the shell's base styles, not a defect seen in this lot. |

## Measures (lot files)

| Measure | Before | After |
|---|---|---|
| `style={{` inline | 10 (5 not dynamic) | 3 (all dynamic: progress bars, agent ink) |
| Hex outside `tokens.css` | 0 | 0 |
| `font-size` px off the scale | 1 (`.hl-plan small` 10 px) + 2 SVG axis labels (exception) | 0 + 2 SVG axis labels (exception) |
| Detector 1 (out of its card) | 24 hits: 4 elements × 6 captures (bulk bar) | 0 (168 captures) |
| Detector 2 (cut without ellipsis) | 0 | 0 |
