# UI refactor — ledger

Memory of `.claude/loops/ui-refactor.md`. One row per surface. Inventory built 2026-11-27 from the code
(`main.tsx`, `app/Shell.tsx`, `src/features/*`) and PROMPT.md §5–§6.

**Path figures marked `~` are estimated from the code.** Each tick re-measures its surface's goals in the browser
before refactoring and replaces them with measured numbers (screens / clicks / decisions).

Status: `todo` · `in progress` · `done pass N` · `blocked`. Score /5 = clarity of main goal, path length,
scalability at 10× volume, consistency.

## Order of attack (pass 1)

Shared surfaces first (their refactor propagates), then by complexity.

1. `cross-decision`: one Desk-card decision rendered in 7 places → one decision component, one place to decide.
   - 28/11 pass 1: Desk hero removed (the real duplicate). The department « Needs you » rows stay: matrix §12/§14
     want the decision on the row, and they all go through `core/resolve`. Next: one shared row-decision component
     (`publishing/Needs.tsx` NeedRow, `insights` CardDecision, listening rows) — status `todo`.
2. `cross-post-sheet`: two post sheets (Publishing `PostPreview`, Insights `PostSheet`) → one post sheet.
3. `desk`: Detail rendered twice (hero + pane), briefing + triage + KPIs mixed.
4. `inbox-list` + `inbox-conversation-panel`
5. `composer`
6. `clip-editor`
7. `publishing-ideas` + `idea-panel`
8. `listening-needs`
9. `campaign-view`
10. `insights-reports` + `report-view`
11. `listening-mentions`
12. `cross-ask-agent`: 6 ways to ask an agent (⌘K, Chats, Discuss, Ask Atlas/Iris/Juno).
13. `cross-journal`: 4 journal views (bell, Activity, Desk band, profile Record).
14. `cross-labels`: 3 label/tag systems (Inbox, Publishing, Listening).
15. `cross-why`: "Why?" opens either a MoreInfo sheet or an InfoPop.
Then every remaining `todo` row, lowest score first.

## Surfaces

