# Surface review — Publishing › Calendar (Week, Month, List) and Publishing › Ideas landing

2026-11-26, lot `calendar`. Rendered with Chrome headless at 1440 × 900, 1000 × 800 and 375 × 812, light and dark, on
a filled week: the Day 30 workspace plus Echo's negative spike (pauses the next 24 h) and X refusing a post, fired
from the moderator panel. Statuses on screen: published with stats, scheduled, draft, paused, failed, Needs you,
Atlas's gap idea, a post moved by Atlas. Captures: `previews/calendar-before-*.jpg` and `previews/calendar-after-*.jpg`.

Detectors (element leaving its card without a scroll container; text cut without an ellipsis) ran on all 27 before
and 30 after screens: **0 hits before, 0 after**. The defects are hierarchy, density and missing information, not
overflow.

Severity: 1 cosmetic · 2 slows the task · 3 misleads or hides what needs Sam · 4 blocks.

## Before

| # | Finding | Rule or heuristic | Proof | Correction | Sev. |
|---|---|---|---|---|---|
| 1 | The week doesn't fit a screen: day columns 420–848 px tall, Tuesday 848 px. At 1440 × 900 only the first two or three cards of each day show. | Goal of the screen (PROMPT §6.3: see the week at a glance); Nielsen 6 recognition over recall | `before-week-1440-full`, measured column heights `[576,848,476,720,458,465,420]` | Compact card: time + network, two lines of words, one line only when there's something to know; thumbnail, author avatar and campaign chip leave the card (they're in the post sheet) | 3 |
| 2 | What needs Sam is spread across 22 cards: 3 Needs you, 1 failed, 1 paused, 2 drafts, 1 idea, found only by scanning every card. | PROMPT §3.9 decisions first; Krug "don't make me think" | `before-week-1440` | A summary line over the calendar naming each count (« 3 need you · 1 failed · 1 paused · 2 drafts to schedule · 1 idea from Atlas »), each a filter | 3 |
| 3 | Paused posts each repeat Echo's whole alert (« Paused: Echo's alert: 27 negative mentions in 40 minutes about Storm Jacket seams ») plus the pill « Paused ». | Matrix §12: a shared reason is said once | `before-week-1440` Tue 12:00 | Two or more paused posts by the same alert: one line above the calendar with Resume all; the cards keep the pill only. One paused post: « During Echo's alert… », without repeating « Paused » | 2 |
| 4 | Atlas's avatar on every card (22 times): noise, and it hides the cards where Atlas actually did something. | Matrix §10 agent colour in small marks only; signal-to-noise | `before-week-1440` | The Atlas mark appears only on what Atlas changed (« Moved by Atlas from 12:00 ») and on its idea card | 2 |
| 5 | Past, today and ahead look alike; nothing marks « now » in today's column. | Nielsen 1 visibility of system status | `before-week-1440` Tue 25 | Past days on the canvas (no surface), a « Now 08:12 » rule in today between what's out and what's ahead, published cards carry their named stats | 2 |
| 6 | « Select all » checkbox sits in the toolbar with no count or context. | Nielsen 2 match with the real world | `before-week-1440` toolbar | « Select all 22 » at the end of the summary line, the count being the posts shown | 1 |
| 7 | « Drag a post to another day to move it… » printed under the grid, unread. | Help in context, not in a footnote | `before-week-1440-full` bottom | Removed; each draggable card says it in its tooltip; drop zones stretch to the full column height | 1 |
| 8 | Month: three empty weeks (27 Oct–16 Nov) take half the screen; the busy weeks are squeezed at the bottom. | Density where the content is | `before-month-1440` | A week with no post (and not this week) takes one line | 2 |
| 9 | Month: out-of-month days (27–31 Oct) look like November days. | Gestalt similarity | `before-month-1440` | Out-of-month cells on the canvas with a dashed edge, date not bold; the first cell and each 1st say the month | 2 |
| 10 | Month: status shown as a coloured dot without a legend; only Needs you and Failed flagged, Paused and Drafts not at all. | Nielsen 4 consistency; « a code is explained or removed » | `before-month-1440` Tue 25, Wed 26 | The same status icons as the summary line (which acts as the legend): failed triangle, needs-you circle, pause, draft pen | 2 |
| 11 | Month: « 1 more » / « 2 more » doesn't say it opens the day; overflow could hide the post that needs you. | Nielsen 1; decisions first | `before-month-1440` | « +2 more » opens that week; when a day overflows, posts that need Sam are kept in the three lines shown | 1 |
| 12 | List: every post is a flat row; no day grouping; no reason for a failed/paused/needs post; no stats for published ones. | Recognition over recall | `before-list-1440` | Sorted by time the list reads as an agenda (one heading per day, « Today »); the line under the words says why it needs a look, how it did, or what Atlas changed | 2 |
| 13 | List at 375: a seven-column table that scrolls sideways. | Responsive (§10) | `before-list-375` | Below 640 px each row becomes a stacked row: check, time, network, then the words and the status; pillar and author move to the sheet | 2 |
| 14 | Week at 375: a week of full cards with thumbnails, each day a bordered box. | Responsive (§10), « agenda by day » | `before-week-375` | Day after day without column chrome, compact cards, empty days in one line | 2 |
| 15 | Publishing › Ideas (landing) doesn't open on what waits for Sam: the rail says 7, the page shows ideas only (Suggest), with no summary. The 7 (failed post, paused posts, trend approval, licence, missing visual, promo code, next week's plan) are only on the Desk. | PROMPT §3.9, matrix §12 (« the rail badge counts exactly this block ») | `before-ideas-1440` (rail 7, block absent) | « Needs you » block at the top of Ideas: named summary (each count a filter), groups by gesture, one primary per group when it has several rows, a decision on each row; the ideas follow | 3 |

