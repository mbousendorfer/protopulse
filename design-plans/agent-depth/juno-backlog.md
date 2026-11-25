# Juno (Video) — backlog de parité

Audit du 25/11/2026 sur `origin/main` (73a7ba2). Référence : outils de clipping (Opus Clip, Descript) branchés
sur le Publishing d'Agorapulse (type de post vidéo, aperçu par réseau, labels, campagnes, médiathèque).
Trié par valeur ; les corrections « À corriger d'abord » passent en tête et ne sont pas pitchées.

## À corriger d'abord (sans pitch)

| # | Capacité | État actuel (fichier:ligne) | Version agentique | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| F1 | Libellé d'intervenant | `Sources.tsx:183` mappe tout non-hôte sur « Léo », `Editor.tsx:135` a sa propre table | Une seule table de personnes (`data/video.ts`), lue par la source et l'éditeur | 2 | S | done (#25) |
| F2 | Lien collé honnête | `slice.ts:241-251` prend le média d'exemple sans le dire (l'upload le dit, `Sources.tsx:146`) | La source collée porte `sampleTranscript`, la notice et le détail le disent | 2 | S | done (#25) |
| F3 | Preuves de « Find clips about… » | `slice.ts:278` `evidence: []` | Chaque clip trouvé cite le moment (horodatage, phrase, lien source), la tendance d'Echo qui recoupe la requête, la perf passée d'un clip du même pilier | 3 | S | done (#25) |
| F4 | Fix captions suit son cran | `script.ts:6-13` : en Act, une ligne de journal sans effet ; en Draft, l'approbation ne corrige rien | Événement `run` : Suggest = carte qui signale (Sam corrige dans l'éditeur, mots surlignés) ; Draft = carte, l'approbation pose les `fixes` ; Act = Juno pose les `fixes`, journal + Undo qui les retire. Même règle à la découpe d'une nouvelle vidéo | 3 | M | done |
| F5 | Reframe + brand kit suit son cran | `data/video.ts:158-168` cadre et habille toujours | Act = cadré (`track`) + kit, journal ; Draft = cadré + kit, « Framing to check » sur la ligne et dans Layout (Keep / Undo framing) ; Suggest = arrive en `fit` sans logo ni fin, Juno propose le cadrage dans Layout (Apply) | 3 | M | done |
| F6 | Doublage suit son cran | `Editor.tsx:341-344` applique le doublage après 1,5 s quel que soit le cran | Suggest = Juno indique les langues qui valent le coup, Sam les fait ; Draft = la version arrive « to review » (écoute, traduction, Approve) ; Act = Juno fait les langues du brand kit à la découpe, journal + Undo | 3 | M | done |
| F7 | Quota 5 clips / vidéo / semaine | affiché `agents.ts:164`, jamais lu | Appliqué à l'envoi (Sam, Desk, Act) : au-delà, Juno garde les meilleurs et dit pourquoi les autres attendent ; compteur « n of 5 this week » sur la source | 3 | S | done |
| F8 | Autorisation signée à l'écran | affiché `agents.ts:165`, jamais lu | Registre des personnes (staff / client, signé ou non) ; un clip où apparaît une personne sans autorisation ne part pas, avec la raison ; « Release signed » l'enregistre | 3 | M | done |
| F9 | Durée par réseau | `model.ts:282` pénalise > 60 s partout, LinkedIn compris | Spec par réseau (15–60 s, 90 s LinkedIn) : score et envoi n'écartent que les réseaux hors spec, l'onglet Post le dit par réseau | 2 | S | done |
| F10 | Boucle publiée | `h-clip-win` statique (`desk.ts:225`) ; un clip envoyé ne devient jamais « Published » | À l'heure du post, le clip passe Published avec ses chiffres (lus chez Iris, `clipPerf`, repli local en attendant) ; carte Good news réelle quand il bat la moyenne du réseau | 3 | M | done (chiffres d’Iris lus ; publication des posts : demande à Atlas ouverte) |

## Nouvelles features (pitch avant de construire)

| # | Capacité (Opus Clip / Descript / Agorapulse) | État actuel | Version agentique | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| N1 | Versions par réseau | un clip = un ratio pour tous ses réseaux (`model.ts:58`) ; `clipPosts` envoie le même cadre partout | Un clip = une version par réseau (ratio, durée, sous-titres hors zones d'interface, légende) ; Juno les fait en Act (reframe) et signale celles hors spec | 3 | L | done (aperçu Atlas : demande ouverte) |
| N2 | Juno en Chat et ⌘K | intent `clip` : seulement « latest video » et un lien (`agent.tsx:20-58`) | « Clip the best 3 moments about the strap », « Make a LinkedIn version », « Why is this clip not going out? », « Which clip did best last week? » — chiffres lus dans l'état | 3 | M | done |
| N3 | Couverture et miniature | aucune (miniature = poster de la source) | Juno propose 3 cadres de couverture, texte de couverture au brand kit, titre YouTube ; « Pick a better cover » | 2 | M | done |
| N4 | Score qui apprend | `rescore` ne lit que le clip (`model.ts:268`) | Le score intègre les perfs passées par pilier et réseau ; « Why this moment » cite le clip passé comparable | 2 | M | done |
| N5 | Doublage publié | les doublages ne produisent aucun post | Une langue validée produit ses posts (légende traduite) ; en Act, Juno publie les langues que le Playbook autorise | 2 | M | todo |
| N6 | Autorisations avancées | — (F8 bloque seulement) | Juno floute ou coupe le passage sans autorisation et le dit, au lieu de bloquer le clip | 2 | M | dropped — décision de l'humain au pitch (pas de commentaire) |
| N7 | Labels et campagne sur les posts | `clipPosts` ne pose ni label ni campagne | Les posts envoyés portent le label du pilier et la campagne en cours de Sage (`targetsOf`) | 2 | S | done |
| N8 | Lives en direct | les lives arrivent enregistrés | Chapitres en direct, « moment fort à l'instant » remonté pendant le live | 1 | L | dropped — décision de l'humain au pitch |
| N9 | Intervenants nommés, recadrage qui suit celui qui parle | 3 noms en dur | Détection au-delà de 3, cadrage par intervenant | 1 | M | todo |
| N10 | Bibliothèques élargies | 4 B-roll, 2 musiques | Plus de B-roll et musiques générés, suggestions par Juno | 1 | M | todo |
