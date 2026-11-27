# Simplify — Desk, Inbox, Chats

Lot **desk-inbox-chats** of the « grande simplification » pass. Files: `src/features/desk/*`, `src/features/inbox/*`,
`src/features/chats/*`. Measures with `design-plans/text-density.js` at 1440 × 900, Day 30 workspace plus the Nova
events (injury, wrong colour, German warranty, 1-star Google review, buying intent, money-back question): 54 need you
on the Desk, 16 in the Inbox.

## 1. Current map

### Desk `#/` — first screen 204 words, 943 in all, 45 blocks over 2 lines

| Block | Top (px) | Words | Use | Frequency |
|---|---|---|---|---|
| Brief head « Iris wrote your brief · since 18:40 yesterday » + Got it | 101 | 9 | Fold the brief | daily, one click |
| Brief: « Good morning, Sam. » + « 54 things need you. Your agents handled 265 on their own. » + scene | 139 | 14 | Know how much waits | daily |
| Agent grid: 6 tiles, one line each, « Review N » | 272 | 54 | Jump to an agent's items; what each agent did | daily glance; the jump repeats the list, the line repeats Team and Activity |
| Highlights: Iris anomaly, Echo competitor, Atlas weekly plan | 425 | 57 | Open that card in Your day | **duplicate**: the three cards are rows of Needs you / Worth a look |
| Shift board toggle (24 h of agent ticks) | 673 | 5 | Check what the agents did overnight | weekly, rarely |
| Your day: h2, « 1 done », Focus, Filter (agent · type · urgency), 3 tabs, then Waiting on Claire, Later, Done folded under Needs you, keyboard footer | **722** (below the fold) | 337 | Process the day | daily, the reason the page exists |
| Detail pane / batch | 722 | 279 | Decide one card | daily |
| Live feed (9 lines with Undo) + Team (6 agents, « now ») | 1855 | 188 | Undo an autonomous action; who does what | rarely from here (Activity and Agents have both) |

The list that holds the work starts at 722 px: on a 900 px screen Sam sees the brief, never Your day.

### Inbox `#/inbox` — first screen 386 words, 494 in all

| Block | Words | Use | Frequency |
|---|---|---|---|
| PageHead + lede « Nova answers what she can. The rest waits here. » + Saved replies, Rules | 14 | Open the two sheets | weekly |
| Side bar: 6 views + Team (4) + Saved views + By post (4) + Labels (n + Manage) — about 22 entries | 93 | Pick a view | Needs you daily; the rest weekly; Team, By post, Labels are filter shortcuts that repeat the Filters popover (assignee, post, label) |
| List head: Select all, view picker (duplicate of the side bar for narrow screens), search, count, Filters, Sort | 4 | Narrow the list | daily |
| Needs you: 6 groups (Ready to send, One passage to check, Your call, You're replying, Waiting on Claire, With your team), each a header + icon + count + hint, 3 rows then « Show N more » | 377 | Decide each conversation | daily |
| Conversation panel: header, 5 tools (Assign, Sentiment, Mark reviewed, Like, Moderate) + labels, rule suggestion, tabs, thread, draft card with 5 buttons and 2 rows of sources, composer | — | Read, edit, send | daily |

### Chats `#/chats` — first screen 152 words

PageHead + lede « Ask, brief, decide. Nothing goes out without your OK. » + New chat; list of chats; the thread.
Already a two-pane standard; nothing tailored to the demo except the lede.

## 2. Tailored blocks and their standard replacement

| Block | Exists for | Standard pattern |
|---|---|---|
| Desk agent grid (6 tiles) | Showing each agent's night at a glance | The counts go behind « More info » on the one-line header (panel « Your agents since 18:40 »: each agent's line, Shift board, recent actions with Undo). The jump to an agent is the agent `Menu` on the list. |
| Desk highlights (3 hand-picked cards: `h-tiktok`, `h-peakline`, `h-plan`) | **Demo**: three cards chosen by id | Gone. They are rows of the list. |
| Desk « Got it » fold | Folding a 600 px brief | Gone: the header is one line. |
| Desk Shift board toggle | A 24 h chart under the brief | Moves into the header's « More info » panel. |
| Desk Live + Team cards | Agent activity at the bottom | Live moves into the same panel (with Undo); Team is the Agents page (rail). |
| Desk tabs Needs you · Worth a look · Good news + folded sections Waiting on Claire, Later, Done | Three lists plus three sub-lists | One `Filters` row by state with counts, non-empty only: Needs you · Worth a look · Good news · Waiting on Claire · Later · Done (§14). |
| Desk filter menu agent · type · urgency | Narrowing | Agent only, in a `Menu` (§14 second criterion). The list is already sorted by urgency; type is in each row's line. |
| Desk keyboard footer, « Nothing goes out until you confirm » on every card, « Marked: where Nova is unsure… » hint | Explaining keys and trust | Keys sit on the buttons (`kbd`), the `?` sheet lists them all; nothing goes out without a click, which the buttons already say. |
| Desk batch: lanes « Want to buy · Ready · To decide », each with a hint and a « Review » button, a « Review one by one » sheet of `HandoffCard`s, the spam note | A grouped lot | One list of rows with select boxes (ready ones preselected), a `Pill` « Wants to buy » or « Passage to check » only where it differs, each row opening inline as before. « Send N selected » stays the one primary. The sheet and `HandoffCard` go (each row already opens its card); Hidden spam is in Inbox › Hidden. |
| Inbox Needs you groups (6 headers, icons, hints, « Show N more ») | Decision groups (§12) | §14: one list, rows sorted by what they need; a `Pill` when the row isn't a plain « ready to send » (« Your call » + « Why? », « Check a passage », « You're replying »); « Send N » in the list head. |
| Inbox Waiting on Claire, With your team inside Needs you, not counted | Rows that don't need Sam | Their own state « With the team » in the Filters, so Needs you counts what it shows (= rail badge). |
| Inbox view « Nova's drafts » | Drafts only | Gone: they are the Needs you rows without a Pill. `?view=drafts` opens Needs you. |
| Inbox side bar (Team, Saved views, By post, Labels) | Shortcuts | One `Menu` « Views » next to the Filters (the menu narrow screens already used): Team with « N over », saved views, top posts, labels, Manage labels. Deleting a saved view moves to the active-filters line. |
| Inbox panel tools: Sentiment, Like, Moderate as three controls | Moderation | Assign · Mark reviewed · More (sentiment, like, reply in private, spam, ban, delete). |
| Inbox draft card: Send, Edit, Take over, Ask Claire, Hide; « Saved reply » and « Playbook » chip rows | Decisions and sources | Send + Edit visible, the rest in More; sources behind « Why? » next to « Nova's draft » (§13). |
| Inbox post header sentence « Nova answered or hid N on her own. N wait on the team: … » | By post | Title + count; the rows say the rest. |
| Chats lede | — | Gone: the title says it. |

