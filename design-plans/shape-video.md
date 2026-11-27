# Object shape — Video (Clips, Sources, settings, editor head)

Matrix §15 pass. Matt, 27/11: Ideas, Insights, Strategy, Listening and Agents moved; « sauf pour Inbox et Vidéo, qui
n'ont pas vraiment bougé ». Video › Clips was a §14 list of rows with a 40 px vertical thumbnail: a text queue, not a
video tool. Scope: `src/features/video/*` only.

## References (Mobbin, shape only)

| Product | What it shows | Kept |
|---|---|---|
| YouTube › Shorts shelf | 9:16 tiles, the frame carries the weight, title in two lines, views under | A clip is a vertical tile led by its frame |
| YouTube › home grid | 16:9 thumbnails, length badge bottom right, channel and date in one line | A source video is a 16:9 card, length on the frame, one meta line |
| Substack › Media settings › Clips | Portrait clip at size, its actions under it (Download, Share, Edit) | Actions in the card's foot, never over the picture |
| Grain › Clip library | Clip thumbnail with its length, the quote next to it | The hook in quotes is the clip's caption |
| Opus Clip (public product) | Grid of vertical clips with a virality score badge on the frame | The score as a named badge on the frame (« Virality 81 ») |

## Screens

**Video › Clips (landing).** Main object: the clip. Shape: thumbnail grid (§15 « clip → thumbnail grid »).
1. Overview band (above the filters): Juno's sentence with her avatar (how this week's best clip did against the
   network's average), clips ready and from how many videos, views of the clips published in the last 7 days with a
   sparkline, the best published clip (frame and views), and what Juno is cutting now with its progress bar.
2. Filters by state (unchanged: Needs you · Being made · On trial · Later · Sent · Published) and the video menu.
3. Needs you:
   - New videos (Make clips / Retry, Upload instead) and clips that did worse than usual (Below usual · Why? · Recut)
     as small action cards in one row at the top.
   - Set apart: the clip to send first (the first clip Juno would send: vetted, best score first), a wide card with its
     frame large, the hook, its proof (the hook trial it won, else the number that justifies the moment), and the
     zone's only orange button « Send N to Atlas ». Review and Not now beside it.
   - The other clips as a grid of 9:16 cards: frame with length and the Virality badge, the hook in two lines, network
     icons, a status `Pill` only when it differs from the filter (Held, Next week) with « Why? », Review / Not now in
     the foot (Release signed on a held clip). Select box on the frame on hover, always visible once one is checked;
     BulkBar above the grid (Send N to Atlas, Not now).
4. Other filters: the same card, its foot changes (trial results and Stop the trial, Send to Atlas from Later, the
   scheduled slot when Sent, views and engagement when Published, the recut link). Being made shows source cards.

**Video › Sources.** Main object: the source video. Shape: grid of 16:9 cards (poster, length on the frame, title,
channel and date, state: « N clips ready » linking to its clips, Being made with phase and progress bar, Failed with
Why? and Retry, New with Make clips). Add a video stays at the top.

**Source detail.** Unchanged layout (player, Find clips about…, people on screen, transcript); its clips are added as
a row of vertical tiles under the player, so the video shows what came out of it.

**Video settings.** The sheet opens on a live preview of a clip as the kit makes it (caption style and colour, logo,
progress bar) next to Watching; the settings follow.

**Clip editor.** Not redone. Head harmonised with the cards: a held clip shows Held · Why? and Release signed right
there; a clip that did worse than usual shows Below usual · Why? and Recut.

## What is set apart, and why
- Clips: the best clip Juno would send now (`vetClips(...).go[0]`: no hold, best score first). Its proof is the reason.
- Small action cards before it: a new video and a flop each need a gesture today and would otherwise get lost.

## Taken from git history
- Before #164 (`e84a5f7`, quality pass) Video › Clips used `ClipThumb size="md"/"lg"` and per-source groups. Kept: the
  large frame; left: the groups (§14 still bans demo-only sub-groups).

## Still a §14 queue
- Nothing in Video is a pure queue any more: Needs you is a filter of the grid, its few non-clip items are small action
  cards.
