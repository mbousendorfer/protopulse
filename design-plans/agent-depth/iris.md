# Protopulse — profondeur d'agent : Iris (Insights · Reports)

> Lis d'abord `design-plans/agent-depth/_common.md` : contexte, méthode, pitch, circuit Git,
> propriété des fichiers et garde-fous y sont. Ce fichier ne donne que ton périmètre. Port : **5183**
> (`protopulse-iris`). Préfixe de branche et de commit : `iris`.

## Mission
Faire d'Insights l'équivalent agentique des Reports d'Agorapulse : rapports par réseau, par campagne,
par label, rapport community, ROI, audience, benchmark, rapports programmés et partagés. **Iris
calcule, surveille et rédige** ; Sam demande un rapport en une phrase et l'ajuste section par
section. Iris devient **la source unique des chiffres** : le brief, les rapports, Explore, le Chat
et ⌘K citent les mêmes valeurs, lues dans l'état.

Test visé : un SMM qui prépare chaque mois un rapport client dans Agorapulse obtient un rapport
équivalent sans rien construire, et comprend d'où vient chaque chiffre.

## Ce qui existe (inventaire du 25/11/2026 — revérifie)
- `src/features/insights/Page.tsx` : onglets Reports (6 rapports constants, sections citées
  `CitedText`, 2 graphes, Share with Claire simulé par le temps, Download .md, follow-up), Explore
  (période 7/30/90 j, filtre réseau qui **multiplie** par une part fixe `NET_SHARE`, 7 KPI, courbe de
  reach, heatmap best time codée en dur, perf par pilier, table de posts triable avec export CSV,
  lignes non cliquables), Anomalies (ouvertes/fermées, actions groupées, confirmation inline pour
  les euros). Règles d'alerte dans le profil (`src/features/insights/alerts.tsx`).
- `src/features/insights/slice.ts`, `src/data/insights.ts` (KPI fixes × 3 périodes, `DAILY_REACH`
  par formule, 18 posts, 4 piliers, 6 anomalies, 4 règles d'alerte). Aucun test.
- `src/data/agents.ts` (bloc Iris) : brief (Act), rapport hebdo (Draft), anomalies (Act), boost
  (Suggest, verrou) ; budget boost « €580 of €1,500 » en texte.

## À corriger d'abord
1. Les **règles d'alerte ne sont jamais évaluées** ; les anomalies sont des constantes.
2. `insights.boosts` est écrit (`slice.ts`) et lu nulle part ; le budget reste un texte statique.
3. **Chiffres divergents** entre rapport, Chat et ⌘K (reels vs carrousels : `slice.ts` ~l.57,
   `src/features/chats/respond.ts` ~l.45, `src/features/command/CommandBar.tsx` ~l.191 ; best time :
   `slice.ts` ~l.56, `respond.ts` ~l.41, `CommandBar.tsx` ~l.183-185). Une seule fonction, lue partout.
4. `ev-linkedin` est `always: true` : l'autonomie d'Iris est ignorée et aucune anomalie n'est créée.
5. Rapport hebdo en Act : la Phase 0 fait passer la carte par `onResolve` ; vérifie que w47 devient
   partagé.
6. « Skip to tomorrow » n'engendre aucun nouveau brief ni rapport (`REPORTS` constant).
7. Best time ne suit pas le filtre réseau (créneau `[4,6]` et note en dur, `Page.tsx` ~l.179, 220).
8. Types de graphe déclarés et jamais rendus (`'pillars' | 'trail'`, `src/data/insights.ts` ~l.7).
9. Spec §6.4 non livrée : période personnalisée, tri par réseau / pilier / auteur, lignes cliquables.
10. Le partage avec Claire est simulé par le temps au lieu du moteur de Claire (`PROMPT.md` §7.1).

## Backlog d'amorce (à compléter par ton audit de parité)
| Capacité Agorapulse | Version agentique |
|---|---|
| **Données qui vivent** | Les métriques se calculent depuis les posts publiés (Atlas, Juno), les conversations (Nova), les mentions (Echo) ; une série quotidienne par réseau et par compte, pas un multiplicateur |
| **Moteur d'anomalies** | Iris évalue les règles d'alerte au battement de cœur, crée l'anomalie (cause probable, confiance, actions), la remonte selon le cran ; les règles créées par Sam sont évaluées |
| **Rapports générés** | Rapport par réseau, par campagne (avec Sage), par label, période libre ; Iris les rédige depuis l'état, pas depuis des constantes ; le brief du matin et le rapport hebdo se régénèrent au « Skip to tomorrow » |
| **« Report Studio » agentique** | « Iris, a monthly report for Claire on Instagram and TikTok » en ⌘K ou Chat → rapport rédigé ; chaque section se retire, se déplace, se réécrit (« shorter », « add the top 3 posts ») ; modèles sauvegardables |
| **Rapports programmés et partagés** | Planification (hebdo, mensuel), destinataires (Sam, Claire), export PDF simulé et lien de partage en lecture ; en Act, Iris envoie seule et le journal le dit |
| **Rapport community** | Temps de réponse, volumes par type / réseau / membre, SLA tenus, part traitée par Nova seule (lu chez Nova) |
| **Performance par label et campagne** | Posts et conversations par label (Atlas, Nova), campagne vs objectif (Sage) |
| **ROI** | UTM et objectifs GA4 mockés : clics, sessions, conversions, revenu attribué par réseau et par campagne (liens posés par Atlas) |
| **Audience** | Démographie par réseau (âge, genre, pays, villes), croissance des abonnés, heures actives ; Iris en tire des recommandations pour Atlas |
| **Best time** | Calculé par réseau et jour, suit le filtre ; Atlas le lit pour ses créneaux |
| **Boost** | Budget réellement consommé, historique des boosts, résultat mesuré ; garde-fou appliqué (plafond mensuel) |
| **Benchmark dans les rapports** | Section concurrents lue chez Echo (Echo reste propriétaire des données concurrentes) |
| **Posts cliquables** | Ligne de post → panneau d'aperçu d'Atlas avec ses chiffres |
| **Perf des clips** | Vues, rétention, partages des clips de Juno ; Iris renvoie la perf à Juno pour son score |

## Contrats avec les autres agents
- **Source unique des chiffres** : expose des sélecteurs (`reach(period, net)`, `bestTime(net)`,
  `postPerf(id)`, `clipPerf(id)`, etc.). Le Chat et ⌘K (dans ton registre) les appellent ; les autres
  agents aussi. Annonce-les par des demandes `requests/<agent>-from-iris-*.md`.
- **Lis** : posts et liens (Atlas), conversations et temps de réponse (Nova), mentions et concurrents
  (Echo), campagnes et objectifs (Sage), clips (Juno).
- **Fournis** : best time à Atlas, perfs de campagne à Sage (ses KPI bougent), perfs de clips à Juno.

## Scénarios de test à ajouter (PROMPT.md §1)
« Get a monthly report for Claire » · « Why did reach drop on Instagram? » · « Make the report
shorter and add the top 3 posts » · « Send it to Claire every Monday ».
