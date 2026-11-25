# Desk batch: one grouped list instead of lane cards + a mixed list

Written against: 73a7ba2 (origin/main, PR #21 phase-0 registry). Redesign pass (loop rule "redesign, not only details").

## What was weak (rendered, Nova's batch, 1440)
- The sentence says "Nova sorted them: buying questions first, then the replies she's sure of, then the ones to
  check", but the list interleaved "to decide" and "reply ready" rows. What the agent says and what you see disagreed
  (PROMPT §3.2 "tout s'explique", Nielsen #4).
- Four equal lane cards (Leads 0 · Ready 4 · To decide 2 · Spam 5) repeated that grouping above the list, one of them
  empty, and pushed the list and its single primary below the fold.
- Each row repeated its group in faint text ("reply ready", "to decide").

## Redesign
- One list, grouped in the announced order: Want to buy → Ready → To decide (Atlas: Ready → To decide; rules:
  Proposed). Empty groups don't show. Group heading 13 / 600 / ink-2 (matrix §2) with its count, a one-line note,
  and "Review one by one" (opens the existing review sheet on that group).
- Ready rows start selected, so the checked block is exactly the Ready group.
- Spam becomes one line of information: "Nova also hid 5 spam on her own (set to Act). See them".
- Rows keep only what the group doesn't say (network for posts). Sheet tab "Leads" → "Want to buy", like the meta.
- At ≤520 px the note hides; labels never break.

## Kept
- One primary (footer, acts on the selection), row expand with preview and Detail, the review sheet, Inbox link.
