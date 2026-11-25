# Echo (Listening) — backlog de parité

> Audit du 25/11/2026 sur `origin/main` 73a7ba2 (Phase 0 mergée). Référence de parité : skill
> `agorapulse-product`, `references/modules/listening.md` et la partie Competitors d'`analytics.md`.
> Trié par valeur ; les corrections « À corriger d'abord » d'`echo.md` passent en tête (pas de pitch).
> Statuts : `todo`, `doing`, `done (PR)`, `later`, `dropped — raison`, `skipped — raison`.

## Corrections (pas de pitch)

| # | Capacité Agorapulse | État actuel (fichier:ligne) | Version agentique | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| C1 | Alerte de pic → action | `listening/script.ts:7` carte « Negative spike », 3 options, aucun résolveur (`slice.ts:275`) | Option 1 : Atlas en pause (statut d'agent, Undo réel) + carte Claire ; option 2 : Nova reçoit une carte de réponse par mention du pic ; option 3 : Echo surveille 2 h et relance. Demande à Atlas pour la pause des posts du jour | 3 | M | done (#33) |
| C2 | Digest ventes | « Tell sales » envoie tout de suite (`slice.ts:95`) malgré `echo-sales` en Draft | Suggest : Echo dit quoi dire ; Draft : carte Desk avec l'email en aperçu, envoi à l'approbation ; Act : envoi direct, ligne au journal sans Undo (un email ne se rappelle pas, dit avant) | 3 | S | done (#38) |
| C3 | Événement réglé partout | `slice.ts:143` ne retire que `h-peakline` | Toute carte Desk dont l'événement est réglé dans Listening est retirée (lien carte ↔ événement par `ref`) | 2 | S | done (#38) |
| C4 | Compteurs calculés | ⌘K « 14 of 388 » (`agent.tsx:19`), Chat cite @hugo.rando en négatif (`agent.tsx:23`), 27 mentions du pic inexistantes, onglet Mentions compte les masquées (`Page.tsx:38`) | Toutes les mentions viennent de l'état (`allMentions(s)`) ; le pic injecte ses mentions ; ⌘K, Chat, onglet et barre lisent les mêmes calculs | 3 | M | done (#33) |
| C5 | Concurrent ajouté vivant | `Page.tsx:190` Benchmark, événements et profil lisent `COMPETITORS` | Un concurrent ajouté reçoit des chiffres générés crédibles (déterministes depuis son nom), une ligne au Benchmark, un profil et un premier événement après le délai annoncé | 2 | M | done (#51) |
| C6 | Recherche qui se remplit | `slice.ts:175` volume 0, « Collecting » pour toujours | Le battement de cœur remplit la recherche (volume qui monte, puis stable) avec des mentions rattachées | 2 | S | done (#45) |
| C7 | Lien du site concurrent | `Manage.tsx:40` `preventDefault` | Lien réel (nouvel onglet) | 1 | S | done (#38) |
| C8 | Règles d'alerte évaluées | `slice.ts:33` éditables, jamais évaluées | Évaluées au battement de cœur sur le flux de mentions ; dépassement → carte Desk (ou carte chez Claire), une fois par fenêtre | 3 | M | done (#45) |
| C9 | Garde-fous qui suivent l'état | `data/agents.ts:117` « 12 » et la liste des concurrents en dur | Valeurs lues dans l'état ; plafond de recherches actives appliqué à la création | 2 | S | done (#45) |

## Features (pitch obligatoire)

| # | Capacité Agorapulse | État actuel | Version agentique | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| F1 | Flux par recherche (Search view) | Searches = table, pas de résultats par recherche | Page de recherche : ses mentions, volume, sentiment, auteurs uniques, 7 j ; Echo résume en tête | 3 | M | done (PR suivante) |
| F2 | Séries temporelles (Volume, Sentiment, Share of voice) | Aucune série ; Benchmark statique | Graphes 7 / 30 / 90 j par recherche, produit, concurrent, avec la lecture d'Echo | 3 | M | dropped — refusé au pitch (sans commentaire) |
| F3 | Recherches booléennes (Advanced query, sources, langue, pays) | Mots-clés séparés par virgules | Requête AND / OR / NOT, sources (réseaux, News, Blog, Forum), langue, pays ; Echo propose d'affiner (« add NOT trail ? ») | 2 | M | todo |
| F4 | Par produit | Filtre produit seulement | Volume et sentiment par produit ; Echo signale un défaut qui monte (Storm Jacket seams) | 3 | S | dropped — refusé au pitch (sans commentaire) |
| F5 | Créateurs et influenceurs | Une carte `h-creator`, liste inexistante | Liste des auteurs influents (audience, affinité, sentiment, historique), fiche, collaboration via Nova | 2 | M | todo (Go) |
| F6 | Mention → Inbox | Une mention devient une carte Desk de Nova | Une mention à traiter devient une conversation chez Nova (contrat d'entrée de Nova) | 2 | S | todo |
| F7 | Benchmark par réseau avec historique | Table 30 j statique | Par réseau, rang, nos top posts face aux leurs, lecture d'Echo | 2 | M | todo |
| F8 | Tags de mentions | 5 tags fixes | Tags éditables, tagging auto par règles (produit, sujet, risque) | 1 | S | todo |
| F9 | Export search (PDF) | CSV des mentions | Rapport Listening en Markdown téléchargé (Echo l'écrit) | 1 | S | todo |
| F10 | Mark as seen / unseen | Aucun | Non vus comptés « needs you » | 1 | S | todo |
| F11 | Search Screening (Topic focus) | Aucun | Echo écarte le hors-sujet et le montre (« 30 % parlent d'un sentier ») — couvert par F3 | 1 | S | todo |
| F12 | Historical data | Aucun | Hors périmètre (pas de backend) ; les séries de F2 donnent 90 j | – | – | skipped — sans objet dans un mock, F2 le couvre |
