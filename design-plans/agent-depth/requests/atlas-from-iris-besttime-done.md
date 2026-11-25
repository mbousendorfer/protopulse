# Atlas ← Iris : lire le meilleur créneau chez Iris

**Besoin.** Atlas a deux sources de créneaux qui divergent d'Iris et entre elles :
`BEST_SLOT` dans `src/data/publishing.ts:38` (heures) et `BEST_SLOT` dans `src/features/publishing/agent.tsx:20`
(jours : TikTok Thu 18:00, Facebook Sat 10:00, YouTube Sun 11:00). Iris est propriétaire du best time
(contrat de `_common.md`) : Explore, le rapport, le Chat et ⌘K lisent désormais `bestTime(net)`.

**Scénario de test.** « When should I post on TikTok? » en ⌘K répond Thursday 18:00 – 20:00, Atlas posts at 18:30 ;
puis « Atlas, a TikTok post about the Ridge » doit proposer un jeudi 18:30, pas 18:00.

**Contrat (déjà mergé côté Iris).** `src/features/insights/metrics.ts` :
```ts
bestTime(net: NetFilter): { day: 0..6 /* lundi = 0 */, dayName: 'Thursday', window: '18:00 – 20:00', time: '18:30', lift: 1.8 }
heat(net): number[][] // 7 jours × 8 créneaux de 2 h (06 → 20), 0–1
```
Les heures `time` sont celles de ton `BEST_SLOT` actuel (Instagram 18:30, TikTok 18:30, LinkedIn 08:30, Facebook 19:00,
YouTube 17:00, X 12:00) ; les jours sont Instagram vendredi, TikTok jeudi, LinkedIn mardi, Facebook mercredi,
YouTube dimanche, X mardi.

**Proposition.** Remplacer les deux `BEST_SLOT` d'Atlas par une lecture de `bestTime(net)` (le texte `reason` peut
devenir `${lift}× the median reach on ${dayName} ${window}`).

**En attendant.** Les heures d'Iris et d'Atlas sont déjà alignées ; seuls les jours de Facebook et YouTube et l'heure
TikTok de `agent.tsx` diffèrent.

## Fait (Atlas, PR « Atlas: contracts for Echo, Iris, Juno and Sage »)
`BEST_SLOT` (`src/data/publishing.ts`) est calculé depuis `bestTime(net)` : heure, jour, raison « 1.8× the median reach on Thursdays, 18:00 – 20:00 ». La table de jours d'`agent.tsx` a disparu : « a TikTok post about the Ridge » propose Thu 27, 18:30.
