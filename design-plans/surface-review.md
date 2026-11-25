# Surface review

Phase 2 of the UI quality pass (2026-11-25). Every surface rendered from this branch (`npx vite --port 5191`) at
1440×900 and 375×812, light and dark. Three automated sweeps ran in the page over 37 routes and both themes:

1. **Render audit**: page-level horizontal scroll, element past the viewport, uppercase text, left accent borders,
   full-width buttons, font sizes off the scale, and WCAG contrast of every text node against its composited
   background (opacity included).
2. **Clip audit**: containers that hide or scroll content sideways (text cut, tab bars that scroll).
3. **Keyboard**: Tab through the shell and the Desk, `:focus-visible` ring checked on each stop.

Then screenshots of each surface and its states (empty, thinking, selection, long content) to catch what the sweeps
can't. A finding is kept only with a rule, proof on screen and one fix. Severity: 1 cosmetic · 2 inconsistent ·
3 breaks a rule or a11y · 4 blocks.

Not findings: orange primary buttons at 2.91:1 (ADS choice, PROMPT §10), sweep hits during entry animations
(composer, chat bubbles, fresh cards measured at opacity 0.2), `sr-only` text, tab bars that scroll at 375 px
(intended, `overflow-x: auto`), network previews (they mimic each network).

## Cross-cutting

| # | Sev | Finding | Rule | Proof | Fix |
|---|---|---|---|---|---|
| X1 | 3 | Text links are `--signal` #178DFE: 3.18:1 on white ("Edit Iris’s alert rules", competitor names in Benchmark, events in a competitor profile) | §10 "texte d'action electric-blue-150 ≥ 4,5:1" | render audit, `/insights/anomalies`, `/listening/competitors/benchmark` | `a { color: var(--action-ink) }` |
| X2 | 3 | Every confirmation of your own action is a toast (35 call sites); the Desk group actions keep their only Undo in a 6 s toast | Decision "no toast"; §3.3 | `app/core.ts:29`, `Shell.tsx:226` | Pass 3: inline home per action, then delete `Toasts`, `core/toast`, `pushToast` |
| X3 | 2 | Four undo bars and two inline confirms look and behave differently (countdown only in Publishing, green band in Inbox, blue bar in Publishing, grey bar elsewhere, "Sure?" in Chats) | matrix §7 | Inbox, Publishing, Playbook, Agents, Chats, Insights | `UndoBar` + `InlineConfirm` in `src/ui` |
| X4 | 2 | Counters come in five looks (blue chip, outlined chip, filled grey, solid blue 11 px bold, mono) | matrix §6 | Desk rows, Inbox groups, Chats list, Desk tabs | `.count-badge` |
| X5 | 3 | Filter counts are dimmed with `opacity: .8`: 3.27:1 on the pressed filter | AA | `/insights/anomalies`, `/listening/mentions` | drop the opacity |
| X6 | 2 | Clickable calendar posts, month cells and plan items have a grey hover border, invisible in light (`--line-loud` = grey-20) | house rule §4 card hover = blue | `/publishing`, `/publishing/plan` | hover `--signal` |
| X7 | 1 | Inner boxes use 12, 14, 8, 7, 5 px radii next to 10 / 16 | §10 radii 10 / 16 / 20 | 128 literals | `--r-ctl` / `--r-sm` |
| X8 | 2 | `Cancel` sits 8 px from the action in sheet footers | house rule §6 gap 16 | every sheet | `.sheet-foot { gap: var(--s4) }` |
| X9 | 2 | Focus ring lost on the current rail link and current Inbox view (their own `box-shadow` wins over `:focus-visible`) | §10 "focus visibles" | Tab through the rail | `:focus-visible` rule for both |
| X10 | 1 | ~95 inline styles that a class already expresses (`fontSize: 12` ×17, `marginBottom`, `flex: 1`, `justifyContent`) | Définition de fini | 155 `style={{` | utilities `.t-xs`, `.t-sm`, `.grow`, `.between`, `.top` |

## Shell, ⌘K, moderator panel

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| S1 | 2 | Delta down `−38%` is `--alert` #E81313: 4.25:1 | Desk highlights, Chats | `.delta` uses `--alert-strong` / `--ok-strong` |
| S2 | 1 | Claire popover uses inline `fontSize: 12` twice | `Shell.tsx:191-193` | `.t-xs` |
| S3 | 1 | ⌘K user avatar is shrunk inline (22 px, font 10) | `CommandBar.tsx:126` | `.avatar.sm` |

## Desk, Focus

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| D1 | 3 | A batch shows up to three orange buttons ("Send 4 ready" in a lane, "Send 4 selected" in the footer) that act on the same items, plus "Review" per lane and "Review one by one" | one primary per zone (§10), audit "Still open" | footer primary only; one Review per lane |
| D2 | 2 | Group actions (Approve 6, Snooze, Ask Claire, Reject) confirm and undo only in a toast | X2 | UndoBar at the top of Your day |
| D3 | 2 | Batch row count badge is blue (static number in the interactive colour) | house rule §2 | `.count-badge` |
| D4 | 2 | Good news tab count is green (it is not a status) | matrix §3 | neutral count |
| D5 | 3 | 375 px: Your day header cuts the Filter button and the Good news count | screenshot 375, `/` | header wraps; tabs shrink their label gap |
| D6 | 3 | 375 px: batch lanes squeeze into 150 px columns and the "Has urgent" pill is cut | screenshot 375 | lanes one column under 520 px; head wraps |
| D7 | 1 | `.handoff:hover` greys the border of a non-clickable card | house rule §4 | remove |

