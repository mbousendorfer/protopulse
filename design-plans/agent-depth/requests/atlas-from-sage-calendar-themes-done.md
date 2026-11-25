# Atlas ← Sage : temps forts au calendrier

**Besoin.** Les temps forts que Sam (ou Sage en Act) ajoute au calendrier apparaissent sur les jours
concernés du calendrier d'Atlas (semaine et mois) : un bandeau discret « First snow · Sage » qui
renvoie à Strategy.

**Pourquoi.** Feature « Thèmes de calendrier » (Go de l'humain, ≈ Calendar notes d'Agorapulse). Les
idées de chaque temps fort arrivent déjà chez toi par `arriveIdeas(…, 'continuous', 'sage')`.

**Contrat (déjà sur `main`).**

```ts
// src/features/strategy/slice.ts
export const themesOf = (s: State) => { id: string; name: string; start: number; end: number; why: string }[]
```

Seulement les temps forts ajoutés ; `start` / `end` en temps d'app. Lien : `/strategy`.

**En attendant.** Les temps forts se voient dans Strategy › Campaigns › « Moments ahead » (statut,
dates, idées pour Atlas) ; rien n'est affiché au calendrier.

## Fait (Atlas, PR « Atlas: contracts for Juno and Sage (clip versions, moments, open pillars) »)
Les temps forts de `themesOf(s)` s'affichent sur leurs jours, vue semaine (« Black Friday, without the discount · Sage ») et vue mois (compact), avec le pourquoi en infobulle et un lien vers `/strategy`.
