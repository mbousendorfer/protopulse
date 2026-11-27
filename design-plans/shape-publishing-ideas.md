# Object shape — Publishing › Ideas and Plan review

Matrix §15 pass (Matt, 27/11: « tout ressemble à une liste de tickets »). Scope: Publishing › Ideas (`/publishing`),
the idea panel, Plan review (`/publishing/plan`). Calendar, Composer, Media and Video untouched.

## References (Mobbin, shape only)

| Product | What it shows | Kept |
|---|---|---|
| Buffer › Create › Ideas (gallery) | Ideas as cards, picture on top, title, two lines of text | An idea is a card led by its visual |
| Base44 › Social content | A short strategy overview above per-network post cards (picture, network tag, text, Copy / Edit) | Overview band above the objects; network named on the card; actions on the card |
| Cofounder › Marketing agent | One post preview at real size with batch Approve / Reject next to it | The strongest object set apart, with its decision |
| Klaviyo, Canva › content calendars | The week as seven day columns, compact items | Plan review opens on the week as seven columns of network chips |
| Wix › Marketing plan | A plan as a table grouped by week, every row the same weight | What to avoid: the « list of tickets » Matt rejects |

## Screens

**Publishing › Ideas (landing).** Main object: the idea (a post Atlas proposes). Shape: card grid (§15 « idea, draft
→ card with its visual or network preview, the angle in one line, its proof number, its pillar »).
1. Overview band: this week's posts (published, scheduled) with a seven-day mini chart, the pillar mix against Sage's
   target (small bars with a target tick), Atlas's sentence with its avatar (« 8 ideas, 3 ready to schedule. Community
   is behind target, so 2 of them are Community. »). Nothing from Needs you is repeated.
2. Needs you: the §14 queue (`NeedRow`, Approve N in the head), short: first 4 rows, « Show N more » for the rest.
3. Ideas | Drafts (`Filters`, two values): the featured idea, then the grid, then series.
   - Featured: the strongest idea, set apart as a wide card. Rule: written (ready, slot picked) before new, then a
     moment that ends soon, then a proof from Iris or Echo (a calendar gap is a weaker reason), then confidence. It
     shows the caption word for word and carries the zone's one orange button (« Schedule Tue 25, 18:30 »).
   - Grid: visual (photo, or a miniature of the caption on the network's side when there is no photo), networks,
     angle (title), proof number with the avatar of the agent who found it (Iris, Echo), pillar · slot, then
     Schedule / Draft it, Edit, Not this one ▾ (back tomorrow, or dismiss with a reason). « Schedule N ready » sits
     in the section head (secondary).
   - Series: one wide card per series, its steps as a row of linked tiles (network, step, day, words). No banner.
   - Put away: the card shrinks to its title and « Dismissed · Undo » in place.
   - Drafts: the same card shape (visual, network, words, slot · pillar · author, Schedule), selection kept.
4. Idea panel: kept (why / the post at real size / Ask Atlas). Its footer says « Not this one » like the cards.

**Plan review.** Main object: next week's plan, approved as a set (PROMPT §3.6). Shape: the week first.
- Head: title, version and authors, cadence as network chips (« 5 of 5 »), and the global decision right there:
  Reject · Request changes · Approve plan (12 of 14). The sticky footer is gone.
- Week at a glance: seven day columns, each post a chip (network icon, time; unchecked ones struck). Clicking a chip
  scrolls to its row.
- Then the detailed list by day (checkbox, reason, tag, thumbnail), unchanged.

## What is set apart, and why
- Ideas: the written idea that can be scheduled as is, in one click; urgency first, then the data behind it, then
  confidence.
- Needs you: unchanged order (failed first, then paused, then as raised).
- Plan: the decision itself (approve the set) is at the top, not at the end of a 14-row list.

## Taken from git history
- `ideas-mockup.html` (29f2f8b): each idea an article with its hand-off (« Spotted by Iris → drafted by Atlas »)
  and its proof. Kept: the finder's avatar next to the proof number. Left: the confidence bar and the sources list
  (they stay behind « Why? » in the panel).
- Plan review before #145: seven day columns, but as tall cards whose pills overflowed (P8 of the surface review).
  The columns come back as compact chips only; reading and unchecking stay in the list.

## Still a §14 queue
- Needs you (failed post, paused posts, approvals, send windows, missing visuals, the plan card, questions).
