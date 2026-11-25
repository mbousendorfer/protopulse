# Ideas — plan

Brief: `design-plans/publishing-ideas.md`. Short plan, written after reading the code.

## Model — `src/features/publishing/ideasModel.ts` (pure; `Ideas.tsx` is the screen) + `src/data/ideas.ts` (seeds)

`PublishingState` gets `ideas: Idea[]` and `learned: Record<string, number>` (how many times each redirect chip or
dismiss reason was used, for the rule proposal).

```ts
type IdeaSource = { type: 'analytics' | 'listening' | 'brand' | 'calendar'; agent: AgentId; label: string; proof: string; link: string }
type IdeaDraft  = { network: Network; text: string; media?: string; brief?: string; at: number; format?: string }
type IdeaVersion = { n: number; at: number; mode: 'draft' | 'angle' | 'free' | 'variant' | 'edit'; label: string; note: string; drafts: IdeaDraft[] }
type Idea = {
  id; seed; kind: 'post' | 'series'; title; why; sources: IdeaSource[]; confidence; pillar; networks: Network[]
  action: 'atlas-trend' | 'atlas-recycle' | 'atlas-fill' | 'atlas-competitor' | 'atlas-plan'
  origin: 'continuous' | 'weekly' | 'gap' | 'urgent'; at; expiresAt?; expiry?: string   // "the #GR20 trend dropped 40%"
  status: 'new' | 'drafting' | 'ready' | 'scheduled' | 'snoozed' | 'dismissed' | 'sent-to-sage' | 'expired'
  drafts?: IdeaDraft[]; versions: IdeaVersion[]; steps?: SeriesStep[]       // series: teaser, proof, customer voice, call
  dismissReason?; snoozedUntil?; handoff?; posts?: string[]; campaign?; followsRule?; openedAt?; proposal?: { key; text }
}
```

Pure functions, each tested in `ideasModel.test.ts`:

