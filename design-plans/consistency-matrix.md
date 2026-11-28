# Consistency matrix

Phase 1 of the UI quality pass (2026-11-25). Read-only inventory of every pattern, the variant kept, the rule
behind it, and what has to move. Sources, in order: decisions already taken, `PROMPT.md` §3 / §10, `tokens.css` +
`base.css` + `src/ui`, Agorapulse house rules (`design-guidelines` → `house-rules.md`), `docs/ux-audit.html`.

When a house rule and `PROMPT.md` §10 disagree, §10 wins (it is the product's own visual direction) and the
exception is written here.

## Starting measures

| Measure | Before | Notes |
|---|---|---|
| `style={{` inline | 155 | 29 files. ~60 are truly dynamic (agent colour, chart geometry, widths), the rest are `fontSize: 12`, `marginBottom`, `flex: 1`, `justifyContent` |
| Hex outside `tokens.css` | 63 | 36 `ui/Photo.tsx` (placeholder photography), 2 `ui/Illustrations.tsx`, 3 `ui/SocialAvatar.tsx`, 22 in `src/data/*` (mock avatars and photo tints). All illustration or mock data, none in UI chrome |
| Literal px font sizes off the scale | 52 | 9 / 10 / 11 px on `.mark` overrides (no text inside: dead declarations), chart axis labels (10), `.chat-unread` (11), `.hl-plan small` (10), `fontSize: 12/13/14` inline (17), network previews (exempt: they mimic each network) |
| `pushToast` / `core/toast` call sites | 35 (+ `Toasts` component, `core/toast` action, `.toasts` CSS) | Every confirmation of your own action, plus "new on your Desk" |
| Undo bar variants | 4 | `pb-undo` (used outside Playbook in 6 places), `ib-undo-strip`, `pub-undo` (with countdown), Desk `done-box` |
| Inline confirm variants | 1 | Inbox delete (`InlineConfirm`, danger); the paid boost confirms are gone (no paid promotion) |
| Border radius literals | 128 | 12px ×38, 10px ×24, 5/6/7/8/14/18px. Scale is 6 (chips) / 10 / 16 / 20 |

## 1. Buttons

**Variants in use.** `Btn` primary ×69, ghost ×151, secondary (default), danger ×2; sizes md, sm ×133, xs ×51.
Raw buttons styled as buttons: `link-btn` (6), `next-link`, `ib-need-more`, `lane-toggle`, `brief-folded`, `pb-try-fold`,
`cal-rec`, `route-btn`, `<Link className="btn sm ghost">` (publishing/Page.tsx:246, insights/Page.tsx:309).

**Canonical** (PROMPT §10 "trois apparences", `ui/index.tsx` Btn):
- One primary (orange) per zone. Secondary = white + grey-20 border. Tertiary = `ghost` (blue text, no surface).
  Icon-only = `ghost icon`, grey.
- Destructive confirm = `danger` (red text), never primary.
- Icon + label: icon 14 for `sm`/`md`, 12 for `xs`.
- Footer of a sheet or modal: actions grouped on the right, `Cancel` (ghost) then the action; gap 16 (house rule §6).
- Never full width (house rule).

**Exception, written:** house rule says `Cancel` is "ghost grey"; Protopulse's tertiary is blue (§10). Every Cancel
stays `ghost` (blue) so the product is consistent with itself.

**To migrate**
- Batch detail has up to three primaries (lane "Send N" + footer "Send N selected"): `desk/Batch.tsx:116` and `:155`.
  Keep the footer primary, lanes keep one `Review` (audit "Still open"). Drop "Review one by one" (duplicate of lane Review).
- Bulk delete confirm uses `primary`: `publishing/Bulk.tsx:43` → `danger`.
- `.sheet-foot` gap 8 → 16 (`base.css`).
- Full-width buttons: "Add a guardrail" (`agents/Agents.tsx`, guardrails tab), anomaly action on 375 px
  (`insights/Page.tsx:308`, row with a single long label).
- Raw `<Link className="btn …">` are fine (real links styled as buttons); kept.

## 2. Page and section headings

**Variants in use.** `PageHead` h1 24 (11 pages). Object pages: campaign `campaign-head h1` 32
(`strategy.css`), report `h1` 32, competitor event/profile `event-title` 24, agent profile `PageHead` 24, Desk detail 24.
Section titles: `.section-title` (t-md 600, 31 uses), `.side-title` (same, defined twice in insights.css and
listening.css), `.pub-prev-h` (same), `.side-label`, `.h2` (t-lg, agents.css), `card-head h2/h3` (t-md 600, 28 uses).
Group labels inside lists: `day-group h3` (13 / 600 / ink-2), `plan-day h3` (13), `lane > h3` (14 / ink-2),
`act-day h2` (14 / ink-2), `onb-group h2` (14 / ink-2). List item titles: `report-row h2`, `event-row h3`,
`campaign-row h2`, `anomaly h2`, `trend h3`, `handoff-title` all 16 / 600; `agent-card h2` 19.

**Canonical** (§10 type scale, house rule "rank by size and weight"):
| Role | Style |
|---|---|
| Page title | `PageHead`, 24 / 600 |
| Object page title (campaign, competitor, agent, Desk detail) | 24 / 600 |
| Reading document title (Insights report) | 32 / 600 — exception: it is a document, not a screen |
| Card or section title | `.section-title` or `card-head h2`, 14 / 600 |
| Item title in a list or grid | 16 / 600 |
| Group label inside a list (day, lane, status group) | 13 / 600 / ink-2 |

**To migrate:** `campaign-head h1` 32 → 24; `agent-card h2` 19 → 16; `.side-title`, `.pub-prev-h`, `.h2` → `.section-title`
(one definition); `lane > h3`, `act-day h2`, `onb-group h2` 14 → 13.

## 3. Tabs, filters, segmented controls

**Variants.** `Tabs` (9 pages), `Filters` (13), `Seg` (16), house tabs `.day-tab` (Desk, filled count chip coloured by
tab), `.ib-view` (Inbox sidebar, mono count), `.ib-mode` (reply / note toggle), `.chat-mention` toggles, `.cmp-acc`
account toggles. `.filter` reused as suggestion chips (desk/Thread.tsx:55, chats/Thread.tsx:63, strategy/Page.tsx:128,
insights/Page.tsx:143, playbook/Page.tsx:193, listening/Page.tsx:422).

**Canonical**
- `Tabs` for switching views of one page; `Filters` for narrowing a list; `Seg` for a setting with 2–4 values.
- A tab count is the size of that view. A count means "needs you" only on the rail and the Inbox "Needs you" view
  (decision: `inboxNeedsCount` / `NEEDS_YOU`). Desk tabs are views of Your day; their count is the size of the view,
  and only Needs you is tinted (alert), the others neutral.
- Counts on tabs and filters: mono 12, never dimmed by opacity.

**Exceptions, written:** `.day-tab` stays (equal-width tabs inside a 400 px column, PROMPT §6.1). `.ib-view` is a side
nav, not tabs. Suggestion chips reuse `.filter` without `aria-pressed`: same shape, an action that sends text.

**To migrate:** `.filter .count { opacity: .8 }` fails AA on the pressed state (3.3:1) → full opacity;
`.day-tab.good .num` green tint → neutral (Good news is not a status needing you).

## 4. Lists and clickable rows

**Variants.** Hover `--row-hover` (ib-row, batch-row, table) vs `--lift` (day-row, rail-link, chat-item, team).
Current: `--brand-soft` (day-row.active, ib-row.current, chat-item.active) vs `--panel` + border (rail-link.active,
ib-view.active). Picked: `--signal-wash` (ib-row) vs `--brand-soft` (day-li, cal-post, ls-mentions, anomaly).

**Canonical:** hover `--row-hover`, current item `--brand-soft`, selected (checkbox) `--signal-wash`. Side navs (rail,
Inbox views) keep the white tile for the current page (they are navigation, not a list item). No side accent bar
anywhere (none found). Checkboxes always `SelectBox` (no raw checkbox found).

**To migrate:** `day-row:hover`, `chat-item:hover`, `team button:hover` → `--row-hover` (same value in light, differs in
dark); picked rows on Desk, Publishing, Listening, Insights → `--signal-wash`.

## 5. Cards

**Variants.** `.card` (16 radius, grey-20, no shadow), inner boxes with 12 px radius (`well`, `claire-note`, `resolution`,
`move-done`, `ccard`, `plan-warn`, `cal-post`, `ib-orders li`, …), 14 (`ib-draft`), 8 (`aitem`, `aempty`).
Hover on clickable cards: `a.card:hover` blue (reports, events, campaigns), `cal-post`, `cal-cell`, `plan-item` grey
(invisible in light: `--line-loud` = grey-20), `handoff` grey hover on a non-clickable card.

**Canonical:** card 16 / grey-20 / no shadow / padding 20. Boxes inside a card 10 (`--r-ctl`). Clickable card hover =
blue border (house rule §4), nothing else.

**To migrate:** 12 / 14 / 8 px radii → `--r-ctl`; `cal-post`, `cal-cell`, `plan-item` hover → `--signal`;
remove `.handoff:hover`. `.cal-post.published { opacity: .85 }` drops its meta under AA (3.96:1) → no opacity.

## 6. Status

**Variants.** `Pill` (neutral 27, alert 4, caution 8, ok 7, signal 6), `ib-tag` / `ib-sent-*` / `ls-mood` (same shape,
re-declared), `.kind.need/fail/done` text, `ev-status` icon + text, `tstatus`, dots. Counters: `.count` (rail mono),
`.tab .count`, `.day-tab .num` (filled chip), `.day-row .badge` (blue chip), `.ib-need-n` (outlined chip),
`.chat-unread` (solid blue, 11 px bold), `.num` plain.

**Canonical:** status = `Pill` (tinted, no border). `Pill tone="signal"` is reserved for "interactive state"
(trial, selected); a static count is never blue (house rule §2). Counter badge (a number in a chip) = one class
`.count-badge`: 20 high, 12 / 600, neutral `--lift-2`; tinted alert only when it means "needs you".

**To migrate:** `.day-row .badge` (blue) and `.ib-need-n` (outlined) → `.count-badge`; `.chat-unread` (11 px bold,
solid blue) → `.count-badge.alert` (an unread reply needs you). `ls-mood`, `ib-sent-*` stay (sentiment tags) on `.pill`
sizing.

## 7. Feedback after an action

**Variants.** Toast (35 call sites, bottom right, 4–6 s, Undo inside for Desk group actions). Undo bars:
`pb-undo` (Playbook delete, Agents preset / guardrail / escalation, Listening search, Chats delete), `ib-undo-strip`
(Inbox, green band, no countdown), `pub-undo` (Publishing, blue bulk-bar look, "8 s"), Desk `done-box` (green box).
Inline confirm: Inbox delete only (the paid boost confirms are gone). Stamps:
`detail-stamp` (Desk, rotated mono), `handoff.stamped` (dashed, slides out), "Approved · 09:12" in Inbox rows.
Done states: `done-box`, `move-done`, `resolution`, `Pill` "Applied / Declined / Not for us".

**Canonical** (decision "no toast, feedback inline where the action happened"; PROMPT §3.3 "Undo · 9 min left"):
- `UndoBar` — one component: check icon, sentence, `Undo` (secondary xs), time left ("8 s" / "9 min left"), dismiss.
  Neutral `--lift` surface, 10 radius, sits at the top of the list it acted on.
- `InlineConfirm` — one component for permanent deletion: the sentence that says what happens, `Cancel`
  (ghost), the action (primary, or danger for deletion).
- A decision on a card is stamped on the card (existing `detail-stamp`); one-click dismissals become
  "Dismissed · Undo" (audit "Still open").

**To migrate:** all of the above. See pass 3.

## 8. Empty, thinking, errors, fields

**Empty:** `Empty` primitive (21 uses) with a scene; ad-hoc empties: `day-empty` text, `aempty` / `dempty` dashed boxes
(ink-off text, 2.99:1), `cal-empty` (ink-off), Batch "Nothing left in this lane." Canonical: `Empty` for a list or
page; inside a small column, one line of `faint` text (ink-2), no dashed box with ink-off.
**Thinking:** `Thinking` primitive (10 uses) — consistent. Chats pending uses its own row: fine (same component inside).
**Errors:** `cmp-error` (caution text), `ls-risk` (alert box). Canonical: caution text with icon under the field.
**Fields:** `.field` + `label` + `.hint`; `.ib-select` / `.cmp-select` are Menu triggers styled as selects (two
classes, same thing) → one `.select-btn`. Native `window.prompt` for "New label…" (`inbox/Page.tsx`) → input in the menu.

## 9. Menus, popovers, sheets, modals

All on Radix primitives (`Menu`, `Pop`, `Sheet`, `Modal`): consistent. Sheet footers: Cancel + action on the right
everywhere except media preview (`publishing/Page.tsx:319`, "Close" secondary + primary — fine) and Manage competitors
(note on the left, actions right — fine, the note is information). Chats drawer footer has one ghost action: fine.

## 10. Type, spacing, radius, icons, agent colours

- Type scale 12 · 13 · 14 · 16 · 19 · 24 · 32 (`--t-*`). Off-scale: 9/10/11 (see measures). Chart axis labels at 10
  are kept (SVG, inside charts) — exception, written. The Video timeline is the same case: its ruler and the labels
  inside its track blocks (`.tl-ruler`, `.tl-cap`, `.tl-broll`, `.tl-music`) stay at 10, like an axis — exception,
  written (2026-11-25). All others → `--t-xs`.
- Spacing tokens `--s1…--s10`; literal 6 / 10 / 14 px gaps are common in components and allowed (between tokens) when
  inside a component; layout gaps use tokens.
- Radius: 6 chips, 10 controls and inner boxes, 16 cards, 20 sheets, 999 pills. `.seg` (8) and `.seg span` (6) → 10 / 6.
- Icons: 12 (xs buttons, inline meta), 14 (sm / md buttons, rows), 16 (icon buttons, headers). 13 px icons (17 uses)
  → 12 or 14.
- Agent colours: `--a-<id>` for marks and tiles, `--a-<id>-wash` + `-ink` for tiles. No large tinted backgrounds found.
  `kpi-icon` is Iris-tinted on Explore (Iris owns it): fine.

## 12. Decisions-first landing (PROMPT §3.9)

**Rule.** The landing view of every department (Inbox › Needs you, Publishing › Ideas, Listening, Strategy › Campaigns,
Video › Clips, Insights, Agents › Team) and the first tab of every agent profile open on what waits for Sam, before
anything else on the page.

**Canonical**
- Order: page header → one summary line naming each count (« 3 need a move · 1 plan to approve »), each count a filter
  on the block → decision groups → the rest of the module (live, done, history, settings).
- A group is one kind of gesture (« Ready to send », « Plans to review », « Clips to review »). One primary action per
  group (« Send all 4 »), not per row; each row keeps its quick decision as secondary / ghost buttons plus the reason
  in one line (agent, why, proof). Opening a row is never required to decide.
- Exception, written: a group whose rows are each a different decision (Insights anomalies to decide, Agents autonomy
  requests, Listening competitor moves) has no group primary; each row keeps its own quick decision. A group-wide
  « Allow all » or « Apply all » would decide unlike things at once.
- Same reason shared by several rows (one Echo alert pausing 3 posts) is said once at group level, not on every row.
- Empty: one line « Nothing needs you here » + what the agent is watching; no illustration on department pages (the
  All clear illustration stays on the Desk).
- The rail badge and the summary line count the same items (`needs you` only, §3).

**Exemplars:** Inbox › Needs you (grouped views, PROMPT §6.2), Desk › Your day › Needs you (lots).

## 13. Text levels (PROMPT §10 « Le texte se mérite »)

**Rule.** Every block of text sits at one of three levels: visible, popover, panel. A block earns « visible » only if a
user needs it to understand the screen or take the decision in front of them.

**Canonical**
- Visible: title, at most one line of reason (agent · why, cut to the gist), the key number named in words, the action.
  An agent's sentence is one sentence. One `PageHead` lede per page, one sentence at most.
- Popover (`InfoPop`, `src/ui/More.tsx`): a definition, a source, the breakdown of a number. Opens on click; `Tip` only
  for icon-button names and keyboard hints.
- Panel (`MoreInfo`, `src/ui/More.tsx`): the full reasoning, proofs, the cited Playbook rule, history, alternatives.
  The trigger is a link at the end of the visible line: « Why? » for an agent's reason, « More info » for anything else.
  The panel's title names the object (« Why Nova escalated »).
- A reason shared by several rows is said once at group level (§12), not hidden on each row.
- Inside a panel (a `Sheet` already open: post panel, idea panel, clip editor), « Why? » opens an `InfoPop`, never a
  second sheet on top of the first.
- The one-line reason is cut with `gist()` (`src/ui/gist.ts`: first sentence, at most 14 words, then « … »). « Why? »
  only shows when the panel adds something to that line.
- Never moves down a level: an alert, a block (« Held », « Failed »), anything irreversible (« can't be undone »),
  anything a decision needs, a named metric next to its number.

**Exceptions, written:** network previews (`.pv-*`) stay faithful to each network. Onboarding keeps its legal and trust
lines visible (« Never sees your password », « Publishes nothing without your approval »).

**Exemplar:** Inbox escalation — the « Rule · Why · Who · Never » block sits behind « Why? » on the draft card; the
public line and the DM stay visible.

## 14. Standard list (Matt, 27/11: « features tailored to our example make the interface too verbose »)

**Rule.** Every **queue** (a list of things to act on, one after the other: Inbox, approvals, clips to send, the « Needs you »
items of a module) uses one pattern, built only from existing primitives. Objects that are browsed, compared or
followed (ideas, campaigns, competitors, reports, agents) are not queues: they take their own shape (§15).
A rule that exists for one case of the demo (a weekly quota, one person's release, a hook trial, a flop) is a status
on the row, never a group, banner, note or component of its own.

**Canonical**
- Bar: `Filters` by state with counts, non-empty states only (« Needs you 14 · On trial 2 · Later 1 · Sent 6 »). The
  « Needs you » count equals the rail badge. A second criterion (video, competitor, network) is a `Menu` behind a
  ghost button on the right (« All videos ▾ »), never a second row of chips.
- List: one `.card` of rows (`.dq-rows` / `.rows`). A row is: lead (thumb, avatar, select box), title, one meta line
  (named key number, networks, short proof), a `Pill` only when the row's state differs from the filter's
  (« Held », « Next week », « Below usual », « Failed ») followed by « Why? » (`InfoPop`), then the row's actions: one
  visible decision, the rest in a `Menu`.
- Selection: `useSelection` + `SelectAll` + `BulkBar`. The filter's primary action (« Send 13 to Atlas ») sits in the
  list head, right, and gives way to `BulkBar` while rows are selected.
- Empty: `Empty`, one line.
- Gone: summary sentences above the list (the counts are the filters), agent sentences on the page (« I check your
  channel every 15 minutes » belongs to the agent's profile), group hints, rule banners, sub-groups by cause.
- Group headers by gesture are allowed when a queue mixes gestures: a short header names the gesture and its count
  (« Your call 2 », « To check 3 », « Ready to send 6 »), with the group's one primary action on the right (« Send
  all 6 »). No hint sentence under or beside it. Exemplar: Inbox › Needs you (#176). A queue with one gesture has no
  header.
- One cause blocking several rows (Hugo's release) has no banner: its action is on each row it blocks (« Release
  signed ») and in `BulkBar`.

**Exemplar:** Video › Clips. **Supersedes** §12's summary line and decision groups: « Needs you » is the first filter
of the list. §12's other rules (decisions on the row, empty state, rail badge) stand.

## 15. The shape of the object (Matt, 27/11: « everything looks like a list of tickets now, you oversimplified »)

**Rule.** §14 was applied to everything and turned ideas, campaigns, competitors, reports and agents into identical rows.
A screen shows its objects in the shape they have in the user's head, keeps the gains of §13–14 (few tabs, little text,
no demo-only blocks, decisions on the spot) and gives back what makes it a product: an overview, visuals, the agents'
presence and a hierarchy.

**Canonical**
- Module overview: one short band at the top of the landing, above « Needs you »: 2–4 named key numbers or one small
  chart, plus the agent's one-sentence read with its avatar. No paragraph, no tiles that repeat « Needs you ».
- Object shapes:
  - idea, draft → card with its visual or network preview, the angle in one line, its proof number, its pillar;
  - campaign → card with period, goal and progress bar, post count;
  - competitor → card with logo, its latest move and a trend;
  - report → card with a small chart and the period;
  - agent → card with avatar in its colour, state, what it is doing now, its pending request;
  - clip → thumbnail grid or row with a large frame;
  - calendar → grid;
  - mention → feed item with avatar, network and sentiment visible.
- Hierarchy: the most urgent or most promising object is set apart (first, larger card, or status colour); the rest are
  calmer. Not every item weighs the same. On a list + detail screen (Desk), set apart = first in the list and open in
  the detail pane; never a second copy of the detail above the list (UI refactor, 28/11: two decision cards on one
  screen, the keyboard acted on the lower one, the list fell below the fold).
- Queues stay §14: « Needs you » is a short queue above or beside the objects, never the whole page.
- Still out: rule banners, group hints, demo-only sub-groups, text beyond §13.

**Exemplars:** to come from the object-shape pass (Publishing › Ideas, Insights / Strategy, Listening / Agents).

## 16. Object panel (Matt, 27/11: « the hierarchy is wrong, it isn't scalable or consistent, the details are simplistic »)

**Rule.** Every sheet that shows **one object** (post, mention, creator, media, Insights post, and any new one) is built from
the same pieces in `src/ui/ObjectPanel.tsx` plus the `Sheet` props `meta` / `status` / `tools` / `nav`. Form and
settings sheets (Searches, Rules, Labels…) are not object panels and keep §9's footer.

**Canonical**
- **Header = identity + standing actions.** Lead (avatar with network badge, network icon or thumbnail), the object's
  own name (« Fernway · Facebook post », « r/ultralight », « Bivouac above Chamonix »), a meta line joined with « · »,
  the status `Pill` (said once, here), then ‹ › (J / K) when it was opened from a list, the main standing action as an
  icon button with a `Tip` (Edit, Use in a new post), `⋯` for the rest (Reschedule, Duplicate, Hide, Delete…), ✕.
  No footer.
- **Ask = only what waits on Sam.** `Ask`: the agent(s), the question, one reason (`gist()`, « Why? » as `InfoPop`, §13),
  the control (a real field, options), at most one orange primary that names its result (« Add code and schedule »,
  « Ask Nova to reply »). Nothing waits → no Ask (a scheduled or published post, a mention already answered).
- **Body = the object | its aside.** `ObjectBody`: the object as it looks (network preview, quote, photo) on the left,
  360 px; on narrow sheets one column with a hairline before the aside.
- **Details = label | value rows** (`Props`): label `t-sm` ink-2 in a 120 px column, value ink. Each type has a core set
  that is always shown; an empty core value reads « None » next to its add control, so two posts always have the same
  shape. Optional fields (Queue, Link, First comment) show only when set. Never icon-only lines.
- **Results** (`Section` + `Metrics`): each number named, with what it's compared with. Published objects only.
- **Activity** (`Timeline`): one feed, oldest first: agents' actions, history, comments. Actor + action, relative time
  with the exact date in the `title`; their own words as a quote under the name. A comment box ends it where the model
  has comments (posts: `publishing/comment`). No mono timestamps, no side bar.
- **Live preview.** A field that fills a slot of the object shows its effect in the preview as you type (`[code]` →
  TRAIL15, highlighted; `SLOT` + `fill` in `Previews.tsx`).

**Exemplar:** the post panel (`PostPreview`, `publishing/Bulk.tsx`). Also on it: Listening mention and creator, Media,
Insights › Explore post. Captures: `previews/object-panel-{before,after}-needs-info.jpg`.

## 11. Vocabulary

| Verb | Used for | Synonyms to remove |
|---|---|---|
| Send | replies, notes to an agent | — |
| Approve | posts, plans, campaigns | — |
| Schedule | a post into a slot | — |
| Apply / Decline | Sage's adjustments and proposals | — |
| Add to Playbook | rules and facts | "Add N rules" → "Add N to Playbook" |
| Snooze | put off a card (`Snooze a week`, `S` then 1–4) | — |
| Discuss | open the card's thread | — |
| Ask Claire | escalate to Claire | "Send to Claire" (publishing/Bulk.tsx:97, Composer.tsx:124) |
| Hand to <agent> | delegate to an agent | — |
| Dismiss | close a signal without acting | "Not for us" (listening/Page.tsx:454-457) |
| Take it back | undo an agent's autonomous action in a thread | — |
| Undo | reverse your own last action | "Reopen" stays (different: reopens a closed anomaly) |
| Review on Desk | link to a card | "Also on your Desk", "Open your Desk" (when it points to one card) |
| See | navigate to more | "View all" (in network previews: exempt, network UI) |
| Suggest / Draft / Act | autonomy levels, always this order | "Suggests", "Drafts for you", "Acts alone" (`AUTONOMY_COLUMN`, data/agents.ts:5, Agents StackBar, onboarding columns); onboarding lists Act → Suggest |
| Approved unchanged | track record | "Approved without changes" (agents/Agents.tsx:61) |
| Cautious / Balanced / Autonomous | presets (a set of levels) — kept, always called "Preset" | — |
