# Listening and Strategy — decisions first

Lot `listening-strategy` of the decisions-first pass (PROMPT §3.9, matrix §12), 2026-11-26.
Findings, proofs and scenarios: `surface-review-listening-strategy.md`. Captures: `previews/listening-strategy-*`.

## What was wrong

- **Listening** opened on Competitors › Events: four full-width cards under three rows of filters. Nothing said how
  many things waited for Sam or where; the decision (pick a counter-move) needed opening the event; "3 counter-moves
  ready" in orange looked like a link; what waited in Mentions, Creators and Trends was invisible; the rail said 1.
- **Strategy** opened on "Moments ahead" (decisions, not presented as such, including one not raised yet), then a
  grid mixing plans to review, live and done. No summary, no Approve on the list, Sage's proposals and live
  adjustments on other screens, Not this year and Decline without Undo.

## References and what we keep from them

- **Sprout Social Listening, Brandwatch, Talkwalker, Meltwater**: alerts and spikes come before the feeds; a spike
  carries its suggested response. Kept: urgent first, Echo's pick named on the row.
- **Hootsuite Insights / incident.io alerts**: a short queue of what fires, the rest behind tabs. Kept: Needs you as
  the first tab, the feeds unchanged behind it.
- **Linear / Plane / Productboard**: lists grouped by status with a count per group, review first. Kept: a band per
  gesture with its count, Live then Done folded on Strategy.
- **Canva "Designs to review", Planable campaigns, CoSchedule**: approval is a queue with Approve on the row and the
  item one click away. Kept: Approve + Open plan on each plan row.
- Not taken: their visual style, dashboards of charts on the landing.

## New flow

**Listening.** Tabs: **Needs you** (landing) · Competitors · Mentions · Creators · Trends · Searches.
Needs you = summary filters (All · one per group, each a filter on the block) → one card, a band per gesture:

| Group | Row decision | Group action |
|---|---|---|
| Urgent (Echo's urgent cards, the spike) | its options as §10 choices | — |
| Competitor moves | Echo's move as a choice · Other moves (menu) · Dismiss (Undo) | — (each move is different) |
| Mentions to answer (unseen, negative / at risk / question) | Ask Nova to reply · Mark seen (Undo) | Ask Nova to reply to all N |
| Creators worth a collab | Propose a collab · Shortlist (Undo) | — |
| Trends to hand to Atlas (high fit) | Hand to Atlas · Dismiss (Undo) | Hand all N to Atlas |

Three rows per group, then "Show N more". Empty: "Nothing needs you here" + what Echo watches.
Competitors › Events: "Needs a move" with the same rows, then "Handled"; one competitor menu instead of two filter rows.

**Strategy.** Campaigns = notice → summary filters → Plans to approve (Approve, disabled with the guardrail's reason ·
Open plan) · Moments to decide (Add to the calendar · Not this year) · Changes to apply (live adjustments and
pillar/cadence proposals: Apply · Decline) → "Coming up" moments not raised yet (Add it now) → Live → Done (folded).
Pillars and cadence: Sage's proposals first, pillars beside the cadence.

**Rail.** An agent module may declare `needs(s)`; the rail badge shows it. Listening 19, Strategy 8 with Matt's second plan
(7 at seed). The Desk keeps its own counts.

## Moved or removed

- Listening › Competitors: the "Needs a move / Handled / All" filter is gone (the list is now needs a move, then handled);
  the competitor filter is a menu. The event page is unchanged (proof, impact, Echo's read, every move).
- The Competitors tab count is the size of the view (matrix §3); "needs you" lives on the Needs you tab.
- Strategy: the Moments ahead card is replaced by the Moments group plus the Coming up line; every moment stays addable.
  Done campaigns are folded, one click away.
- Dead CSS removed: `.events`, `.event-row`, `.event-top`, `.ev-status.open`, `.moment*`, `.moments-head`.

## Open

- **Badge size.** Listening's rail now says 19 (was 1). It is what the landing lists, as §12 asks; if Matt finds it
  loud, the lever is which groups count (trends and creators are the least urgent), not the badge.
- **Group primary.** Competitor moves, plans, moments and changes have no group action: each row's decision is
  different or risky in bulk (two live campaigns max). Matrix §12 reads "one primary per group"; written here as "at
  most one, when the rows share the gesture".
- **Vocabulary.** Matt's brief said "Not this time"; the glossary (matrix §11) says Dismiss for closing a signal, so
  Dismiss. "Mark seen" is new on Listening for a mention with nothing to answer.
- **Primitive.** The decision block is composed from `card`, `CountBadge`, `Filters`, `Btn`, `.choice`, `UndoBar`,
  `Notice` and `needs.css` (shared by both pages). To migrate to the agents lot's `DecisionGroup` after merge.
- **Shared files** (one commit): `src/app/agent-module.ts` (optional `needs`), `src/app/Shell.tsx` (one line),
  `src/app/types.ts` (`'strategy'` notice scope). Another lot may change the same Shell line.
- Not captured: keyboard focus order through the rows, the Other moves menu open, Done expanded, the spike's Urgent group
  (exercised in tests and by code path only).
