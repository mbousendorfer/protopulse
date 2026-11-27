# Text diet: Publishing and Video

Lot **publishing-video** of the 26/11 text-diet pass (PROMPT §10 « Le texte se mérite », matrix §13). Branch
`claude/ui-next-level-text-diet-publishing-video`.

Rule applied, block by block: rewrite first, then move what's still long (reasoning, rule, proof list) behind
`MoreInfo` « Why? », and a definition, a setting or a supporting figure behind `InfoPop`. Nothing that decides a row
moved: alerts, Held and Failed with their short reason, the irreversible, the named metric next to its number, and the
network previews stayed where they were.

## Inventory

| Surface | Block | Before → after | Why |
|---|---|---|---|
| Publishing (all tabs) | Page lede, 2 sentences | visible → rewritten, 1 sentence | One lede per page, one sentence. |
| Ideas › Needs you | Group hint « The network refused them. Atlas has a fix ready. » | visible → removed | The row says why, the button says the fix. |
| Ideas › Needs you | Group hint « Atlas prepared them. Approving schedules them. » | visible → « Approving schedules them. » | The consequence of the group action stays; who prepared them is the rail and the icon. |
| Ideas › Needs you | Group hints « One answer each… », « Built from Sage's cadence… » | visible → removed | Each row already says it (field, « Built from October's winners… »). |
| Ideas › Needs you | Row reason, up to 3 sentences | visible → first sentence | One line of reason. The title opens the Desk card (or the failed post) with the rest. |
| Ideas › Needs you | Slot under a title that already names it (« Tuesday tips: Tue 2, 08:30 ») | visible → removed | Said once. |
| Ideas › Needs you (data) | Queue fill: « Atlas filled the Tuesday tips slot from the queue's Trail stories tips. » | data → « From the queue's Trail stories tips. » | The title names the queue; the same line on two rows got shorter. |
| Ideas › Needs you (data) | Licence: rights first, use second | data → « Used by 1 post still to go out. » first | The decisive sentence comes first, so the one-sentence cut keeps it. |
| Ideas › Needs you (data) | Missing visual: subject first, reason second | data → reason first | Same. |
| Idea panel | « Why Atlas suggests this »: 2–3 sentences, every proof, spotted by · when · confidence · pillar · deadline · rule | visible → first sentence, strongest proof, « Spotted by Iris · 82% confident » (+ deadline); the rest → `MoreInfo` « Why? » | The post preview was pushed below the fold. The panel « Why Atlas suggests this » holds the whole reasoning, every source with its link, when, the pillar and the rule. |
| Idea panel | « Atlas's first take, not written yet. Draft it to get… » | visible → rewritten shorter | Same meaning, 4 words less. |
| Calendar (week, list) | Card reason (« X refused it: the short link looks like… », clamped) | visible → gist (« X refused it », « Missing visual », « During Echo's alert ») | It was cut by the clamp anyway. The card opens the post's panel, which shows the whole reason. |
| Calendar (week) | « 3 posts » in each day header | visible → screen reader only | The cards are right under it. |
| Post panel | Failed: setting sentence (« Publishing failures always reach you… ») | visible → `InfoPop` « Why? » | Rule and setting are popover material; the failure itself stays visible with its three ways out. Already inside a sheet, so a popover, not a second sheet. |
| Post panel | Desk card: `why`, Playbook rules, confidence | visible → `InfoPop` « Why? » | Same. « It goes out Wed 26 at 09:00 once you approve » stays: it's the consequence of the decision. |
| Composer | Copilot hint « Write a first line: Atlas can then offer variants, shorten it or adapt it for LinkedIn. » | visible → « Write a first line, then ask Atlas for variants. » | Rewritten. |
| Composer | Slot comment, 2 sentences (+ a layout bug: the Atlas mark sat alone on its line) | visible → first sentence + `InfoPop` « Why? » with the figure | « Good slot: the right time of day. » decides; « Fridays at this hour do best, 2.1× the median reach » is the supporting figure. |
| Composer | Empty preview body | visible → shorter | « Write the caption and pick a visual » repeated the form. |
| Plan review | « Uncheck what you don't want, then approve the week in one go. » | visible → removed | The checkboxes and the footer say it. |
| Queues | 2-sentence lede | visible → 1 sentence | « Each queue is one kind of post on recurring slots » is what the cards show. |
| Media › needs | « “<post text>” Atlas would use “X”. It never uses stock photos. » | visible → removed when Atlas has a pick; kept when none fits | The button is « Use “X” »; the post's words are one click away: the row title now opens the post. |
| Media › needs | Licence: « <rights>. Used by Tue 25 Instagram. Atlas would put “X” instead. » | visible → « Used by Tue 25 Instagram. » | The title opens the photo's sheet (rights, uses, date added); the swap is the button. |
| Media grid | « Used 5 times · added 12 Nov » | visible → « Used 5 times » | The date is in the photo's sheet. |
| Video (all tabs) | Page lede, 2 sentences | visible → 1 sentence | One lede. |
| Video › Clips | Summary « … from 3 videos. I check your channel every 15 minutes. » | visible → « I check your channel every 15 minutes. » | The video filter right under it names the 3 videos with their counts. |
| Video › Clips | « From <source video> » on every row | visible → removed | The filter above names the sources; the editor's first line is « From <video> ». |
| Video › Clips | Languages « FR DE » on the line and « FR DE versions to review » under it | visible twice → once (in the to-do) | Said once. |
| Video › Clips | Trial proof « 61% still watching at 3 s: “<hook>” won its hook trial » | visible → « 61% still watching at 3 s · won its hook trial » when the hook already is the winner | The hook is quoted on the line above. |
| Video › Ready to send | Hint « Best first. Atlas puts them in your best slots. » | visible → « Best first · Atlas picks the slots » | Rewritten. |
| Video › Ready to send | Quota note | visible → shorter (« 2 clips from “X” would wait for next week: 5 clips per video a week, best first. ») | It decides what « Send N » does: stays, shorter. |
| Video › Held | Hint « Juno won't send these until the reason is fixed. » | visible → removed | « Held » and the reason line (« Hugo… is on screen without a signed release ») say it. |
| Video › Did worse than usual | Hint « Published, under half their network's average views. Juno can recut… » | visible → `InfoPop` « What's usual? » | A definition. The row keeps « Did worse than usual: 14% of your TikTok average views ». |
| Video › New videos | Hint « Juno asks before cutting a new video. » | visible → removed | « Make clips » says it. |
| Video › On trial | « On trial on Reels · results Thu 18:00 » under the header « Two hooks on Reels… » | visible → « Results Thu 18:00 » | Said once at the group. |
| Clip editor › Post | One reason sentence under each part of the score, and under Track record | visible → `MoreInfo` « Why? » (« Why Virality 81 ») | Each part stays named with its bar and number. |
| Clip editor › Post | Running trial: « On Instagram Reels since 10:00, each hook shown to non-followers first. Results… ; nothing reaches your followers before. » | visible → « On Reels since 10:00 · results Thu 18:00 » + `InfoPop` « How it works » | The how is a definition. |
| Clip editor › Post | « One opens on a number, the other doesn't: a hook with a number won 2 of your 3 trials so far. » | visible → `InfoPop` « Why these two? » | Supporting figure. |
| Clip editor › Post | Autonomy sentence « Hook trials are set to Draft: when a trial ends, Juno asks you… » | visible → `InfoPop` « Hook trials: Draft » | The setting is named; what it means is a popover. |
| Network previews (`.pv-*`), held / failed / paused reasons, plan cadence warnings, Brand kit, Sources transcript | — | unchanged | Exempt, or needed to decide. |

## References

Mobbin, web, « social media content calendar week view »: Canva Content Planner, Klaviyo Campaigns calendar, Wix
Marketing Plan (AI marketing agent), Base44 Social content, Jasper content calendar, Mindtrip calendar. From memory of
the products: Buffer and Hootsuite calendars, Opus Clip's clip list.

What I kept:
- **Calendar cards carry a time, a title and a status mark, never a reason.** Canva, Klaviyo and Mindtrip show one line
  per event; Klaviyo adds a status icon. Our cards keep their status pill and, for what needs Sam, a gist of two or
  three words; the reason itself goes to the post's panel.
- **An agent's plan list is title, date, status, type** (Wix Marketing Agent): no per-row explanation, the row opens the
  detail. That's the Needs-you row: title, one sentence, the decision.
- **The agent's long reasoning folds** (Base44 « Suggested approach » with « Show less »). Ours goes to a side panel
  behind « Why? », which keeps the post preview above the fold in the idea panel.
- **Clip lists in Opus Clip** show the score, the title and the length, and the reasons only inside the clip. Our row
  keeps one proof with its number, since that's what makes « Send to Atlas » a decision on the spot.

## Density, before → after

`design-plans/text-density.js`, 1440 × 900, light. Day 30 workspace, Queues « Ask Atlas to fill », then from ⇧D: legal
threat, injury, « which jacket », compliments, send window, hook trial, flop, Echo spike, TikTok audience, X rejected a
post, gap idea, the GR20 upload (left to finish cutting). Same setup before and after; the « after » workspace is rebuilt
so the reworded data is in it.

| Route | words | first screen | > 2 lines | > 25 words |
|---|---:|---:|---:|---:|
| `#/publishing` Ideas (landing) | 615 → 539 | **279 → 218** (−22%) | 10 → 10 | 5 → 3 |
| `#/publishing/calendar` week | 458 → 410 | 425 → 378 (−11%) | 0 → 0 | 0 → 0 |
| `#/publishing/calendar` month | 442 → 436 | 442 → 436 | 0 → 0 | 0 → 0 |
| `#/publishing/calendar` list | 512 → 484 | 255 → 232 | 66 → 66 | 1 → 1 |
| `#/publishing/plan` | 474 → 456 | 225 → 207 | 14 → 14 | 1 → 1 |
| `#/publishing/drafts` | 162 → 156 | 162 → 156 | 8 → 8 | 0 → 0 |
| `#/publishing/queues` | 149 → 130 | 149 → 130 | 0 → 0 | 1 → 1 |
| `#/publishing/media` | 450 → 316 | 236 → 201 | 32 → 32 | 2 → 0 |
| `#/video` Clips (landing) | 597 → 451 | **321 → 260** (−19%) | 13 → 13 | 12 → 10 |
| `#/video/sources` | 125 → 114 | 125 → 114 | 0 → 0 | 0 → 0 |
| `#/video/brand` | 163 → 152 | 129 → 124 | 6 → 6 | 0 → 0 |

Why some counts didn't move, and why that text earns its place:
- **Calendar, week and month.** Most words are the posts' own text. The metric counts each excerpt in full even though
  the card clamps it to two lines (one in month view), so the eye reads about half of what's counted. The reasons that
  were truncated mid-word are now whole gists. Shortening the posts' words would hide which post is which.
- **> 25 words on Video and Ideas.** The script takes the whole row (`li`) as one block: title, hook, score, proof,
  to-do and the two buttons. Each row is one line of title and one line of facts; under 25 words it would lose the hook
  or the proof, which is what makes the row decidable.
- **> 2 lines on Media (32), the list (66), Plan (14).** Same cause: a `li` or `td` that holds a photo or two lines
  (text + reason) is taller than 2.5 lines. No paragraph there runs long.

## Checks

- `npx tsc --noEmit`, `npm run build`, `npm test` (367 tests): green.
- Each added `MoreInfo` / `InfoPop` (idea « Why? », post « Why? » failed and Desk card, composer slot « Why? », clip
  score « Why? », « Hook trials: Draft »): opened with Enter, closed with Escape, focus back on the link, at 1440 and 375,
  light and dark. Escape on a popover inside the post sheet closes the popover only. Captures:
  `previews/text-publishing-video-after-open-*`.
- Detectors (an element leaving its card without a scroll container; text cut without an ellipsis) on 14 routes and
  panels at 1440, 1000 and 375: none.
- Every decision still happens without opening a panel: the Needs rows, ideas, clips, plan and media rows keep their
  buttons and their one line of reason.

## Captures

`design-plans/previews/text-publishing-video-{before,after}-*`: every route at 1440 and 375, light and dark; the idea
panel, the failed and published post panels, the composer and the clip editor's Post tab; the opened panels and
popovers (`after-open-*`).

## Open

- `MoreInfo` inside a `Sheet` opens a second sheet. In the post panel I used `InfoPop` labelled « Why? » instead. Proposal
  for matrix §13: « Inside a sheet, “Why?” opens a popover, not a second sheet. »
- Proposal for matrix §13: « A row reason is its first sentence; data that feeds a row puts the decisive sentence first »
  (done here for the licence and missing-visual cards).
- The Needs-you rows still don't show the rule or setting behind each card (§3.2): it's on the Desk card, one click
  away through the title. A « Why? » popover per row would add a word to every row; left for the decision-group primitive.
- Calendar month view: unchanged. Its words are the posts' one-line excerpts.
- The Desk shows the same queue / licence / missing-visual cards: their reworded contexts appear there too (same meaning).
  Not checked on the Desk screens (other lot).
