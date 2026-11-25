# Autonomy redesign: sub-agent prompt

Prompt used to build the autonomy settings redesign (one list, a 3-step scale in the agent's colour, weekly volume, examples, Desk impact).
Paste it into a new Claude Code session or an Agent call. The app routes use a HashRouter: `/protopulse/#/agents/nova?tab=autonomy`.

```
You are working in the Protopulse repo (Vite + React + TS, hand-written CSS tokens in src/styles/tokens.css
that mirror the Agorapulse ADS palette). Read README.md, then src/features/agents/Agents.tsx,
src/features/agents/agents.css, src/ui/index.tsx (Seg, AutonomySeg), src/data/agents.ts, src/app/types.ts,
src/app/reducer.ts (core/autonomy, core/preset) and src/features/onboarding/Page.tsx (Autonomy step).

Goal: redesign the agent autonomy settings so a social media lead understands in 5 seconds how much the agent
does alone, changes it in one click, and sees what that produces. Today it is three grey columns of cards, each
with a Suggest/Draft/Act segmented control: monochrome, repetitive, and it never shows the effect.

Build:
1. One list, one row per action: label, "Low/Medium risk · ~N a week · X% approved unchanged", and on the right a
   3-step scale Suggest ─ Draft ─ Act (native radio group, visible labels, ≥44px hit area, arrow keys work).
   Fill the scale up to the chosen level with the agent's colour ramp: Act = var(--a-<id>),
   Draft = color-mix(in srgb, var(--a-<id>) 40%, transparent), Suggest = var(--lift-2) (same ramp as the
   StackBar on the Team card). Hover/focus use --focus (electric blue).
   Under the label: "e.g. {example} → {says[level]}".
   Locked actions go to an "Always you" group at the bottom: lock icon + lockReason, no control.
2. A summary above the list: "This week, about N {unit}", a stacked bar with the same ramp, and a named legend
   "■ N handled alone · N wait for your OK · N you handle". Widths transition, reduced motion respected.
3. Desk impact: after a row changes, a line under it: "~N a week now come to you" / "~N a week leave your Desk".
   The preset UndoBar text gains the total delta. Under the title, one sentence spelling out the current preset.
4. Data: add perWeek:number and example:string (concrete Fernway case with names/products) to every action of the
   5 agents, and unit:string on each agent. Export levelFor(risk, preset) and weeklyLoad(actions, levelOf) from
   src/data/agents.ts; use levelFor in the reducer core/preset, in presetOf and in onboarding (delete its copy).
5. Put AutonomySummary, AutonomyList (onChange optional = read-only compact mode) and presetOf in
   src/features/agents/autonomy.tsx. Replace AutonomySeg with AutonomyScale in src/ui/index.tsx. Delete
   AutonomyBoard, its FLIP code and the .aboard/.acol/.aitem/.aempty CSS.
6. Onboarding Autonomy step: per agent, preset Seg + AutonomySummary + <details> "See the N actions" with the
   read-only list.
7. Add a few asserts for levelFor and weeklyLoad in src/app/reducer.test.ts.

Rules (non-negotiable): only existing tokens, never invent a value. Text ink --ink or --ink-2 only. Borders --line.
Electric blue only for interactive states, never for data. No uppercase labels, no coloured left border, no shadow
inside a card, buttons never full width, every number named in text. UI copy in English, plain and short.

Verify: npm test, npm run build, then the preview server "protopulse" (.claude/launch.json): /protopulse/#/agents/nova?tab=autonomy
and /protopulse/#/agents/atlas?tab=autonomy, change a level and a preset, Undo, keyboard, dark theme, 375px width, onboarding step
(⇧D → reset with onboarding). Report screenshots and anything you could not verify. Do not commit.
```
