# Cross-post-sheet — one post, one sheet, one set of numbers (UI refactor, 28/11) — BLOCKED

## Goal
« How did this post do, and what do I do with it? » from Publishing (calendar, list) or Insights › Explore.

## Measured
Two sheets for the same object:
- Publishing `PostPreview` (`publishing/Bulk.tsx`): network preview, Results vs median + Atlas's reading,
  **Recycle it**, Details, Activity, comments, prev/next, Edit, ⋯.
- Insights `PostSheet` (`insights/Page.tsx`): Results vs network average + Iris's reading, Details. **No action**:
  Iris says « Worth recycling: Atlas can bring it back » and there is no button (dead end).

Root cause: two mock datasets for the same published posts, with **contradictory numbers**:
| post | Publishing (`data/publishing.ts`) | Insights (`data/insights.ts`) |
|---|---|---|
| Five knots | 18,400 reach, 3.4 % | 41,200 reach, 5.1 % |
| Bottle drop test | 210,000 reach, 7.8 % | 210,000 reach, 6.8 % |
| Storm Jacket vs. a garden hose | 26,100 reach, 4.6 %, 6 days ago | 52,100 reach, 4.1 %, yesterday |
| Lac Blanc at sunrise (TikTok) | 41,000 reach | 1,900 reach |

## Findings
| heuristic | proof | fix |
|---|---|---|
| Trust / Nielsen 4 (sev 3) | the same post has two reaches depending on the module | one source of truth |
| Nielsen 3 / dead end (sev 3) | Iris recommends recycling, Explore's sheet has no action | Explore opens the Publishing sheet |
| Nielsen 4 consistency (sev 2) | two sheets, two layouts, two « average » definitions (median vs network average) | one sheet |

## Target
- One dataset of published posts: `publishing.posts` (+ `clicks` in `stats`). Insights `POSTS` becomes a view of it
  (plus older history rows that only exist as performance data, migrated as published posts).
- Explore rows open `PostPreview` (`?post=` already works on any path). `PostSheet` deleted.
- One reference for « usual »: the network median.

## Why blocked
Insights `POSTS` feeds `roi.ts`, `studio.ts` (reports), `listening/model.ts` and `data/ideas.ts`. Reconciling it
changes numbers in reports, ROI and Listening, and the loop's rule is not to touch `src/data` unless the refactor
requires it. It does, but the blast radius needs Matt's go-ahead.
