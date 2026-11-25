# Iris ← Sage : rapport de campagne

**Besoin.** Quand une campagne se termine, Sage écrit son bilan (`recapOf` / `endCampaign`,
`src/features/strategy/slice.ts`) sur la page de la campagne. Le bouton « Full recap » doit ouvrir un
vrai rapport d'Iris sur la campagne (période de la campagne, réseaux de ses posts, objectif vs réel).

**Pourquoi.** Scénario « How did Trail Week go? » → bilan de Sage, puis le rapport complet d'Iris
partageable à Claire (backlog d'Iris : « Rapport par campagne (avec Sage) »).

**Contrat proposé.** Une fonction exportée par Iris, appelée par Sage à la fin d'une campagne :

```ts
/** Écrit le rapport de la campagne (id `campaign-${c.id}`), sans journal ni notice : Sage journalise. */
export function writeCampaignReport(s: State, c: Campaign): State
```

Sage pose alors `reportId: 'campaign-' + c.id` sur la campagne. Lecture côté Iris : `s.strategy.campaigns`
(goal, actual / planned, posts, budget, adjustments).

**En attendant.** Le bilan de Sage est sur la page de la campagne ; « Full recap » n'apparaît que si
`reportId` est posé (Repair Friday seulement).
