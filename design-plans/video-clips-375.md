# Video clips: row actions fit at 375, duration badge on the type scale

Written against: 03204e1 (origin/main, PR #15 Video merged)

## 1. Row actions wrap on narrow screens

- Surface: `/video` (Clips) at 375 px. Each ready clip shows Review · Send to Atlas · Not now; "Not now" ends at
  410 px and is clipped by `.ideas-rows { overflow: hidden }` ("Not n…"). The list's `scrollWidth` is 393 for 341.
- Design evidence: PROMPT.md §10 Responsive (usable at 375) and §3.8 (a cut-off button is a dead button).
- Root: clip rows reuse Ideas' `.idea-row` / `.idea-acts`. The ≤640 px rule moves `.idea-acts` under the text but
  keeps it `nowrap`. Ideas has two buttons and fits; clips have three and don't.
- Change: `src/features/publishing/publishing.css` ≤640 px `.idea-acts` gets `flex-wrap: wrap`. One rule, both lists.
- Verify: `/video` and `/publishing/ideas` at 375: `.ideas-rows` `scrollWidth === clientWidth`, "Not now" fully visible.

## 2. Duration badge at `--t-xs`

- Surface: clip thumbnails in the Clips list (`.clip-thumb-len`, "0:17"), 10 px, 9 px on small thumbnails.
- Design evidence: consistency matrix §10 — off-scale 9/10/11 go to `--t-xs`; only chart axis labels keep 10.
- Change: `src/features/video/video.css` `.clip-thumb-len` → `var(--t-xs)`; drop the 9 px override on `.sm`.
- Exception written in the matrix: the editor timeline's ruler and track labels stay at 10 (axis, same as charts).

## Set aside

- Juno's emerald `#12A87A`, close to Echo's cyan: specified in PROMPT.md (Juno — Video).
- One orange "Send to Atlas" per ready row: same pattern as ready rows in Publishing › Ideas ("Schedule").
- Ask Juno suggestion chips and the timeline scroll inside their own strips at 375: intended, no page scroll.

## Validation

- `npm test && npm run build` → green.
- `/video`, `/video/sources`, `/video/brand`, `/video/clips/:id` at 1440 / 375, light / dark.
