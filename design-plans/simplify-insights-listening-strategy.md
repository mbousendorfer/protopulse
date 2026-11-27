# Simplify — Insights, Listening, Strategy

Phase A of the big simplification (27/11). Audit first, then the target map. Data: Day 30, Publishing › Queues
« Ask Atlas to fill », and every Echo, Iris and Sage event triggered from ⇧D (except « a campaign ends »).
Words = words visible in the first screen at 1440 × 900, per block (`text-density.js`, grouped by the nearest
section / card / header).

## 1. Current map

### Insights (`/insights`) — 5 tabs: Reports · Explore · Audience · ROI · Anomalies

| Route | Blocks (first-screen words) | Total words |
|---|---|---|
| `/insights` (Reports) | Page head + lede 9 · tabs 6 · summary line « 3 anomalies to decide » 4 · **Anomalies to decide** group (head + hint + 3 rows with cause, confidence, up to 4 actions each, sparkline) 128 · « To approve » group (0 today) · **Last 7 days** KPI tiles 34 · **Written by Iris** (6 rows, 2 with a summary) 38 · Ask Iris + templates · Scheduled | 269 (219 first screen) |
| `/insights/explore` | Period Seg + network Filters · 7 KPI tiles 75 · daily reach · heatmap + sentence · by pillar (ER, share · target, saves) + sentence · posts table | 388 |
| `/insights/audience` | Network Filters · 4 tiles 14 · Iris's tip card (sentence + « Brief Atlas ») 79 · followers chart · age · countries | 158 |
| `/insights/roi` | Period · 4 tiles 25 · by network 38 · by campaign + « Tell Sage » 21 · posts that sold 15 | 171 |
| `/insights/anomalies` | Select all + Open / Closed · one big card per anomaly (metric, sparkline, cause, rule, confidence, actions) 162 · rules link | 211 |
| `/insights/reports/:id` | the report (document) · side: Share, Download, PDF, link, Template, Ask a follow-up + 4 suggestion chips | — |

### Listening (`/listening`) — 6 tabs: Needs you · Competitors · Mentions · Creators · Trends · Searches

| Route | Blocks (first-screen words) | Total words |
|---|---|---|
| `/listening` (Needs you) | Page head + lede 8 · 6 tabs with counts 13 · kind Filters 22 · **Urgent** group (head + hint + 3 choice buttons) 50 · **Competitor moves** group (hint, 3 rows with impact pill, reason, Why, a 320 px choice button, Other moves, Dismiss, « Show 1 more ») 125 · **Mentions to answer** group (hint + group primary) 24 · Creators group · Trends group | 452 (242) |
| `/listening/competitors` (Events) | Events / Benchmark filters + Manage · competitor menu · **Needs a move** (same rows as Needs you) 154 · Handled 42 | 382 (224) |
| `/listening/competitors/benchmark` | Network Filters · side by side table + share of voice 92 · Lessons 58 · their top posts | 696 (184) |
| `/listening/competitors/manage` | Back · Add · watched competitors 76 | 102 |
| `/listening/mentions` | sentiment bar card 12 · sentiment Filters + product menu + tag menu + 2 switches 15 · list head + « run » sub-groups + rows 104 | 490 (152) |
| `/listening/creators` | Echo's read card 12 · « 5 creators talk about Fernway » 103 | 136 |
| `/listening/trends` | fit Filters · 8 trend cards (25 words each) | 236 |
| `/listening/searches` | « 11 of 15 slots » + New search · table 114 · rules link | 158 |
| `/listening/searches/:sid` | Back · title · Echo's read card · 4 stat cards · the mention feed again | — |

### Strategy (`/strategy`) — 2 tabs: Campaigns · Pillars and cadence

