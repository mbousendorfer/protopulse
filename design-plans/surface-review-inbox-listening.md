# Surface review — Inbox and Listening

Phase 2 of the UI quality pass for the `inbox-listening` lot (2026-11-25). Matrix applied as written
(`consistency-matrix.md`); no rule changed.

**Method.** Every surface and state below was rendered in headless Chrome at 1440 × 900, 1000 × 800 and
375 × 812, light and dark (186 captures before, the same set after). Data filled first (Needs you with all six
groups, 60 conversations, 77 mentions, 12 searches, 4 competitors). On each capture two detectors ran: an
element leaving its card with no scroll container between them, and text cut by its box without an ellipsis
(`scrollWidth > clientWidth`, overflow not visible/auto/scroll, no `text-overflow: ellipsis`, `.sr-only`
excluded). Both returned 0 before and 0 after: the defects below were found by eye on the captures.

**States covered.** Inbox: Needs you, To review, All, Hidden, a teammate's view, a label, a post, filters on,
the Filters panel, the view menu, a selection, a conversation with a draft, with an escalation, with a review,
an auto-reply, the Contact tab, Rules, Saved replies, Labels. Listening: competitor events, an event, a
competitor profile, Benchmark (all networks and one), Manage competitors, Mentions, a mention open, a
selection, Creators, a creator open, Trends, Searches, one search, New search, Mention tags.

Severity: 1 cosmetic · 2 visible inconsistency or friction · 3 a task is hard or a control is out of reach ·
4 blocking.

## Inbox

| # | Sev | Finding | Rule or heuristic | Proof | Fix |
|---|---|---|---|---|---|
| I1 | 3 | Under 1100 px the side nav flattens into ~25 buttons plus 8 grey selects above the list: at 1000 × 800 the first conversation starts at y 510, at 375 it is below the first screen | brief pass 6 "la barre de filtres ne repousse pas la liste hors du premier écran"; Buffer, Plain, Klaviyo keep views in a nav and filters on the list | `pass-inbox-listening-inbox-1000-before.jpg`, `-inbox-375-before.jpg` | **Redesign.** When the nav folds, views, team, saved views, posts and labels live in one menu in the list head; filters behind one Filters button on the list. List at y 245 at 1000, first row on screen at 375 |
| I2 | 2 | Filters sit at the bottom of a 30-row nav, under the fold at 1440 × 900: what narrows the list is not visible from the list | filters live on the list they narrow (Nielsen: visibility) | `-inbox-1440-before.jpg` | **Redesign.** Filters button with a count; each filter on is a chip that removes it, then Clear filters · Save as view (the naming form inline) |
| I3 | 2 | Select triggers show the text centred with the chevron glued to it ("All networks⌄") | a select reads as a field: label left, chevron right | computed `display: block` from the global `.block` utility (`publishing/publishing.css:478`) beating `.select-btn` | Inbox no longer uses the `block` class; the panel sets the width. The global `.block` is left to its owner (flagged in the PR) |
| I4 | 3 | Opening a conversation with Nova's draft: the Send row is covered by the sticky note composer and the panel's foot is below the window (the panel is one window tall but starts under the page head). Send, the main decision, is not on screen | one primary action per zone, visible; PROMPT §3 the decision first | `-panel-1440-before.jpg` (orange edge peeking at y 815) | **Redesign.** While a draft waits, the note field folds to one "Note for the team" button; the panel opens on the latest message and brings its foot into view |
| I5 | 2 | Two orange buttons in the panel (Send on the draft, Add note in the composer) | matrix §1 one primary per zone | same capture, expanded note | A note is secondary; only a reply to the customer is orange |
| I6 | 2 | 1440 with a conversation open: the list is 260 px, search placeholder cut to "Searc", previews after ten characters | a list must stay readable beside its reading pane | `-panel-1440-before.jpg` | The nav folds into the view menu up to 1500 px; the list is ~550 px |
| I7 | 3 | Phones: list rows in All, Hidden, a label… drop their status (Draft ready, Auto-replied, Waiting 26 min): nothing tells what each conversation needs | a status is never dropped, it moves | `ib-all-375` captures | Under 560 px the status goes under the message |
| I8 | 2 | A deep link to a conversation hidden by the current label or filter opens it beside a list that doesn't contain it | the open item is always in the list | `ib-conv-esc-1440-dark` before (Refund label still on) | Opening it clears what hides it |
| I9 | 1 | Panel tools end with a separator orphaned at the end of a line | matrix §5 nothing decorative without a role | `-panel-1440-before.jpg` | Removed |
| I10 | 1 | The post a comment answers is a bordered grey box around a link | §10 what doesn't click has neither fill nor border | same | Plain line |
| I11 | 1 | Icons at 11 and 13 px (8 uses), an inline `style={{ width: 14 }}` spacer in the sort menu | matrix §10 | grep | 12 / 14; the current sort carries a check in the hint slot |
| I12 | 1 | "Approve 3" sends three replies; "I'll reply" and "I'll reply myself" next to "Take over" for the same act; "Not reviewed" next to "Mark not reviewed" | matrix §11 Send = replies; one verb per act | grep | Send N · Take over · Mark not reviewed |

