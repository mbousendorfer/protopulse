# Object shape — Insights and Strategy (matrix §15)

Matt, 27/11: « tout ressemble à une liste de tickets ». Before this pass, `#/insights` and `#/strategy` each opened on one
§14 list (filters + rows) and nothing else: no number, no chart, no campaign, no agent.

## References (Mobbin)
- **Plausible** (sites as cards): one card per object, a sparkline and its named number. → report cards.
- **Base44 / AirOps analytics**: a row of named KPIs with their change, one chart beside or under. → the overview band.
- **Monarch goals**: a goal is a bar with a marker and a status pill, not a sentence. → campaign progress, pillar bars.
- **Klaviyo campaigns**: the campaign waiting for review is set apart at the top; the rest is calmer. → the featured
  anomaly, the report to approve first, the live campaign large.

Kept: shape, density, what is set apart. Not the style (ADS tokens, agent colours, grey-20 rules).

## Insights (`#/insights`)
- **Overview** (Iris): Reach, Engagement rate, Link clicks, Sales from social (GA4, organic) with their change on the
  week before; daily reach over 4 weeks; Iris's read in one sentence (the biggest mover) + « Weekly report ».
- **Needs you** (§14 queue, short): the most urgent anomaly set apart — rule: a drop before a spike, then confidence —
  as a large card with its named number, its curve, Iris's reason and her options on the spot. The rest beside it as
  rows with a mini curve. « Closed anomalies » and « Alert rules » are links on the heading (`?show=closed` kept).
- **Reports**: cards with a small chart (reach over the report's own week, TikTok views, or the campaign's curve), the
  period, and a status only when it differs (To approve, Sent to Claire, Scheduled / Paused). The report to approve
  comes first and wider; schedules are cards with Pause / Delete.
- **Explore**: reach by network as bars beside daily reach; a data bar behind each post's reach.
- **Audience**: gender as a split bar instead of a sentence. **ROI**: revenue columns carry a data bar (organic only).

## Strategy (`#/strategy`)
- **Overview** (Sage): the live campaign's progress (current of goal, trajectory, days left), pillars on target, and the
  pillar mix against target as bars with target ticks; Sage's read in one sentence.
- **Needs you** (§14 queue): plans, moments, then Sage's changes; the first 4, « Show N more ».
- **Campaigns**: cards with status, networks, goal and progress bar (tick = where the plan expects it today), dates,
  post count. The live campaign that started first is large, with its plan vs actual curve. A plan shows its goal, not
  0% progress. Later moments stay a short « Coming up » list.
- **Pillars**: bars actual vs target first (Sage's colour, caution when > 5 pt off), cadence beside, Sage's proposals
  under them.
- **Campaign page**: the progress bar is added above the plan vs actual curve.

## From git history
Before #168: campaign cards with progress (`CampaignCard`, `.goal-bar`, `.campaigns`), the week's KPI tiles. Reused
without the boost budget and without the group hints.
