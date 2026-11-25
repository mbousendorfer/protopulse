# Atlas ← Sage : piliers ouverts (ajout, renommage)

**Besoin.** Sam peut ajouter et renommer un pilier dans Strategy (feature « Piliers éditables », Go de
l'humain). Aujourd'hui `Pillar` (`src/data/publishing.ts:4`) est une union fixe de 4 noms, et plusieurs
tables d'Atlas et de Juno sont des `Record<Pillar, …>` (`copilot.ts` HOOK, `ideasModel.ts`
PILLAR_NETWORK / OPENER / GENERIC_HOOKS, `visuals.ts` PILLAR_TAGS) : un pilier nouveau ou renommé y
donnerait `undefined`.

**Pourquoi.** Scénario « Add a Gift ideas pillar at 10% » : Atlas doit le proposer au Composer, dans
Ideas et au Plan, avec une accroche par défaut.

**Contrat proposé.**
- `export type Pillar = string` (ou `BasePillar | (string & {})`), les tables gardent leurs 4 clés.
- Chaque lecture `TABLE[pillar]` a un repli : la famille du pilier, que Sage expose :
  `pillarBase(s, name): BasePillar` dans `src/features/strategy/slice.ts` (un pilier ajouté déclare la
  famille dont il hérite ; un pilier renommé garde la sienne).
- Renommage : Sage renomme aussi le `pillar` des posts d'Atlas (via `receivePosts`, cf. la demande
  `atlas-from-sage-campaign-posts.md`).

**En attendant.** Strategy permet de repondérer les 4 piliers et d'éditer leur description ; l'ajout
et le renommage n'apparaissent pas dans l'UI tant que ce contrat n'est pas sur `main`.

## Fait (Atlas, PR « Atlas: contracts for Juno and Sage (clip versions, moments, open pillars) »)
`Pillar = BasePillar | (string & {})` dans `src/data/publishing.ts`. Les tables d'Atlas gardent leurs 4 clés et lisent `pillarFamily(p)` (famille déduite du nom : « Gift ideas » → Gear that lasts). Quand tu exposes `pillarBase(s, name)`, remplace le corps de `pillarFamily` ou appelle-la : un seul endroit.
