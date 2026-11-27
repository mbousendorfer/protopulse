# Text diet — Insights, Listening, Strategy

Lot of the 26/11 text-diet pass (PROMPT §10 « Le texte se mérite », matrix §13). Branch
`claude/ui-next-level-text-diet-insights-listening-strategy`.

**Method.** Day 30 workspace, filled: Publishing › Queues « Ask Atlas to fill » (both queues), then from ⇧D: Echo
negative spike, TikTok audience, LinkedIn follower spike, creator worth a collab, Trailkind viral reel, a calendar
moment. The state was saved once and loaded before every capture, so before and after read the same data. 22 routes,
captured in headless Chrome at 1440 × 900, 1000 × 800 and 375 × 812, light and dark, before any change and after
(132 captures each, plus the three new panels). `design-plans/text-density.js` measured each route at 1440 × 900
light, animations finished. The two detectors (an element leaving its card without a scroll container; text cut
without an ellipsis) ran on every capture.

The three questions of the brief, answered:
- **What must Echo say about a competitor move before Sam picks a counter-move?** What happened (title), how much it
  matters (impact level) and why in one sentence, when, and the move Echo recommends with the others one menu away.
  The proof, the full impact and Echo's read are behind « Why? », one click, without leaving the row.
- **What does an Iris anomaly show before the click?** Its title (which already names the metric and its change), the
  sparkline, the first sentence of the likely cause, Iris's confidence, and the decision buttons. The value, the full
  cause, when it was detected and by which alert rule are behind « Why? ».
- **How many words for a mention?** About fifteen: who, where, the quote itself, when and its reach. What a run of
  mentions shares (sentiment, product, at risk, tags) is said once above the run, and the row's button is « Reply »
  with Nova's mark. The full detail stays in the mention's sheet.

## Inventory

Levels: **V** visible · **P** popover (`InfoPop`) · **S** side panel (`MoreInfo`) · **—** removed because the screen
already says it · **R** rewritten shorter.

