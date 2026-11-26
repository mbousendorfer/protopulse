# Surface review — video-insights lot

Rendered with Chrome headless at 1440 × 900, 1000 × 800, 375 × 812, light and dark, on three filled states: the
demo after the GR20 upload and four replays of « 4 more moments » (Matt's 25-clip state), a states fixture (Suggest on
clip drafting, a private link, two short found clips, Iris's brief on Draft), and an empty fixture (everything sent or
decided). Detectors on every capture: element out of its card without a scroll container, text cut without an
ellipsis, horizontal page scroll. Final run: 0 findings on all captures.

| # | Finding | Rule / heuristic | Proof | Fix | Sev. |
|---|---|---|---|---|---|
| 1 | Four copies of each found moment in Clips | Bug (feed loop + non-idempotent `video/find`) | before-video-1440-light | `findMoments(taken)` skips moments already cut; test | 4 |
| 2 | 25 « Send to Atlas » buttons, one per row (orange in Matt’s capture) | §12 one primary per group | before-video-1440-light | One « Send N to Atlas » per group, BulkBar for a subset | 3 |
| 3 | Held clips mixed with ready ones, send fails silently into a notice | §3.2, Nielsen #5 | before-video-1440-light | Held group by unblocking gesture | 3 |
| 4 | Weekly quota discovered after the send | Nielsen #5 | — | Quota said once at group level; primary counts what goes | 2 |
| 5 | Rail badges disagree with the pages (Video 2 vs 25, Insights 1 vs 3) | §12 badge = block | before-*-1440 | `videoNeeds` / `insightsNeeds` drive the rail | 3 |
| 6 | Insights landing has no decisions; anomalies a tab away | §3.9 | before-insights-1440-light | Decisions block on the landing | 3 |
| 7 | Found clips say the same sentence three times (title, quote, proof) | Density, §12 one-line reason | wip | Said once; proof takes the next evidence | 2 |
| 8 | Double opening quote on a trend proof (« ““Dawn patrol” ») | Polish | wip states | `foundEvidence` doesn't re-quote quoted names | 1 |
| 9 | At 1000 px the proof was cut mid-word without an ellipsis | Text cut without ellipsis | wip-video-1000-dark | Proof and source shrink with ellipsis | 2 |
| 10 | At 375 px a long anomaly action overflowed the block; the cause wasn't clamped; the spark took a line | Overflow | wip-insights-375 | Wrapping buttons, 2-line clamp, spark hidden (metric is named in text) | 2 |

Scenarios (ux-heuristics walkthrough):
- « I land on Video, what waits for me and how long? » One line: 12 ready to send · 1 held. One orange action sends 8
  (quota said); ~1 min.
- « I have 10 minutes, I send the right clips to Atlas. » Scan the best-first rows (score + proof on one line), Not now on
  the weak ones, Send N. Editor never required.
- « Why is this clip blocked and how do I unblock it? » Held: the reason above its clips, the unblocking button next
  to it (release) or on the row (length).
- « What did Iris see overnight that needs a decision? » Insights opens on 3 anomalies with cause, confidence and the
  actions on the row; the boost asks for confirmation inline.
