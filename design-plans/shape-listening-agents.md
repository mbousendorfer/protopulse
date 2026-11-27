# Object shape — Listening and Agents

Matrix §15. Queues stay §14; objects take their shape; each landing opens on a short overview; the most urgent object
is set apart.

## References (Mobbin, web)
- **Searchable · Sentiment** — mentions count, then one named breakdown bar (positive / neutral / negative with %).
  Kept: one bar, every part named in text. Not kept: the gauge.
- **AirOps · Visibility** — share of voice as a number and a rank among competitors (« 1st »). Kept: our rank next to
  our share, rivals ranked under it.
- **Buffer · Home** — « Weekly pulse » strip of 3 named numbers above the work; comments as a feed with the author's
  avatar and network badge. Kept: a short band, not tiles; the feed item shape for mentions.
- **folk · Assistants** — one card per assistant: icon in its colour, one line on what it does, status pill, channel
  icons. Kept: the card, the state pill, one line. Not kept: the description paragraph.
- **incident.io · Team overview** — pending « cover requests » set apart beside the team. Kept: the pending request is
  its own block, above the roster, with its actions.

## Listening (`#/listening`, Echo)
- **Overview band** (landing only): Echo's one sentence with her avatar · Mentions, 7 days + sparkline per day ·
  Sentiment bar (positive / neutral / negative, named) · Share of voice + rank among tracked brands.
- **Needs you**: the strongest open move is set apart as a large card (urgent spike first, else the highest-impact
  competitor move, then the newest) with Echo's recommended counter-move and the other moves as choices. The rest is the
  §14 queue, short (8 rows, then « Show more »), unchanged otherwise.
- **Beside the queue** (wide screens): the competitors as small objects (initials, share of voice and its trend), each a
  link to its page. Stacks under the queue below 1100 px.
- **Mentions**: a feed, not rows. Item = author avatar with network badge, author · network · time, sentiment as a
  coloured icon + word, the text in full (3 lines), reach and tags, Reply. Filters, menus, selection and bulk unchanged.
- **Competitors**: one card per competitor — initials avatar, name and price, latest move (with « Needs a move » when
  open), share of voice with a 6-week sparkline and delta, sentiment bar. Cards with an open move come first. Network
  filter, the side-by-side table, lessons and top posts stay below.
- **Competitor page**: header with large initials avatar and positioning; one card « vs you » with the four numbers in
  a single aligned row (not 4 cards); share of voice over 6 weeks, them vs you; their sentiment bar; « Answer their
  price cut » when a move waits. Events and top posts stay lists.

## Agents (`#/agents`)
- **Team**: the pending autonomy request with the strongest proof is a large card on top (avatar, the ask, the proof
  lines visible, Allow · Try for a week · Not yet); other requests stay rows under it. Then one card per agent: illustrated
  avatar in its colour on its wash, name and department, state pill (On shift / Paused), what it is doing now, autonomy in
  one sentence, reliability named (« 92% approved unchanged »). Pause / Resume in the card's menu. Card = link to the
  profile, blue border on hover. No tricolour bar, no row of 4 stats.
- **Profile**: header keeps the agent scene (large avatar) with its state. **Track record**: one chart, stacked per day —
  handled alone (agent colour), raised to you (neutral), undone (caution) — with the totals as a named legend; the 4 KPI
  cards go. **How it works**: autonomy stays the control list; Guardrails, Escalation and Playbook become three side by
  side section cards with an icon tile each.
- **Activity**: grouped by day (already); each entry shows the agent's avatar and its name in the agent's ink; each day
  heading lists who worked that day (avatars with counts).

## Taken from history
- Team cards (`83e1165^`, `agent-card`): avatar large, state pill, Now line, Open profile, pause in a menu. Dropped: the
  autonomy StackBar, the 4-number `agent-stats` grid, the role paragraph.
- Competitor event cards (`6b5f0d0^`): the recommended move as a `choice` button with the agent's mark, Echo's read
  behind « Why? ».

## Still §14 queues
Listening › Needs you (below the featured card), autonomy requests after the first, Activity.
