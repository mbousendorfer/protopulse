# Text diet — agents, onboarding, shell

Lot: Agents (Team, profiles, Shared rules, Escalation), Activity, Settings, the onboarding v2 and every module's
`PageHead` lede. Rule applied: PROMPT §10 « Le texte se mérite », matrix §12 and §13. Branch
`claude/ui-next-level-text-diet-agents-onboarding-shell`.

## Inventory

Levels: **V** visible · **P** popover (`InfoPop`) · **—** removed because the screen already says it · **R** rewritten
shorter.

| Surface | Block | Before → after | Why |
|---|---|---|---|
| Agents (all tabs) | `PageHead` lede | V → R | One sentence naming what each tab holds. |
| Team › Needs you | « Autonomy requests » hint « Each one comes with its proof. A trial week goes back on its own, with a report. » | V → R « A trial week ends on its own, with a report. » | The proof is already a link on every row. What a trial does is needed to decide « Try for a week », so it stays. |
| Team › Needs you | « Rule proposals » hint « Spotted in your edits. An added rule applies to the next draft. » | V → R « Applies from the next draft. » | Each row already says which edits it was spotted in. |
| Team › Needs you | « Waiting in departments » hint « Decided where they live, with the agent’s draft and its reason. » | V → — | The « Review in Inbox » button on each row says it. |
| Team › Needs you, empty | « 6 of 6 agents on shift. Nova: watching… · Atlas: … » | V → R « 6 of 6 agents on shift. » | Each agent's current task is in the team list right below. |
| Team › Your team | « Shift: Mon – Fri · plans next week on Thursdays » under each agent | V → — on the list | Shown on the profile header (« On shift · Mon – Fri… »), one click away on the agent's name. |
| Profile | `PageHead` lede « Community · Answers comments, DMs and reviews. Hides spam. Fixes orders within limits. » | V → R one sentence | Role rewritten as one sentence in `src/data/agents.ts` (same meaning). |
| Profile › Overview › Waiting in Inbox | Row line « 15 waiting in Inbox, urgent first » | V → — | The group head already says « Waiting in Inbox 15 »; the row leads with the urgent item. |
| Shared rules | Second lede « Your Playbook: what every agent knows about Fernway and how it speaks. Edit anything… » | V → P « What’s the Playbook? » next to the section control | One lede per page. The definition is a popover. |
| Shared rules, profile › Rules | « Used 186 times in 30 days · Onboarding » on each rule | V → V « 186 uses » + P (window and origin) | The metric stays named next to its number; its counting window and the rule's origin are a source, so a popover. A rule added in the last 2 days keeps its origin visible (« Added by you · 2 h ago »). |
| Profile › Rules | Card subtitles « A shared rule changes for every agent that follows it. » / « Products, prices and policies Nova quotes. » | V → — | The edit form already says who else a shared rule changes for; the title says « Facts Nova cites ». |
| Escalation | Card subtitle « Whatever the autonomy, these topics never go out without a human. » | V → R merged into the title « Always raised to a person, whatever the autonomy » | One line instead of two. |
| Activity | `PageHead` lede, 2 sentences | V → R one sentence | — |
| Activity | Rows | 2-line rows → one line with ellipsis; opening the row (already a button) shows the whole sentence, the reason and the rule | A ledger reads as a list (Shopify, Klaviyo, Square). |
| Activity | Entries per day before « Show N more » | 12 → 8 | Four days of 12 rows was half the page; the rest stays one click away. |
| Settings | `PageHead` lede « Accounts your agents use, what pings you, and who approves what. » | V → — | It listed the tabs right below it. |
| Settings › Approver | « Topics that go straight to Claire instead of you. You can still send her any card with “Ask Claire”. » | V → R first sentence | « Ask Claire » is on every card. |
| Onboarding › Connect | Lede, 2 sentences | V → R « Your agents read and reply through your profiles. » | Skipping is the footer's button. |
| Onboarding › Connect | « Not ready to connect a profile yet? Invite up to 3 people… » after a profile is connected | V → changes question: « Someone else manages your other profiles? Invite up to 3 people for free to connect them. » | Fix from the #150 review: the question was wrong once a profile was connected. Before a connection, the product's own copy stays verbatim. |
| Onboarding › Connect (mobile) | « Network sign-ins work best on a computer. We’ll email you a link to finish there. » | V → R second sentence | The title « Connect from your computer » says the first. |
| Onboarding › Playbook source | Lede, 26 words | V → R « We’ll turn your website into a Playbook that keeps every post sounding like you. » | Not in the product's kept labels (onboarding-reality §5a). |
| Onboarding › Interview, Voice, Loading | Ledes of 2 sentences | V → R one sentence | « We started reading fernway.co N min ago » stays (real copy). |
| Onboarding › Playbook recap | Lede « Pre-filled from your website. Edit anything: every agent writes from it. » | V → R one sentence + P « How agents use each answer » | — |
| Onboarding › Playbook recap | 9 card hints (« Posts speak to them first. », « Agents favour angles that serve it. »…) | V → P in « How agents use each answer » | The fields and their labels are Archie's and stay; what each answer does is one click from the lede. Hints that carry a requirement stay: « Optional without a website. », « Optional: your voice profile already says it. », « Agents follow it exactly as written. » |
| Onboarding › Playbook recap | « Competitors · found from your website. Echo watches them for your topic feed. » | V → R « · Echo watches them » + P | Provenance moved to the popover. |
| Onboarding › Playbook recap | « What Nova learned… · in plain words. Untick what’s wrong, click a line to fix it. » | V → R « · untick what’s wrong, click to fix » | The evidence under each line stays: it is what decides keep or untick. |
| Onboarding › Team | Lede, 2 sentences; 6 agent lines (Iris 2 sentences) | V → R one sentence each | Each still says what and when. |
| Onboarding › Team | « Press, legal and safety always come to you, whatever you pick. Agents ask for more autonomy when… » | V (trust) + P « How autonomy grows » | The trust line stays visible (§13 exception); how autonomy grows is a popover. |
| Onboarding › Team › Approver | « You said 3 people or more handle social. Invite the person who signs off on press, legal and budget: agents send those to them. » | V → R « Agents send press, legal and budget to the person you invite. » | « Optional. You can invite them later from Settings. » stays. |
| Onboarding › Results | Lede, 3 sentences | V → R « Nothing goes out without you, and what takes hours says when it lands. » | The trust sentence stays. |
| Onboarding › Results | « Atlas · 3 first drafts » above « Atlas wrote 3 drafts… »; « Draft for Wed 26, 18:30 » above « Schedule for Wed 26, 18:30 » | V → — the repeats | The button says « Schedule » (its accessible name keeps the slot). |
| Onboarding › Results › What takes longer | « In about 2 hours, after the backfill · around 10:12 » | V → R « Around 10:12, after the backfill » | Same facts, the time first. |
| Every module | `PageHead` ledes (Inbox, Chats, Publishing, Insights, Listening, Strategy, Video) | V → R one sentence each | Separate commit, only the `lede` prop changes. |

