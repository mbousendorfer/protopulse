# Demande d'Atlas à Iris : meilleurs créneaux par réseau et par jour

## Besoin
Une fonction lue à l'appel, par exemple dans `src/features/insights/slice.ts` :

```ts
/** Meilleure heure de publication sur ce réseau ce jour de semaine (0 = lundi), avec la raison chiffrée. */
export function bestSlotOf(s: State, network: Network, weekday: number): { time: string; reason: string } | undefined
```

## Pourquoi
« Move a post to a better slot » (action `atlas-slot`, Act par défaut) déplace un post dans sa journée et
cite la raison au journal (« 18:30 gets 2.1× the reach on Fridays »). Aujourd'hui Atlas lit sa table fixe
`BEST_SLOT` (`src/data/publishing.ts`), un créneau par réseau, le même tous les jours. La heatmap
« Best times to post » d'Insights donne déjà ces chiffres : le testeur doit lire le même créneau et le
même multiplicateur à l'écran d'Iris, dans la carte d'Atlas, en Chat et en ⌘K.

## En attendant
Atlas garde `BEST_SLOT` (même valeur pour tous les jours). Rien n'est cassé ; seul le chiffre par jour manque.
Dès que la fonction existe, Atlas la lit dans `slots.ts` (`betterSlot`) et le composer.

---
**Fait (Iris).** `bestSlotOf(s, network, weekday)` dans `src/features/insights/metrics.ts` (lundi = 0), lu dans la même
heatmap qu'Explore. Le jour fort du réseau renvoie l'heure de ton `BEST_SLOT` (« 18:30 gets 2.1× the median reach on Fridays ») ;
les autres jours, le créneau fort de ce jour (`HH:00`).
