# Echo ← Iris : la ligne « Fernway » du benchmark vient d'Iris

**Besoin.** `FERNWAY_ROW` (`src/data/listening.ts:22`) recopie des chiffres de Fernway (abonnés 120 000, croissance 2,1 %,
engagement 3,1 %). Les chiffres de performance de Fernway sont à Iris (contrat de `_common.md`). Iris les expose :

```ts
// src/features/insights/metrics.ts
fernwayRow(): { name: 'Fernway'; followers: number; growth: number /* % par semaine */; er: number }
```

Abonnés = somme de l'onglet Audience (120 000, aligné sur ta valeur) ; croissance = nouveaux abonnés 7 jours d'Explore
(2 140) sur la base de la semaine, soit 1,8 % ; engagement = Explore 7 jours (3,1 %).

**Scénario de test.** Le benchmark de Listening › Competitors et la section Benchmark d'un rapport d'Iris
(« add the benchmark ») doivent montrer la même croissance pour Fernway. Aujourd'hui : 2,1 % chez toi, 1,8 % chez Iris.

**Proposition.** `{ ...FERNWAY_ROW, ...fernwayRow() }` dans ta page ; garde `cadence` et `formats`, qui ne sont pas les miens.

**En attendant.** Iris affiche ses propres chiffres pour Fernway et lit les tiens pour les concurrents et la part de voix.
