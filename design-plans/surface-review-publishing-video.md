# Surface review — Publishing and Video

Quality pass, lot `publishing-video` (2026-11-25). Surfaces: Publishing (Ideas and the idea panel, Calendar
week / month / list, Plan review, Drafts, Queues, Media, bulk actions; Composer and post view reviewed only)
and Video (Clips, Sources, one source, Brand kit, editor and timeline).

## Method

- Every surface rendered in headless Chrome at 1440 × 900, 1000 × 800 and 375 × 812, light and dark (114 captures
  before, 114 after). Queues filled with "Ask Atlas to fill" first; calendar bulk bar shown with every post selected;
  media sheet, post view (needs you, published) and the composer opened.
- Two detectors on every capture: an element that sticks out of its card with no scroll container on the way, and a
  text cut by its container without an ellipsis (`scrollWidth > clientWidth`, overflow not visible / auto / scroll,
  `text-overflow` not ellipsis, outside `.sr-only` and the `.pv-*` network previews).
- Read by eye for overlaps, alignment, hierarchy, density and empty space. Competitors looked at for the screens
  rebuilt (Mobbin: Buffer and Klaviyo calendars; Opus Clip-style clip review): flows only, never the look.

Severity: 1 cosmetic · 2 inconsistent or confusing · 3 gets in the way · 4 blocks.

## Findings

| # | Sev | Finding | Rule or heuristic | Proof | Fix |
|---|---|---|---|---|---|
| P1 | 3 | Calendar week: each post is a tall card with a 72 px banner photo; the week is 1290 px tall at 1440 and 5355 px at 375, Thursday evening is below the fold | Density, scannability (Buffer and Klaviyo use compact cards, small thumbnail) | `before/pub-cal-week-1440.png`, `-375.png` | Compact card: network, time, author and a 32 px thumbnail on one line, then 3 lines of text. 960 px at 1440, 3700 px at 375 |
| P2 | 2 | Calendar week: the invisible "+ Note" button reserves a line above the first post of every future day, so the posts of Mon (past) and Tue start 40 px apart | Alignment | `before/pub-cal-week-1440.png` | "Add a note" is an icon button in the day header, shown on hover or focus (always on touch) |
| P3 | 2 | Day header count is a bare "3" | House rule: a metric is named in text | same | "3 posts" |
| P4 | 2 | Today's date is blue (`--action-ink`) on a static label, in week and month | House rule: electric blue is for interactive only | same, `pub-cal-month-1440.png` | Date in a filled ink disc (Klaviyo pattern); "today" for screen readers |
| P5 | 2 | Month cells get a blue border on hover but are not clickable (only the day number is) | Matrix §5: blue border = clickable card; §3 PROMPT "what doesn't click has no border" | `before/pub-cal-month-1440.png` | Hover removed from the cell; each post row has its own hover |
| P6 | 2 | Month: a post is only a network icon and a time; "needs you" is told by the time turning orange, colour only; "+2 more" is dead text | Colour is never the only signal; ce qui se clique se voit | same | Each row shows the text with an ellipsis and a status dot named in `title` and `aria-label`; "2 more" opens that week |
| P7 | 2 | List view shows two "Select all" (bar and table header); the "Drag a post" hint shows in list and month, where nothing drags | One control per job | `before/pub-cal-list-1440.png` | Bar "Select all" and the hint only in week |
| P8 | 3 | Plan review: tag pills stick out of their 150 px cards by 16 px (detector at 1440 and 1000); reasons are unreadable in 7 narrow columns; "Campaign" is a blue pill on static data | Detector; house rule blue = interactive | `before/pub-plan-1440.png`, report | Rebuilt as a list grouped by day: checkbox, time and network, the words with the reason under them, tag (neutral), thumbnail. Unchecked rows strike through. Phones stack the row |
| P9 | 2 | "Reject the plan" confirm is an orange primary; its cancel says "Keep it" | Matrix §1: destructive confirm = danger, Cancel then action | code, `Plan.tsx` | `danger`, "Cancel" |
| P10 | 1 | Plan meta line "Atlas · plan v1 · built with…" set in mono | Mono is for times and figures | `before/pub-plan-1440.png` | Plain text |
| P11 | 3 | Drafts: "Waiting for your approval" lists Atlas's other Desk cards (licence ending, good news), which are not approvals | Visible contradiction | `before/pub-drafts-1440.png` | Only `approval` cards, count in the title |
| P12 | 2 | Drafts: a draft without a visual shows its file icon pinned top-left of the tile: a rule meant for the text column (`.pub-draft-open > span`) also hit the thumbnail | Alignment | same | Rule scoped to the text column |
| P13 | 1 | Drafts: the author mark floats far right, away from the facts; date and slot in mono | Hierarchy | same | "by Atlas / by you" in the meta line |
| P14 | 2 | Queues: "Tuesday [08:30]" in the card header reads like a filter, not a recurring slot; a scheduled slot says "Scheduled" in grey, other statuses show the raw key | Clarity; status = `Pill` (matrix §6) | `before/pub-queues-1440.png` | "Every Tuesday at 08:30"; statuses through `STATUS_LABEL` in a `Pill` |
| P15 | 3 | Media: 4:5 tiles at 180 px make a 2580 px page at 1440 and 6000+ at 375; the two things Atlas needs are two separate cards, each with an orange primary | Density; one primary per zone | `before/pub-media-1440.png` | Square 144 px tiles (2 per row on a phone); one "Atlas needs you on 2 visuals" card with secondary actions; the tile says "Licence ends 31 Dec" |
| P16 | 2 | Ideas: every ready row has an orange "Schedule", two primaries in one list | One primary per zone | `before/pub-ideas-1440.png` | Row action secondary; the idea panel keeps the orange Schedule |
| P17 | 3 | Composer and idea panel: a Wednesday 18:30 slot says "Good slot. 2.1× the median reach on Fridays" | Visible contradiction | `before/pub-new-1440.png` | `slotComment` quotes the best day only on that day, otherwise "the right time of day, Fridays at this hour do best". Test added |
| P18 | 1 | Post view activity: "Atlas Asked for your approval", capital mid-sentence; comments run into the name | Writing | `before/pub-post-1440.png` | "Atlas asked…"; people's own words after a colon |
| P19 | 1 | ⌘K answer from Atlas: "Open the Desk" for one card | Glossary: "Review on Desk" | `publishing/agent.tsx` | "Review on Desk" |
| P20 | 1 | Plan review tab dot coloured with an inline style | Measure: inline styles | `Page.tsx` | `.pub-tab-dot` |
| V1 | 3 | Clips: six orange "Send to Atlas" in one list; the frame is a 40 px sliver, too small to judge a video moment; the to-dos ("1 caption to fix") look like any other metadata | One primary per zone; hierarchy | `before/vid-clips-1440.png` | Clip cards, two per row at 1440: 90 × 160 frame with length, title, hook, virality and networks, the proof, the source, to-dos with a caution icon, then Send to Atlas (secondary) and Not now. The card opens the editor (the extra "Review" button is gone) |
| V2 | 1 | A published clip says its views twice (proof and stats) | Repetition | same | Proof hidden once there are stats |
| V3 | 3 | Timeline captions are cut mid-letter (detector: 16 cut texts per screen at every size); at 375 each line is 8 px wide ("\ c s t") | Detector; text cut without ellipsis | `before/vid-editor-375.png`, report | Ellipsis, and the timeline never fits below 40 px a second: on a phone it scrolls |
| V4 | 2 | Editor at 375: Undo on the first line, Redo wrapped to the second, next to the actions | Grouping | `before/vid-editor-375.png` | Undo and Redo stay together; Not now and Send to Atlas get their own row |
| V5 | 1 | Video bulk "Back tomorrow" vs "Not now" in every menu; editor status "Back tomorrow" vs "Back tomorrow 08:00" | Glossary | code | "Not now", "Back tomorrow 08:00" |
| V6 | 1 | `#fff`, `#000` and black alphas for UI drawn over video (length badge, play icon, player background, logo, trim handle grip) | Measure: hex outside tokens | `video.css` | Four `--media-*` / `--on-media` tokens; the trim grip uses `--signal-ink` so it reads in dark |

