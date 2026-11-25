# Strategy › Pillars and cadence: one way to say "off target"

Written against: b3cc02e (origin/main, after PRs #30–#50 and hotfix #53).

## What was weak (rendered, 1440)
- Two off-target pillars, two signals: same caution bar, but "+6 pt vs target" in green and "-11 pt vs target" in
  red, in mono. Over target isn't good news, red is for status (PROMPT §10), and mono is for timestamps only.
- Cadence printed "4 −1" in red: an unnamed number (house rule: a metric is named in text) in the alert colour.
- Sage's proposals and a campaign's adjustments put an orange "Apply" on every row: several primaries in one zone.

## Change
- Pillars: "6 pt over target" / "11 pt under target", t-sm 500, `--caution` (same tone as the bar).
- Cadence: "4 · 1 short", same style.
- Apply: secondary. The page keeps one primary, "New campaign brief".

Insights KPI deltas (`.delta` up/down) are unchanged: there, up and down are good and bad news.
