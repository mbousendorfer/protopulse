# Previews show no counters before a post has results

Written against: 8a3e50e (origin/main, PR #12 merged)

## Evidence chain

- Surface: Desk → "2 posts to approve" → open the TikTok row (batch detail). Also Composer and the Calendar post sheet
  for any TikTok or YouTube post that is not published.
- Problem: the TikTok preview of an unpublished draft prints `0` under like, comment, save and share. The Shorts
  preview prints `0` under comments while its likes fall back to the word "Like". On the Desk, where Sam decides
  whether to approve, a draft reads as a post that already got zero engagement.
- Design evidence: `NetworkPreview` props doc — counters "are derived from [published results]". Sibling variants in
  the same component already show nothing when there are no results: X (`count(n) > 0 ? short(n) : null`),
  Instagram (likes and comments hidden at 0), LinkedIn and Facebook (social row hidden at 0), Shorts likes
  ("Like"). TikTok and Shorts comments are the only two that contradict them. Nielsen #1/#2 (system status, match
  the real world). PROMPT.md §3.8 (no make-believe).
- Owner: `src/features/publishing/Previews.tsx`
- Scope and affected surfaces: every `NetworkPreview` consumer (Composer, Ideas panel, Calendar post sheet, Desk batch).
- Uncertainty: none.

## Design decision

One rule for every network: a counter with no value shows no number. Lift X's local `count` helper to module scope
and use it in TikTok and Shorts. Shorts keeps its own idiom: a rail button without a number shows its name
("Like", "Dislike", "Share" already do), so comments falls back to "Comment".

## Reuse

- `count` (today local to `XPost`), `short`
- Exemplar: `XPost` in `Previews.tsx`

## Changes

1. `src/features/publishing/Previews.tsx`
   - Change: module-level `const count = (n: number) => (n > 0 ? short(n) : null)`; `XPost` uses it; TikTok rail uses
     `count(...)` for its four counters; Shorts comments uses `count(comments) ?? 'Comment'`, likes
     `count(likes) ?? 'Like'`.
   - Preserve: published posts keep their derived counters; layout of the rails.
   - Verify: TikTok draft on the Desk shows icons with no `0`; published TikTok post still shows 16 / 1 / 2 / 1.

## Scope

- Inherit: Composer, Ideas panel, Calendar post sheet, Desk batch.
- Verify: published TikTok, Shorts and X posts in the Calendar sheet.
- Exclude: network chrome itself (exempt per consistency matrix).

## Validation

- Product: approve a TikTok draft from the Desk without reading it as a failed post.
- Interface: Desk batch (1440, 375, light, dark); Calendar sheet for a published TikTok and a scheduled Short.
- System: one `count` helper, no parallel formatter.
- Repository: `npm test && npm run build` → green.

## Stop conditions

- Stop if a consumer relies on `0` being printed.

## Design documentation

- None.

---

# Long chips wrap instead of pushing the page sideways (found while verifying)

- Surface: Desk → "2 posts to approve" → TikTok row, Sources. 375 px: page `scrollWidth` 441 (horizontal scroll).
  1440 px: "Ridge 28L holds 28 L, stove fits in the side pocket · Product page" clipped by the 300 px detail column.
- Contract: PROMPT.md §10 Responsive ("utilisable à 375 px"); loop check "pas de scroll horizontal".
- Root: `.chip` in `src/styles/base.css` had `white-space: nowrap`, so a quoted source or a Playbook rule could not
  wrap. `.row` and `.sources` already wrap whole chips, so dropping `nowrap` (and capping at `max-width: 100%`) only
  changes chips longer than a full line.
- Changes: `base.css` `.chip` loses `nowrap`, gains `max-width: 100%`; `desk/today.css` `.chip.source` flows as inline
  text (label, then "· from") so a wrapped source reads as one sentence, not three columns.
- Verified: no `.chip` wraps at 1440 on Desk, Inbox, Listening, Activity, Playbook; `scrollWidth` 375 on Desk,
  Ideas, Calendar sheet, Inbox, Listening, Activity at 375 px.
