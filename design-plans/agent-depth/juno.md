# Protopulse — profondeur d'agent : Juno (Video)

> Lis d'abord `design-plans/agent-depth/_common.md` : contexte, méthode, pitch, circuit Git,
> propriété des fichiers et garde-fous y sont. Ce fichier ne donne que ton périmètre. Port : **5186**
> (`protopulse-juno`). Préfixe de branche et de commit : `juno`.

## Mission
Faire de Video l'équivalent agentique des outils de clipping (Opus Clip, Descript) branchés sur la
publication d'Agorapulse : chaque clip existe en une version par réseau qui respecte ses specs,
a sa couverture, ses sous-titres, sa langue, et revient avec ses performances pour que Juno apprenne
ce qui marche. **Juno regarde, découpe, adapte et livre** à Atlas des posts complets ; Sam décide ce
qui sort.

Juno est déjà l'agent le plus profond (éditeur complet, tests solides) : ta priorité est que **ses
réglages et garde-fous gouvernent réellement son comportement** et que **la boucle se ferme** (clip
publié → chiffres → score).

## Ce qui existe (inventaire du 25/11/2026 — revérifie)
- `src/features/video/` (le dossier s'appelle `video`) : Clips (`Page.tsx` : groupes Ready to review,
  Being made, Later, Sent to Atlas, Published ; sélection multiple ; Not now à 4 raisons), Sources
  (`Sources.tsx` : surveillance des uploads et lives, coller un lien, upload local, détail avec
  transcription, moments, chapitres, « Find clips about… »), Brand kit (`BrandKit.tsx`), Editor
  (`Editor.tsx` : transcription éditable, ratios 9:16 / 1:1 / 16:9, 5 modèles de sous-titres, `.srt`
  réel, cadrage, B-roll, musique, studio sound, doublage, score décomposé, « Why this moment »,
  légende par réseau, timeline, ⌘Z), `model.ts`, `slice.ts`.
- `src/data/video.ts` + `video-transcripts.json` : 3 sources, 11 clips seed, 5 modèles de
  sous-titres, 4 B-roll, 2 musiques, 4 langues. Médias générés par `scripts/media/build.mjs`.
- Tests : `model.test.ts`, `slice.test.ts` (les plus complets du projet).
- `src/data/agents.ts` (bloc Juno) : 6 actions, **seules 2 sont lues par le code** (découper,
  envoyer à Atlas).

## À corriger d'abord
1. Réglages ignorés : « Fix captions » (Act), « Reframe and apply the brand kit » (Act), « Translate
   and dub » (Draft) ne changent rien ; « Make it » applique le doublage après 1,5 s quel que soit le
   cran (`Editor.tsx` ~l.341-344). Chaque action doit suivre ses trois crans.
2. Garde-fous non appliqués : 5 clips max par vidéo et par semaine, autorisation signée pour invités
   et clients à l'écran, durée par réseau (15–60 s, 90 s LinkedIn : le score pénalise > 60 s partout,
   `model.ts` ~l.282).
3. Libellé d'intervenant faux dans Sources : tout ce qui n'est pas l'hôte devient « Léo »
   (`Sources.tsx` ~l.183) alors que l'éditeur mappe correctement (`Editor.tsx` ~l.135).
4. Un lien collé réutilise le média d'exemple sans le dire (l'upload le dit) : l'écrire.
5. Les clips de « Find clips about… » n'ont aucune preuve (`slice.ts` ~l.275).
6. La carte Good news `h-clip-win` est statique ; les clips envoyés ne deviennent jamais « Published »
   avec des chiffres.

## Backlog d'amorce (à compléter par ton audit de parité)
| Capacité (Opus Clip / Descript / Agorapulse) | Version agentique |
|---|---|
| **Versions par réseau** | Un clip = une version par réseau (ratio, durée, sous-titres placés hors zones d'interface, légende) ; Juno les fait en Act (reframe) et signale celles qui ne tiennent pas dans la spec |
| **Couverture et miniature** | Choix de l'image de couverture (Juno propose 3 cadres, texte de couverture au brand kit), titre YouTube |
| **Boucle de performance** | Un clip programmé devient « Published » à l'heure dite, reçoit vues / rétention / partages (calculés chez Iris) ; Good news réelle quand il surperforme |
| **Score qui apprend** | Le score (hook, flow, value, trend) intègre les perfs passées par format et sujet ; « Why this moment » cite le clip passé comparable |
| **Preuves partout** | Chaque clip, y compris à la demande, a ses sources (moment, tendance d'Echo, perf passée) |
| **Autorisations** | Registre des personnes à l'écran (signé / non) ; Juno floute ou écarte le passage sans autorisation et le dit |
| **Doublage et traduction en Draft** | La version doublée arrive à relire (écoute, transcription traduite, mots du Playbook vérifiés) ; en Act, Juno publie les langues validées par le Playbook |
| **Détection d'intervenants** | Intervenants nommés au-delà des 3 actuels, recadrage qui suit celui qui parle |
| **Bibliothèques** | B-roll et musiques élargies (générées comme les médias actuels), suggestions de B-roll par Juno |
| **Quotas appliqués** | Compteur 5 clips / vidéo / semaine visible ; au-delà, Juno garde les meilleurs et explique pourquoi les autres attendent |
| **Lives** | Clips pendant le live (chapitres en direct), remontée « moment fort à l'instant » |
| **Juno en Chat et ⌘K** | « Clip the best 3 moments about the strap », « How did the French version do? » — chiffres lus chez Iris |

## Contrats avec les autres agents
- **Envoie** à Atlas des posts complets (une version par réseau, légende, couverture, lien, labels,
  campagne) via l'action d'entrée d'Atlas ; Undo retire l'ensemble (existe : `unsendClips`, à garder).
- **Fournis** à Iris l'identité des clips publiés ; **lis** chez Iris leurs performances.
- **Lis** chez Echo les tendances pour le critère « trend » du score, chez Sage la campagne en cours
  pour rattacher les clips.

## Scénarios de test à ajouter (PROMPT.md §1)
« Make a LinkedIn version of this clip » · « Why is this clip not going out? » (quota ou
autorisation) · « Which clip did best last week? » · « Pick a better cover ».