## Inbox

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| I1 | 2 | Undo strip is a green band without countdown, unlike Publishing | X3, audit "Details" | UndoBar with time left |
| I2 | 2 | Group count `ib-need-n` outlined chip, not the shared counter | X4 | `.count-badge` |
| I3 | 2 | "New label…" opens the browser prompt | audit "Still open", house rule "never hand-build / native" | input inside the label menu |
| I4 | 3 | 375 px: views, labels and three filters stack above the list: the first conversation starts below the first screen | screenshot 375, audit | views + labels in one scrollable row, filters behind one "Filters" menu on phones |
| I5 | 1 | "Also on your Desk" link uses inline `marginLeft`, `fontSize` | `inbox/Page.tsx:420` | class + glossary "Review on Desk" |

## Publishing

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| P1 | 3 | Today's date in the week is `--signal` at 16 px: 3.35:1 | render audit `/publishing` | `--action-ink` |
| P2 | 3 | Published posts are faded with `opacity: .85`, which drops their stats to 3.96:1 | render audit | no opacity; "Published" already says it |
| P3 | 2 | Bulk delete confirms with an orange primary | matrix §1 | `danger` |
| P4 | 2 | Undo bar borrows the blue selection bar | X3 | UndoBar |
| P5 | 3 | 375 px composer: footer actions overflow, "Send to Claire" is cut | screenshot 375 `/publishing/new` | footer wraps |
| P6 | 2 | "Send to Claire" (bulk, composer) vs "Ask Claire" everywhere else | glossary | "Ask Claire" |
| P7 | 1 | Two classes for the same select trigger (`ib-select`, `cmp-select`) | matrix §8 | `.select-btn` |

## Insights

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| N1 | 2 | Boost confirmation reuses the Playbook undo bar | X3 | `InlineConfirm` |
| N2 | 2 | 375 px: an anomaly with one long action shows a full-width button | render audit | actions wrap at their own width |
| N3 | 1 | Report rows repeat their type in the title ("Weekly report · …") | audit "Details" | title without the type, type in the meta |
| N4 | 2 | Share with Claire and Save alert confirm in a toast | X2 | button becomes "Shared with Claire · 10:12"; alert sheet closes onto the updated rule list |

## Listening

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| L1 | 2 | "Not for us" (trend) vs "Dismiss" (lesson) for the same act; neither can be undone once clicked | glossary, audit "Still open" | "Dismiss", then "Dismissed · Undo" |
| L2 | 2 | Removed search undo bar has an inline margin | `listening/Page.tsx:506` | UndoBar |
| L3 | 1 | Share-of-voice and sentiment captions with inline `fontSize`, `marginBottom` | `listening/Page.tsx:213, 343` | `.caption` |

## Strategy

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| G1 | 3 | "Drop a task here" in ink-off: 2.99:1 | render audit `/strategy/campaigns/trail-week` | ink-2 |
| G2 | 1 | Campaign title 32 px, every other object page 24 | matrix §2 | 24 |
| G3 | 1 | Applied / Declined proposals can't be reopened | audit "Still open" | "Declined · Undo" |

## Chats

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| C1 | 2 | Boost asks "Sure?" in a plain row | X3 | `InlineConfirm` |
| C2 | 2 | Unread count solid blue, 11 px bold | X4 | `.count-badge.alert` |
| C3 | 2 | Deleted chat undo bar with inline margin | `chats/Page.tsx:33` | UndoBar |

## Agents

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| A1 | 3 | Autonomy has two vocabularies on one screen: segmented control "Suggest · Draft · Act", column titles "Suggests · Drafts for you · Acts alone"; the team card's bar lists Act first | glossary, audit "Still open" | "Suggest · Draft · Act", always in that order |
| A2 | 2 | "Add a guardrail" spans the whole card | house rule §6 | auto width |
| A3 | 2 | Three undo bars with inline margins (preset, guardrail, escalation) | X3 | UndoBar |
| A4 | 1 | Agent card name 19 px, every other list item title 16 | matrix §2 | 16 |
| A5 | 2 | "Approved without changes" (team card) vs "Approved unchanged" (track record) | glossary | "Approved unchanged" |

## Activity, Playbook, Settings, Onboarding

| # | Sev | Finding | Proof | Fix |
|---|---|---|---|---|
| Y1 | 2 | Onboarding lists autonomy columns Act → Draft → Suggest, everywhere else Suggest → Act | glossary | Suggest → Act |
| Y2 | 1 | Playbook rule delete undo, Settings and Playbook captions with inline `fontSize: 12` | `playbook/Page.tsx:268, 289`, `settings/Page.tsx:73, 148` | `.t-xs`, UndoBar |
| Y3 | 1 | Day headings in Activity 14 px, other list group labels 13 | matrix §2 | 13 |
| Y4 | 2 | Notifications setting still offers "Shown as…" a toast | X2 | remove with the toasts |

## Dark theme

No contrast failure outside entry animations at either width. The `--a-*-ink` tokens hold AA on their washes.

## What was not reviewed by hand

Every surface went through the sweeps; screenshots were taken of Desk, Inbox, Publishing (calendar, composer),
Agents profile at both widths. Hover states were read from the CSS, not hovered one by one.
