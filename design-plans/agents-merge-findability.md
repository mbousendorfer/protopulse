# Agents merge: "Playbook" still findable, Escalation fits at 375

Written against: d62f06a (origin/main, PRs #11 and #6 merged)

## 1. ⌘K finds Shared rules when you type "Playbook"

- Surface: command bar (⌘K) on any page. Typing `playbook` → "No command matches."
- Problem: PR #6 moved the Playbook under Agents › Shared rules and dropped "Playbook" from the rail and from the
  command bar's Go to list. About 20 places still say "Add to Playbook", "Playbook check", "Playbook:" — on purpose.
- Design evidence: PROMPT.md §6.9 — "« Playbook » reste le nom de l'ensemble des règles ; l'écran qui les montre est
  l'onglet Shared rules". The product keeps the word, so the one search box must resolve it. Nielsen #6 (recognition
  over recall), Krug "don't make me think". Old `/playbook` links already redirect (`PlaybookRedirect`): the same
  courtesy for people who type it.
- Owner: `src/features/command/CommandBar.tsx` `PAGES`.
- Change: optional `keywords` on a page entry, passed to `Command.Item` (cmdk 1.0.4 supports `keywords`). Shared rules
  gets `['Playbook']`. Label stays "Shared rules" (the tab's name).
- Verify: ⌘K → `playbook` lists "Shared rules"; Enter lands on `/agents/rules`.

## 2. Escalation's add button says "Add", like every other add form

- Surface: Agents › Escalation › Add a rule. At 375 the primary button
  `Add “More than 20 negative mentions in an hour”` overflows the card: page `scrollWidth` 383.
- Design evidence: sibling forms in the same section submit with "Add" (Shared rules `AddRule`, Words, Guardrails in
  `Agents.tsx`). The composed rule is already shown right above in the condition menu and the threshold field.
  PROMPT.md §10 Responsive (usable at 375). Nielsen #4.
- Owner: `src/features/agents/Escalation.tsx`.
- Change: label `Add` (no icon, like the sibling submits). `disabled` / "Already in the list." unchanged.
- Verify: `scrollWidth` 375 on `/agents/escalation` at 375; adding a rule still works and shows it in the list.

## Set aside

- Autonomy levels selected in the agent's colour instead of the blue selection style: deliberate in PR #11 and in the
  scale it replaced ("The chosen level takes the agent's colour"). Not a regression.
- Agent profile tabs scroll horizontally inside their own strip at 375: that is the Tabs primitive's behaviour.

## Validation

- `npm test && npm run build` → green.
- `/agents`, `/agents/rules`, `/agents/escalation`, `/agents/nova` at 1440 / 375, light / dark: no page scroll,
  no console error.
