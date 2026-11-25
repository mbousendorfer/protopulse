# Composer rework

The "New post" sheet (`/publishing/new`, `/publishing/post/:id`, opened from Drafts, Media, the calendar, ⌘K and
Desk cards). Captures: `design-plans/previews/composer-before-*.png` and `composer-after-*.png`, 1440 × 900 and
375 × 812, light and dark.

## What was wrong

| Problem | Rule or heuristic | Capture |
|---|---|---|
| A flat form where every block weighs the same: no starting point, no sense of order | Krug "Don't make me think"; brief: "un parcours, pas un formulaire" | `before-new-1440` |
| The Playbook check sat at the bottom, out of view; the only blocker shown near Schedule was a count after the click | Nielsen #5 and #9: say what blocks before the click, with the fix | `before-blocked-1440`, `before-multi-1440` |
| Four footer exits, two of them floating blue links, none grouped | §10 one primary per zone; brief: exits grouped and ranked | `before-new-1440` |
| Atlas's slot note in a grey well, the copilot in a box in a corner of the preview column | §10 "Information: jamais de fond ni de bordure"; brief: Atlas next to what it changes | `before-new-1440` |
| Per-network format and first comment far from the preview they change | brief: what differs per network is edited where it is seen | `before-multi-1440` |
| Empty preview: a phone with "No visual" and "Your caption shows here" | brief: the empty state guides | `before-new-1440` |
| Bare `type=date` + `type=time` inputs, centered pillar label | the Idea panel already shows a slot as a sentence with Change | `before-new-1440` |
| Accounts wrap with X alone on a second line; in edit mode five greyed chips at 40 % opacity | §10 AA contrast; no disabled decoration | `before-new-1440`, `before-edit-375` |
| 375: preview pushed below the whole form, four buttons on two rows | §10 responsive: usable at 375 | `before-new-375` |

## The new path

Left column, top to bottom, sections separated by grey-20 rules:

1. **Post to**: the profile toggles (main accounts plus Fernway Repair, from `accounts.ts`), Profile groups as a
   tertiary menu beside the title, and Atlas's routing tip ("Repair content on Instagram goes to Fernway Repair" ·
   Use Fernway Repair) right under them. In edit mode, the post's profile as text, no disabled chips.
2. **Caption**: the field, the pillar on the same line (it shapes Atlas's variants and first comment), then Atlas's
   copilot right under the text (3 variants, Shorten, Adapt for LinkedIn, as tertiary actions), then the live
   Playbook check: each problem with a one-click fix (Remove the banned words, Keep one emoji, Remove emojis,
   Shorten), passing rules ticked, lengths per network on one line. Variants are Choice rows ("Use"), "Keep mine"
   closes them. Every Atlas edit and every fix shows an Undo line. The optional **Link** follows, with Atlas's
   tracking said as information (UTM convention, then per profile: short link, plain link on X, first comment on
   Instagram).
3. **Visual**: larger thumbnail, Pick from Media (the library, plus **Upload**, which the composer lacked), Remove, and
   which networks need a visual.
4. **When**: the slot as a sentence (`Thu 27 Nov, 18:30`, time in mono), **Change** opens the date-time field in a
   popover (the Idea panel's pattern), Atlas's comment on the slot with "Use 18:00" when it would do better, the
   3-a-day cap with "Use <next day with room>", a past time, and the critical-alert pause.

Right column (sticky): the preview is the proof. Network switch when there are several accounts (names up to three,
icons beyond), then that network's settings above the phone: format (Atlas's pick said), "Own caption on LinkedIn"
switch and field, first comment (Atlas's suggestion said). With nothing written and no visual, an empty state
explains what the preview will show instead of an empty phone.

Footer: on the left, a live readiness line ("Ready for Wed 26 Nov, 18:30 on Instagram and LinkedIn", or the first
thing to fix + "Fix", which scrolls to the field and focuses it); on the right, Save draft (secondary, "Move to drafts"
when the post is scheduled), **More ▾** (Ask Claire to approve · Add to next week's plan), and the one primary:
Schedule / Save changes. Delete stays on the left in edit mode (bulk delete keeps its calendar Undo).

At ≤ 820 px the sheet gets **Write / Preview** tabs; the readiness line takes the full width above the actions.
Editing a post that isn't simply scheduled shows its status pill and note or failure reason at the top.

## Removed or moved

- "Per network" fieldset → the preview column, for the network on screen.
- "Customize for X" switches under the caption → "Own caption on X" next to that network's preview.
- Separate "Playbook check · live" section at the bottom → under the caption (caption rules), under Visual (visual),
  under When (cap, past time), summarized in the footer.
- Copilot box under the preview → under the caption.
- Native date and time inputs → slot sentence + Change (one `datetime-local` in a popover, like Ideas and Bulk).
- Check marks inside the account chips → the selected state matches `Filters` (blue border and wash). Six networks
  fit on one row; with Fernway Repair (seven profiles, merged from main during this work) the row wraps once at 1440.
- Atlas's routing and link-tracking notes lose their grey well (§10 Information: no background, no border).
- "Ask Claire" and "Add to plan" as footer buttons → More menu.

Merged from main while this was in review: profiles, profile groups, repair routing and tracked links (Atlas
contracts). They are carried over into the new layout, not redesigned.

Shared code touched: `readImage` moved from `Page.tsx` to `visuals.ts` so Media and the composer upload the same way.
No change to the store, the reducer, the engine, mock data or slice actions.

## Review (ux-heuristics, four scenarios)

- *Instagram + LinkedIn for Thursday evening*: toggle LinkedIn, write, pick a visual, Change the slot, optionally an
  own LinkedIn caption from the preview. Works; the day still goes through the native picker (sev. 2).
- *Take an Atlas idea and schedule it*: ideas schedule from their own panel; a Desk card's "Make a similar post"
  opens the composer pre-filled, the footer says what's missing (TikTok needs a visual) before the click.
- *Fix a post blocked by the Playbook*: the problem is named under the caption with its fix, the footer names it
  again with "Fix"; Undo after each fix. No dead end.
- *Send a sensitive post to Claire*: More ▾ → Ask Claire to approve. One click deeper than before (sev. 2).

## Still open

- Seven profiles wrap to two rows at 1440; a compact chip (icon + short name) or grouping by network would fix it.
- Day shortcuts in When (Atlas's best day this week, tomorrow) would spare the native picker for the common case.
- "Ask Claire" sits in More; if Claire's approval becomes frequent, it may deserve the secondary slot instead of
  Save draft.
- Closing the sheet drops unsaved work without a word (same as before).
- A pre-filled composer doesn't say where it came from (the Desk card URL carries no origin).
- Atlas's slot comment covers the network on screen only; a two-network post gets one network's advice at a time.
