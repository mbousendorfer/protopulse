# Protopulse — profondeur d'agent : Sage (Strategy)

> Lis d'abord `design-plans/agent-depth/_common.md` : contexte, méthode, pitch, circuit Git,
> propriété des fichiers et garde-fous y sont. Ce fichier ne donne que ton périmètre. Port : **5185**
> (`protopulse-sage`). Préfixe de branche et de commit : `sage`.

## Mission
Faire de Strategy la couche qui pilote tous les autres agents, comme les campagnes, labels, piliers
et objectifs le font dans Agorapulse et les outils voisins (Sprout, Later) : un brief devient une
campagne avec objectifs chiffrés, budget, phases et tous ses posts au calendrier ; les piliers et la
cadence que Sage tient sont ceux qu'Atlas applique ; les KPI bougent avec les vrais chiffres d'Iris ;
les tâches avancent quand les agents livrent. **Sage planifie, suit et réajuste** ; Sam valide des
plans et des réajustements, pas des tâches.

Test visé : un SMM qui monte une campagne de lancement voit, d'un brief d'une phrase, une campagne
complète qui se déploie dans le calendrier et se suit d'elle-même.

## Ce qui existe (inventaire du 25/11/2026 — revérifie)
- `src/features/strategy/Page.tsx` : Campaigns (cartes), New brief (texte + budget, chargement en 3
  phases, accessible depuis ⌘K `?brief=&auto=1`), page campagne (Approve / Request changes → v2 avec
  diff / Discard, plan vs actual, ajustements Apply / Decline, recap d'Iris, objectifs, messages,
  phases, posts par phase, tableau « Who does what » glissable, risques), Pillars and cadence (barres
  piliers verrouillées, table de cadence à steppers, propositions de Sage).
- `src/features/strategy/slice.ts`, `src/data/strategy.ts` : 3 campagnes (Trail Week en cours,
  Repair Friday terminée, Gift guide à revoir), 4 piliers, 6 lignes de cadence, 3 propositions ;
  générateur de plan (~l.192-254) qui renvoie toujours les mêmes 10 titres ; v2 par regex. Aucun test.
- `src/data/agents.ts` (bloc Sage) : 4 actions ; « jamais plus de 2 campagnes actives » non appliqué.
- Après la Phase 0 : **Sage est la source unique** des piliers et de la cadence (vérifie le sélecteur
  posé et ce qu'Atlas lit).

## À corriger d'abord
1. Une campagne approuvée n'envoie que son **premier** post à Atlas (`slice.ts` ~l.48-56) ; PROMPT.md
   §13 attend tous les posts au calendrier, avec campagne et pilier.
2. Les propositions de piliers « Apply » ne changent ni cibles ni cadence (`slice.ts` ~l.96-101) ;
   les steppers de cadence n'atteignent pas Atlas (à vérifier après Phase 0).
3. Ajustements de campagne câblés par id (`adj1`, `adj2`, `slice.ts` ~l.109-121) ; un Apply ne
   s'annule pas.
4. Garde-fou « 2 campagnes actives max » non appliqué.
5. Lien « Full recap » codé en dur sur Repair Friday (`Page.tsx` ~l.239) ; option d'objectif de
   Trail Week trouvée par regex sur le titre (`slice.ts` ~l.125-126).
6. Une campagne créée depuis `/strategy/new` n'a pas de carte Desk, celle créée via `briefSage` oui.
7. Les « actual » des piliers sont statiques au lieu d'être calculés depuis les posts.
8. Sage ne répond en Chat qu'aux briefs (pas à « how is Trail Week doing »).

## Backlog d'amorce (à compléter par ton audit de parité)
| Capacité (Agorapulse / Sprout / Later) | Version agentique |
|---|---|
| **Campagne → calendrier** | Tous les posts d'une campagne approuvée arrivent chez Atlas (contrat d'entrée d'Atlas), avec `campaignId`, pilier, label ; Undo retire l'ensemble |
| **Brief complet** | Dates, produit, objectif, audience, budget, réseaux (champs optionnels de §6.6) ; Sage pose les questions manquantes au lieu de deviner |
| **Générateur de plan crédible** | Le plan varie vraiment par produit, objectif, saison et réseaux (phases, formats, messages, cadence), toujours dans les piliers ; v2 qui comprend la demande au-delà d'une regex |
| **Objectifs et KPI vivants** | KPI chiffrés (cible, actuel, tendance) qui bougent avec les données d'Iris ; plan vs actual calculé ; Sage propose un réajustement quand la trajectoire dévie (Desk) |
| **Budget** | Dépensé, engagé, rythme ; boosts d'Iris imputés à la campagne |
| **Piliers éditables** | Ajouter, renommer, repondérer — via proposition verrouillée (Suggest) que Sam valide ; « actual » calculé depuis les posts publiés et programmés |
| **Cadence qui pilote Atlas** | Une cadence modifiée change les suggestions et le plan d'Atlas dès la semaine suivante, et le journal le dit |
| **Tâches qui avancent** | Les tâches du tableau passent à « done » quand l'agent livre (post publié, clip envoyé, rapport partagé) ; réallocation (Act) quand un agent est en pause |
| **Validation par Claire** | Les campagnes au-dessus d'un budget (Playbook) passent par Claire avant lancement |
| **Thèmes de calendrier** | Temps forts et thèmes (Black Friday, première neige, Repair Friday) visibles au calendrier d'Atlas, proposés par Sage |
| **Revue mensuelle du 1er** | Sage livre sa revue (piliers, cadence, campagnes, ce qu'elle propose de changer) ; déclenchable au modérateur |
| **Bilan de campagne** | En fin de campagne, recap rédigé avec Iris, lien vers le vrai rapport |
| **Sage en Chat et ⌘K** | « How is Trail Week doing? », « Is Community behind? » — réponses chiffrées lues chez Iris |
| **Labels de campagne** | Label de campagne partagé (posts d'Atlas, conversations de Nova, rapports d'Iris) |

## Contrats avec les autres agents
- **Propriétaire** de : piliers, cadence cible, campagnes (objectifs, budget, phases, tâches), thèmes.
  Expose des sélecteurs ; Atlas et Iris les lisent. Toute modification passe par tes actions.
- **Envoie** à Atlas les posts de campagne et les thèmes (action d'entrée d'Atlas, demande-la si
  absente).
- **Lis** chez Iris les chiffres (KPI, plan vs actual, boosts), chez Atlas l'état des posts, chez
  Juno les clips envoyés, chez Echo les briefs de riposte reçus.

## Scénarios de test à ajouter (PROMPT.md §1)
« Plan a launch for the Summit Bottle in March » · « How is Trail Week doing? » · « Put more
Community in the mix » · « Ask Claire to approve the Gift guide budget ».
