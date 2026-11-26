# Surface review — Agents (Team, profile first tab)

Rendered at 1440 × 900, 1000 × 800 and 375 × 812, light and dark, with headless Chrome. Data filled before review:
seeded Day 30 workspace plus three moderator events (Nova steps back on refunds, two rule proposals), so every group
of the decisions block has rows. Empty state checked with the moderator's « Calm morning » scenario (Sage, Iris, Echo,
Juno). Detectors run on every capture: element leaving its card without a scroll container, text cut without ellipsis,
horizontal page scroll. Before: clean. After: clean.

Captures: `previews/agents-before-*` and `previews/agents-after-*` (`-empty-` for the empty block).

| # | Finding | Rule / heuristic | Evidence (before) | Fix | Sev |
|---|---|---|---|---|---|
| 1 | Team opens on six identity cards; what waits for Sam (an autonomy request, 21 items in departments) is a footer link per card, pointing to the Desk, not to a decision | PROMPT §3.9, matrix §12 (decisions first) | `agents-before-agents-1440-light.png` | « Needs you » block on top: summary line whose counts filter the block, Autonomy requests and Rule proposals decided on the row, Waiting in departments routed to each department | 4 |
| 2 | Status said twice per card: green dot on the avatar and « On shift » pill | Status once; information has no fill (§10) | idem, each card head | Dot on the mark only; the Now column says « Paused until … » when paused | 2 |
| 3 | Autonomy as a three-tone bar in the agent's colour plus « Suggest 13 % · Draft 50 % · Act 38 % »: three shades of one hue, and a share of actions that says nothing about volume | A metric is named in words; agent colour in small marks only; recognition over recall (Nielsen 6) | idem, autonomy line | Preset name plus « 415 of 443 messages a week on its own »; the bar is gone, the detail stays in the profile | 3 |
| 4 | Four stats of equal weight, « Handled alone · 30 days » on two lines pushes its number down; the most useful (what waits) is absent | Alignment; hierarchy by size and weight | idem, stat row | One « Track record · 30 days » column in words: « 92 % approved unchanged » then « 1,204 handled alone · 7 undone » | 3 |
| 5 | Footer mixes a button, a blue link to `/`, a yellow pill that reads as a link, and « Pause ▾ » that wraps on Nova; card heights differ | One primary action per zone; what is clickable looks clickable, what isn't has no fill (§10) | idem, card footers | One line per agent, columns aligned; secondary actions (profile, autonomy, track record, pause / resume) in one row menu | 3 |
| 6 | « Asks for more autonomy » could only be acted on from the Desk | Quick decisions in place (§12) | idem, Nova card | Allow · Try for a week · Not yet on the row, proof foldable, Undo bar | 3 |
| 7 | Profile opens on the Autonomy settings; the pending request is a « 1 request on your Desk » orange button at the bottom, pointing away | PROMPT §3.9 (first tab of each profile) | `agents-before-agents-nova-1440-light.png` | New first tab « Overview »: same block for this agent, then last actions with « Now », then track record and autonomy summaries linking to their tabs; the history button switches to Overview | 4 |
| 8 | Agents rail entry had no badge although decisions wait there | Each badge counts its block (§12) | rail in every before capture | Agents badge = autonomy requests + rule proposals; department badges now read the same `departmentNeeds` as the block | 2 |
| 9 | At 375 the four-stat grid became 2 × 2 and the footer wrapped | Responsive (§10) | `agents-before-agents-375-light.png` | Rows stack by container width: name and menu, then Now, Autonomy, Track record with their labels | 2 |

## Scenarios (ux-heuristics walkthrough, after)

- **I land on Agents: what waits and how long?** Summary line names it: « 2 autonomy requests · 2 rule proposals ·
  22 waiting in departments ». The two first are one click each; departments show the first item and its urgency.
- **Who waits for me, for what, can I settle it here?** Requests and rule proposals: yes, on the row, with Undo.
  Department items: one row per agent, « Review in Inbox » opens the department's own Needs you.
- **Who can I trust, who gets it wrong?** One column, same words for all six: approval rate, then volume and undos.
- **What is each one doing now?** « Now » column; paused agents say until when, in caution ink.
- **Pause an agent.** Row menu › Pause › For 1 hour … Until I resume. Paused: the menu offers Resume.
- **Give more autonomy, with proof.** « See the proof » folds the evidence under the request; Allow / Try for a week.
- **Nova has 25 things for me.** « Nova · 12 in Inbox · Urgent: Journalist… » › Review in Inbox.
- **Atlas was undone twice this week, I lower his autonomy.** Track record column shows « 2 undone »; row menu ›
  Change autonomy opens his Autonomy tab. On his profile, Overview shows the last undone actions and « Change autonomy ».

## Not fixed here

- Shift text is long for some agents (« Monthly review on the 1st · campaigns on request ») and makes the profile
  header pill wide. Data copy, not this lot.
- The Activity list repeats identical journal lines for Sage in the Calm scenario: engine data, not UI.