## Listening

| # | Sev | Finding | Rule or heuristic | Proof | Fix |
|---|---|---|---|---|---|
| L1 | 3 | 375: a mention's text is squeezed into a 70 px column by its actions: one word per line. The rule meant to fix it targeted `.mentions`, a class that doesn't exist | text keeps the width; actions wrap under | `-mentions-375-before.jpg` | Under 720 px the actions go under the text |
| L2 | 2 | Mentions toolbar: 4 sentiment + 5 product chips, tags, two switches, Export and Mark as seen wrap over two lines (four at 375) before the list | density; actions on a list belong to the list | `-mentions-1440-before.jpg` | **Redesign.** Products in one menu; Export CSV and Mark N as seen in the list head ("77 mentions · 36 new"); the toolbar is one line at 1440 |
| L3 | 2 | Bulk Tag and Correct sentiment float in a second centred row stuck 76 px above the selection bar | one bulk bar per selection (`BulkBar`) | `ls-select` capture before | Inside the bulk bar (new optional `children` slot); "Sentiment" with Mark positive/neutral/negative, as in the Inbox |
| L4 | 2 | Tab counts mean three things in one bar: Mentions = unseen, Creators = fits not acted on, the others = size | matrix §3 a tab count is the size of its view | `ls-*` captures | Mentions and Creators count their view; "N new" moved to the list head |
| L5 | 3 | Under 820 px a watched competitor loses Profile, Edit and Remove (`display: none`): they can't be edited or removed on a phone | never hide a control to fit; wrap it | `ls-manage-375` before | The switch and actions wrap under the competitor |
| L6 | 2 | A paused competitor is faded to 60 %: its name and handles drop under grey-80 ink | house rule ink grey-80 to grey-100 (AA) | `ls-manage` captures | No opacity; "Paused since…" says it |
| L7 | 2 | 375: card heads squeeze their title into a column ("Competitors / Echo / watches / 4 of 4") | heads wrap, never squeeze | `-manage-375-before.jpg` | Card heads wrap on Listening |
| L8 | 2 | Trends: every card has an orange Hand to Atlas, low fit included: eight orange buttons on one screen | matrix §1 one primary per zone; orange marks the recommended act | `ls-trends-1440-dark` before | Orange only on high-fit trends, secondary elsewhere |
| L9 | 1 | Creators: "84,000 people" doesn't say which metric | house rule a metric is named in text | `ls-creators-1440` before | "84,000 followers" (row and sheet) |
| L10 | 1 | Creators: Shortlist sits at two x positions from one row to the next | alignment | same | The status or Shortlist always ends the row |
| L11 | 1 | Tinted mention tags get a grey dot in front, sometimes alone at the start of a line | separators only between plain chips | `ls-mentions-1000` | No dot before a tinted tag |
| L12 | 1 | "Bring back" (Listening) and "Unhide" (Inbox) for the same act; Manage's back link "Competitor events" vs "All events" | matrix §11 | grep | Unhide · All events |
| L13 | 1 | Dead CSS: `.comp-chip*`, `.ls-sent`, `.move-list .option`, `.ls-bulk-more` | — | grep | Removed |

## Checked, kept

- Searches at 375: the table scrolls sideways inside its card (a scroll container): kept, a table is the right
  form for 12 searches with 5 columns on desktop.
- Selection toolbar at 375 scrolls sideways (`overflow-x: auto`): kept, every action stays reachable.
- Needs you rows keep a 28 px select gutter on phones: shared `SelectBox` behaviour, kept.
- Dark: every capture readable, no fill or border lost; chips, the Filters panel and the view menu use the same
  tokens in both themes.
