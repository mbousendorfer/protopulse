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
| Inline confirm variants | 2 | Insights boost reuses `pb-undo` with `role=alertdialog`; Chats boost is a plain `row` with "Sure?" |
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
Inline confirm: Insights boost (`pb-undo` + `role=alertdialog`), Chats boost (`row` + "Sure?"). Stamps:
`detail-stamp` (Desk, rotated mono), `handoff.stamped` (dashed, slides out), "Approved · 09:12" in Inbox rows.
Done states: `done-box`, `move-done`, `resolution`, `Pill` "Applied / Declined / Not for us".

**Canonical** (decision "no toast, feedback inline where the action happened"; PROMPT §3.3 "Undo · 9 min left"):
- `UndoBar` — one component: check icon, sentence, `Undo` (secondary xs), time left ("8 s" / "9 min left"), dismiss.
  Neutral `--lift` surface, 10 radius, sits at the top of the list it acted on.
- `InlineConfirm` — one component for paid spend and permanent deletion: the sentence that says what happens, `Cancel`
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
- Same reason shared by several rows (one Echo alert pausing 3 posts) is said once at group level, not on every row.
- Empty: one line « Nothing needs you here » + what the agent is watching; no illustration on department pages (the
  All clear illustration stays on the Desk).
- The rail badge and the summary line count the same items (`needs you` only, §3).

**Exemplars:** Inbox › Needs you (grouped views, PROMPT §6.2), Desk › Your day › Needs you (lots).

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
