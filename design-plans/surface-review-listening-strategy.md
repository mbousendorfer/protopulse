# Surface review — Listening and Strategy landings

Phase 2 of the decisions-first rework, lot `listening-strategy` (2026-11-26). Matrix §12 applied as written; nothing in
the matrix changed.

**Method.** Listening (Needs you, Competitors › Events, Mentions, Trends, Creators) and Strategy (Campaigns, Pillars and
cadence, the Gift guide plan) rendered in headless Chrome at 1440 × 900, 1000 × 800 and 375 × 812, light and dark,
before and after (48 captures each). Data filled first: a second plan to review (the Storm Jacket brief, as on Matt's
screen), four competitor events open, the spike-free seed with 9 mentions that need a human. Two detectors on every
capture: an element leaving its card with no scroll container between them, and text cut by its box without an
ellipsis. Both returned 0 before and 0 after: the findings below come from reading the captures and walking the
scenarios. Interaction checks scripted on the live page: a move, a dismissal and its Undo, Hand all to Atlas,
Not this year and its Undo, Approve, Decline; the rail badge followed each one.

Severity: 1 cosmetic · 2 visible inconsistency or friction · 3 a task is hard or a control is out of reach · 4 blocking.

## Listening

| # | Sev | Finding | Rule or heuristic | Proof | Fix |
|---|---|---|---|---|---|
| L1 | 3 | Nothing in the page head says how many things wait for Sam, nor where: "Needs a move" is one filter among three rows of filters, and Mentions, Creators, Trends say nothing about what needs a call | §3.9 / matrix §12: header → named summary → decisions; Nielsen visibility of system status | `listening-strategy-before-ls-1440.jpg` | **Redesign.** First tab "Needs you 19", the landing: summary filters (All 19 · Competitor moves 4 · Mentions to answer 9 · Creators worth a collab 2 · Trends to hand to Atlas 4), then one card with a band per gesture |
| L2 | 3 | Choosing a counter-move means opening the event: the decision is never on the list | §12 "opening a row is never required to decide" | same | Echo's move as a §10 choice on the row (agent, move, arrow), "Other moves" in a menu, Dismiss with Undo |
| L3 | 2 | "3 counter-moves ready" in caution orange reads as a link and isn't one | §10 what clicks looks clickable, the rest doesn't; colour for status only | same | Gone: the moves are real buttons now |
| L4 | 2 | Three stacked filter rows before the first event (View, Status, Competitor) | density; Krug "don't make me think" | same | Status filter removed (needs a move first, then Handled); the competitor filter is one menu |
| L5 | 2 | Rail badge said 1 while 4 events needed a move: it counted Echo's Desk cards, most of which are "Worth a look" | matrix §12 "the rail badge counts exactly this block" | before captures, rail | The rail reads the module's own count (`needs` on the agent module); 19 at seed |
| L6 | 1 | Event reason is Echo's long read cut after one line | one reason in one line | same | The row's reason is the impact and why it matters to Fernway; the read stays on the event page |
| L7 | 2 | At 1000 px a mention's quote was cut after six words | the reason must be readable | `after` first pass, 1000 | Under 1100 px titles and reasons get two lines |

## Strategy

| # | Sev | Finding | Rule or heuristic | Proof | Fix |
|---|---|---|---|---|---|
| S1 | 3 | Plans waiting for approval sit in the grid between Live and Done; Approve is two screens away | §12; Canva "Designs to review" and Linear/Plane status groups put the review queue first | `listening-strategy-before-st-1440.jpg` | **Redesign.** "Plans to approve" first: name, brief, goal, posts, dates, budget; Approve on the row (disabled with the guardrail's reason), Open plan |
| S2 | 2 | Moments ahead are decisions but read as a calendar, and list a date Sage hasn't raised yet (1–4 Jan, five weeks out) | §12; PROMPT §4 Sage raises a moment 3 weeks before | same | "Moments to decide" holds the raised ones; later ones are a "Coming up" line with Add it now |
| S3 | 2 | Sage's proposals (pillars, cadence) and live adjustments are decisions buried in other screens (bottom right of Pillars, inside Trail Week) | §12 everything waiting, on the landing | `before-st-pillars-1440.jpg` | "Changes to apply" group on Campaigns; on Pillars, proposals move to the top |
| S4 | 2 | No summary: nothing says 8 things wait | §12 | same | Summary filters: All 8 · Plans to approve 2 · Moments to decide 2 · Changes to apply 4 |
| S5 | 2 | Not this year and Decline had no Undo (only a Reopen next to the row, which disappears from the queue) | §3.3 everything is undoable | code | Both are journal entries with a 10-minute Undo; every decision is confirmed in place by a `Notice` |
| S6 | 1 | Done campaigns take as much room as live ones | the rest of the module after the decisions, history folded | same | Live, then "Done 1" folded |
| S7 | 1 | Pillars card half empty beside a short proposals list, cadence below | density | `before-st-pillars-1440.jpg` | Proposals first (full width), pillars beside the cadence they drive; the editor takes the full width |

## Scenarios (ux-heuristics)

- **"Monday morning, what does Echo want me to do?"** Listening opens on Needs you: 19 things in four groups, the shared
  reason once per group. About 2 minutes if Sam takes Echo's picks: 4 choices, Ask Nova to reply to all 9, Hand all 4 to Atlas.
- **"Peakline cuts its prices, I choose our answer."** Second row of Competitor moves: Echo's pick "Counter-post by Atlas:
  Built to last, not to discount" is one click; Other moves lists Brief Sage and Tell the sales team. The notice says
  "Peakline: Atlas drafted it. The post is on your Desk." with Review on Desk.
- **"Approve the Gift guide plan."** Strategy › Plans to approve › Approve, on the row. "Launched Gift guide that lasts:
  7 posts in Atlas's calendar…" with Undo · 10 min left. A third live campaign is refused on the row with the reason.
- **"Should we do something for First snow?"** Moments to decide: the why (2.3× saves last year), 2 ideas for Atlas,
  Add to the calendar or Not this year, both undoable.
- **"I land on the page: what waits for me and how long will it take?"** The summary line answers before anything else
  on both pages.

## Checked, kept

- Tabs scroll sideways at 375 (shared `Tabs`): every tab stays reachable.
- Two orange buttons on Listening › Needs you (Ask Nova to reply to all, Hand all to Atlas): one per group, the rule.
- Strategy's head keeps "New campaign brief" orange; the decision groups have no bulk action, so no second orange.
