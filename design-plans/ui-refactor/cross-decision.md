# Cross-decision — one card decision everywhere (UI refactor pass 1, 28/11)

## Goal
« Decide an agent's card from its department » (Publishing, Insights, Listening « Needs you »).

## Measured (1440×900, Day 30)
Before, the same Desk card had 3 implementations and 5 overflow triggers:
Publishing « Other ways ▾ » / « Other answers ▾ », Listening « Other options ▾ », Insights icon-only ⌄ with
« Review on Desk » as a second visible button, anomaly / mention rows icon-only ⌄. Reject was impossible from a row,
« Review on Desk » existed on some rows only.
After: `CardActs` everywhere. One visible button (the recommended answer, or Approve / « Approve the plan » /
« Share with Claire »), then « More ▾ » = other answers, Reject (approvals only), Review on Desk. Same verbs as the Desk.

## Findings
| heuristic | proof | fix |
|---|---|---|
| Nielsen 4 consistency (sev 3) | 5 different triggers for one decision | one component, one trigger « More ▾ » |
| Nielsen 3 control / freedom (sev 2) | no Reject from a row, Review on Desk on some rows only | both always in « More » |
| Nielsen 6 recognition (sev 2) | icon-only ⌄ on anomaly and mention rows | labelled « More ▾ » |

## Removed
Publishing NeedRow's own verbs and answer form, Insights `CardDecision`, Listening UrgentRow verbs (−65 / +50 lines).
Matrix §14 states the trigger rule and `CardActs`.

## Kept on purpose
Agents › Requests (Allow / Try for a week / Not yet: three equal choices, not a recommended answer).
Listening event « Moves ▾ » names its content. Shared rules ⋯ is an object menu (§16).