| id | open | main files | jobs mixed | actions at rest | score | status | PR |
|---|---|---|---|---|---|---|---|
| rail | always | app/Shell.tsx | 1 | 11 | – | todo | |
| topbar-crumbs | always | Shell.tsx | 1 | – | – | todo | |
| claire-popover | top bar Claire | Shell.tsx | 1 | 1 | – | todo | |
| notification-center | bell | Shell.tsx | 2 (log, undo) | 12+ | – | todo | |
| command-bar | ⌘K | command/CommandBar.tsx, data/command.ts | 4 (Q&A, brief, nav, agent control) | ~25 | – | todo | |
| shortcut-help | ? | Shell.tsx | 1 | – | – | todo | |
| moderator-panel | ⇧D | moderator/Moderator.tsx | tester only | ~30 | – | todo | |
| moreinfo-sheet / infopop | "Why?" | ui/More.tsx | 1 | – | – | todo | |
| desk | #/ | desk/Desk.tsx, parts, widgets, Detail, Batch | 3 (brief, triage, bulk) | ~12 (Detail ×1, was ×2) | 2→3.5 | done pass 1 (hero) — brief band still todo | desk-one-decision |
| desk-brief-band | Desk top | desk/widgets.tsx | 2 | 11 | – | todo | |
| desk-band-what-they-did | band › What they did | widgets.tsx | 3 | – | – | todo | |
| desk-welcome-day1 | Desk Day 1 | desk/Day1.tsx | 1 | 5 | – | todo | |
| desk-detail-card | select a card | desk/Detail.tsx, parts.tsx | 1 | up to 8 | – | todo | |
| desk-batch | batch row | desk/Batch.tsx | 1 | 2 | – | todo | |
| desk-thread | Detail › Discuss | desk/Thread.tsx | 2 | – | – | todo | |
| desk-done-view | Desk › Done | Desk.tsx | 1 | 1 | – | todo | |
| focus-mode | F / #/focus | desk/Focus.tsx | 1 | 3 + Detail | – | todo | |
| inbox-list | #/inbox | inbox/Page.tsx (835), parts.tsx | 5 (triage, send, routing, moderation, search/views) | ~15 + per row | – | todo | |
| inbox-featured-conv | Inbox › Needs you | inbox/parts.tsx | 1 | 5 | – | todo | |
| inbox-filters-pop | list › Filters | inbox/Page.tsx | 1 | 8 | – | todo | |
| inbox-conversation-panel | #/inbox/:id | inbox/Page.tsx ConversationPanel | 4 | ~14 | – | todo | |
| inbox-contact-tab | panel › Contact | inbox/Page.tsx | 1 | 1 | – | todo | |
| inbox-rules-sheet | ?rules=1 | inbox/RulesSheet.tsx | 1 | 18 | – | todo | |
| inbox-saved-sheet | ?saved=1 | inbox/SavedSheet.tsx | 1 | 5 | – | todo | |
| inbox-labels-sheet | ?labels=1 | inbox/LabelsSheet.tsx | 1 | 5 | – | todo | |
| publishing-ideas | #/publishing | publishing/Page.tsx, Ideas.tsx, Needs.tsx | 3 (approvals, ideas, drafts) | ~20 | – | todo | |
| publishing-drafts | ?show=drafts | Ideas.tsx, Bulk.tsx | 1 | per card | – | todo | |
| idea-panel | #/publishing/ideas/:id | Ideas.tsx IdeaPanel | 3 (review, rewrite, schedule) | ~12 | – | todo | |
| publishing-plan | #/publishing/plan | publishing/Plan.tsx | 1 | 3 | – | todo | |
| publishing-calendar-week | #/publishing/calendar | publishing/Page.tsx Calendar | 3 (plan, notes, suggestions) | 8 + per day | – | todo | |
| publishing-calendar-month | Seg › Month | same | 1 | – | – | todo | |
| publishing-calendar-list | Seg › List | PostTable | 1 | 5 sorts | – | todo | |
| calendar-filters-pop | calendar › Filters | CalendarFilters | 1 | 6 facets | – | todo | |
| posts-bulk-bar + modals | select posts | publishing/Bulk.tsx | 1 | 5 + 4 modals | – | todo | |
| post-sheet | ?post=:id | publishing/Bulk.tsx PostPreview | 4 (approve/fix, results, metadata, comments) | 3–8 | – | todo | |
| composer | #/publishing/new | publishing/Composer.tsx, ComposerParts, Previews | 4 (write, adapt, schedule, route) | 25+ | – | todo | |
| publishing-queues | #/publishing/queues | publishing/QueuesTab.tsx | 1 | per queue | – | todo | |
| publishing-media | #/publishing/media | publishing/Page.tsx MediaLibrary | 1 | 3 + grid | – | todo | |
| media-sheet | media tile | publishing/Page.tsx | 1 | 4 | – | todo | |
| insights-reports | #/insights | insights/Page.tsx, StudioPanels.tsx | 3 (KPIs, anomalies, reports) | ~15 | – | todo | |
| insights-closed-anomalies | ?show=closed | insights/Page.tsx | 1 | 2 | – | todo | |
| insights-report-view | #/insights/reports/:id | insights/Page.tsx ReportView | 4 (read, edit, share, Q&A) | ~12 + 4/section | – | todo | |
| insights-explore | #/insights/explore | insights/Page.tsx Explore | 1 | ~5 | – | todo | |
| insights-post-sheet | Explore › row | insights/Page.tsx PostSheet | 1 (duplicate of post-sheet) | 0 | – | todo | |
| insights-audience | #/insights/audience | insights/AudienceTab.tsx | 1 | per tip | – | todo | |
| insights-roi | #/insights/roi | insights/RoiTab.tsx | 1 | 1 | – | todo | |
| alerts-tab | #/agents/iris?tab=alerts | insights/alerts.tsx | 1 | per rule | – | todo | |
| listening-needs | #/listening | listening/Needs.tsx, Overview.tsx | 5 object kinds | ~15–20 | – | todo | |
| creator-sheet | ?c=:handle | listening/Needs.tsx | 1 | – | – | todo | |
| listening-mentions | #/listening/mentions | listening/Page.tsx Mentions | 4 (browse, route, tag, configure) | ~12 + bulk 5 | – | todo | |
| mention-sheet | mention author | listening/Page.tsx | 1 | ~5 | – | todo | |
| searches-sheet + form | ?searches=manage | listening/Page.tsx | 1 | – | – | todo | |
| mention-tags-modal | Product/tag › Manage | listening/Page.tsx | 1 | – | – | todo | |
| listening-competitors | #/listening/competitors | listening/Page.tsx Benchmark | 1 | 2 filters | – | todo | |
| competitor-profile | …/competitors/profile/:id | listening/Page.tsx Profile | 1 | – | – | todo | |
| competitor-event | …/competitors/:eventId | listening/Page.tsx EventView | 2 | per move | – | todo | |
| competitors-manage | …/competitors/manage | listening/Manage.tsx | 1 | – | – | todo | |
| strategy-campaigns | #/strategy | strategy/Page.tsx (815) | 3 | ~10 | – | todo | |
| strategy-new-brief | #/strategy/new | strategy/Page.tsx NewBrief | 1 | – | – | todo | |
| campaign-view | #/strategy/campaigns/:id | strategy/Page.tsx CampaignView | 3 (approve, monitor, delegate) | ~10 + Move | – | todo | |
| strategy-pillars | #/strategy/pillars | strategy/Page.tsx Pillars | 2 | ± per network | – | todo | |
| video-clips | #/video | video/Page.tsx | 2 | 1–3 per card | – | todo | |
| video-sources | #/video/sources | video/Sources.tsx | 1 | – | – | todo | |
| video-source-detail | #/video/sources/:id | Sources.tsx SourceDetail | 2 | – | – | todo | |
| clip-editor | #/video/clips/:id | video/Editor.tsx (681), Timeline, Player | 4 (trim, design, post, approve) | ~35 | – | todo | |
| video-settings | #/video/settings | video/BrandKit.tsx | 2 | – | – | todo | |
| agents-team | #/agents | agents/Agents.tsx, AgentDecisions.tsx | 2 | 3–4 per request + 6 cards | – | todo | |
| agent-profile | #/agents/:id | Agents.tsx, autonomy.tsx | 3 | Seg per action | – | todo | |
| agents-shared-rules | #/agents/rules | agents/SharedRules.tsx | 2 | ~10 | – | todo | |
| playbook-check-sheet | Shared rules › Check | SharedRules.tsx TryMessage | 1 | 2 | – | todo | |
| agents-escalation | #/agents/escalation | agents/Escalation.tsx | 1 | per rule | – | todo | |
| agents-activity | #/agents/activity | activity/Activity.tsx | 1 | filters | – | todo | |
| chats | #/chats | chats/Page.tsx, Thread.tsx | 2 (Q&A, act on cards) | 2–4 per card | – | todo | |
| settings | #/settings | settings/Page.tsx | 3 tabs | – | – | todo | |
| onb-signup … onb-results | #/onboarding/:step | onboarding/* | 1 per step | – | – | todo | |
| connect-modal | 3 call sites | onboarding/Connect.tsx | 1 | – | – | todo | |

