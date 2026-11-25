# Insights › Explore: one pillar table that says what to read, KPIs in two full rows

Written against: 07f64c4 (origin/main, PRs #23–#29; #26 made Insights' numbers per network). Redesign pass.

## What was weak (rendered, 1440)
- By pillar showed the same four pillars twice in one card: horizontal bars (engagement rate), then a table (share,
  saves). One bar, Community, was darker because `highlight="Community"` was hard-coded: an emphasis nobody explains
  (PROMPT §3.2, Nielsen #8). Sage's share targets per pillar (Strategy) weren't shown, though they're the reason
  Community matters.
- Seven KPI tiles in an auto-fill grid: five, then two orphans.

## Redesign
- One table: Pillar · Engagement rate (inline bar + value) · Share · target · Saves rate. The top engagement row is
  computed (not hard-coded), its bar full colour and its name 600. A takeaway line under it, like the heatmap's:
  "Community engages best (4.4%), yet makes 9% of posts for a 20% target." Targets from `targetsOf(s)`.
- KPIs on a 12-column grid: four audience tiles (span 3), three community tiles (span 4). ≤900 px: two columns, the
  odd last tile spans both. ≤520 px: the pillar bar hides, headers wrap.

## Kept
- Agent colour on the bars (Iris owns Insights, as before), heatmap, posts table, all numbers.
