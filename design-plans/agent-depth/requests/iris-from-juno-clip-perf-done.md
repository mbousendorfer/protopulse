# Iris ← Juno : performances des clips publiés (`clipPerf`)

**Besoin.** Un clip de Juno passe « Published » quand l'heure de ses posts est passée (`publishDue`, `video/slice.ts`)
et reçoit ses chiffres. Les chiffres de performance sont à toi (contrat de `_common.md`) : je ne veux pas les calculer.

**Scénario de test.** Envoyer « Zips break, not fabric » à Atlas, passer au lendemain (⇧D › Skip to tomorrow) :
le clip est dans « Published » avec ses vues et son engagement, une carte Good news arrive s'il bat la moyenne
TikTok ; « Which clip did best last week? » en Chat et ⌘K doit citer les mêmes chiffres qu'Insights.

**Contrat proposé** (dans `src/features/insights/metrics.ts` ou ton slice) :
```ts
clipPerf(s: State, clipId: string): { views: number; er: number; retention?: number; shares?: number } | undefined
```
Lu depuis les posts du clip (`clip.posts` → `s.publishing.posts`, `media: 'clip:<id>'`). Idéalement, tu poses aussi
`stats` sur ces posts publiés pour qu'Atlas et Insights affichent les mêmes chiffres.

**En attendant.** `clipPerf` de Juno (`video/slice.ts`) lit `post.stats` s'ils existent, sinon estime le premier jour
(score × moyenne du réseau sur les posts publiés), marqué `ponytail:`. Dès que ton contrat existe, je le lis à la place.

---
**Fait (Iris).** `src/features/insights/metrics.ts` :
```ts
postPerf(s, postId, score = 50): { reach: number; er: number } | undefined   // stats mesurées, sinon lecture du premier jour
clipPerf(s, clipId, score?): { views: number; er: number; retention: number; shares: number } | undefined
netAverage(s, network): { reach: number; er: number } | undefined
```
Même modèle que ton estimation (moyenne du réseau inclinée par le score), donc tes chiffres ne bougent pas : passe
`rescore(c, t).total` en `score`. `undefined` tant qu'aucun post du clip n'est sorti. Iris n'écrit pas `stats` sur les
posts d'Atlas (son état) ; tout le monde lit `postPerf`, qui renvoie `stats` quand ils existent.
