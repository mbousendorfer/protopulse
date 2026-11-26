# Surface review: Insights, Strategy, Agents, Activity, Settings, Onboarding

Phase 2 of the "UI next level" pass, lot `insights-strategy-team` (2026-11-25). Applies `consistency-matrix.md`
(exceptions included); it is not edited here.

**How it was reviewed.** Every route of the lot rendered from this branch with headless Chrome over CDP at 1440 × 900,
1000 × 800 and 375 × 812, light and dark: Insights (reports list, two reports, Explore, Audience, ROI, Anomalies),
Strategy (campaigns, a live, a done and a to-review campaign, new brief, pillars), Agents (team, Shared rules,
Escalation, Iris's profile and its seven tabs), Activity, Settings, and the whole onboarding run from sign-up to first
results (filled through the real flow, not an empty state). The mock state is the 30-day workspace: lists are full.

Two detectors ran in the page on every screen and theme:

1. **Escapes**: any element that leaves its `.card` or dialog without a scrolling or clipping ancestor in between.
2. **Cut text**: any element with text whose `scrollWidth > clientWidth`, `overflow-x` not visible / auto / scroll,
   `text-overflow` not ellipsis, outside `.sr-only`.

Then each screenshot was read for what the detectors can't see: label collisions (chart axes included), alignment,
hierarchy, density, empty space. Severity: 1 cosmetic · 2 inconsistent or weak · 3 breaks a rule or hides content ·
4 blocks.

Detector results before the pass: no escape anywhere; one cut-text hit family, the campaign Timeline (below, G1).
After the pass: zero escapes, zero cut text on every route, size and theme.

## Shared (root cause in `src/ui`, `src/app`)

| # | Sev | Finding | Rule / heuristic | Proof | Fix |
|---|---|---|---|---|---|
| T1 | 3 | `LineChart` scaled its 640-wide viewBox to the container: axis text at ~17 px on Explore (1440), ~5 px at 375, and the chart grew to 380 px tall. In reports the last two date labels collided ("24 Nov25 Nov") | §10 type scale (chart labels 10, matrix exception); labels never overlap | `/insights/explore`, `/insights/reports/w47`, `/strategy/campaigns/trail-week` | Chart measures its box (ResizeObserver) and draws 1:1; label step from the room available; a stepped label closer than a step to the last one is dropped |
| T2 | 2 | Crumbs showed ids: "W47", "Trail week", "Repair friday" | One name per object | top bar on a report and a campaign | Crumbs use the report title and the campaign name |

## Insights

| # | Sev | Finding | Rule / heuristic | Proof | Fix |
|---|---|---|---|---|---|
| N5 | 2 | Reports list: six separate cards, ~110 px each, four on the first screen; "Not shared" pill on every old report | Density; a status says what differs (as on the Desk) | `/insights` 1440 | **Redesign**: one list card, one row per report, row hover, status only for "Waits for you" and "Shared with Claire" |
| N6 | 1 | ROI "Posts that sold": titles cut to ~14 characters ("Storm Jacket vs. a g…") | A label that is cut no longer names its bar | `/insights/roi` | Title on its own line above its bar |
| N7 | 1 | Icons at 11 and 15 px (shared pill, sort arrows, Alerts heading) | matrix §10 icons 12 / 14 / 16 | code | 12 / 16 |

## Strategy

| # | Sev | Finding | Rule / heuristic | Proof | Fix |
|---|---|---|---|---|---|
| G1 | 3 | Timeline: the Teasing phase starts before the campaign and renders 16 px wide, its name cut; Follow-up cut at 1000 and 375. Its content repeats the phase summaries and the posts by phase | Cut text detector (101 > 16) | `/strategy/campaigns/trail-week`, `repair-friday`, all sizes | **Redesign**: Timeline card removed; each phase heads its posts with dates, summary and a "Now" marker |
| G2 | 2 | Campaign page: nine stacked full-width cards; the brief (goal, KPIs, messages, audience, risks) is split over three cards far apart | Hierarchy: the work and the brief it answers to are two different things | `/strategy/campaigns/trail-week` 1440 (≈2,000 px tall) | **Redesign**: two columns ≥ 1100 px, work left, brief + label right |
| G3 | 2 | Posts by phase: three 220 px columns, titles cut ("Why we close the office for Trail We…") | Truncation hides the post | same | Phase list in one column, titles in full |
| G4 | 2 | Who does what: five-column grid, the sixth agent (Juno) alone on a second row | Alignment | same, 1440 | Auto-fit columns (min 170 px): six on one row at 1440, 3 + 3 at 1000 |
| G5 | 2 | 375: Sage's adjustments squeeze the sentence to ~40 % beside Apply / Decline | Responsive | `/strategy/campaigns/trail-week` 375 | Sentence full width, buttons under it (adjustments and proposals) |
| G6 | 1 | Cadence table: network shown by icon only; "incl. 2 on Fernway Repair · 4 · 1 short" puts the count in the middle | A metric is named in text | `/strategy/pillars` | Icon + network name; "4 · 1 short", the Repair share on its own line |
| G7 | 1 | Icons at 13 px (published check, lock) | matrix §10 | code | 14 |

## Agents

| # | Sev | Finding | Rule / heuristic | Proof | Fix |
|---|---|---|---|---|---|
| A6 | 2 | Team cards: the four metrics sit at different heights (the first label wraps to three lines and `column-reverse` pushes its number down) | Alignment | `/agents` 1440 | Numbers aligned at the top |
| A7 | 2 | "Asks for more autonomy" is a blue pill (static) and wraps Nova's footer to a second row | Blue = interactive; one footer per card | `/agents` | Caution pill next to the autonomy bar it is about |
| A8 | 2 | Shared rules filters agents with a segmented control; Escalation and Activity with filter chips | matrix §3: Filters narrow a list | `/agents/rules` vs `/agents/escalation` | Filters chips with agent marks, everywhere |
| A9 | 1 | Escalation: filter chips touch the first row | Spacing | `/agents/escalation` | Chips get the card-body bottom padding |
| A10 | 1 | Track record: bar ticks "30 25 20 15 10 5" say neither date nor "days ago" | A metric is named | `/agents/iris?tab=record` | Dated ticks every 5 days, ending "Today" |
| A11 | 1 | Icons at 13 px on rule edit / delete | matrix §10 | code | 14 |

## Activity

| # | Sev | Finding | Rule / heuristic | Proof | Fix |
|---|---|---|---|---|---|
| Y5 | 2 | "Done" on ~240 rows; four full days unrolled, the page is ~4,100 px | A status says what differs; Inbox "3 then Show N more" (validated) | `/activity` 1440 | **Redesign**: no status on Done; each day shows 12 entries then "Show N more" (≈1,800 px) |
| Y6 | 2 | "Edited by you" is a blue pill on a past event | Blue = interactive | `/activity` | Neutral pill |

## Settings

| # | Sev | Finding | Rule / heuristic | Proof | Fix |
|---|---|---|---|---|---|
| Y7 | 2 | Two orange "Reconnect" in one list; a green "Connected" on 7 of 9 rows | One primary per zone; a status says what differs | `/settings` | Reconnect secondary; status only for "Expires soon" / "Disconnected" |
| Y8 | 2 | Shopify shows the letters "SH"; onboarding shows its mark | Same object, same look | `/settings` vs onboarding accounts | `ShopifyMark` in both |
| Y9 | 1 | Icon at 13 px on Resync | matrix §10 | code | 14 |

## Onboarding

| # | Sev | Finding | Rule / heuristic | Proof | Fix |
|---|---|---|---|---|---|
| Y10 | 3 | Team step counts "Act alone · Draft for you · Suggest only", reverse order, other words | Glossary: Suggest / Draft / Act, always in that order | `/onboarding/team` | "Actions on Suggest · On Draft · On Act" |
| Y11 | 2 | 375: preset control cut ("Auto…") by the "Cautious · Recommended" tag, which is blue static text | Responsive; blue = interactive | `/onboarding/team` 375 | Tag removed; the Cautious description starts with "Recommended for the first week." |
| Y12 | 2 | Sign-up says "Five AI agents" and lists Juno without a line; the team step says six | Consistency | `/onboarding/signup` | "Six AI agents", Juno's line |
| Y13 | 1 | Sign-up title 36 px | §10 scale | `onboarding.css:50` | `--t-3xl` |

## Dark theme

No escape, no cut text, no unreadable state found at either width after the pass. The redesigned campaign, Activity and
reports list were checked in dark at 1440 and 375.

## Seen, not changed (and why)

- **Top bar at 1000 px**: the search field covers the end of the crumbs ("Campaign…"). `Shell` / `base.css`, outside
  this lot's surfaces; reported for the shell lot.
- **Anomaly actions "No action"** (`src/data/insights.ts`) read as the glossary's Dismiss. Mock data, shared with the
  engine tests; left for a data pass.
- **"Not this year"** on Strategy moments is a Dismiss in context; kept because it says what is dismissed (a yearly
  moment) and offers Undo.
- **Shared rules** is a flat list of 25 rules. Search and agent filter make it workable; grouping (by agent or by
  Do / Don't) would change the page's model and was left as a proposal.
- **Brand marks**: the Google "G" (four hex colours) and the Shopify green are logos, kept as literal colours like the
  network glyphs and illustrations.
- **Anomaly cards** reserve 32 px on the left for the selection box even when none is shown: it comes from the shared
  `SelectBox` and keeps the text from jumping when selection starts.
