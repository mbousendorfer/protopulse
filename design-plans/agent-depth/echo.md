# Protopulse — profondeur d'agent : Echo (Listening)

> Lis d'abord `design-plans/agent-depth/_common.md` : contexte, méthode, pitch, circuit Git,
> propriété des fichiers et garde-fous y sont. Ce fichier ne donne que ton périmètre. Port : **5184**
> (`protopulse-echo`). Préfixe de branche et de commit : `echo`.

## Mission
Faire de Listening l'équivalent agentique du Listening et du benchmark concurrentiel d'Agorapulse :
recherches booléennes avec leur flux de résultats, volumes et sentiment dans le temps, share of voice,
alertes de pic, benchmark par réseau, créateurs et influenceurs. **Echo écoute, trie, chiffre et
alerte** ; elle transforme ce qu'elle entend en objets pour les autres (une conversation pour Nova,
une idée pour Atlas, un brief pour Sage, une section pour Iris).

Test visé : un SMM qui suit sa marque et ses concurrents dans Agorapulse retrouve ses recherches,
ses graphes et ses alertes, et voit qu'Echo lui apporte la conclusion plutôt que le flux brut.

## Ce qui existe (inventaire du 25/11/2026 — revérifie)
- `src/features/listening/Page.tsx` : Competitors › Events (fil + page d'événement avec ripostes,
  une Recommended), Benchmark (table statique, barre de share of voice, leçons, top posts concurrents),
  profil concurrent, Mentions (barre de sentiment, filtres, sélection multiple, export CSV réel),
  Trends, Searches (table : créer, éditer, pause, supprimer avec Undo). `Manage.tsx` : gérer les
  concurrents (plusieurs comptes par réseau).
- `src/features/listening/slice.ts`, `src/data/listening.ts` : 4 concurrents (sans séries
  temporelles), 15 événements, 20 top posts (vues en chaîne « 1.2M »), 8 leçons, 50 mentions (pas
  d'URL, de langue, de pays, de recherche d'origine), 8 tendances, 12 recherches (mots-clés en chaîne
  séparée par virgules, volume statique), 3 règles d'alerte, 5 tags fixes. Aucun test propre.
- `src/data/agents.ts` (bloc Echo) : 6 actions ; garde-fous (« 12 recherches actives »,
  « 4 concurrents ») en texte qui ne suit pas l'état.

## À corriger d'abord
1. Le pic négatif (`script.ts`, carte « Negative spike ») a 3 options et **aucun résolveur** :
   Atlas n'est jamais mis en pause. Câbler l'effet (pause des posts du jour, en lien avec Atlas par
   une demande).
2. « Tell sales » part instantanément malgré le cran Draft (`slice.ts` ~l.95-99) : aperçu de l'email
   en Draft, envoi en Act.
3. Agir sur un événement dans Listening ne retire que la carte Peakline (`slice.ts` ~l.143) : les
   cartes Trailkind, Norrø, Basecamp restent sur le Desk.
4. Compteurs faux : ⌘K « 14 negative mentions out of 388 » alors que les données en ont 50 ; Chat
   cite @hugo.rando en négatif alors que sa mention est positive ; les 27 mentions du pic n'existent
   pas ; l'onglet Mentions compte les masquées. Tout chiffre se calcule depuis l'état.
5. Un concurrent ajouté n'a aucune donnée (Benchmark, événements et profil lisent les constantes).
6. Une nouvelle recherche reste « Collecting » pour toujours (volume 0).
7. Le lien du site d'un concurrent est désactivé par `preventDefault` (`Manage.tsx` ~l.40).
8. Les règles d'alerte sont éditables mais jamais évaluées.

## Backlog d'amorce (à compléter par ton audit de parité)
| Capacité Agorapulse | Version agentique |
|---|---|
| **Recherches booléennes** | Requête AND / OR / NOT, guillemets, exclusions, langue, pays, sources (réseaux, web, forums, presse) ; Echo propose et affine la requête (« 30 % of results are about a hiking trail called Ridge : add NOT trail ? ») |
| **Flux par recherche** | Chaque recherche a ses résultats (mentions rattachées), son volume réel, son sentiment ; une nouvelle recherche se remplit progressivement avec le moteur |
| **Séries temporelles** | Volume, reach, sentiment, share of voice dans le temps avec période (7 / 30 / 90 j, libre), par recherche, produit, concurrent |
| **Alertes de pic** | Règles évaluées au battement de cœur (seuil 3× en 1 h du garde-fou) ; Echo remonte le pic avec les mentions qui l'expliquent ; en Act, elle met Atlas en pause et le dit |
| **Benchmark concurrentiel** | Par réseau, avec historique (abonnés, engagement, cadence, formats), nos top posts face aux leurs, rang ; Echo écrit la lecture (« Trailkind gains on TikTok with POV formats ») |
| **Concurrents ajoutés vivants** | Un concurrent ajouté reçoit des données générées crédibles et des événements |
| **Créateurs et influenceurs** | Liste des auteurs influents qui parlent de la marque ou des concurrents (audience, affinité, sentiment, historique) ; fiche ; Echo propose une collaboration (vers Nova pour le contact) |
| **Mention → Inbox** | Une mention qui appelle une réponse devient une conversation chez Nova (contrat d'entrée de Nova), pas une carte Desk |
| **Tags de mentions** | Tags éditables, tagging automatique par Echo (produit, sujet, risque) avec règles |
| **Par produit** | Volume et sentiment par produit Fernway dans le temps ; Echo signale un défaut qui monte (« seams peeling » sur la Storm Jacket) |
| **Digest ventes** | Email aux ventes : aperçu, destinataires, fréquence ; en Draft Sam relit, en Act Echo envoie |
| **Export** | CSV des mentions (existe) + rapport Listening en Markdown |
| **Garde-fous appliqués** | Nombre de recherches actives et de concurrents réels, plafond appliqué à la création |

## Contrats avec les autres agents
- **Envoie** : à Nova des conversations (mentions à traiter), à Atlas des idées (tendances, leçons,
  ripostes en Suggest verrouillé), à Sage des briefs (riposte « Brief Sage »), à Iris la section
  benchmark et le share of voice. Utilise les actions d'entrée publiées par chacun ; s'il en manque
  une, demande-la dans `requests/`.
- **Lis** chez Iris les chiffres de Fernway pour le benchmark (une seule valeur par métrique).
- **Pause d'Atlas** sur pic : demande à Atlas l'action publique « pause du jour » si elle n'existe pas.

## Scénarios de test à ajouter (PROMPT.md §1)
« Track what people say about the Storm Jacket seams » · « Why is negative volume up? » · « How do
we compare with Trailkind on TikTok? » · « Who are the creators talking about Peakline? ».