## Cross-cutting duplicates (each is a surface of its own in the order above)

| id | today | candidate direction (to confirm by measurement) |
|---|---|---|
| cross-decision | Same card decision in Desk pane, Desk hero, Focus, post-sheet Ask, Publishing/Insights/Listening Needs rows, Agents Requests | One decision component; department pages link to the Desk or open the same Detail, no re-implemented verbs |
| cross-post-sheet | Publishing `PostPreview` vs Insights `PostSheet` | One post sheet with Overview / Results / Activity tabs |
| cross-ask-agent | ⌘K, Chats, desk-thread, idea-panel dock, report Ask Iris + Studio ask, clip-editor Ask Juno | ⌘K for one-shot, Chats for conversation; in-context asks open the same thread |
| cross-journal | bell, Activity, Desk band, profile Record | Activity is the log; bell = last few + link; band and profile filter Activity |
| cross-labels | Inbox labels, Publishing labels, Listening tags | One label system, one manager |
| cross-why | MoreInfo sheet vs InfoPop | One rule: short definition = popover, reasoning = sheet |
| cross-theme | top bar + Settings | keep one |
| cross-connect | Settings, onb-connect, connect-modal | one connect flow |
| cross-pause-agent | team card, profile, ⌘K action, ⌘K intent | fine as is unless measurement says otherwise |
| cross-pillar-mix | Strategy Overview, Pillars, Publishing Overview, Insights Explore | one owner (Strategy), others summarise + link |
| cross-alert-rules | live in agent profile, raised in Insights/Listening | reachable from where alerts are raised |

## Key user goals (Sam) and current paths

| goal | entry | current path ~ | target |
|---|---|---|---|
| Clear what needs me this morning | Desk | **measured 28/11**: before, 1440×900 showed 2 decision cards, list at 86 % of the fold, keys acted on the lower card; after, 1 card, list from 38 %, keys act on what you see (1 key per decision) | done pass 1 |
| Send Nova's ready replies | Desk or Inbox | 2 competing places (Desk batch vs Inbox state) | one place, 1 click |
| Answer one negative review | Inbox | list → row → panel (~14 actions) → Edit → Send: 4 clicks, 3 decisions | ≤ 3 clicks |
| Reschedule Thursday's post | Publishing | Publishing → Calendar tab → drag (or sheet ⋯ › Reschedule › modal) | 2 steps |
| Approve next week's plan | Desk or Publishing | Desk card or Publishing Needs row → plan page → Approve | 2 clicks |
| Write and schedule a post | Publishing | New post → composer (25+ controls) → When → Primary | fewer controls at rest |
| Know if the campaign works | Strategy | Strategy → campaign card → 9-block page | answer above the fold |
| See how last week went | Insights / Desk | Desk band, Insights Overview, or a report: 3 places | one answer |
| Handle a competitor move | Listening | Listening → Featured or row → event page → counter-move | 2 clicks |
| Ship a clip from a live | Video | Video → clip → editor (~35 actions) → Send to Atlas | review-first, edit on demand |
| Give an agent more autonomy | Desk / Agents | request card on Desk, Agents Team, or profile | one place |
| Add a "never say X" rule | anywhere | 6 sources of rule proposals + Shared rules › Add | one sheet reused everywhere |
| Ask an agent a question | anywhere | ⌘K or Chats or 4 in-context docks | one conversation model |
