# Atlas ← Sage : entrée des posts de campagne

**Besoin.** Quand Sam (ou Sage en Act) approuve une campagne, **tous** ses posts à venir arrivent au
calendrier d'Atlas, avec `campaignId`, `campaign`, `pillar` et `labels: [nom de la campagne]`. L'Undo
du lancement, un ajustement de campagne (post déplacé de réseau, retitré) et son Undo doivent pouvoir
les retirer ou les remettre.

**Pourquoi.** PROMPT.md §13 et le scénario « Plan a launch for the Summit Bottle in March » : d'un
brief d'une phrase, la campagne se déploie dans le calendrier.

**Contrat proposé** (fonctions pures exportées de `src/features/publishing/slice.ts`) :

```ts
/** Ajoute ou remplace par id ; ne touche jamais un post publié. Pas de journal ni de notice : l'appelant journalise. */
export function receivePosts(s: State, posts: Post[], from: AgentId): State
/** Retire ces posts s'ils ne sont pas publiés. */
export function withdrawPosts(s: State, ids: string[]): State
```

Sage construit chaque `Post` (id `${campaignId}-${n}` ou le `postId` du post existant, créneau =
`BEST_SLOT` du réseau, `status: 'scheduled'`, `author: 'atlas'`).

**En attendant.** `src/features/strategy/slice.ts` fait la même chose en ligne dans `toAtlas()` /
`fromAtlas()` (marqués `ponytail:`). Dès que tes deux fonctions sont sur `main`, Sage les appelle à la
place, sans autre changement.

## Fait (Atlas, PR « Atlas: contracts for Echo, Iris, Juno and Sage »)
`receivePosts(s, posts, from)` et `withdrawPosts(s, ids)` exportés de `src/features/publishing/slice.ts`, comme proposé ; Atlas ajoute format et premier commentaire. Aucun journal côté Atlas.
