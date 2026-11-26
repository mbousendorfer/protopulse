# Agents rework — decisions first

## What was wrong
Matt: « les cartes d'agents sont imbittables ». The Team grid stacked six cards that each said the status twice, drew
autonomy as three shades of one colour with percentages of actions, lined up four stats of equal weight (one wrapping
and misaligning its number), and ended on a footer mixing a button, a link to the Desk, a yellow pill that looked like a
link and a Pause menu that wrapped. What waited for Sam was a footer link; the profile opened on settings.
Details, rules and captures: `surface-review-agents.md`.

## References (Mobbin) and what we keep
- **Writer, Mistral AI Studio, Relevance AI** (agent lists): one row per agent, aligned columns, secondary actions in a
  row « ⋯ » menu. → A dense list beats cards once you compare agents; six agents fit one screen.
- **Juicebox** (agents + « Leads by agent » overview): the approval mode in words (« Auto approval ») and pending
  approvals per agent beside the list. → Autonomy as a word; what is pending, per agent.
- **Plain** (Ari agent overview): « Handed off 3 » with a breakdown, activity first. → Profile overview opens on what
  the agent hands to you.
- **Intercom Fin** (performance): one headline rate (involvement). → One trust number in words, « approved unchanged ».

## New flow
**Agents › Team**
1. « Needs you » block (`DecisionBlock`): summary line « 2 autonomy requests · 2 rule proposals · 22 waiting in
   departments », each count a filter.
2. Autonomy requests: Allow · Try for a week · Not yet (or Move to Draft · Keep on Act for a step back), the proof
   folded under the reason; Undo bar on top of the block.
3. Rule proposals: Add to Playbook · Dismiss; « Add all N to Playbook » is the group's one primary action.
4. Waiting in departments: one row per agent with the first item and its urgency, « Review in Inbox » etc. 3 rows, then
   « Show N more ».
5. Your team: one line per agent: Agent · Now (or Paused until …) · Autonomy (preset + weekly volume on its own) ·
   Track record (approved unchanged, handled alone, undone) · row menu (Open profile, Change autonomy, See track
   record, Pause … / Resume).

**Profile** (`/agents/:id`): new first tab **Overview**: the same block for this agent, then « Last 5 actions » headed
by what it does now, then Track record and Autonomy summaries linking to their tabs.

## Moved or removed
- Card description (role): still in the profile header.
- Autonomy bar and Suggest / Draft / Act percentages: removed; the per-action detail is the Autonomy tab.
- « Raised to you » stat: replaced by the live « waiting » count, which is what Sam can act on.
- « N need you » link to the Desk: now « Review in <department> » in the block.
- « Open profile » button: the name is the link, and it is in the row menu.
- Pause / Resume: row menu on Team (sections + divider, no flyout); unchanged on the profile.
- Profile « 1 request on your Desk » (orange, to `/`): « 1 request to decide », opens Overview.
- Inbox › Rules sheet « Rules are on Act » link now opens Nova's Autonomy tab (the profile's default tab changed).

## Shared files
- `src/ui/Decisions.tsx` + `decisions.css`: `DecisionBlock`, `DecisionGroup`, `DecisionRow`. Same anatomy as Inbox ›
  Needs you. Other lots migrate to it after merge.
- `src/app/Shell.tsx`: department badges read `departmentNeeds` (same numbers as before), Agents gets a badge.

## Still open
- Department items are routed, not decided, on the Agents page: they live in their department's block (one place each).
- The Agents badge counts only what is decided on Agents; an autonomy request also counts in its department badge
  (except Nova, whose Inbox badge counts conversations).
