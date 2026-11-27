# Simplify — agents, shell, onboarding

Lot: Agents (Team, profiles, Shared rules, Escalation), Activity, Settings, Playbook, the onboarding v2 and the Shell
(rail, top bar, crumbs, ⌘K). Branch `claude/ui-next-level-simplify-agents-shell-onboarding`. Method:
`simplify-common.md`, matrix §12–14, PROMPT §3 and §10.

Words are measured with `design-plans/text-density.js` at 1440 × 900 on the Day 30 workspace, before any action
(« first » = first screen, « total » = whole page).

## 1. Current map (before)

| Route | Tabs / sections / blocks | Words first / total |
|---|---|---|
| Rail | Desk, Chats · Departments (6) · **Team**: Agents, Activity · Settings, Sam, Collapse | — |
| Top bar | Crumbs (plain text) · « Ask or brief an agent… ⌘K » · **Chat** (drawer) · Claire · theme · bell | — |
| `#/agents` (Team) | Lede · Tabs Team / Shared rules / Escalation · **Needs you** block: summary line (« 1 autonomy request · 53 waiting in departments »), group « Autonomy requests » + hint, group « Waiting in departments » (one row per agent, « Show 3 more ») · « Your team » card with « 6 of 6 on shift » | 180 / 287 |
| `#/agents/rules` | Proposals card · « Try a message » fold · Seg Rules/Facts/Words/Voice + InfoPop · search + 7 agent chips · « Add a rule » · list (Switch, Edit, Delete per row, 6 agent marks per row) | 117 / 362 |
| `#/agents/escalation` | Card title · 7 agent chips · list · add form | 130 / 145 |
| `#/agents/:id` | Back button + crumbs · scene · header · **8 tabs** for Iris and Echo, 7 for the others: Overview · Autonomy · Guardrails · Rules · Escalation · (Alerts) · Track record · Activity | Overview 190 / 231 |
| ↳ Overview | Needs you block (requests, rule proposals, « Waiting in Inbox ») · last 5 actions · Track record card · Autonomy card | 190 / 231 |
| ↳ Autonomy | Preset + action list · Autonomy history (+ « 1 request to decide » button) | 115 / 214 |
| ↳ Guardrails / Escalation | One card each | 61 / 61 · 92 / 92 |
| ↳ Rules | Proposals for the agent · rules it follows · facts it cites · « Also follows the brand voice » | 121 / **556** |
| ↳ Track record | 4 KPIs · chart · « By action » table · « Last undos » | 99 / 177 |
| ↳ Activity | Last 20 actions | 221 / 321 |
| `#/activity` | Lede · 7 agent chips · 4 status chips · « Reversible only » switch · days | 161 / 358 |
| `#/settings` | 5 tabs: Connected accounts · Notifications · Appearance · Profile · Approver | 108 / 108 |
| Onboarding | signup 85 · about 21 · team-org 69 · connect, playbook (Archie's labels) · team 154 · results 187 (first screen) | — |

Sum of an agent's tabs (Nova): **1,652 words** across 7 tabs.

## 2. Usage

| Block | Who, for which decision | How often |
|---|---|---|
| Team › Autonomy requests | Sam: Allow / Try / Not yet | weekly (one request in the seed) |
| Team › Waiting in departments | Nothing to decide here: each row is a link to a department | never — the rail badges already say it, the Desk lists it |
| Team › roster | Who is on, how free, how trusted; pause | weekly |
| Profile › Overview | Repeats Autonomy, Track record and Activity in short | rarely, demo |
| Profile › Autonomy | The dial — the scenario « more autonomy for Nova » | weekly |
| Profile › Guardrails, Escalation | Read, edit a limit | rarely |
| Profile › Rules | Same rules as Shared rules filtered on the agent, with a second add form | rarely |
| Profile › Track record « By action » | Same numbers as the Autonomy row detail | rarely |
| Profile › Activity | Same entries as Activity filtered on the agent | rarely |
| Shared rules | Change a brand rule, decide a proposal | weekly |
| Shared rules › Try a message | Test a caption | rarely, demo |
| Escalation | Who decides what | rarely |
| Activity | Find what an agent did, undo it | daily |
| Settings › Approver | Read-only copy of Escalation's « Claire » rows | never |
| Settings › Appearance | One Seg duplicated by the moon in the top bar | rarely |
| Top bar › Chat | Opens a drawer: same chats as the rail's Chats | rarely (⌘K and Chats cover it) |

## 3. Tailored components → standard pattern

| Component | Replaced by |
|---|---|
| `DecisionBlock` + `DecisionGroup` (summary line, group heads, hints, « Show N more ») on Team and Overview | One « Needs you » card of `DecisionRow`s, only when a request waits (§14: no summary line, no group head, no hint) |
| « Waiting in departments » group | Removed: the rail badge and the Desk carry it |
| Profile › Overview | Removed: its four blocks were each a tab's summary |
| Profile › Rules (`AgentRules`, its proposals card, its add form, scope labels) | Shared rules `?agent=<id>` (the agent menu), and one « Playbook » line on the profile with the count and a link |
| Shared rules › Proposals card | Rows at the top of the rule list with a « Proposed by Nova » `Pill` + « Why? » (`InfoPop`) and Add to Playbook / Dismiss; `Filters` « All · Proposed · Paused » with counts; « Add all N » in the list head under « Proposed » |
| Shared rules › « Try a message » fold | « Check a message » ghost button → `Sheet` |
| Agent chips (7) on Shared rules, Escalation, Activity | One ghost `Menu` « All agents ▾ » (§14 second criterion) |
| Rule row: Switch + Edit + Delete + 1–6 agent marks | Switch visible, Edit / Delete in a `Menu`; who follows it in words |
| Activity: status chips + « Reversible only » switch | `Filters` « Everything · Can undo · Done alone · Your decisions · Undone » with counts |
| Track record « By action » table, « Last undos » | The Autonomy row detail now says « N reviewed by you · N% approved unchanged »; undone entries are marked in « Last 20 actions » |
| Settings › Approver | Escalation (Claire's column), linked from the Claire popover « What goes to Claire » |
| Settings › Appearance tab | A card under Profile |
| Profile « ← Team » button | The first crumb is a link |

## 4. Target map

| Before | After | Why |
|---|---|---|
| Rail: Team group (Agents, Activity) | Agents alone, no group label | Activity is the agents' journal: a tab of Agents, and the bell keeps « See all activity » |
| Top bar: Chat button | Removed | Chats is in the rail with its unread count; ⌘K briefs any agent from anywhere |
| Crumbs: plain text | First crumb links back | Replaces the profile's Back button |
| Agents: Team · Shared rules · Escalation | Team · Shared rules · Escalation · **Activity** (4) | Each tab is a different view; the count on a tab is what it decides (Team: requests, Shared rules: proposals) |
| Team: Needs you (summary, 2 groups, 4+ rows) + roster | Requests card (only when one waits) + roster | One block above the list |
| Profile: 7–8 tabs | **How it works** · **Track record** (+ Alerts for Iris, Echo) | How it works = requests, autonomy, guardrails, escalation, Playbook line. Track record = KPIs, chart, last 20 actions, autonomy history |
| Shared rules and profile › Rules | Shared rules only, filtered by agent | One source of truth (`s.playbook`), one screen to edit it |
| `#/activity` | `#/agents/activity` (redirect keeps `?agent=`) | — |
| Settings: 5 tabs | 3 tabs: Connected accounts · Notifications · Profile | Approver duplicated Escalation, Appearance duplicated the moon |
| Onboarding | Unchanged steps and fields | The text diet (#162) already cut it; the one dead promise (« invite them later from Settings ») goes |

### Answers to the lot's questions

- **Profile tabs.** 2 core tabs, plus Alerts where the agent has them. Autonomy, Guardrails and Escalation form « How it
  works »; Rules leaves for Shared rules.
- **Shared rules vs Playbook.** Same thing. `src/features/playbook/slice.ts` is the store (`s.playbook`), the source of
  truth; « Shared rules » is its only screen. The profile only counts and links.
- **Team vs Desk and rail.** « Waiting in departments » repeated both: removed. Requests stay (decided only here).
- **Activity in the rail.** No: a tab of Agents, plus the bell, the Desk's Live feed and ⌘K « What did Nova do overnight? ».
- **Settings duplicates.** Approver (= Escalation), Appearance (= moon). Escalation is edited once, in Agents.
- **Rail and top bar.** Rail 12 → 11 entries; top bar 6 → 5 controls. Theme, Claire and the bell stay: each is the only
  quick way to its thing.

## 5. References (structure only)

- **Expensify** (Mobbin, web): agents live in Account › Agents, one page of instructions per agent, no tabs.
- **Contra** Co-Agent settings: one page, sections, a preview — no tab per setting.
- **Base44** Superagent: one settings dialog, left nav of 6 sections; rules and memory in one place.
- **Linear**: no activity entry in the nav; history is per object and in the inbox.
- **Shopify / Square activity logs** (from #162's research): one list, filters by state, grouped by day.

Kept: one place per setting, agents' rules with the rest of the brand rules, the log as a filtered list.
