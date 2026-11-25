# Agents × Playbook — plan

Brief: `design-plans/agents-playbook-merge.md`. Mockup: `design-plans/agents-playbook-mockup.html`.
Store untouched (`s.playbook` stays): this is an interface change only.

## Routes

| Address | Shows |
|---|---|
| `/agents` | Agents › Team (cards as today) |
| `/agents/rules` (`?section=rules\|facts\|words\|voice`) | Agents › Shared rules |
| `/agents/escalation` (`?agent=nova`) | Agents › Escalation, filtered when `agent` is set |
| `/agents/:id` (`?tab=autonomy\|guardrails\|rules\|escalation\|alerts\|record\|activity`) | Agent profile |

`rules` and `escalation` are static routes, so they win over `:id` in React Router's ranking; a test asserts no agent id
is `rules` or `escalation`.

Old addresses (one `PlaybookRedirect` element on `/playbook`, `replace`):
`/playbook`, `?tab=rules` → `/agents/rules` · `?tab=words|facts|voice` → `/agents/rules?section=…` ·
`?tab=escalation` → `/agents/escalation` · `?tab=pillars` → `/strategy/pillars`.

## What moves where

- `features/playbook/Page.tsx` → split. `Proposals`, `TryMessage`, `RuleList`, `AddRule`, `Words`, `VoicePanel` move as
  they are into `features/agents/SharedRules.tsx`; `Escalation` + `CONDITIONS` into `features/agents/Escalation.tsx`.
  `Pillars` is deleted. `playbook.css` moves with them. `playbook/slice.ts` stays (store).
- `Agents.tsx`: `Team` gets a shared header (`PageHead` "Agents" + `Tabs` Team · Shared rules · Escalation) through an
  `AgentsLayout` with an `<Outlet>`. The profile keeps its own head (back to Team).
- `RuleList` / `AddRule` / `Proposals` get one optional prop, `agent`: fixed filter, scope label on each row, add form
  locked to that agent ("Add a rule for Nova"). Same component in both places, no copy.
- Profile tabs: Autonomy · Guardrails · **Rules** · Escalation · Alerts (Iris, Echo) · Track record · Activity.
  - Rules: Nova's open proposals (if any), then "Rules Nova follows" and "Facts Nova cites" (`rulesFor`), each row with
    its scope ("Nova only", "Shared with Atlas", "Shared · all agents"), pause / edit / delete with `UndoBar`. Editing a
    shared rule says who else it changes for. Last line: "Also follows the brand voice and words · Open shared rules".
  - Escalation: read-only rows for this agent, link "Edit in Escalation" → `/agents/escalation?agent=nova`.
- Escalation page: one list. Filters "All agents · Nova · Atlas · Iris · Echo · Sage"; each row: switch, label,
  "Watched by…", You / Claire, delete with `UndoBar`; add form from the ready-made conditions (threshold, duplicates
  refused). This is the only place escalation is edited.
- Settings › Approver: read-only summary (Claire's topics listed, "N other topics come to you") + "Edit in Escalation".

## Counts

A tab count means "needs you" or there is none. Shared rules tab: open rule proposals (`CountBadge needs`). Profile
Rules tab: that agent's open proposals. Team, Escalation and the sub-sections: no count. The profile Escalation tab
loses its count (it was a size). Guardrails and Alerts counts are existing and out of this brief: left as they are.

## Wording

The consistency matrix keeps "Add to Playbook" as the verb for rules and facts, so "Playbook" stays the name of the
rule set (Desk, Chats, Composer "Playbook check", "Playbook facts" sources). Only places change name:
"Edit in the Playbook" → "Edit in Escalation"; "Open the Playbook" → "Open shared rules"; "pause or delete it in the
Playbook" → "in Shared rules"; onboarding "later in the Playbook" → "later in Agents › Shared rules". The Shared rules
lede bridges the two: "Your Playbook: what every agent knows about Fernway and how it speaks."

## Links to update (from `grep -rn playbook src`)

- `main.tsx`: routes above, drop `PlaybookPage`.
- `app/Shell.tsx`: rail entry removed; `CRUMB.playbook` removed, crumbs `rules` → "Shared rules", `escalation` →
  "Escalation"; `GOTO.b` → `/agents/rules`; shortcut help "G then B · Shared rules".
- `features/command/CommandBar.tsx`: nav entry "Shared rules" → `/agents/rules`, add "Escalation"; "Open the Playbook" ×2.
- `features/agents/Agents.tsx`: escalation link.
- `features/settings/Page.tsx`: Approver link and summary.
- `features/chats/Drawer.tsx`: `LABEL.playbook` removed.
- `data/script.ts`: two `link: '/playbook'` → `/agents/rules`.
- `data/ideas.ts`: `srcFact` link → `/agents/rules?section=facts`.
- `app/reducer.ts:291`: "You can pause or delete it in the Playbook" → "in Shared rules".
- `features/onboarding/Page.tsx:192`: "later in the Playbook".
- **Open:** `features/publishing/slice.ts:408, 491` (`link: '/playbook'`) sit in the folder another session owns. The
  redirect keeps them working; I change those two strings last, after checking that session is done.

## Spec

`PROMPT.md` §5 (rail, shortcuts), §6.7 (Agents: tabs, profile Rules), §6.9 (Playbook → Shared rules and Escalation
under Agents), §3.7 wording kept.

## Order

1. `rulesFor` / `scopeOf` / `proposalsFor` + tests (done, `features/agents/rules.ts`).
2. Routes and redirects. 3. Move components. 4. Links and wording. 5. `PROMPT.md`.
6. Browser: 1440 and 375, light and dark, every old address. `tsc -b`, `vitest run`, `npm run build`.