**Never moved down:** decision rows (title, reason, « See the proof », quick decisions), « Paused », the undo
windows, every named metric (« 92% approved unchanged », « 475 of 523 messages a week on its own », « 186 uses »),
the onboarding trust lines (Reads / Publishes nothing / Never sees your password), the OAuth « This is a test… »
line, the sign-up legal line, « Nothing goes out until you say so », « 16-day trial · Advanced plan », the product's
own labels listed in `onboarding-reality.md`.

## References

Searched on Mobbin (web): agent rules and instructions pages (incident.io Suggestions, Snowflake agent configuration,
Base44 guidelines), activity logs (Shopify store activity log, Klaviyo activity feed, Square activity log, Gumloop,
Basecamp), onboarding « connect your accounts » steps (folk, Attio, Gumloop, Canva).

What we keep from them:
- **Rules lists** (incident.io): one line per rule, a muted second line at most; definitions sit behind an info
  icon next to the label (Snowflake). Here: the rule, who follows it, « N uses », the rest in a popover.
- **Activity logs** (Shopify, Klaviyo, Square): one line per entry with a timestamp, details on open, « Load more »
  rather than long days. Basecamp truncates long entries with an ellipsis.
- **Connect steps** (folk, Attio): a title, one short sentence, three short trust lines, then the buttons. Our
  Connect already had the trust lines; the lede lost its second sentence.

## Density

Measured with `design-plans/text-density.js` at 1440 × 900, light, same filled Day 30 workspace before and after
(Publishing › Queues « Ask Atlas to fill » twice, then from ⇧D: injury, legal threat, « which jacket », compliments,
send window, hook trial, clip that flopped, Echo spike, TikTok audience, Nova's promotion request and step-back, the
three rule proposals). Onboarding: a fresh run, Google sign-up, team of 3-5, Instagram connected, Playbook from the
website, profile voice.