| Surface | Block | Before → after | Why |
|---|---|---|---|
| Insights | `PageHead` lede (14 words) | V → R (8 words) | One sentence, says the promise only |
| Insights › Reports | Summary line « I check every network every hour » | V → — when something waits (kept in the empty state) | The empty state is where Iris says what she watches (§12) |
| Insights › Anomalies to decide | Group hint « Outside the normal range. Pick what happens; the history is in Anomalies. » | V → R « Outside the normal range » | The tab is next to it; the buttons say « pick what happens » |
| Insights › Anomalies to decide | Metric hook « Views per video 1,840 −38% » next to the title | V → S | The title already names the metric and its change; the value sits in the panel with its curve |
| Insights › Anomalies to decide | Likely cause (up to 35 words, two lines) | V → V gist (first sentence) + S full | The decision needs the gist; the proof is one click |
| Insights › Anomalies to decide | « 68% confident » | V (same line as the cause) | Confidence stays visible (§3.2) |
| Insights › Anomalies to decide | « Detected 1 h ago », alert rule | V → S | Not needed to pick an option; the panel also links to the rule and the history |
| Insights › To approve | Card context + agent's reason (two lines) | V + V → V context + S reason with confidence | One line of reason (§13) |
| Insights › Last 7 days | « vs 381k the previous 7 days » on each tile | V → R « vs 381k », the period said once in the title | Said once at group level |
| Insights › Written by Iris | A summary on each of 6 reports | V → V on the newest report and drafts; elsewhere it is the report's lede, one click | A list to open, not to read |
| Insights › ROI | « Google Analytics 4 · UTM source = social » | V → P « Source » | A source is a popover (§13) |
| Insights › Anomalies tab, Explore, Audience, report page | — | unchanged | The Anomalies tab is the history: the full cause belongs there. Explore's and Audience's notes are one sentence each and are Iris's read |
| Listening | `PageHead` lede (19 words, two lines) | V → R (7 words) | One short sentence |
| Listening › Needs you | Group reasons (12–16 words each) | V → R (4–9 words) | Kept what changes the decision: « Anything public stays yours to publish », « At risk ones need a reply within the hour » |
| Listening › Needs you › Creators | « Positive about Fernway, unpaid, 10k people or more » | V → P « Who counts » | A definition |
| Listening › Needs you › Urgent | Echo's reason (2 sentences) | V → V gist + S full with context | The alert itself (title, options) stays visible |
| Listening › Needs you, Competitors › Events | Impact reason, cut mid-word by the ellipsis | V (cut) → V first sentence + S « Why? » | Proof, full impact and Echo's read in one panel; the row keeps impact level and the gist |
| Listening › Needs you, Competitors › Events | Meta « Peakline · Price cut · 1 h ago » | V → R « Price cut · 1 h ago » | The title and the avatar already name the competitor |
| Listening › Needs you › Mentions | « At risk: a reply within the hour keeps it from spreading » on every row; network and product on every row | V ×N → « At risk » on the row, the reason once in the group | A reason shared by rows is said once (§12) |
| Listening › Needs you › Mentions | « Ask Nova to reply » button | V → R « Reply » with Nova's mark, full name in `aria-label` | The mark names the agent |
| Listening › Competitors › Events | Header hint, empty line | V → R | Same reason as the Needs you group |
| Listening › Benchmark › Lessons | Evidence line on each of 8 lessons | V → P « Proof » next to the idea | The idea is what « Test it » tests; the evidence is a supporting number |
| Listening › Mentions | 77 rows, all at once (2,101 words) | V → V 20 rows + « Show 20 more of 57 » | One click for the rest; Select all takes what's shown |
| Listening › Mentions | Sentiment, product, at risk, tags on each row | V ×N → V once above a run of 3+ rows that share them | Said once at group level; a row that differs keeps its own chips |
| Listening › Mentions | « Ask Nova to reply » on each row | V → R « Reply » with Nova's mark | Same as Needs you; the bulk bar and the sheet keep « Ask Nova to reply » |
| Listening › Searches | « Echo checks every search every 15 minutes across social networks, news, blogs and forums » | V → P « How Echo searches »; the slots count stays visible | The slots are the constraint, the method a definition |
| Listening › Creators | Collab criteria in Echo's read and in the card head | V → P « Who counts » + « 5,000+ people reached » | A definition |
| Listening › Trends | Two example lines on each card | V → P « 2 examples » | Proof of a trend; growth, fit and why stay |
| Listening › Manage competitors | « Echo checks their accounts every hour and raises launches, price changes, campaigns and viral posts » | V → R « Echo checks them every hour » | The kinds of events are said on Events |
| Strategy | `PageHead` lede (19 words, two lines) | V → R (9 words) | One short sentence |
| Strategy › Campaigns | Group reasons (two sentences each) | V → R (one clause) | Kept the consequence of the gesture |
| Strategy › Plans to approve | The quoted brief on the row | V → — (on the plan page) | The row keeps goal, posts, dates and budget: what the decision needs |
| Strategy › Moments to decide | Reason cut by the ellipsis, ideas count, pillars | V → V reason (ellipsis) + S « Why? » with source, dates, pillars and Atlas's ideas | The panel shows the ideas Atlas would get, which the row could only count |
| Strategy › Changes to apply | « Instagram is at 41%… Move 2 Instagram posts to TikTok. » + « Trail Week, live campaign · Sage’s adjustment » | V → R: the move as title, « Trail Week · reason » as its line | Action first, one line of reason |
| Strategy › Coming up | « Sage raises it on 26 Nov. » | V → R « · Sage raises it 26 Nov » | Shorter, same information |
| Strategy › Live | Campaign card brief | V → — (on the campaign page) | The card keeps dates, posts, budget and progress |
| Strategy › Campaign page | « drag a task to another agent, or use its menu » | V → R « drag a task to reassign it » | The Move menu is on every task |
| Strategy › Pillars and cadence | — | unchanged apart from the lede | Pillar descriptions are 5–7 words and define the bar under them; proposals keep their one-line reason |

Never moved down: the Urgent alert and its three options, the « Held / locked to Suggest » note on the event page,
the launch block on plans (« Active campaigns: 2 max »), every named metric next to its number, network previews.

## References

Looked at on Mobbin for the amount of text on equivalent screens, not for style:
- **Searchable** (mentions & citations, AEO insights): one truncated line per mention in a table, « Details » opens the
  rest; chart cards have a one-line subtitle and an ⓘ for the definition. → one line per mention, definitions in
  popovers.
- **Buffer** (community): a list of posts with two-line snippets, the full thread in a side panel. → the mention sheet
  already plays that role; the feed only needs the quote.
- **Braintrust / incident.io** (dashboards): a card title, the number, and nothing else; explanation lives in docs or
  tooltips. → KPI tiles keep label, value, delta, previous value; the period is said once.
- **Base44**: agent actions collapsed to one line with « Show details ». → « Why? » at the end of the reason line.
- **Sprig** (AI insights): a single AI summary paragraph per card, ~45 words, and that is the only prose on the page.
  → one sentence of agent read per row, the paragraph in the panel.

Retained: one line per item, the definition in a popover, the reasoning in a side panel, and a « load more » on long
feeds rather than everything at once.

## Density, before → after

