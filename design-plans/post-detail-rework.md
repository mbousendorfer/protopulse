# Post detail: rework

The sheet that opens on `?post=<id>` from the calendar, the queues and the plan (`PostPreview` in
`src/features/publishing/Bulk.tsx`, styles `.pd-*` in `publishing.css`). Benchmark: `post-detail-benchmark.md`.

## Problems, with proof

Screenshots are in `previews/post-detail-before-*`.

| # | Problem | Proof |
|---|---|---|
| 1 | A "Needs you" post could not be approved from its own view. Sam could not see why it was waiting or what would unblock it | `before-1440-needs-trend`: Status, Author, Pillar, Labels and Note are listed, and the footer has Delete, Reschedule, Duplicate and Edit. The reason sits on the Desk card, and the sheet never read it |
| 2 | Nothing was ranked. The fields were pairs of a label and a value in a column, with empty space below | `before-1440-needs`: the sheet is half empty, and Status has the same weight as Pillar |
| 3 | History had a grey side bar (`.pub-hist { border-left }`), which is a side accent bar and is banned by the house rules. It also showed only "Created by Atlas" | `before-1440-published` |
| 4 | Results and failures were not given any weight. Results sat under the fold after the fields. A failure sat in a box with a red border, with Edit and Reschedule competing next to Retry | `before-1440-published`, `before-1440-failed` |
| 5 | Delete was a blue link at the bottom left, the first thing read in the footer | every "before" screenshot |

## The new view

The view is built in three layers, top to bottom.

1. **State band** (`.pd-state`). It shows the status pill and one sentence that answers "what do I do?", then the reason
   in the agent's words, then the actions. There is at most one orange button.
   - **Needs you, with a Desk card**: the band reads the card that decides the post (`cardOfPost`: its `handoff`, the
     queue's or Claire's `ref`, or `approval.card`). It shows the relay ("Echo → Atlas"), `context` and `why`, the
     Playbook rules applied, the confidence, and when the post goes out. The actions follow the card's own shape.
     - Approval card: **Approve and schedule** · Request changes ▾ (Shorter / Warmer / More formal, sent to Atlas through
       the card's thread, so the preview shows the revision) · Edit.
     - Card with options (missing visual): the card's options, with the recommended one in orange.
     - Card that asks for a value (promo code): a labelled field and **Add and schedule**.
   - **Needs you, no card**: the post's note, then **Approve and schedule**. If the post is waiting for a visual, the
     button is **Upload it in Media** instead.
   - **Waiting on Claire**: what was sent to her and when, then Edit. This status has no orange button, because Sam has
     nothing to do.
   - **Scheduled**: "Goes out Tuesday 2 December at 08:30", then "It publishes on its own: nothing to do." Actions:
     Reschedule and Edit.
   - **Draft**: when scheduling would put it out, then **Schedule it** (or Reschedule if its slot has passed).
   - **Published**: Reach and Engagement rate, each named and compared with the network's median, then Atlas's
     reading, then **Recycle it** (only when Atlas says it's worth it) and See in Insights.
   - **Failed**: "X refused it at 08:12", the network's reason, then **Retry with a plain link**, Publish without the
     link, and Skip X today. These are `RETRY_OPTIONS`, so they settle the Desk card when one exists.
   - **Paused**: the note, then **Resume this post**.
   - Every status has a **More ▾** menu: Edit and Reschedule when the band doesn't already show them, Duplicate,
     and Delete (confirmed in a dialog, with a 10 s Undo).
   - After a decision taken on the post's card, here or on the Desk, the band shows the journal's **Undo** while the
     window lasts (`core/undo`, which brings the card back and restores the post).
2. **The post**: the preview, shown the way the network shows it, in a 360 px column. If the Desk card holds a revised
   draft, the preview shows that draft and says that approving schedules this text. Passages Atlas isn't sure about
   are listed under the preview with Atlas's note.
3. **Details and Activity**. Details is a list of lines, each one an icon and some text, with no labels and no boxes:
   when, network · format, who wrote it, pillar, queue (link), campaign (link), link with UTM, labels (editable).
   Activity lists, oldest first, the Desk card, its thread, the post's history and its comments. Each line has an
   avatar (Atlas, Claire, you, or a grey history dot), a sentence and a mono timestamp. There is no side bar.

At 375 px the band stacks, the buttons wrap and never take the full width, and the post comes before its details. The
sheet has no horizontal scroll (scrollWidth = clientWidth = 364).

## What moved, and what disappeared

- The footer is gone. Actions now sit in the band, next to the reason they answer.
- Status, Author, Pillar, Format, Campaign and Link are no longer a column of fields. They are lines in Details,
  and the status is in the band.
- Note no longer has its own field. It is the reason in the band.
- `.pub-prev*`, `.pub-hist`, `.pub-perf*`, `.pub-fail` and `.pub-paused` are deleted (they had no other user).
- The sheet's title is "LinkedIn post" with the network icon. The date moved to the band and to Details.

## Changes outside the view

These are in `src/features/publishing`. The engine was not touched.

- `approvals.ts`: `cardOfPost` (the card that decides a post) and `actorOf` (who a history line names), both tested.
- `slice.ts` `resolveCard`: approving a post's card now adds "Approved by you / Claire / Atlas, on Act" to the
  post's history, and so does answering the promo code. Without this, Activity lost the decision once the card was
  gone.

## What the model doesn't have, so the view doesn't show it

- Why a post is "Needs you" when it has no card. The view shows `note`, or nothing.
- When a post was created, and who made the seeded changes (for example "Moved from 12:00 to 18:30 by Atlas" is only
  a note). Activity says "No activity recorded on this post yet."
- A real link to the post on the network ("View on X"), and comments sent to a client. Neither is in the prototype, so
  neither is in the view (§3.8).
- Free text for "Request changes". Atlas's thread only understands shorter, warmer, more formal, and "use X instead".
  The menu offers the first three, and Edit covers everything else.

## Review

**improve-ui.** The view was checked against PROMPT §10, the consistency matrix and the house rules. Two findings
were fixed:
1. The agent mark was resized to 16 px in Details. §10 fixes avatar sizes at 22 / 28 / 44 / 96. The mark is back to
   22, and icons sit in a 22 px slot so the text lines up.
2. Buttons in the action group were 8 px apart. The matrix §1 and house rule §6 say 16. It is now `gap: 8px 16px`,
   the same as `.sheet-foot`.

**ux-heuristics.** Four scenarios were walked through in the browser. Score 9/10.

| Scenario | Path | Issues (severity) |
|---|---|---|
| Approve the LinkedIn post of the Tuesday tips queue | Queues → row → band: Atlas filled the slot, Filling empty slots is set to Draft, goes out Tue 2 Dec 08:30 → Approve and schedule → Scheduled, "Approved by you", Undo · 10 min left | none |
| Understand why a post waits | Band: the relay, the reason, the Playbook rules, the confidence, and the passages Atlas isn't sure about under the preview | Without a card, only the note is shown (1, the data isn't stored) |
| See how a published post did | Band: 210,000 reach, 8.4× your TikTok median (25,100) · 7.8% engagement rate, above the median (4.4%) · Atlas: worth recycling → Recycle it | No "View on TikTok" (1, the data isn't stored) |
| Retry a failed post | Band: X refused it at 08:12 + the reason → Retry with a plain link → Published, Activity shows the retry | none |

Still open (severity 1): "Request changes" offers only three rewrites. At 375 px, More wraps onto its own line.
