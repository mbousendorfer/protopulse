# Protopulse — profondeur d'agent : Atlas (Publishing)

> Lis d'abord `design-plans/agent-depth/_common.md` : contexte, méthode, pitch, circuit Git, propriété des
> fichiers et garde-fous y sont, dont le **pitch obligatoire avant chaque nouvelle feature**.
> Ce fichier ne donne que ton périmètre. Port : **5182**
> (`protopulse-atlas`). Préfixe de branche et de commit : `atlas`.

## Mission
Faire de Publishing l'équivalent agentique du Publishing d'Agorapulse : composer multi-profils avec
réglages par réseau, formats natifs, approbations, files et créneaux récurrents, médiathèque, labels
et campagnes, liens suivis, échecs gérés. **Atlas remplit, place, vérifie et répare** ; Sam valide
des plans et des lots, pas des posts un par un.

Test visé : un SMM qui programme habituellement 30 posts par semaine dans Agorapulse retrouve
toutes ses options de publication, et constate qu'Atlas a déjà fait le gros du travail.

## Ce qui existe (inventaire du 25/11/2026 — revérifie)
- `src/features/publishing/` : onglets Ideas (le plus abouti : `Ideas.tsx`, `ideasModel.ts`),
  Calendar semaine / mois / liste (`Page.tsx`, glisser-déposer qui ne change que le jour), Plan review
  (`Plan.tsx`, un seul plan, semaine du 1er décembre), Drafts, Media (grille de 30 images en lecture
  seule), Composer (`Composer.tsx` : 6 réseaux, légende commune + « Customize for X » texte seul,
  une image, pilier, date, check Playbook `checks.ts`, copilote à variantes figées), actions groupées
  et panneau d'aperçu (`Bulk.tsx`), aperçus fidèles (`Previews.tsx`, format déduit d'un préfixe de texte).
- `src/data/publishing.ts` : 35 posts, 14 items de plan, 30 médias, table fixe de meilleurs créneaux.
  Statut `failed` stylé mais jamais attribué. Un compte par réseau.
- `src/data/agents.ts` (bloc Atlas) : 6 actions ; « Move a post to a better slot » (Act) n'a **aucun
  code** ; garde-fous « pause pendant une alerte critique » et « jamais de banque d'images » = texte.
- 27 tests (`slice.test.ts`, `ideasModel.test.ts`, `Previews.test.ts`) ; rien sur Plan review,
  composer, reprogrammation groupée, duplication, chemins Act.

## À corriger d'abord
1. Plan en Act : la Phase 0 fait passer la carte par `onResolve` ; vérifie que le plan devient
   `approved` et que ses posts entrent au calendrier, avec Undo qui les retire.
2. « Fill a slot » en Act résout la carte « visuel manquant » sans visuel : le post reste en Needs you.
   En Act, Atlas choisit un visuel de la médiathèque (règle : jamais de stock) et le dit ; sans visuel
   possible, la carte reste.
3. `ev-x-fail` (« X rejected a post ») : aucun post lié, aucun post `failed` en seed ; Retry /
   Publish without the link / Skip X today ne font rien. Construire le vrai cycle d'échec (voir backlog).
4. « Move a post to a better slot » : à câbler (voir backlog).
5. « I'll upload one » écrit « Drop it in Media » mais Media n'a pas d'upload.
6. Variantes du copilote figées (toujours GR20 / Chamonix, `Composer.tsx` ~l.34-43) : les générer
   depuis le texte, le pilier et le Playbook.
7. Le bandeau « visuel manquant » de Media est codé en dur sur `h-visual` : le généraliser.
8. Reject du plan puis « Ask Atlas for a new plan » restaure les mêmes items.