| Route | Blocks (first-screen words) | Total words |
|---|---|---|
| `/strategy` (Campaigns) | Page head + lede + New campaign brief 14 · tabs 4 · need Filters · **Plan to approve** group 31 · **Moments to decide** group 64 · **Changes to apply** group 107 · « Coming up » lines · **Live** cards · **Done** disclosure | 293 (252) |
| `/strategy/pillars` | Sage's proposals (applied, declined, pending, each with its why) 79 · Editorial pillars 74 · Cadence per week 42 | 217 |
| `/strategy/campaigns/:id` | header, brief, assumptions · progress + chart · adjustments · recap · plan by phase · goal / messages / audience / risks · campaign label · who does what | 454 (191) |
| `/strategy/new` | brief form | — |

## 2. Usage

| Block | Who, for which decision | Frequency |
|---|---|---|
| Insights › anomalies to decide | Sam: act on a number outside its range (Atlas test, boost, follow-up) | daily |
| Insights › cards to approve (report, brief, audience idea) | Sam: share the weekly report with Claire | weekly |
| Insights › Last 7 days tiles | Sam: glance at the week. Same tiles on Explore | daily glance, duplicate |
| Insights › Written by Iris | Sam / Claire: read the brief, the weekly report | daily |
| Insights › Ask Iris + templates | Sam: ask for a report | weekly |
| Insights › Scheduled | Sam: pause or drop a schedule | rarely |
| Insights › Anomalies tab | Sam: closed anomalies, reopen, bulk handle | rarely (the open ones are on the landing) |
| Explore · Audience · ROI | Sam, Claire: read numbers | weekly |
| Explore › By pillar « share · target » | Sam: are we on target? — that's Strategy's job | duplicate |
| Listening › Needs you | Sam: answer the spike, choose a counter-move, reply to mentions | daily |
| Listening › Competitors › Events | the open events are Needs you's « Competitor moves »; the handled ones are history | duplicate + rarely |
| Listening › Benchmark | Sam, Claire: how we compare | weekly |
| Listening › Manage competitors | Sam: add, pause | rarely (setting) |
| Listening › Mentions | Sam: browse, filter, bulk reply, export | daily |
| Listening › Creators | the fit ones are Needs you rows; the others are « Echo watches them » | weekly, mostly duplicate |
| Listening › Trends | high fit ones are Needs you rows; the others are « Echo watches them » | weekly, mostly duplicate |
| Listening › Searches | Sam: add, edit, pause a search | rarely (setting) |
| Listening › one search's page | Sam: what's said under one search | weekly — it's the mention feed, filtered |
| Strategy › needs (plans, moments, changes) | Sam: approve a plan, decide a moment, apply a change | weekly |
| Strategy › Coming up | Sam: add a moment early | rarely, **demo** |
| Strategy › Live / Done cards | Sam: open a campaign | weekly |
| Strategy › Pillars and cadence | Sam: on target? edit shares, cadence | weekly / rarely |
| Strategy › Sage's proposals history | Sam: re-open a declined proposal | rarely |

## 3. Tailored components

| Component | Exists for | Standard pattern |
|---|---|---|
| Insights summary line `dq-sum` + « Anomalies to decide » / « To approve » groups, hints (`dq-*` from `video.css`) | the landing | §14 list: `Filters` « Needs you · Reports · Scheduled · Closed », rows |
| `WeekKpis` on the landing | a glance at the week | Explore (same tiles) |
| Anomaly cards (`.anomaly`, `.anomaly-head`, `.resolution`) on the Anomalies tab | the closed history | §14 row, « Closed » filter, Reopen on the row |
| Schedules card (`in-schedules`) | 2 schedules | §14 « Scheduled » filter, Pause on the row, Delete in its menu |
| Templates chip row | saved templates | a `Menu` on the Ask Iris row |
| Explore « share · target » column + sentence | pillar targets | Strategy › Pillars (source of truth) |
| Listening `NeedGroup` (5 groups, icons, hints, group primaries, « Show N more ») | the landing | §14 list, kind in a `Menu` |
| 320 px `need-choice` move button | Echo's counter-move | one visible decision (the verb), every move in `Menu` |
| Urgent card's 3 choice buttons | the spike | recommended option on the row, the others in `Menu` |
| Competitors › Events (`Needs a move` group + Handled) | a second copy of Needs you's events | Needs you, kind « Competitor moves »; handled → « Done » filter |
| Mentions sentiment bar, two switches, « run » sub-groups (`runsOf`, `ls-run`) | demo of shared chips | counts in `Filters`, product/tag in one `Menu`, no sub-groups |
| Creators tab + Echo's read card | 5 creators | Needs you rows (fit) and « Watching » rows; creator panel kept (`?c=`) |
| Trend cards grid | 8 trends | Needs you rows (high fit), « Watching » rows (the others) |
| Searches tab table + slots sentence | settings | « Searches » `Menu` on Mentions + « Manage searches » sheet |
| Search page: Echo's read card + 4 stat cards | one search | Mentions filtered by the search, one meta line, Echo's read in `InfoPop` |
| Strategy groups `need-*` with icons and hints, « Coming up » lines, Live/Done cards + Done disclosure | the landing | §14 list: `Filters` « Needs you · Live · Done · Coming up » |
| Page ledes (« Iris writes the story… », « Echo turns what she hears into moves. », « Sage plans… ») | flavour | gone, the title and the agent mark say it |

