# Protopulse

Clickable, fully mocked prototype of an **agentic, proactive social media management platform**, built for user testing. A social media lead (Sam, at the fictional outdoor brand Fernway) runs a team of five agents and only steps in where a person is needed.

**Live:** https://mbousendorfer.github.io/protopulse/

The full product spec, which is also the prompt that generates the prototype, lives in [PROMPT.md](PROMPT.md).

## Agents

| Agent | Department | Does |
|---|---|---|
| Nova | Community (Inbox) | Comments, DMs, reviews, exchanges and refunds within limits |
| Atlas | Publishing | Weekly plan, posts, slots, recycling |
| Iris | Insights | Morning brief, weekly report, anomalies |
| Echo | Listening | Competitors, mentions, trends |
| Sage | Strategy | Campaign plans, pillars, cadence |

Every action has an autonomy level (**Suggest**, **Draft**, **Act**). Agents ask for more autonomy when they've earned it and step back after undos.

The **Desk** lists the day in three groups (Needs you, Worth a look, Good news) and shows one item at a time. Similar items come as batches you can approve in one go ("Send 4 ready"), with one Undo.

## Running a test session

- The demo starts on Tuesday 25 November 2025 at 08:12 and the agents produce new events every ~30 s.
- **⇧D** opens the moderator panel: reset, scenario presets, trigger any event, skip to tomorrow, export the tester log as JSON.
- **?** lists the keyboard shortcuts. On the Desk: ↑/↓ to move, **A** approve, **E** edit, **R** reject, **S** snooze, **C** ask Claire, **F** full-screen Focus.
- **Chat** (top bar) opens a conversation with the team from any page; **Chats** in the sidebar keeps them all. @mention an agent to pick who answers.
- The sun/moon button in the top bar switches between the light (default) and dark themes.
- State is kept in `localStorage`. Reset from the moderator panel.

## Develop

```bash
npm install
npm run dev
npm test
npm run build
```

Vite + React + TypeScript, hand-written CSS tokens (`src/styles/tokens.css`), Radix primitives, `cmdk`. Pushing to `main` deploys to GitHub Pages.

```
src/app        store, reducer, event engine, shell
src/data       seed data and the scripted event feed
src/features   desk, agents, activity, inbox, publishing, insights, listening, strategy, playbook, command, onboarding, moderator, settings
src/ui         primitives and SVG charts
```
