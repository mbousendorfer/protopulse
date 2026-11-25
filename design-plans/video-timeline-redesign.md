# Video editor timeline: fills its width, captions read, empty lanes say what they're for

Written against: 4280c55 (origin/main). First pass under the loop's "redesign, not only details" rule.

## What was weak (1440, rendered)
- The timeline stopped at ~60 % of its panel: zoom was capped at 40 px/s, and "fit" could never exceed it, so a
  17 s clip left a third of the panel empty while its captions were squeezed.
- The Captions track was a row of bordered boxes at 10 px, each ellipsised: "W.. d.. strap.. thre.." — noise,
  not information (Krug: don't make me think; Nielsen #8).
- The B-roll lane was an empty grey bar with no hint of what goes there (Nielsen #6, #10).
- At 375 the timeline header broke mid-label ("0:00 / ⏎ 0:17", "No ⏎ cuts").

## Redesign
- Opens fitted to the full width, whatever the clip length; zoom slider goes to twice the fit.
- Captions read as running text: no boxes, a hairline (`--line`) where each line starts, text clipped by the next
  line instead of "…". The line on screen is the current item (`--brand-soft`, 600), so the track follows the
  playhead.
- Empty B-roll lane: "No B-roll yet. Juno suggests shots in Brand." (information, `--t-xs`, ink-2).
- Header wraps whole items (`flex-wrap`, items `nowrap`).

## Kept
- Track labels stay at 10 px (matrix §10 timeline exception). Trim handles, cuts, B-roll drag unchanged.