## 4. Target map

| Module | Before | After | Why |
|---|---|---|---|
| Insights | Reports · Explore · Audience · ROI · Anomalies | **Reports** · Explore · Audience · ROI | The open anomalies already sit on the landing; the closed ones are a filter of the same list |
| Insights › Reports | summary + 2 groups + KPIs + reports + Ask + schedules | Ask Iris row (one block) → one list: `Needs you · Reports · Scheduled · Closed` | One list, counts in the filters; KPIs live in Explore |
| Insights › Explore | by pillar shows share vs target | by pillar shows performance only | Pillar targets live in Strategy |
| Listening | Needs you · Competitors · Mentions · Creators · Trends · Searches | **Needs you** · Mentions · Competitors | Creators and Trends are kinds of Needs you; Searches is a setting of Mentions |
| Listening › Needs you | 5 groups | one list: `Needs you · Watching · Done`, kind in a `Menu` | Creators and trends Echo doesn't push are « Watching »; handled events are « Done » |
| Listening › Competitors | Events · Benchmark · Manage | Benchmark, « Manage competitors » button | Events were a copy of Needs you |
| Listening › Mentions | bar + 5 controls + sub-groups | `Filters` (sentiment, at risk, hidden) + « Search ▾ » + « Filter ▾ » | One bar, one list |
| Strategy | Campaigns · Pillars and cadence | same | Two really different views |
| Strategy › Campaigns | 3 groups + coming up + live cards + done | one list: `Needs you · Live · Done · Coming up` | One list per state is enough |
| Strategy ↔ Insights | pillars in both | targets and actual share in Strategy, engagement by pillar in Explore | One home per number |

Redirects: `/insights/anomalies` → `/insights?show=closed`; `/listening/creators` → `/listening?kind=creators`
(keeps `?c=`); `/listening/trends` → `/listening?kind=trends`; `/listening/searches` → `/listening/mentions?searches=1`;
`/listening/searches/:sid` → `/listening/mentions?search=:sid`; `/listening/competitors/benchmark` →
`/listening/competitors` (keeps `?net=`).

## 5. References

- **Sprout Social › Listening**: topics are a list you manage in settings; opening a topic gives a few views of the
  same mentions (overview, conversation, demographics). Queries are never a top-level tab.
- **Brandwatch / Agorapulse Listening**: searches live in a side selector of the feed, managed in a dialog; the feed is
  one list with filters.
- **AirOps › Analytics** (Mobbin): 4 tabs (Overview · Visibility · Citations · Sentiment); filters as dropdowns in one
  bar above the content.
- **Buffer › Community** (Mobbin): one list, criteria as menus (« Channels ▾ », « All ▾ ») on the right.
- **Linear › Inbox / Triage**: one queue, filters by state; the decision is on the row; history is a filter, not a tab.

Kept: few tabs, settings behind a button or a menu, one list per queue with state filters, history as a filter.