| Function | Does |
|---|---|
| `spotIdeas(now, posts)` | The demo-load ideas, built from the data, not hard-coded copy: top post above average (Iris `POSTS`, `ANOMALIES`), High-fit `TRENDS` with `fitWhy`, `LESSONS`, positive `MENTIONS` with UGC rights, `FACTS`, the pillar under target (`PILLAR_PERF`), and `calendarGaps()`. Each idea has ≥1 source with a number and a link. |
| `calendarGaps(posts, weekStart, now)` | `recommend()` moved out of `Page.tsx`: future day with < 2 posts, network furthest below `CADENCE`, else the under-target pillar's network. Used by the calendar and by gap ideas. |
| `draftIdea(idea, ctx)` | Text per network, media from `MEDIA` (rights shown) or a visual brief (never stock), the best free slot (`BEST_SLOT`, ≤ 3 posts per network per day), learned rules applied ("Following your rule…"). Never the Ridge 40L, never a `BANNED` word, never a competitor name. |
| `checkPost(text, network, media, rules, words)` | The Composer's Playbook checks, moved out of `Composer.tsx` so both use one function. |
| `applyAngle(idea, chip)` | Shorter · More playful · Customer angle · Repair angle · As a carousel · For LinkedIn. New version + Atlas's sentence on what changed. |
| `applyInstruction(idea, text)` | Free text → a known rewrite, or an honest refusal (price it doesn't have, Ridge 40L, competitor, invented code, banned word, unknown ask). A refusal never creates a version and is never pasted into the caption. |
| `variantsOf(idea)` / `mixVariants(a, b)` | Three variants (hook, format, tone); keep one, or hook of one + body of another. |
| `diffWords(a, b)` | Word diff for the highlighted "what changed". |
| `learn(state, key)` | Same chip or same dismiss reason twice → a rule proposal on the card. |
| `expireIdeas(ideas, now)` / `capIdeas(ideas, incoming)` | Expired ideas leave with their reason; never more than 8 open (Atlas holds the rest back and says so). |

Reducer actions (`publishing/idea*`): `ideaDraft`, `ideaRedirect` (angle / free / variant / edit), `ideaSchedule`
(one or many, snapshot in `publishing.undo` → Undo puts them back in Ideas), `ideaSnooze`, `ideaDismiss` (reason),
`ideaReopen`, `ideaToPlan` (via `addToPlan`), `ideaToSage` (via `briefSage` → campaign in Strategy), `ideaRule`
(accept / decline the proposal, via `addRule`), `ideaOpen`, `ideaArrive` (engine), `askFill` now creates a gap idea.

## Screen — `/publishing/ideas`, first tab

- Atlas's summary sentence, computed ("6 ideas this week, 2 ready to schedule. Community is behind target, so 3 of them are Community.").
- Groups: **Ready to review** · **New ideas** · **Series**. Selection + `BulkBar` ("Schedule 2 ready").
- Card = the "Choice" pattern (white row, grey-20 border, blue border on hover): angle, why, sources (information:
  text + icon, "Spotted by Echo → drafted by Atlas"), confidence, pillar, networks, freshness ("good until Thu").
  Ready cards show a small `NetworkPreview` + media + slot.
- Actions in order: primary (`Schedule` / `Draft it` / `Add to plan` for the weekly batch), `Redirect`, `Not now`,
  `Dismiss` (reason in one click, then `Reopen` "Dismissed · Undo"). Series: `Send to Sage` or `Schedule the series`.
- Detail = side panel like the Inbox (`ib-panel` layout: list left, panel right; stacked at 375): draft per network
  (editable), Playbook checks, slot, the four redirect modes, version history with diff.
- Tab badge = ideas ready to review (`CountBadge needs`), not the total.
- No toast: `Notice scope="publishing"` / `UndoBar` at the top of the list.

## Proactivity — `fire()` + `SCRIPT`

`ScriptEvent` gets `idea?: string`; `fire()` routes those to `arriveIdea()`. Four new events, each in ⇧D:
`ev-idea-signal` (continuous: Iris sees the knots carousel saved again), `ev-idea-weekly` (Thursday batch, 5–8 ideas,
cap respected, can join Plan review), `ev-idea-urgent` (#FirstSnow, window ends tonight → also a Desk "Needs you" card;
settling either side removes the other), `ev-idea-gap` (empty day → gap idea, shown in that calendar cell).
Heartbeat expires and un-snoozes ideas. Autonomy: arrival is always Suggest; drafting follows `atlas-trend` /
`atlas-recycle` / `atlas-fill`; on Act Atlas schedules it and the journal line has a real Undo (`LogEntry.idea`).

## Instrumentation

`ideas/open`, `ideas/redirect {mode}`, `ideas/decision {outcome: as-is | modified | rejected, reason, ms}` via
`track`; counters in ⇧D.

## Out of scope, unchanged

The existing `ev-fill` Desk card and the Composer UI (only its check function moves).

## Définition de fini — état

- [x] Au chargement : 7 idées couvrant les quatre sources (analytics, listening, brand, calendar), 2 prêtes, 1 série,
  1 qui expire bientôt (#GR20, 09:30) ; chaque source a son chiffre et son lien (test `demo load`).
- [x] Les quatre modes de réorientation produisent une version visible avec ce qui a changé (diff surligné, note d'Atlas,
  historique avec retour arrière). Vérifié dans le navigateur et par les tests.
- [x] Deux réorientations identiques → règle Playbook proposée sur la carte ; acceptée, l'idée suivante l'applique
  (« Following your rule… »). Vérifié avec Repair angle puis l'arrivée des « 5 knots ».
- [x] Une idée acceptée devient un post programmé (média avec droits, ou statut Needs you + brief visuel), avec créneau ;
  Undo 10 s la remet dans Ideas. Sur Act, l'Undo du journal fait de même.
- [x] Une série part chez Sage (`briefSage`, chaîne Atlas → Sage) et revient comme campagne dans Strategy, liée depuis l'idée.
- [x] Pendant le scénario : flux (`ev-idea-signal`), Desk urgent (`ev-idea-urgent`, synchronisé dans les deux sens),
  trou du calendrier (`ev-idea-gap`, visible dans la case), lot du jeudi (`ev-idea-weekly`) ; les quatre dans ⇧D.
- [x] 1440 et 375 px, clair et sombre vérifiés dans le navigateur (pas de débordement horizontal) ; vrais liens et boutons,
  menus Radix au clavier, tokens du thème.
- [x] `npx tsc -b`, `npx vitest run` (47 tests), `npm run build` verts.
- [ ] Pas d'audit AA automatisé lancé : contrastes hérités des tokens existants, non mesurés un à un.

Ouvert, volontairement :
- ~~`/publishing` ouvre le Calendar~~ : validé, `/publishing` arrive sur Ideas ; le calendrier est à
  `/publishing/calendar` et tous les liens qui voulaient dire « le calendrier » (journal, Desk, aperçus `?post=`) y pointent.
- La carte urgente arrive sur le Desk dans le lot « N posts to approve » d'Atlas (regroupement existant du Desk), pas
  seule. La sortir du lot est un changement de motif du Desk : à valider avant.
- Annuler la programmation d'une idée urgente la remet dans Ideas mais ne recrée pas sa carte Desk.
- Bug existant, hors périmètre : la démo dit « mardi 25 novembre 2026 », qui est un mercredi. Les jours écrits à la
  main dans les données (« Thu 27 ») ne collent pas au calendrier. Le code des idées calcule la semaine comme le calendrier.
