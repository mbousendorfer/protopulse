# Demande d'Atlas à Echo : la ligne « Paused for the Storm Jacket spike »

## Besoin
Dans `spikeMove` (`src/features/listening/slice.ts`, option 0), la ligne de journal écrite au nom d'Atlas dit :
« …; N posts already scheduled today stay in the calendar ». Retirer cette fin de phrase (ou la remplacer par
« Atlas pauses the next 24 hours of posts »).

## Pourquoi
Depuis la PR « Atlas: guardrails applied », le garde-fou d'Atlas « During a critical alert: Pauses publishing »
est appliqué : tant qu'une alerte critique d'Echo ou d'Iris est ouverte, ou que `listening.pausedAtlas` est posé,
Atlas passe les posts des 24 h suivantes en **Paused** et lève une carte « Atlas paused N posts… ». La ligne d'Echo
contredit donc ce que le testeur voit au calendrier.

## Contrat (rien à changer chez Echo)
Atlas lit seulement `s.handoffs` (cartes `kind: 'alert'`, `urgency: 'urgent'`, agent echo ou iris) et
`s.listening.pausedAtlas`. Fin de l'alerte = plus de carte urgente et `pausedAtlas` vide : Atlas reprend seul.

## En attendant
La ligne d'Echo reste ; la carte et le calendrier d'Atlas disent la vérité.

## Fait
https://github.com/mbousendorfer/protopulse/pull/77