## 3. Answers to the architecture questions

- **Brief vs Your day.** They overlapped: the brief's count is the Needs you count, its three highlight cards are three
  rows of the list, and its agent grid repeats the agent filter, the Team card and Activity. The brief becomes the
  page's header line: « Good morning, Sam. » + « **54** need you. Your agents handled **265** on their own. More info ».
  The panel behind « More info » holds what the brief, the Shift board, Live and Team said about the agents.
- **Three tabs?** No: tabs plus three folded sub-lists were six states in two widgets. One `Filters` row says all six,
  with counts, and hides the empty ones.
- **Inbox side bar.** None. The six views become five states in `Filters` (Needs you · With the team · To review ·
  Handled by Nova · Hidden · All, non-empty only); the rest are filter shortcuts and go in one « Views » menu.
  Needs you and its groups become a §14 list.
- **Chats page?** Yes, keep it. The drawer is for a quick question with the page as context; the page is where past
  conversations and the agents' follow-ups (they mark a chat unread) are found again. Only the lede goes.

## 4. Target map

| Route | Before | After |
|---|---|---|
| `#/` Desk | Brief card (head, hello, 6 tiles, 3 highlights) · Shift board toggle · Your day (3 tabs + 3 sub-lists + filter menu + footer) and detail · Live + Team | Header line (hello, counts, « More info » → agents panel with each agent's line, Shift board, Live) · `Filters` (6 states) + agent `Menu` + Focus · list and detail |
| `#/` Day 1 | Welcome (6 tiles) + checklist | Welcome header line + checklist; the agents' first steps in the same panel |
| `#/focus` | unchanged | unchanged |
| `#/inbox` | Side bar (≈22 entries) · list with grouped Needs you | `Filters` (states) + Views `Menu` · one list (§14) |
| `#/inbox/:id` | 5 tools, 5 draft buttons, 2 source rows | 3 tools, 2 draft buttons + More, sources behind « Why? » |
| `#/chats` | Lede + list + thread | List + thread |

No route disappears. `?view=drafts` (gone) falls back to Needs you; `?view=claire|leo|yanis|mine|negative` keep working
from the Views menu.

## 6. Result (same data, 1440 × 900)

Day 30 workspace, « Ask Atlas to fill » in Publishing › Queues, the six Nova events triggered; before measured on
`origin/main`'s files with the same saved state.

| Route | Words, all | First screen | Chrome on the first screen (not rows) | Where the list starts |
|---|---|---|---|---|
| `#/` before | 683 | 194 | 155 | 722 px (below the fold) |
| `#/` after | 355 | 302 | 39 | 230 px |
| `#/inbox` before | 471 | 367 | 136 (side bar 23 entries, 6 group headers) | — |
| `#/inbox` after | 443 | 369 | 30 | — |
| `#/chats` before | 152 | 152 | — | — |
| `#/chats` after | 143 | 143 | — | — |

The Desk's first screen has more words because it now shows the work: rows of the list instead of the brief.
The Inbox's first screen holds as many words because the list is full width and shows more rows; its chrome drops
from 136 to 30 words.

Captures: `design-plans/previews/simplify-desk-inbox-chats-{before,after}-*.jpg`.

## 5. References

Structure only (Mobbin, web):
- [Expensify inbox](https://mobbin.com/screens/c92ecb8c-de9e-4ad1-b066-a227e43f6950): three chips (All · Unread · To-dos) over one list, the conversation beside it. No side bar of views.
- [Quo inbox](https://mobbin.com/screens/1aa7565e-af8c-40b9-9a71-bded45c330d5): a state menu (Open ▾) then two chips and « Filter »: states and filters in one row above the list.
- [Fresha client messages](https://mobbin.com/screens/bdceb00f-dcbb-48e0-9257-3127a05eaf5d): Open · Closed with counts, list, conversation, contact panel.
- [Remote agent chats](https://mobbin.com/screens/67f953a4-0f17-4d66-845e-a852f336c3de): a Chats page (search, list, New chat) next to an in-page assistant: the page keeps the history.
- Front and Intercom (known): the side bar lists *inboxes* (teams), not states; states (Open · Snoozed · Done) are one switch above the list. Linear's My issues: three tabs and a display menu, no summary sentence.

Takeaway: one row of states above one list, everything else in a menu; a home that opens on the queue, not on a report.