| Route | words | first screen | > 2 lines | > 25 words |
|---|---:|---:|---:|---:|
| `#/insights` | **447 → 275** | **271 → 222** | 9 → 9 | 8 → 4 |
| `#/insights/explore` | 393 → 388 | 138 → 133 | 0 → 0 | 0 → 0 |
| `#/insights/audience` | 163 → 158 | 128 → 123 | 0 → 0 | 1 → 1 |
| `#/insights/roi` | 181 → 171 | 131 → 121 | 5 → 5 | 0 → 0 |
| `#/insights/anomalies` | 216 → 211 | 188 → 183 | 0 → 0 | 1 → 1 |
| `#/insights/reports/w47` | 268 → 263 | 190 → 185 | 0 → 0 | 2 → 2 |
| `#/listening` | **546 → 452** | **258 → 242** | 11 → 11 | 6 → 3 |
| `#/listening/competitors` | 418 → 382 | 260 → 224 | 15 → 15 | 4 → 4 |
| `#/listening/competitors/benchmark` | 790 → 696 | 186 → 184 | 28 → 28 | 8 → 2 |
| `#/listening/competitors/e-peak-price` | 167 → 156 | 167 → 156 | 1 → 1 | 1 → 1 |
| `#/listening/competitors/manage` | 123 → 102 | 123 → 102 | 4 → 4 | 0 → 0 |
| `#/listening/competitors/profile/peakline` | 213 → 202 | 213 → 202 | 9 → 9 | 0 → 0 |
| `#/listening/mentions` | **2101 → 496** | **216 → 154** | 77 → 20 | 47 → 3 |
| `#/listening/creators` | 156 → 136 | 156 → 136 | 5 → 5 | 0 → 0 |
| `#/listening/trends` | 277 → 236 | 262 → 236 | 0 → 0 | 0 → 0 |
| `#/listening/searches` | 180 → 158 | 169 → 158 | 0 → 0 | 0 → 0 |
| `#/listening/searches/s1` | 2154 → 549 | 154 → 137 | 77 → 20 | 47 → 3 |
| `#/strategy` | **382 → 293** | **302 → 252** | 7 → 7 | 5 → 3 |
| `#/strategy/pillars` | 227 → 217 | 223 → 213 | 6 → 6 | 2 → 2 |
| `#/strategy/campaigns/trail-week` | 468 → 454 | 187 → 191 | 5 → 5 | 0 → 0 |
| `#/strategy/campaigns/gift-guide` | 286 → 272 | 193 → 191 | 1 → 1 | 0 → 0 |
| `#/strategy/campaigns/repair-friday` | 339 → 325 | 172 → 164 | 1 → 1 | 0 → 0 |

Landing pages in bold. Before was measured on this branch's base (`c13f76f`) with the same fixture; it matches the
shared baseline (`text-density-before.md`) within a few words (Listening and Mentions move with the clock, as
« 1 min ago » becomes « 13 min ago »).

What the remaining numbers are:
- **> 2 lines** barely moves because the blocks it counts are rows (`li`) holding a title, a reason line and the
  buttons. They are now two short lines each.
- **> 25 words** on the landings is the same kind of block: a decision row counts its title, its one-line reason and
  its button labels (« Ask Atlas to test 3-second hooks this week », the counter-move choice). On Insights the fourth
  is the newest report's one-sentence summary.
- **Insights first screen (222)** is the three anomalies with their options, then the four named KPIs: decisions
  and named metrics, which don't move down (§13).
- **Listening first screen (242)** is the Urgent alert with its three options and the competitor moves, each with
  Echo's recommended move in words. A verb alone (« Hand to Atlas ») would hide what Atlas will post.
- **Strategy first screen (252)**: one plan, two moments and four changes, each the change itself in words plus one
  line of reason.

## Checks

- Detectors (card overflow, text cut without ellipsis, page scrolling sideways): 0 findings before (132 captures) and 0 after (150 captures, the three panels included; the two panels restyled afterwards were captured again, 0 findings).
- Every `MoreInfo` and `InfoPop` added (10 kinds) opens on Enter and closes on Escape with focus back on its link,
  scripted with real key events.
- Every decision is still taken on the row: Approve, Add to the calendar, Apply, the anomaly options, the counter-move
  choice and Other moves, Reply, Propose a collab, Hand to Atlas. No panel is needed to decide.
- `npx tsc --noEmit`, `npm test`, `npm run build` green.

## Still open

- Insights › To approve was empty in this fixture (Iris's TikTok audience card is not in her « need » group in this
  state, before or after); its « Why? » was checked by type and code, not on screen.
- The `.dq-*` rows (Insights) and `.need-*` rows (Listening, Strategy) are two copies of the same pattern; the shared
  decision primitive the matrix promises would let « Why? » sit in one place.
- Benchmark still shows 16 top posts each with Echo's takeaway; several repeat the lessons above them. Worth a pass
  once the lessons and takeaways are one list.
- Proposal for the matrix §13: name « gist » as the rule for the visible reason (the first sentence of the agent's
  reason; the rest behind « Why? »), and add « rows that share chips get them once above the run » as the feed
  version of « a reason shared by several rows is said once ».