## After

| Screen | Result |
|---|---|
| Week 1440 | The whole week on one screen but the last card of Tuesday (columns 633 px, equal height = full drop zones). Summary line + filters; Now rule; Atlas only where it acted. `after-week-1440`, `after-week-1440-full` |
| Week, filtered on « 3 need you » | Only the three posts, with their reason; « Show every post » to come back. `after-week-1440-only-needs` |
| Month 1440 | Empty weeks on one line, out-of-month days recede, every line names the post, status icons. `after-month-1440` |
| List 1440 / 375 | Agenda by day, reason or stats under each post; stacked rows on a phone. `after-list-1440`, `after-list-375` |
| Ideas 1440 | Needs you block (7 = rail) then ideas. `after-ideas-1440-full`; empty state « Nothing needs you here. Atlas is watching… » `after-ideas-1440-empty` |
| Dark | Same screens in dark: AA on pills and lines, the caution band uses `--caution-wash`. `*-dark` |
| Detectors | 0 overflow, 0 cut text on all 30 screens |

## Scenarios (ux-heuristics)

- **« I land on the page: what waits for me, how long will it take? »** Publishing opens on Needs you: 7 cards in 5
  named groups, each decided on its row (Approve, Retry with a plain link, Keep them paused, the promo code typed in
  place, Approve the plan). Roughly a minute for the lot. The calendar repeats the same signal for the week shown.
- **Monday morning, see what goes out this week and what waits for me:** week view, one screen, summary line on top.
- **Find and fix the post that failed:** « 1 failed » in the summary (or on the landing); the card says why
  (« X refused it: the short link looks like a redirect »); Retry is on the landing row or in the post sheet.
- **Move Thursday's post to Friday:** drag the card (tooltip says so), or Reschedule in the sheet. Unchanged.
- **See what Atlas changed since yesterday:** moves show « Moved by Atlas from 12:00 » with its mark; pauses are said
  once at the top. Open: there is no « since yesterday » filter in the calendar; Activity keeps the full journal.
- **Check the month before a launch:** Month: themes, every post named, status icons, empty weeks folded.
