import type { Agent, AgentAction, AgentId, Autonomy, Network, Risk } from '../app/types'

export const AUTONOMY: Autonomy[] = ['suggest', 'draft', 'act']
export const AUTONOMY_LABEL: Record<Autonomy, string> = { suggest: 'Suggest', draft: 'Draft', act: 'Act' }

export const NETWORK_LABEL: Record<Network, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', facebook: 'Facebook',
  youtube: 'YouTube', x: 'X', google: 'Google Reviews', trustpilot: 'Trustpilot',
}

export const AGENT_INITIAL: Record<AgentId, string> = { nova: 'N', atlas: 'A', iris: 'I', echo: 'E', sage: 'S', juno: 'J' }

const says = (suggest: string, draft: string, act: string) => ({ suggest, draft, act })

export const AGENTS: Agent[] = [
  {
    id: 'nova', unit: 'messages', name: 'Nova', dept: 'Community', route: '/inbox',
    role: 'Answers comments, DMs and reviews. Hides spam. Fixes orders within limits.',
    status: 'on', shift: '24/7', now: 'Watching 8 inboxes',
    record: { handled: 1204, escalated: 61, approvedUnchanged: 92, undone: 7, series: [38, 41, 36, 44, 47, 39, 42, 45, 40, 38, 46, 49, 44, 41, 39, 43, 48, 51, 46, 42, 40, 44, 47, 43, 45, 49, 52, 47, 44, 46] },
    actions: [
      { id: 'nova-faq', perWeek: 189, example: 'Léa asks when her Ridge 28L will ship', label: 'Answer product and shipping questions', risk: 'safe', autonomy: 'act', reviewed: 812, approvedUnchanged: 97,
        says: says('Nova flags the question and suggests an answer. You write the reply.', 'Nova writes the reply and waits for your approval.', 'Nova replies on her own using the Playbook facts. You can undo for 10 minutes.') },
      { id: 'nova-spam', perWeek: 79, example: 'A bot drops a crypto link under your Storm Jacket reel', label: 'Hide spam and bots', risk: 'safe', autonomy: 'act', reviewed: 340, approvedUnchanged: 99,
        says: says('Nova marks likely spam. You hide it.', 'Nova queues spam for a batch review.', 'Nova hides spam on her own. Hidden items stay in the Hidden view.') },
      { id: 'nova-rules', perWeek: 140, example: 'A DM asks for its money back: label it Refund', label: 'Apply Inbox rules (label, assign, hide, review)', risk: 'safe', autonomy: 'act', reviewed: 610, approvedUnchanged: 98,
        says: says('Nova shows which of her rules fit a message. You apply them.', 'Nova lines up what her rules would do. You apply them in one go from Inbox › Rules.', 'Nova applies her rules as messages arrive. Each one is in the journal with Undo.') },
      { id: 'nova-complaint', perWeek: 12, example: 'Tom’s Ridge 28L strap broke after two hikes', label: 'Answer complaints', risk: 'risky', autonomy: 'draft', reviewed: 50, approvedUnchanged: 92,
        says: says('Nova flags the complaint. You handle it from scratch.', 'Nova drafts an apology and a fix, and waits for your approval.', 'Nova answers complaints on her own and applies the fix within her limits.') },
      { id: 'nova-exchange', perWeek: 5, example: 'Inès got her Ember Fleece in M and needs an L', label: 'Send an exchange or a replacement (up to €150)', risk: 'risky', autonomy: 'draft', reviewed: 22, approvedUnchanged: 86,
        says: says('Nova suggests an exchange. You create it in Shopify.', 'Nova prepares the exchange and waits for your approval.', 'Nova creates exchanges up to €150 on her own.') },
      { id: 'nova-refund', perWeek: 7, example: 'Marco’s Summit Bottle arrived two days late', label: 'Refund shipping costs (up to €15)', risk: 'risky', autonomy: 'act', reviewed: 31, approvedUnchanged: 94,
        says: says('Nova suggests a refund. You issue it.', 'Nova prepares the refund and waits for your approval.', 'Nova refunds shipping up to €15 on her own, €300 a day at most.') },
      { id: 'nova-code', perWeek: 4, example: 'A customer of four years is upset about a late order', label: 'Send a discount code (up to 15%)', risk: 'risky', autonomy: 'draft', reviewed: 18, approvedUnchanged: 72,
        says: says('Nova suggests a code. You decide.', 'Nova adds a single-use code to her draft for your approval.', 'Nova sends single-use codes up to 15% on her own.') },
      { id: 'nova-reviews', perWeek: 6, example: 'A 3-star Trustpilot review says the Storm Jacket runs small', label: 'Reply to reviews (Google, Trustpilot)', risk: 'risky', autonomy: 'draft', reviewed: 27, approvedUnchanged: 81,
        says: says('Nova flags new reviews.', 'Nova drafts a public reply for your approval.', 'Nova replies to reviews on her own.') },
      { id: 'nova-links', perWeek: 14, example: '“Which jacket is that?” under your Storm Jacket reel', label: 'Send product links in DM', risk: 'safe', autonomy: 'draft',
        says: says('Nova shows which product they mean. You answer.', 'Nova drafts the public reply and the DM with the product link, and waits for your approval.', 'Nova answers in public and sends the link in DM on her own. You can undo for 10 minutes.') },
      { id: 'nova-holding', perWeek: 6, example: 'A customer threatens legal action in a comment under your reel', label: 'Send holding replies on escalations', risk: 'safe', autonomy: 'draft',
        says: says('Nova suggests a holding reply on each escalation. You send it.', 'Nova drafts the holding reply (in public, “we’ve sent you a DM”, then the DM) and waits for your approval.', 'Nova sends the holding reply herself as soon as she escalates. The answer itself stays yours.') },
      { id: 'nova-sensitive', perWeek: 1, example: 'A journalist asks about a hiker hurt on a trail', label: 'Reply to press, legal, safety or injuries', risk: 'destructive', autonomy: 'suggest', locked: true,
        lockReason: 'Press, legal and safety topics always go through a person.',
        says: says('Nova never replies. She routes the message to you with context and a suggested holding reply.', '', '') },
    ],
    guardrails: [
      { id: 'g1', label: 'Public replies per day', value: '200 max' },
      { id: 'g2', label: 'Quiet hours on LinkedIn', value: '23:00 – 07:00' },
      { id: 'g3', label: 'Refunds per day', value: '€300 max' },
    ],
  },
  {
    id: 'atlas', unit: 'publishing tasks', name: 'Atlas', dept: 'Publishing', route: '/publishing',
    role: 'Plans the week, writes posts, picks slots, recycles winners.',
    status: 'on', shift: 'Mon – Fri · plans next week on Thursdays', now: 'Reworking Friday’s reel caption',
    record: { handled: 96, escalated: 22, approvedUnchanged: 78, undone: 2, series: [3, 4, 2, 5, 3, 1, 0, 4, 3, 5, 4, 3, 1, 0, 3, 4, 4, 5, 3, 1, 1, 4, 3, 4, 5, 2, 1, 0, 4, 3] },
    actions: [
      { id: 'atlas-plan', perWeek: 1, example: 'Thursday: next week has 14 slots to fill', label: 'Build next week’s plan', risk: 'risky', autonomy: 'draft', reviewed: 4, approvedUnchanged: 75,
        says: says('Atlas lists ideas for next week. You build the plan.', 'Atlas builds the whole week and asks you to approve it in one go.', 'Atlas schedules the week on its own. You get a summary on Friday.') },
      { id: 'atlas-slot', perWeek: 9, example: 'Friday’s reel is set for 18:00, your audience peaks at 20:00', label: 'Move a post to a better slot (same day)', risk: 'safe', autonomy: 'act', reviewed: 41, approvedUnchanged: 95,
        says: says('Atlas suggests a better slot. You move the post.', 'Atlas proposes the move for your approval.', 'Atlas moves posts within the same day on its own.') },
      { id: 'atlas-recycle', perWeek: 1, example: 'Last spring’s Ridge 28L packing reel got 3× your usual reach', label: 'Recycle a top post (rewritten)', risk: 'risky', autonomy: 'draft', reviewed: 9, approvedUnchanged: 89,
        says: says('Atlas lists posts worth recycling.', 'Atlas rewrites a past winner and adds it to the plan for approval.', 'Atlas republishes rewritten winners on its own, one per week at most.') },
      { id: 'atlas-trend', perWeek: 3, example: 'A “what’s in my pack” trend is rising on TikTok', label: 'Publish trend posts', risk: 'risky', autonomy: 'suggest', reviewed: 6, approvedUnchanged: 67,
        says: says('Atlas suggests a trend post. You decide whether to write it.', 'Atlas drafts trend posts for your approval.', 'Atlas publishes trend posts on its own, one per day at most.') },
      { id: 'atlas-fill', perWeek: 2, example: 'Wednesday’s LinkedIn slot is still empty', label: 'Fill a slot left empty', risk: 'risky', autonomy: 'draft', reviewed: 7, approvedUnchanged: 86,
        says: says('Atlas tells you a slot is empty.', 'Atlas drafts a post for the empty slot.', 'Atlas fills empty slots on its own from the approved pillars.') },
      { id: 'atlas-retry', perWeek: 1, example: 'X refused a post: its short link looked like a redirect', label: 'Retry a failed post with a safe fix', risk: 'safe', autonomy: 'draft', reviewed: 3, approvedUnchanged: 100,
        says: says('Atlas tells you a post failed and why. You fix it.', 'Atlas prepares the fix and asks before retrying.', 'Atlas retries with the fix on its own and tells you. Fixes that need you, like a reconnection, still come to you.') },
      { id: 'atlas-competitor', perWeek: 1, example: 'Peakline cuts its prices and a reply is tempting', label: 'Publish anything that mentions a competitor', risk: 'destructive', autonomy: 'suggest', locked: true,
        lockReason: 'Naming a competitor in public is always your call.',
        says: says('Atlas drafts it as a suggestion only. You publish it yourself.', '', '') },
    ],
    guardrails: [
      { id: 'g1', label: 'Posts per network per day', value: '3 max' },
      { id: 'g2', label: 'Follows Sage’s pillars and cadence', value: 'Always' },
      { id: 'g3', label: 'Stock photos', value: 'Never' },
      { id: 'g4', label: 'During a critical alert', value: 'Pauses publishing' },
    ],
  },
  {
    id: 'iris', unit: 'reports and alerts', name: 'Iris', dept: 'Insights', route: '/insights',
    role: 'Writes the morning brief and the weekly report. Spots anomalies.',
    status: 'on', shift: 'Brief at 07:00 · report on Mondays 08:00', now: 'Comparing TikTok reach with October',
    record: { handled: 48, escalated: 9, approvedUnchanged: 88, undone: 0, series: [1, 2, 1, 1, 2, 1, 1, 3, 1, 1, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 1, 3, 1, 2, 1, 1, 1, 1, 3, 2] },
    actions: [
      { id: 'iris-brief', perWeek: 7, example: '07:00: the overnight numbers are in', label: 'Write and share the morning brief', risk: 'safe', autonomy: 'act', reviewed: 30, approvedUnchanged: 100,
        says: says('Iris prepares the numbers for your morning.', 'Iris writes the brief and waits before showing it.', 'Iris writes the brief every morning at 07:00.') },
      { id: 'iris-report', perWeek: 1, example: 'Monday: last week’s results, ready for Claire', label: 'Write and share the weekly report with Claire', risk: 'risky', autonomy: 'draft', reviewed: 4, approvedUnchanged: 75,
        says: says('Iris prepares the numbers. You write the report.', 'Iris writes the report and waits for you before sharing it with Claire.', 'Iris shares the report with Claire every Monday on her own.') },
      { id: 'iris-anomaly', perWeek: 2, example: 'TikTok reach dropped 38% over three posts', label: 'Raise anomalies', risk: 'safe', autonomy: 'act', reviewed: 14, approvedUnchanged: 93,
        says: says('Iris lists anomalies in Insights. You decide what to do.', 'Iris brings each anomaly to your Desk with what she’d do about it.', 'Iris does what she’d recommend, like asking Atlas for a post, and tells you in the journal.') },
      { id: 'iris-audience', perWeek: 1, example: 'TikTok is 62% under 25: a brief for Atlas', label: 'Recommend content from the audience', risk: 'safe', autonomy: 'draft', reviewed: 3, approvedUnchanged: 67,
        says: says('Iris shows what the audience wants in Insights. You brief Atlas.', 'Iris drafts a brief for Atlas and waits for you.', 'Iris briefs Atlas on her own and tells you in the journal.') },
      { id: 'iris-boost', perWeek: 1, example: 'Your Ember Fleece reel is beating its average by 4×', label: 'Recommend a paid boost', risk: 'destructive', autonomy: 'suggest', locked: true,
        lockReason: 'Spending money always needs a person.',
        says: says('Iris suggests posts to boost with a budget. You decide.', '', '') },
    ],
    guardrails: [
      { id: 'g1', label: 'Shares reports with', value: 'Sam and Claire only' },
      { id: 'g2', label: 'Boost budget this month', value: '€580 of €1,500 used' },
    ],
  },
  {
    id: 'echo', unit: 'mentions and signals', name: 'Echo', dept: 'Listening', route: '/listening',
    role: 'Watches competitors, mentions and trends. Turns signals into moves.',
    status: 'on', shift: '24/7', now: 'Watching comments on Peakline’s price cut',
    record: { handled: 1830, escalated: 44, approvedUnchanged: 84, undone: 1, series: [52, 61, 58, 66, 70, 55, 49, 63, 68, 72, 65, 59, 51, 48, 66, 71, 74, 69, 62, 54, 50, 67, 73, 78, 70, 61, 57, 64, 76, 81] },
    actions: [
      { id: 'echo-file', perWeek: 140, example: 'A hiker tags Fernway in a summit photo with a Summit Bottle', label: 'Tag and file mentions', risk: 'safe', autonomy: 'act', reviewed: 600, approvedUnchanged: 98,
        says: says('Echo lists mentions in a daily digest.', 'Echo groups mentions into stories for your review.', 'Echo tags, scores and files every mention on its own.') },
      { id: 'echo-events', perWeek: 3, example: 'Peakline cuts the price of its 30L pack by 20%', label: 'Raise competitor events', risk: 'safe', autonomy: 'act', reviewed: 15, approvedUnchanged: 93,
        says: says('Echo lists competitor moves in a weekly digest.', 'Echo asks before raising a competitor move.', 'Echo raises launches, price changes and viral posts as they happen.') },
      { id: 'echo-trend', perWeek: 2, example: 'Do-it-yourself repair videos are rising on TikTok', label: 'Hand a trend to Atlas', risk: 'safe', autonomy: 'draft', reviewed: 8, approvedUnchanged: 75,
        says: says('Echo shows the trend. You decide what to do.', 'Echo asks you before handing a trend to Atlas.', 'Echo hands good-fit trends to Atlas on her own.') },
      { id: 'echo-counter', perWeek: 1, example: 'Norrø launches a lifetime repair programme', label: 'Propose a counter-move to a competitor', risk: 'risky', autonomy: 'suggest', reviewed: 5, approvedUnchanged: 60,
        says: says('Echo suggests counter-moves on each competitor event.', 'Echo prepares the counter-move with the right agent and asks for approval.', 'Echo launches counter-moves on her own.') },
      { id: 'echo-spike', perWeek: 1, example: 'Negative mentions triple in an hour after a shipping delay', label: 'Handle a negative spike', risk: 'risky', autonomy: 'draft', reviewed: 3, approvedUnchanged: 100,
        says: says('Echo notes spikes in the daily digest.', 'Echo raises the spike with three moves and waits for your pick.', 'Echo pauses Atlas and asks Claire for a statement on her own, then tells you.') },
      { id: 'echo-sales', perWeek: 1, example: 'Three retailers ask about the Storm Jacket restock', label: 'Tell the sales team (email digest)', risk: 'risky', autonomy: 'draft', reviewed: 6, approvedUnchanged: 83,
        says: says('Echo suggests what sales should know.', 'Echo drafts the email for your approval.', 'Echo emails the sales team on her own.') },
      { id: 'echo-creators', perWeek: 1, example: 'A hiker with 84k followers posts the Ridge three times, unpaid', label: 'Shortlist creators for a collab', risk: 'safe', autonomy: 'draft', reviewed: 4, approvedUnchanged: 75,
        says: says('Echo shows who talks about you.', 'Echo proposes creators to shortlist; you decide.', 'Echo shortlists good-fit creators on her own. Contacting them stays your call.') },
    ],
    guardrails: [
      { id: 'g1', label: 'Spike threshold', value: '3× usual negative volume in 1 h' },
      { id: 'g2', label: 'Competitors watched', value: '4 of 6: Peakline, Norrø, Trailkind, Basecamp Co.' },
      { id: 'g3', label: 'Active searches', value: '11 of 15' },
    ],
  },
  {
    id: 'sage', unit: 'strategy tasks', name: 'Sage', dept: 'Strategy', route: '/strategy',
    role: 'Turns briefs into campaign plans. Keeps the pillars and the cadence.',
    status: 'on', shift: 'Monthly review on the 1st · campaigns on request', now: 'Tracking Trail Week against its goal',
    record: { handled: 14, escalated: 6, approvedUnchanged: 71, undone: 0, series: [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 1, 0, 1] },
    actions: [
      { id: 'sage-plan', perWeek: 1, example: 'Claire sends the brief for Trail Week', label: 'Turn a brief into a campaign plan', risk: 'risky', autonomy: 'draft', reviewed: 3, approvedUnchanged: 67,
        says: says('Sage suggests an approach. You build the plan.', 'Sage builds the full campaign plan and asks you to approve it.', 'Sage launches campaigns on its own once briefed.') },
      { id: 'sage-cadence', perWeek: 1, example: 'LinkedIn engagement has fallen four weeks in a row', label: 'Adjust cadence when a network underperforms', risk: 'risky', autonomy: 'draft', reviewed: 4, approvedUnchanged: 75,
        says: says('Sage points out cadence problems.', 'Sage proposes a new cadence for your approval.', 'Sage changes the cadence on its own and tells Atlas.') },
      { id: 'sage-reassign', perWeek: 1, example: 'Atlas is behind on Trail Week posts while Echo is free', label: 'Reallocate tasks between agents during a campaign', risk: 'safe', autonomy: 'act', reviewed: 6, approvedUnchanged: 100,
        says: says('Sage suggests who should do what.', 'Sage asks before moving a task to another agent.', 'Sage moves campaign tasks between agents on its own.') },
      { id: 'sage-pillars', perWeek: 1, example: 'Repair content beats every pillar this quarter', label: 'Change the editorial pillars', risk: 'destructive', autonomy: 'suggest', locked: true,
        lockReason: 'Pillars define the brand. Only people change them.',
        says: says('Sage suggests pillar changes with data. You decide.', '', '') },
      { id: 'sage-moments', perWeek: 1, example: 'First snow is due in 3 weeks', label: 'Plan for calendar moments', risk: 'safe', autonomy: 'suggest', reviewed: 0, approvedUnchanged: 0,
        says: says('Sage points out moments worth planning for. You add them.', 'Sage prepares the moment and its ideas, and asks you to add them.', 'Sage adds moments to the calendar and gives Atlas the ideas on its own.') },
    ],
    guardrails: [
      { id: 'g1', label: 'Every campaign has', value: 'One number goal' },
      { id: 'g2', label: 'Active campaigns', value: '2 max' },
    ],
  },
  {
    id: 'juno', unit: 'clips', name: 'Juno', dept: 'Video', route: '/video',
    role: 'Watches your videos and lives, finds the best moments and cuts them into captioned clips.',
    status: 'on', shift: '24/7 · checks YouTube every 15 minutes', now: 'Captioning the Repair Friday live',
    record: { handled: 212, escalated: 31, approvedUnchanged: 74, undone: 1, series: [4, 6, 3, 9, 7, 2, 1, 5, 8, 6, 4, 3, 2, 1, 6, 9, 7, 5, 4, 2, 1, 7, 8, 6, 9, 4, 2, 1, 8, 7] },
    actions: [
      { id: 'juno-clip', perWeek: 2, example: 'A new upload: “Storm Jacket: 3 days of GR20 rain”', label: 'Draft clips from new videos', risk: 'risky', autonomy: 'draft', reviewed: 38, approvedUnchanged: 71,
        says: says('Juno tells you a new video is out and suggests moments. You cut the clips.', 'Juno cuts, captions and frames the clips and asks you to review them.', 'Juno cuts clips from every new video on her own. You still review them before they go to Atlas.') },
      { id: 'juno-captions', perWeek: 9, example: 'Speech-to-text heard “Ridge 28”, the Playbook says Ridge 28L', label: 'Fix captions (product names, Playbook words)', risk: 'safe', autonomy: 'act', reviewed: 64, approvedUnchanged: 97,
        says: says('Juno flags captions that look wrong. You fix them.', 'Juno proposes caption fixes for your approval.', 'Juno fixes product names and Playbook words in captions on her own. You can undo for 10 minutes.') },
      { id: 'juno-reframe', perWeek: 11, example: 'Léa walks out of frame at the sewing machine', label: 'Reframe and apply the brand kit', risk: 'safe', autonomy: 'act', reviewed: 52, approvedUnchanged: 94,
        says: says('Juno suggests a framing and the brand kit on each clip. You apply them.', 'Juno frames each clip and applies the brand kit, and asks you to check it.', 'Juno follows the subject and applies the brand kit on her own.') },
      { id: 'juno-dub', perWeek: 3, example: 'A French version of “The repair follows the bag”', label: 'Translate and dub clips', risk: 'risky', autonomy: 'draft', reviewed: 9, approvedUnchanged: 78,
        says: says('Juno points out the brand kit languages worth making on each clip. You make them.', 'Juno translates and dubs every new clip into your brand kit languages, in the same voice. Each version waits for your review.', 'Juno makes the language versions of every new clip on her own. You can undo for 10 minutes.') },
      { id: 'juno-handoff', perWeek: 6, example: '“Zips break, not fabric” scores 86', label: 'Send her best clips (80+) to Atlas’s calendar', risk: 'risky', autonomy: 'draft', reviewed: 21, approvedUnchanged: 86,
        says: says('Juno tells you a clip is ready. You schedule it yourself.', 'Juno waits for your go before Atlas schedules a clip.', 'Juno sends clips scoring 80 or more straight to Atlas, who schedules them. You can undo for 10 minutes.') },
      { id: 'juno-trial', perWeek: 2, example: '“42 stitches. 20 minutes. €0.” against “This repair cost the owner nothing.”', label: 'Trial hooks before sending', risk: 'risky', autonomy: 'draft', reviewed: 2, approvedUnchanged: 100,
        says: says('Juno says which two hooks to test on each clip. You start the trial on Reels and pick the hook.', 'Juno trials the hooks you ask her to. When the results are in, she asks you to use the winner and send the clip.', 'Juno trials the hooks of her best new clips on Reels, with non-followers first, and puts the winner on. You can undo for 10 minutes.') },
      { id: 'juno-recut', perWeek: 1, example: '“Fabric goes last” got 8.4k views, 14% of your TikTok average', label: 'Recut clips that did worse than usual', risk: 'risky', autonomy: 'draft', reviewed: 0,
        says: says('Juno tells you when a published clip did worse than usual. You recut it from Published.', 'Juno makes a new cut with the product on screen from the first second, and asks you before Atlas posts it.', 'Juno recuts clips that did worse than usual and sends the new cut to Atlas. You can undo for 10 minutes.') },
      { id: 'juno-overdub', perWeek: 1, example: 'Léa said “twenty-eight stitches” where she meant forty-two', label: 'Change words in someone’s voice', risk: 'destructive', autonomy: 'suggest', locked: true,
        lockReason: 'Putting words in someone’s voice always needs a person.',
        says: says('Juno points out a word that could be re-voiced. You decide and confirm.', '', '') },
    ],
    guardrails: [
      { id: 'g1', label: 'Clip length', value: '15–60 s · 90 s on LinkedIn' },
      { id: 'g2', label: 'Captions', value: 'Always on' },
      { id: 'g3', label: 'Brand kit', value: 'On every clip' },
      { id: 'g4', label: 'Clips per video per week', value: '5 max' },
      { id: 'g5', label: 'Guests and customers on screen', value: 'Only with a signed release' },
    ],
  },
]

export type Preset = 'cautious' | 'balanced' | 'autonomous'
export const PRESET_LABEL: Record<Preset, string> = { cautious: 'Cautious', balanced: 'Balanced', autonomous: 'Autonomous' }
/** The one preset rule. Cautious: low risk drafts, the rest suggests. Balanced: low risk acts, the rest drafts. Autonomous: all act. */
export const levelFor = (risk: Risk, p: Preset): Autonomy =>
  p === 'cautious' ? (risk === 'safe' ? 'draft' : 'suggest') : p === 'balanced' ? (risk === 'safe' ? 'act' : 'draft') : 'act'

/** Weekly volume per level. Locked actions always count as Suggest. */
export function weeklyLoad(actions: AgentAction[], levelOf: (x: AgentAction) => Autonomy): Record<Autonomy, number> {
  const out: Record<Autonomy, number> = { suggest: 0, draft: 0, act: 0 }
  for (const x of actions) out[x.locked ? 'suggest' : levelOf(x)] += x.perWeek ?? 0
  return out
}

export const agentName = (id: AgentId | 'claire') => id === 'claire' ? 'Claire' : AGENTS.find(a => a.id === id)!.name
