# Desk — one decision on screen (UI refactor pass 1, 28/11)

## Goal and path
« Clear what needs me this morning ». Measured at 1440×900, Day 30.
- Before: brief band, then a full « Decide first » card (hero, same `Detail` component), then list + detail pane
  showing a *different* card. List started at 86 % of the fold. A/E/R/1-3 acted on the pane, not on the hero
  (`keys={false}`): the biggest card on screen ignored the keyboard.
- After: brief band, then list + one detail pane. The most urgent card is first in the list and open in the pane.
  List starts at 38 % of the fold. One key per decision, on the card you see.

## Findings
| heuristic | proof | fix |
|---|---|---|
| Nielsen 4 consistency, 1 visibility (sev 3) | two decision cards, two « Urgent » pills, two verb sets at once | one detail |
| Nielsen 2/6, Krug « don't make me think » (sev 3) | keys hit the lower card while the hero looked first | keys act on the only card |
| Scalability (sev 2) | hero pushed the list below the fold whatever the volume | list above the fold |

## Structure
```
[ Brief band                                   ]
[ Needs you 46 · Worth a look · Good news · Done      All agents ▾  Focus ]
[ list (first = most urgent, selected) | detail pane ]
```

## Removed
`desk-feature` section, `Detail`'s `feature` split layout and its CSS. Matrix §15 amended (list + detail: set apart =
first and open). PROMPT §6.1 states it.

## Not done here
Counts « Needs you 46 » / « Your call 17 » / « 1 of 27 » count different things (cards vs gesture group vs stops) —
to fix with the brief band pass. Department « Needs you » rows: next `cross-decision` pass.
