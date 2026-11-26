# Video and Insights — decisions-first rework

Lot **video-insights** of the decisions-first pass (PROMPT §3.9, consistency matrix §12). Captures in
`design-plans/previews/video-insights-{before,after}-*` (1440, 1000, 375; light and dark), states and empty block in
`video-insights-after-states-*` and `video-insights-after-empty-*`.

## What was wrong

| Surface | Problem | Rule / heuristic | Capture |
|---|---|---|---|
| Video › Clips | 25 clips, of which 16 were four copies of the same four moments (« The left shoulder strap, you know, ripped… », same 0:16, same proof) | Bug: the shared feed loops (`s.engine.cursor % script.length`) and replays `ev-video-more`; `video/find` re-cut moments it had already cut. One run also re-cut the seeded « Back on a trail » moment (identical span). | before-video-1440-light |
| Video › Clips | Every row carried its own « Send to Atlas »: one action per row instead of one per group | Matrix §12 « one primary action per group, not per row » | before-video-1440-light |
| Video › Clips | Held clips (Hugo without a release, length out of spec) mixed with ready ones, with a « Send to Atlas » that could only fail | §3.2 everything explains itself; Nielsen #5 error prevention | before-video-1440-light |
| Video › Clips | Two-up cards, 120 px per clip: 25 clips = 4 screens; title, quote and proof repeated the same sentence on found clips | Density; §12 « reason in one line » | before-video-1440-light |
| Video › Clips | Weekly quota (5 clips per video) only discovered after sending | §3.2, error prevention | — |
| Rail | Video badge 2 (Desk cards) while the page said 25 to review; Insights badge 1 while 3 anomalies waited in a tab | §12 « the rail badge and the summary count the same items » | before-*-1440-light |
| Insights | Landing = report list under an « Ask Iris » box; the 3 open anomalies (one a paid-boost decision) were a tab away | §3.9 decisions first | before-insights-1440-light |

## References (journeys and density, not style)

- **Opus Clip** (clip list): every clip carries a named score and a one-line reason; one bulk export for the batch, not a
  button per clip. Kept: named score + proof on one line, one batch action.
- **Google Ads › Create video › Select videos** (Mobbin): selection is the decision; one primary « Use selected clips »
  for the whole set. Kept: checkboxes always visible in « Ready to send », the group action, BulkBar for a subset.
- **Descript / Riverside Magic Clips**: clips as a dense list with the frame, length and transcript line; the editor is
  one click away, never required. Kept: 40 × 71 frame with length, quote in the title line, row opens the editor.
- **Higgsfield Virality predictor** (Mobbin): every score is named (Hook score, Hold rate). Confirms « Virality 83 ».
- **Amplitude / Mixpanel insights feed, Sprout Social reports home**: anomalies arrive as a feed of cards with the
  metric, the change, a sparkline and the suggested next step; reports and dashboards come after. Kept: the anomaly row
  (metric named + delta + spark + likely cause + actions on the row), KPIs after the decisions.

## New journeys

**Video › Clips** (« I have 10 minutes, I send the right clips to Atlas »)
1. Summary line: « 12 ready to send · 1 held · 2 new videos to start », each count a filter on the block, then Juno's
   context (from N videos, what she is working on).
2. **Ready to send**: select-all, one orange « Send N to Atlas » (N = what the weekly quota lets through), the quota said
   once at group level (« 4 clips from … would wait for next week »). Each row: Review (opens the editor) and Not now ▾
   (snooze or dismiss with a reason); what is left to check (« 1 caption to fix », « FR DE versions to review ») in one
   caution line. Selecting rows swaps in the BulkBar (Send N / Not now).
3. **Held** (« why is this clip blocked and how do I unblock it? »): grouped by what unblocks it. A person without a
   release: the reason once, with « Hugo's release is signed » (the same action as Sources › People on screen, which
   also takes it back). Length out of spec: the spec once, each row « 9 s long » and « Change the length » (editor).
4. **New videos**: a video Juno asks about (Suggest) gets « Make clips »; a link she couldn't open gets its reason,
   Retry and « Upload the file instead ».
5. Then the rest: Being made, Later (Send to Atlas as a ghost action), Sent to Atlas (slot), Published (numbers).
6. Empty: « Nothing needs you here. I check your channel every 15 minutes. » No illustration.

**Insights** (« what did Iris see overnight that needs a decision? »)
1. Summary line: « 3 anomalies to decide · 2 to approve », each count a filter.
2. **Anomalies to decide**: network, title, metric named with value and delta, likely cause (2 lines), confidence and
   when; Iris's actions on the row (first as secondary, others ghost), a paid boost behind the existing inline
   confirmation, « Review on Desk » when a card exists. No group primary: each anomaly has a different decision.
3. **To approve**: Iris's other Desk cards that need Sam (brief on Draft, weekly or scheduled report to share), with the
   decision on the row (Approve / Share with Claire, or the card's options) through `core/resolve`, so the Desk's Undo
   and journal stay the single path.
4. Then « Last 7 days » (Reach, Engagement rate, New followers, Link clicks, named, with the previous period) and
   « Explore the numbers », then « Written by Iris », then « Ask Iris for a report » and schedules.
5. Empty: « Nothing needs you here. I check every network every hour and write your brief at 07:00. »

## Moved or removed

- Per-row « Send to Atlas » on ready clips: removed. Sending one clip = tick it, then « Send 1 to Atlas » in the BulkBar
  (same single journal line and Undo). Snoozed clips keep a ghost « Send to Atlas ».
- « Ask Iris » report box and Schedules: moved below the report list (same components).
- Anomaly actions: one `AnomalyActions` component for the landing and the Anomalies tab; in both, the first action is
  secondary and the others ghost (they were all secondary).
- Explore KPI tiles: extracted to `KpiTiles`, reused by « Last 7 days ».
- The Clips Empty illustration: replaced by the one-line empty state (§12).

## Still open

- The `.dq-*` block lives in `video.css` and Insights uses it: migrate both to the agents lot's `DecisionGroup`
  primitive after merge.
- Agents › Team « Waiting in departments » still counts Desk cards for Juno and Iris (agents lot's file): it should use
  `videoNeeds` / `insightsNeeds` so it matches the rail.
- Saved demo states created before this fix keep their duplicate clips; Reset the demo (⇧D) clears them.
- Some found clips are 7–13 s (`findMoments` widens toward `len`, but stops at sentence boundaries): they now land in
  Held with « Change the length » instead of failing on send. Making Juno widen to the 15 s minimum is an engine change
  left for later.