## Checked and kept

- Composer (#120) and post view (#123): layout kept. Only P17 and P18 changed. Detectors clean at every size.
- Network previews (`.pv-*`): exempt (they imitate each network), not touched.
- Timeline labels stay at 10 px (written exception in the matrix).
- Captions, hook card, end card, safe-zone stripes and the caption samples keep their own colours and shadows: they are
  the clip's look inside the frame, like an illustration. Written in `video.css`.
- Sources, one source, Brand kit: detectors clean, nothing that breaks a rule.
- Idea panel: clean. At 900 px high the post preview starts low in the panel (Why + Ask Atlas take the room); left as is,
  noted below.

## Still open

- Breadcrumb on a source shows the route id ("Repair") instead of the video's title, and at 1000 px the breadcrumb
  runs under the search field. Both are in `src/app/Shell.tsx` (shared), not changed here.
- Idea panel at 1440 × 900: the preview shows ~100 px before scrolling. A shorter Ask Atlas dock (chips on one
  scrolling line) would help; it changes a surface redone recently, so it is left for a decision.
- Cover text on clip thumbnails is a fixed 11 px (9 px in the cover picker): it is the clip's own text, scaled down.

## Measures in this lot's files (`src/features/publishing`, `src/features/video`)

| Measure | Before | After | What's left |
|---|---|---|---|
| `style={{` inline | 23 (1 static) | 22 (0 static) | All dynamic: widths, positions, focus, preview zoom, swatch colour |
| Hex outside `tokens.css` | 22 | 11 | 6 in caption looks inside the frame, 5 Fernway swatches (data) |
| `rgba()` in feature CSS | 13 | 7 | Caption shadows and bands inside the frame |
| `font-size` px off the scale (outside `.pv-*`) | 6 | 6 | 4 timeline labels (written exception), 2 cover texts (the clip's own text) |
| Detector hits (114 captures) | 106 (6 plan pills, 100 timeline captions) | 0 | |
