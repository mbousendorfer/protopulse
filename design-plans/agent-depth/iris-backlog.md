# Iris — backlog de parité (Insights · Reports)

> Audit du 25/11/2026 sur `origin/main` 73a7ba2. Référence Agorapulse : skill `agorapulse-product`,
> module Analytics (Reports, Report Studio, Competitors, Social Media ROI, Export & Connect, Indicators,
> Scheduled reports). Trié par valeur ; les corrections « À corriger d'abord » passent en tête.
> Statuts : `todo`, `in progress`, `done (PR)`, `later`, `dropped — raison`, `skipped — raison`.

## Corrections d'abord (pas de pitch)

| # | Capacité Agorapulse | État actuel (fichier:ligne) | Version agentique | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| F3 | Un chiffre = une source | Reels vs carrousels : 3 versions (`insights/agent.tsx:71-78` 4,2 % vs 2,9 %, reach 2,4× ; `slice.ts:57` saves 3,4 % vs 1,7 %, reach 1,6×). Best time : `agent.tsx:27` Thu 18:00 TikTok, `slice.ts:56` TikTok 18:30, `Page.tsx:220` Friday en dur. TikTok −38 % « vs 2 970 » (`agent.tsx:47`) mais « vs 9 000 » ailleurs (`data/desk.ts:62`, `slice.ts:55`). (Les lignes `respond.ts`/`CommandBar.tsx` du prompt ont migré dans `insights/agent.tsx` à la Phase 0.) | `metrics.ts` : sélecteurs `bestTime(net)`, `heat(net)`, `formats()`, `tiktokViews()`, `kpis(period, net)` lus par l'écran, le rapport, le Chat, ⌘K et les réponses de suivi | 3 | M | done (#26) |
| F7 | Best time par réseau | Créneau `[4,6]` et note en dur (`Page.tsx:179,220`), heatmap unique `HEAT` (`data/insights.ts:182`) | Heatmap par réseau, meilleur créneau = argmax calculé, la note suit le filtre ; Atlas lit `bestTime(net)` (demande) | 3 | S | done (#26, demande à Atlas) |
| F1 | Indicators (alertes sur variations) | Règles d'alerte jamais évaluées ; `ANOMALIES` constantes (`data/insights.ts:209`) | Anomalies en état ; Iris évalue chaque règle active au battement de cœur contre les séries ; une règle qui se déclenche crée l'anomalie et la remonte selon le cran de `iris-anomaly` | 3 | M | done (#34) |
| F4 | idem | `ev-linkedin` `always: true` (`insights/script.ts:8`) : cran ignoré, pas d'anomalie | Événement `run` : crée l'anomalie, carte en Suggest/Draft, journal + Undo en Act | 3 | S | done (#34) |
| F2 | Paid : budget boost | `insights.boosts` écrit (`slice.ts:76,121`) et lu nulle part ; garde-fou texte « €580 of €1,500 » (`data/agents.ts:91`) ; `h-boost` dit « €920 left » ; le boost du Chat ne passe pas par Iris (`chats/slice.ts:112`) | `boostBudget(s)` calcule l'utilisé depuis `boosts` ; garde-fou affiché calculé et appliqué (un boost au-delà du plafond est refusé avec la raison) ; Undo rend le budget | 3 | S | done (boost PR) |
| F5 | Rapport hebdo en Act | `onResolveInsights` marque w47 partagé (`slice.ts:124`), testé (`reducer.test.ts:223`) | Vérifier en navigateur ; garder le test | 2 | S | done (reports PR) |
| F6 | Rapports réguliers | `REPORTS` constant (`data/insights.ts:21`) ; « Skip to tomorrow » écrit seulement une ligne de journal (`reducer.ts:425`) | Rapports en état ; au changement de jour, `tick` d'Iris écrit le brief du jour (et le rapport hebdo le lundi) depuis les sélecteurs | 3 | M | done (reports PR) |
| F8 | — | Types `'pillars' \| 'trail'` déclarés jamais rendus (`data/insights.ts:7`) | Rendre `pillars` (utilisé par les rapports générés), retirer `trail` | 1 | S | done (reports PR) |
| F9 | Période libre, tri, lignes cliquables (§6.4) | Périodes 7/30/90 seules, tri date/reach/ER/clics, lignes inertes (`Page.tsx:157-185`) | Période personnalisée (dates), tri réseau/pilier/auteur, ligne → panneau d'aperçu du post avec ses chiffres | 2 | M | todo |
| F10 | Partage de rapport | « Seen » simulé par le temps (`Page.tsx:126`) | Le partage passe par le moteur de Claire (`CLAIRE['Weekly report']`, `core/heartbeat`) : sa réponse arrive dans le rapport | 2 | S | done (reports PR) |

## Features (pitch avant construction)

| # | Capacité Agorapulse | État actuel | Version agentique | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| 1 | Données qui vivent (profile reports) | KPI fixes × 3 périodes (`data/insights.ts:98`), `NET_SHARE` multiplicateur, 18 posts d'Iris ≠ posts publiés d'Atlas (`data/publishing.ts:53`) | Séries quotidiennes par réseau ; posts = posts publiés d'Atlas (et clips de Juno) avec leurs `stats` ; un post publié pendant la session entre dans les chiffres | 3 | L | todo |
| 2 | Report Studio (agentique) | 6 rapports constants, aucune édition | « Iris, a monthly report for Claire on Instagram and TikTok » (⌘K, Chat) → rapport rédigé depuis l'état ; chaque section se retire, se déplace, se réécrit (« shorter », « add the top 3 posts ») ; modèles sauvegardables | 3 | L | todo |
| 3 | Scheduled reports, export PDF | Download .md seulement | Planification hebdo/mensuelle, destinataires Sam/Claire ; en Act Iris envoie seule (journal + Undo) ; export PDF simulé (impression) et lien de lecture | 3 | M | todo |
| 4 | Rapport par réseau / campagne / label | Un seul rapport de campagne constant | Iris rédige par réseau, par campagne (lu chez Sage `targetsOf`), par label (posts d'Atlas) | 2 | M | todo |
| 5 | Community management (rapport) | Chiffres Nova recopiés en texte (`data/insights.ts:53`) | Temps de réponse, volumes par type/réseau, part traitée par Nova seule, lus dans `s.inbox` | 2 | M | todo |
| 6 | Social Media ROI | Absent | UTM des liens d'Atlas → clics, sessions, conversions, revenu mockés GA4 par réseau et campagne | 2 | M | todo |
| 7 | Audience | Absent | Démographie par réseau, croissance des abonnés, heures actives ; recommandation à Atlas | 2 | M | todo |
| 8 | Competitors (benchmark) | Texte dans `answer()` (`slice.ts:59`) | Section benchmark lue chez Echo (`s.listening`) dans les rapports | 2 | S | todo |
| 9 | Perf des clips | Absent côté Iris | Vues, rétention, partages des clips de Juno ; renvoi à Juno pour son score | 2 | M | todo |
| 10 | Boost : résultat mesuré | — (le budget est F2) | Historique des boosts avec résultat (reach payé, coût par clic) dans Explore | 1 | S | todo |
| 11 | CSV Builder | Export CSV de la table des posts (`Page.tsx:189`) | — | 1 | — | skipped — l'export CSV d'Explore couvre le besoin du test |
| 12 | Ads reports | Absent | — | 1 | — | skipped — hors périmètre (_common : Paid = boost recommandé par Iris, pas de gestionnaire de campagnes) |
| 13 | Custom branding, timezones | Absent | — | 1 | — | skipped — sans valeur pour un test de 45 min |