| Screen | words | first screen | > 2 lines | > 25 words |
|---|---:|---:|---:|---:|
| `#/agents` | 471 → 404 | 252 → 224 | 14 | 9 → 6 |
| `#/agents/nova` | 344 → 317 | 220 → 192 | 5 | 3 |
| `#/agents/nova?tab=autonomy` | 215 | 115 | 12 | 0 |
| `#/agents/nova?tab=guardrails` | 61 | 61 | 0 | 0 |
| `#/agents/nova?tab=rules` | 835 → 582 | 163 → 124 | 37 | 28 → 12 |
| `#/agents/nova?tab=escalation` | 92 | 92 | 0 | 0 |
| `#/agents/nova?tab=record` | 177 | 99 | 0 | 0 |
| `#/agents/nova?tab=activity` | 336 | 228 | 0 | 0 |
| `#/agents/atlas` | 286 → 262 | 217 → 193 | 3 | 0 |
| `#/agents/rules` | 613 → 409 | 167 → 127 | 27 | 17 → 6 |
| `#/agents/rules?section=facts` | 519 → 375 | 182 → 146 | 22 | 17 → 7 |
| `#/agents/escalation` | 157 → 146 | 142 → 131 | 9 | 0 |
| `#/activity` | 553 → 375 | 190 → 178 | 1 → 0 | 1 |
| `#/settings` | 119 → 108 | 119 → 108 | 9 | 0 |
| `#/onboarding/signup` signup | 85 | 85 | 0 | 0 |
| `#/onboarding/about` about | 21 | 21 | 0 | 0 |
| `#/onboarding/team-org` team-org | 69 | 69 | 0 | 0 |
| `#/onboarding/connect` connect | 95 → 83 | 95 → 83 | 10 | 0 |
| `#/onboarding/connect` connect-done | 98 → 82 | 98 → 82 | 10 | 0 |
| `#/onboarding/playbook` playbook-source | 59 → 47 | 59 → 47 | 0 | 1 → 0 |
| `#/onboarding/playbook` playbook-voice | 74 → 71 | 74 → 71 | 4 | 0 |
| `#/onboarding/playbook` playbook-recap | 384 → 313 | 135 → 128 | 12 | 0 |
| `#/onboarding/team` team | 210 → 171 | 168 → 142 | 6 | 0 |
| `#/onboarding/results` results | 245 → 219 | 198 → 184 | 9 | 7 |

Notes:
- The « > 25 words » column counts a block's `innerText`, which includes visually hidden labels (each rule's switch is
  labelled « Pause “…rule…” » for screen readers). On the rule lists the remaining hits are rows of about 12 visible
  words plus their switch label. Proposal: count only visible text nodes for that column too.
- Decision rows stay above 2.5 lines by design: title, reason with its proof link, and the decision buttons.
  Agents › Team's first screen (224 words) is the Needs you block: 3 autonomy requests, 2 rule proposals and the
  department rows, each a decision Sam takes there. Nothing left in it can move without hiding a reason or a proof.
- Onboarding › Results keeps 7 blocks over 25 words: Atlas's 3 drafts and Nova's reply are the work itself, shown
  in full so Sam can schedule or send them from this screen.
- Signup, about and team-org are the product's own screens (labels kept verbatim): unchanged.

## Captures

`design-plans/previews/text-agents-onboarding-shell-{before,after}-*`, at 1440 and 375, light and dark: Agents › Team,
Nova's profile, Shared rules (with the « 186 uses » and « What’s the Playbook? » popovers open), Escalation, Activity,
Settings, every onboarding screen (Connect before and after a connection, the recap with « How agents use each
answer » open, Team with « How autonomy grows » open).

## Open

- Iris's and Echo's **Alerts** profile tabs are rendered from `src/features/insights/agent.tsx` and
  `src/features/listening/agent.tsx` (other lots): not touched.
- The Day 1 Desk welcome card and checklist live in `src/features/desk` (desk lot).
- The team list lost its shift line; if testers miss it, it can come back as a popover on « Now ».
- Matrix proposals (not edited here):
  - §13: « A metric's counting window and its source can go in its popover, as long as the metric stays named next
    to its number (“186 uses”). »
  - §13: « A lede that only lists the tabs under it is removed. »
  - §12: « On an agent's profile, a department row leads with its first item; the group head carries the count. »
