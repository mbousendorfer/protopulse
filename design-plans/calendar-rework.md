# Calendar rework — Publishing › Calendar (Week, Month, List) and the Publishing landing

Lot `calendar`, 2026-11-26. Findings and proof: `surface-review-calendar.md`. Captures: `previews/calendar-before-*`
and `previews/calendar-after-*` (Week, Month, List, Ideas; 1440, 1000, 375; light and dark).

## What was wrong

- **The week didn't fit a screen** (columns up to 848 px at 1440 × 900): big cards with a thumbnail, Atlas's avatar,
  three lines of caption, the status pill, a 2–4 line note and the campaign chip. Sam scrolled day by day.
  (Recognition over recall; `before-week-1440-full`.)
- **What needs Sam drowned** in the 22 cards; a pause reason was repeated on every paused card. (PROMPT §3.9,
  matrix §12; `before-week-1440`.)
- **Past, today, ahead looked alike**; no « now ». (Visibility of status.)
- **Month**: empty weeks took half the screen, out-of-month days looked current, an unexplained coloured dot,
  « 1 more » without saying where it goes. (`before-month-1440`.)
- **List**: a flat table, no day grouping, no reason or stats, a sideways scroll on a phone. (`before-list-375`.)
- **Publishing › Ideas**, the landing, didn't open on what waits for Sam: the rail said 7, the page showed ideas
  only. (PROMPT §3.9; `before-ideas-1440`.)

## Competitor references (journeys and density, not style)

| Reference | What we keep |
|---|---|
| Buffer, calendar week ([Mobbin](https://mobbin.com/screens/d064970a-0daa-460d-ab40-2ad1e47cc25a)) | Compact post chip: icon + time, two lines of caption; past days shaded. We drop the thumbnail at our column width. |
| Klaviyo, campaigns week ([Mobbin](https://mobbin.com/screens/9fd76029-a965-453f-8804-f2f4745c6fb2)) and Mindtrip ([Mobbin](https://mobbin.com/screens/4f8af2f1-e584-46e1-ac7c-700be750581c)) | An hourly axis works for a few events a day and wastes the screen at 3–5 posts a day: **no hour grid**. The time stays on each card, in order, and a « Now » rule splits today. |
| Canva, Content Planner month ([Mobbin](https://mobbin.com/screens/5baf57f3-acf9-4d4b-abf6-a86c85fad25a)) | Each month entry is a labelled line, out-of-month days recede. |
| Google Calendar iOS, agenda ([Mobbin](https://mobbin.com/screens/18c687b5-87d8-4344-a5bf-c92fa1abddb0)) | On a phone, an agenda: day after day, no grid. |
| Agorapulse Inbox › Needs you (exemplar, matrix §12) | Group by gesture, one primary per group, decision on the row, shared reason said once. |

## The new journey

1. **Publishing (landing, Ideas tab)** opens on **Needs you**: « Needs you 7 » then the named counts (« 1 failed ·
   1 paused · 1 to approve · 3 questions · 1 plan »), each a filter. Groups by gesture:
   *Failed to publish* (Retry with a plain link, other ways in a menu), *Paused by Atlas* (the alert said once; Keep
   them paused, Resume all, Resume per post), *Ready to approve* (Approve, Review on Desk; « Approve all N » when
   several), *Atlas asks you* (the recommended answer in one click, others in a menu, the promo code typed in place),
   *Next week's plan* (Approve the plan, Review it). The block counts exactly Atlas's Needs-you cards, the same filter
   as the rail badge (`atlasNeeds`, tested). Nothing left: « Nothing needs you here. Atlas is watching the calendar,
   the queues and 7 open ideas. » Then the ideas, as before.
2. **Calendar** opens on the week. Above it, the same signal for the period shown: « 3 need you · 1 failed · 1 paused
   · 2 drafts to schedule · 1 idea from Atlas », each a filter (« Show every post » to come back), and « Select
   all 22 ». Two or more posts paused by the same alert: one line with the reason and Resume all.
3. **Week card**: time and network (and the profile when it isn't the main one), two lines of words; then, only if
   there's something to know, the status pill with its reason, the named stats of a published post, or « Moved by
   Atlas from 12:00 » with Atlas's mark. Past days sit on the canvas; today has a « Now 08:12 » rule.
4. **Month**: every line names the post; status icons match the summary (it serves as the legend); empty weeks take
   one line; out-of-month days recede; « +2 more » opens the week, and a day that overflows keeps what needs Sam.
5. **List**: sorted by time it's an agenda (a heading per day, « Today »); the same line under each post. On a phone,
   stacked rows.
6. **375**: the week is an agenda (day after day, no column boxes), the list is stacked rows, the month shows icons.

## Moved or removed, and why

| What | Where it is now | Why |
|---|---|---|
| Thumbnail on week cards | Post sheet (preview at real size) | Dominated a 120 px card; the words identify the post faster |
| Atlas avatar on every card | Only on what Atlas changed; author in List, Filters › Author and the sheet | 22 identical marks hid the three that mattered |
| Campaign chip on week cards | Filters › Campaign, the sheet | Secondary at week density |
| Notes that aren't reasons (« Clip by Juno… ») | The sheet | Only reasons to act stay on the card |
| « Drag a post to another day… » footer | Card tooltip | Nobody read it; drop zones now fill each column |
| « Select all » in the toolbar | « Select all N » at the end of the summary line | Says what it selects |
| Month coloured dots | Status icons shared with the summary | One code, explained |

Nothing became unreachable: drag and drop, multi-select and `PostsBulk`, Filters, network menu, Themes (Sage),
DayNotes (add, quiet day, remove), gap ideas and « Ask Atlas for an idea », the post sheet, all kept.

## Measures

| Measure (my files) | Before | After |
|---|---|---|
| Tallest week column at 1440, filled week | 848 px | 633 px (all equal, full-height drop zones) |
| Week on one 1440 × 900 screen | 2–3 cards per day | all but Tuesday's last card |
| `style={{` non-dynamic / hex outside tokens / px font sizes off scale | 0 / 0 / 0 (network previews exempt) | 0 / 0 / 0 |
| Overflow and cut-text detectors | 0 | 0 |
| Tests | 327 | 328 (`needs.test.ts`) |

## Still open

- The landing block is built from existing primitives (`card`, `filters`, `Btn`, `Menu`, `CountBadge`); migrate it to
  the agents lot's shared decision-group primitive once that PR merges.
- The block's chips count rows; the paused group shows posts (one Desk card can pause several), so with 3 paused
  posts the chips add up to more than the rail badge, which counts cards. The header badge always equals the rail.
- No « since yesterday » view of Atlas's changes in the calendar; Activity keeps the journal.
- Week at 1000 px stays on 4 + 3 columns; an agenda layout there too could be tried.