## Backlog d'amorce (à compléter par ton audit de parité)
| Capacité Agorapulse | Version agentique |
|---|---|
| **Échecs de publication + retry** | Statut `failed` réel avec la cause (token expiré, lien refusé, média trop lourd) ; Atlas retente seul ce qui est sûr (Act), propose le correctif sinon (Desk) ; vue « Failed » et compteur needs-you |
| **Meilleur créneau** | Action « Move to a better slot » câblée : en Act, Atlas déplace dans la journée et le journal dit pourquoi (« 18:30 gets 2.1× the reach on Fridays ») avec Undo ; créneaux par jour de semaine et par réseau lus chez Iris |
| **Composer par réseau** | Par réseau : légende, média, heure, format ; **premier commentaire** ; @mentions et tags produit/personnes ; lieu ; formats explicites (carrousel multi-images, reel, story avec stickers, doc LinkedIn, Short) ; specs TikTok (confidentialité, duet/stitch, couverture) et YouTube (titre, description, tags, catégorie, playlist) ; Atlas pré-remplit tout et signale ce qui viole une spec |
| **Approbations** | Workflow multi-étapes (Sam → Claire → publié), statut « In review » visible au calendrier, commentaires d'approbation, approbation externe par lien simulé ; Atlas route vers Claire ce que le Playbook exige (prix, presse) |
| **Files et créneaux récurrents** | Catégories de contenu (ex. Tips du mardi) et créneaux récurrents ; Atlas remplit la file depuis Ideas et le recyclage, Sam voit la file des 2 semaines à venir |
| **Labels et campagnes** | Labels et campagne éditables sur un post (champs posés en Phase 0), filtres calendrier par label / campagne / pilier / auteur / statut ; Atlas étiquette seul |
| **Liens et UTM** | Champ lien, UTM générés par Atlas selon une convention du Playbook, raccourcissement simulé ; les clics remontent chez Iris |
| **Médiathèque** | Upload (fichier local, comme Juno), dossiers, recherche, tags éditables, droits ; Atlas trie et tagge à l'arrivée, signale les visuels sans droits |
| **Notes et commentaires** | Notes de calendrier par jour (lancement, jour férié), commentaires sur un brouillon avec @mention de Claire ; Atlas lit les notes pour ses suggestions |
| **Fuseaux horaires** | Fuseau par profil, aperçu « 18:30 Paris · 17:30 London » ; Atlas programme à l'heure locale du public |
| **Import CSV** | Import d'un CSV de posts ; Atlas vérifie chaque ligne (Playbook, specs, créneau, doublons) et propose un lot validable |
| **Multi-profils** | Plusieurs comptes par réseau (ex. Instagram Fernway + Fernway Repair), groupes de profils dans le composer |
| **Garde-fous appliqués** | Pause pendant une alerte critique (Echo/Iris) : les posts du jour passent « Paused » avec la raison et une reprise en un clic ; plafond 3 posts / réseau / jour partout, pas seulement dans Ideas |
| **Glisser-déposer** | Changer l'heure en semaine, déplacer en vue mois, Atlas commente le nouveau créneau |
| **Perf d'un post** | Depuis le panneau d'aperçu, ses chiffres et un lien vers Insights (lus chez Iris) |

## Contrats avec les autres agents
- **Lis** piliers, cadence et campagnes chez Sage (source unique posée en Phase 0). Un post de
  campagne approuvée garde `campaignId`, pilier et label.
- **Reçois en posts ou en idées, pas en cartes Desk** : clips de Juno (déjà des posts), tendances et
  leçons d'Echo (→ idées), posts de campagne de Sage (→ calendrier), ripostes concurrentielles
  (→ brouillon verrouillé en Suggest). Publie l'action d'entrée (`publishing/…`) et préviens par une
  demande dans `requests/`.
- **Expose** les posts publiés (lien, UTM, labels, campagne) pour qu'Iris calcule les performances.
- **Lis** chez Iris les meilleurs créneaux ; plus de table fixe dans `publishing.ts` à terme.

## Scénarios de test à ajouter (PROMPT.md §1)
« Fix the post X rejected » · « Add a first comment with the size guide link » · « Send Friday's
post to Claire for approval » · « Fill next week's Tips slots ».
