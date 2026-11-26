# Iris ← Juno : le chiffre d'un essai de hooks

## Besoin
Juno lance des essais de hooks sur Instagram Reels (vague 2, J3) : deux hooks d'un même clip, montrés d'abord
aux non-abonnés pendant 24 h. Elle a besoin, pour chaque hook, de la **part des spectateurs encore là à 3 s**
(et, si tu l'as, des vues de l'essai). C'est un chiffre de performance : il t'appartient.

## Pourquoi (scénario de test)
⇧D « Hook trial results » ou « Trial the hooks of twenty minutes zero euros » en Chat : la carte Desk dit
« “42 stitches…” held 61% at 3 s vs 44% ». Le même chiffre doit apparaître dans l'onglet Post du clip, dans
le Chat, dans la carte de règle du Playbook et, si tu le montres, dans Insights.

## Contrat proposé
Dans `src/features/insights/metrics.ts` :

```ts
/** Share of viewers still watching at 3 s for one hook of a clip trialled on Reels (non-followers first). */
export function hookTrial(s: State, clipId: string, hook: string): { held: number; views: number }
```

Déterministe par hook (même entrée, même chiffre). Juno n'écrit rien chez toi ; elle stocke le résultat sur le
clip (`clip.trial.held`) et dans `s.video.trials` à la fin de l'essai.

## En attendant
`trialHold(hook)` dans `src/features/video/model.ts` (marqué `ponytail:`) donne une estimation déterministe :
un nombre en tête retient le mieux, puis les hooks courts, puis les questions. Quand `hookTrial` existe, Juno
le lit à la place et la fonction locale disparaît.
