# Atlas (Publishing) — backlog de parité

Audit du 25/11/2026, sur `origin/main` 73a7ba2 (Phase 0 mergée). Référence de parité : skill
`agorapulse-product`, module Publishing (statuts officiels : Draft, Scheduled, To approve, Published, Failed
avec « Retry now » ; pas de statut « Approved »). Trié par valeur, les corrections en tête.

| # | Capacité Agorapulse | État actuel (fichier:ligne) | Version agentique (qui fait quoi, à quel cran) | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| F1 | Approbation du plan (Act) + Undo | `slice.ts:277-283` : en Act le plan passe `approved` et ses 14 posts entrent au calendrier, mais l'Undo ne ramène que la carte, les posts restent (sonde du 25/11) | `onUndo` d'Atlas : un Undo qui ramène `h-plan` retire les posts du plan et remet le plan `proposed` | 3 | S | done |
| F8 | Nouveau plan après un rejet | `slice.ts:164-166` `planReset` remet les mêmes items | Atlas repart des alternatives et des idées ouvertes : nouveaux items, diff affiché, version +1 | 2 | S | done |
| F2 | Visuel manquant en Act | `data/desk.ts:116` carte `info` : `actDecision` l'ignore, le post reste en Needs you | En Act sur « Fill a slot », Atlas choisit seul un visuel de la médiathèque aux droits OK (jamais de stock), le dit au journal avec Undo ; sans candidat, la carte reste | 3 | S | done |
| F5 | Upload dans Media | `Page.tsx:297-347` Media en lecture seule ; « I'll upload one » renvoie vers Media | Bouton Upload (fichier local, comme Juno) ; l'image arrive en tête de Media, Atlas propose de l'utiliser pour le post qui attend un visuel | 3 | S | done |
| F7 | Bandeau « visuel manquant » | `Page.tsx:304` codé sur `h-visual` | Un bandeau par carte « Missing visual » ouverte, avec le post lié | 2 | S | done |
| F3 | Échecs de publication + retry | `script.ts:29-35` `ev-x-fail` sans post lié ; statut `failed` jamais attribué ; options sans effet | Le post passe `failed` avec sa cause ; Retry (lien simple) / Publish without the link / Skip X today agissent ; en Act Atlas retente seul ce qui est sûr ; vue « Failed » au calendrier | 3 | M | done |
| F4 | Meilleur créneau (même jour) | action `atlas-slot` (Act par défaut, `agents.ts:54`) sans code | Événement + carte : en Suggest Atlas signale, en Draft carte « Move to 18:30 », en Act il déplace dans la journée, journal avec raison chiffrée et Undo | 3 | M | done |
| F6 | Copilote « 3 variants » | `Composer.tsx:34-43` variantes figées (GR20 / Chamonix) | Variantes construites depuis le texte, le pilier et le Playbook (mots bannis, règles « do ») | 2 | S | done |
| B1 | Composer par réseau (premier commentaire, formats, specs) | `Composer.tsx` : légende commune + « Customize for X » texte seul ; `format` posé sur `Post` sans UI | Atlas pré-remplit format, premier commentaire et spec par réseau ; signale ce qui viole une spec | 3 | L | go, plus simple (format + premier commentaire) |
| B2 | Approbations multi-étapes (To approve) | `toClaire` (`slice.ts:215`) met le post en `needs` ; pas de statut « To approve » au calendrier | Statut To approve visible, commentaires d'approbation, Atlas route vers Claire ce que le Playbook exige (prix, presse) | 3 | M | done |
| B3 | Files et créneaux récurrents (Queues) | absent | Catégories (« Tips du mardi ») + créneaux ; Atlas remplit la file depuis Ideas et le recyclage | 3 | L | go, plus simple (2 files fournies) |
| B4 | Labels et filtres calendrier | `labels`, `campaign` posés sur `Post` sans UI ; filtre réseau seul (`Page.tsx:128`) | Labels éditables, filtres label / campagne / pilier / auteur / statut ; Atlas étiquette seul | 2 | M | à pitcher |
| B5 | Garde-fous appliqués | `agents.ts` g1 (3/réseau/jour) appliqué dans Ideas seulement ; g4 (pause pendant alerte critique) = texte | Plafond partout (composer, plan, Act) ; posts du jour « Paused » pendant une alerte critique, reprise en un clic | 3 | M | done |
| B6 | Liens et UTM | `link` posé sur `Post` sans UI | Champ lien, UTM générés selon une convention du Playbook, lien court simulé ; clics lus chez Iris | 2 | M | à pitcher |
| B7 | Notes et commentaires | absent | Notes de calendrier par jour, commentaires sur un post avec @Claire ; Atlas lit les notes | 2 | M | à pitcher |
| B8 | Glisser-déposer horaire | `Page.tsx:104-115` : le dépôt garde l'heure ; mois : pas de dépôt | Déposer sur une heure en semaine, déplacer en vue mois ; Atlas commente | 1 | S | à pitcher |
| B9 | Perf d'un post | aperçu (`Bulk.tsx`) : `stats` seulement | Chiffres d'Iris et lien vers Insights depuis le panneau d'aperçu | 2 | S | à pitcher |
| B10 | Médiathèque complète (dossiers, tags, droits) | Media : filtres par tag, lecture seule | Tags éditables, recherche, alerte droits expirés ; Atlas trie et tagge à l'arrivée | 2 | M | à pitcher |
| B11 | Fuseaux horaires | absent | Fuseau par profil, aperçu « 18:30 Paris · 17:30 London » | 1 | M | à pitcher |
| B12 | Import CSV | absent | Import d'un CSV ; Atlas vérifie chaque ligne et propose un lot validable | 1 | M | à pitcher |
| B13 | Multi-profils | un compte par réseau | Plusieurs comptes par réseau, groupes de profils | 1 | L | à pitcher |

Demandes entrantes (`requests/atlas-from-*.md`) au 25/11 : aucune.
