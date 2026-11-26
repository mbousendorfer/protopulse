# Protopulse — spec de génération

> Prompt autonome : il contient tout ce qu'il faut pour construire le prototype de zéro avec un agent de code.
> Sources : benchmark « outils IA et agentiques de gestion des réseaux sociaux » (24/11/2026), Pinpoint, Velocity, Blaze, Ocoya, Vista Social, et une interview produit de 21 questions (24/11/2026).
> Les textes d'interface sont en anglais. La spec est en français.

---

## 0. Ta mission

Tu es product designer et ingénieur front senior. Tu construis **Protopulse** : un prototype cliquable, entièrement mocké, d'une plateforme de gestion des réseaux sociaux **agentique et proactive**. Il sert à des **tests utilisateurs en manipulation libre** : chaque écran doit tenir debout seul, chaque bouton visible doit faire quelque chose, chaque état (vide, chargement, erreur, succès) doit exister. Un testeur qui clique au hasard ne doit jamais tomber sur un cul-de-sac ou un « coming soon ».

Pas de POC. La barre : un social media manager doit croire, pendant 45 minutes, qu'il utilise un vrai produit.

---

## 1. Ce que le test doit valider

1. **Confiance.** Un SMM accepte que des agents agissent seuls sur des actions publiques, à condition de voir pourquoi, de pouvoir annuler, et de régler l'autonomie lui-même.
2. **Le Desk remplace la routine.** Le matin, il traite ce qui demande un humain en quelques minutes au lieu de parcourir chaque module.
3. **L'autonomie qui se gagne.** Il accepte qu'un agent demande plus d'autonomie preuves à l'appui, et il comprend pourquoi un agent redescend d'un cran.
4. **Valider un plan plutôt que des items.** Il préfère approuver une semaine ou une campagne entière, avec la possibilité de retirer des éléments.
5. **Atlas propose avant qu'on demande.** Sam comprend en 5 secondes pourquoi Atlas propose une idée (preuve chiffrée et sourcée), la réoriente sans réécrire, et fait assez confiance au brouillon pour le programmer tel quel.

**Tâches du scénario de test (Ideas)** : « Find out why Atlas suggests this » · « Make this post about repair » · « Schedule the two ready ideas » · « Turn this series into a campaign ».

6. **Juno prépare, Sam décide.** Sam accepte qu'un agent découpe ses vidéos en clips, comprend pourquoi un moment a été choisi, retouche le clip sans quitter l'éditeur et l'envoie à Atlas.

**Tâches du scénario de test (Video)** : « Find out why Juno picked this moment » · « Remove the ums and start on the strap » · « Make the French version » · « Send the 3 ready clips to Atlas » · « Make a LinkedIn version of this clip » · « Why is this clip not going out? » · « Which clip did best last week? » · « Pick a better cover ».

7. **Echo apporte la conclusion, pas le flux.** Un SMM qui suit sa marque et ses concurrents dans Agorapulse retrouve ses recherches, ses chiffres et ses alertes, et voit qu'Echo lui dit ce qui se passe et quoi faire.

**Tâches du scénario de test (Listening)** : « Track what people say about the Storm Jacket seams » · « Why is negative volume up? » · « How do we compare with Trailkind on TikTok? » · « Who are the creators talking about Peakline? ».

Hypothèses de marché (issues du benchmark) que le proto incarne : un réglage d'autonomie lisible par l'utilisateur métier, la validation d'un plan, un journal de ce que l'agent a fait avec annulation, un brief livré avant la journée, une mémoire de marque visible. Anti-patterns à éviter : autopilote sans revue sur le contenu public, promesse « autopilot » opaque, crédits IA opaques, fonctions annoncées non livrées.

---

## 2. Personas et contexte

- **Sam Rivera**, Social Media Lead chez **Fernway**. C'est l'utilisateur, le testeur joue Sam. Il gère seul les réseaux de la marque avec ses agents. Il ouvre Protopulse vers 8 h avec son café, a 10 minutes avant son premier call, puis revient quand une alerte tombe.
- **Claire Dubois**, Head of Brand. Elle valide ce que Sam lui escalade (budget, presse, sujets sensibles, déclarations). Elle n'est **pas jouable** : c'est un personnage simulé (voir §9.3).
- **Fernway** : marque DTC d'équipement outdoor, basée à Annecy, vend en ligne en Europe. Produits : sac **Ridge 28L** (€140), gourde **Summit Bottle** (€35, garantie à vie), veste imperméable **Storm Jacket** (€220), polaire **Ember Fleece** (€95). Coloris : Moss, Ember, Slate, Glacier. Politique : retours 30 jours, échange gratuit, garantie à vie sur les gourdes, programme de réparation des sacs.
- **Comptes connectés** : Instagram (48k), TikTok (31k), LinkedIn (9k), Facebook (22k), YouTube (6k), X (4k), Google Reviews, Trustpilot.
- **Concurrents suivis** : Peakline (le plus gros, agressif sur les prix), Norrø (premium scandinave, très durable), Trailkind (challenger TikTok-native), Basecamp Co. (grande distribution).
- **Moment du test** : mardi 25 novembre, 08:12. L'espace tourne depuis 30 jours, les agents ont un historique. Une session peut aussi commencer par le signup (§6.11) : même jour, même heure, et l'espace démarre au Jour 1.

---

## 3. Principes produit (à respecter partout)

1. **Par exception.** Les agents gèrent seuls ce qui est dans leurs règles et ne remontent que ce qui demande un humain, toujours avec la raison.
2. **Tout s'explique.** Chaque action d'agent et chaque remontée affiche : quel agent, pourquoi, quelle règle du Playbook a été appliquée, un niveau de confiance, et les sources quand il y en a.
3. **Tout s'annule** tant que c'est réversible (fenêtre affichée : « Undo · 9 min left »). Ce qui ne s'annule pas le dit avant.
4. **L'autonomie est un réglage visible**, par action, avec trois crans : **Suggest** (l'agent propose, tu fais), **Draft** (l'agent prépare, tu valides), **Act** (l'agent exécute dans ses garde-fous, tu peux annuler). Certaines actions sont **verrouillées** (jamais en Act).
5. **Les agents se passent le relais** et ça se voit : « Spotted by Echo → drafted by Atlas → needs you ».
6. **Valider des ensembles.** Plans, campagnes, lots : approbation globale, partielle, ou avec modification.
7. **Le Playbook est la source de vérité** de la marque. Une correction dans un fil peut devenir une règle.
8. **Aucun faux-semblant.** Pas de bouton mort, pas de « coming soon ». Si une fonction n'est pas dans le proto, elle n'est pas dans l'UI.
9. **Décisions d'abord** (demande de Matt, 25–26/11). La page d'arrivée de chaque département (Inbox, Publishing, Listening, Strategy, Video, Insights, Agents) et le premier onglet de chaque profil d'agent s'ouvrent sur ce qui attend Sam : en tête, un résumé nommé (« 4 need you · 2 plans to approve »), puis les décisions groupées par geste, chacune avec sa décision rapide sur place, sans ouvrir d'autre écran ; ensuite seulement le reste du module (suivi, historique, réglages). Rien n'attend → une ligne « Nothing needs you here » et ce que l'agent surveille. Le badge du rail compte exactement ce bloc.

---

## 4. Les agents

Six agents préconfigurés, chacun responsable d'un département. Un agent a : un nom, une couleur et un avatar illustré (§10), un département, une ligne de rôle, un statut (`On shift` / `Paused` / `Off shift`), un planning, une activité en cours, des **actions** avec leur cran d'autonomie, des **garde-fous**, et un **track record** (géré seul, remonté, taux d'approbation sans modification, annulations).

### Nova — Community (Inbox)
Planning : 24/7. Activité type : « Watching 8 inboxes ». Travaille avec une équipe de quatre : Sam, Claire (approuve), Léo Marchand (service client) et Yanis Haddad (wholesale), qui répondent seuls à ce qui leur est assigné.

| Action | Risque | Cran par défaut | Verrou |
|---|---|---|---|
| Answer product and shipping questions | safe | Act | |
| Hide spam and bots | safe | Act | |
| Apply Inbox rules (label, assign, hide, review) | safe | Act | |
| Answer complaints | risky | Draft | |
| Send an exchange or a replacement (≤ €150) | risky | Draft | |
| Refund shipping costs (≤ €15) | risky | Act | |
| Send a discount code (≤ 15 %) | risky | Draft | |
| Reply to reviews (Google, Trustpilot) | risky | Draft | |
| Reply to press, legal, safety, injuries | destructive | Suggest | 🔒 |

Ce que fait chaque cran : **Act** = Nova répond, applique ses règles ou signale le spam seule, une ligne au journal avec un Undo qui restaure la conversation ; une carte prise par Act passe la conversation en « Nova · auto » (Handled by Nova). **Draft** = brouillon dans Needs you (et carte Desk), règles proposées groupées (« Apply all »), spam regroupé en une carte. **Suggest** = Nova signale et propose (règle suggérée sur la conversation).

**Escalades appliquées** : chaque message qui arrive est vérifié contre les règles d'escalade du Playbook actives pour Nova (blessure, presse, juridique, créateur > 50k, remboursement > €150, budget, prix) ; une règle qui matche passe avant le cran : Your call (ou Waiting on Claire), réponse d'attente, règle citée.

**Règles d'Inbox** (Automated moderation) : mots + réseau + type → label, assigner, masquer, marquer revu, sentiment ; compteur d'usages, Undo ; créées depuis le panneau Rules, ⌘K/Chat (« make Nova label refund requests as Refund ») ou proposées par Nova après trois étiquetages identiques à la main.

**Temps de réponse** : cible par type (messages 1 h, commentaires et mentions 4 h, avis 24 h, réglables) ; Nova prévient 15 minutes avant qu'une cible soit manquée (carte Desk) ; « who is waiting longest? » en ⌘K.

Garde-fous affichés : max 200 réponses publiques par jour · aucune réponse LinkedIn entre 23:00 et 07:00 · remboursements cumulés ≤ €300 par jour. (Leur application a été écartée au pitch du 25/11 : ils restent déclaratifs.)

### Atlas — Publishing
Planning : lun.–ven., prépare la semaine suivante le jeudi. Activité type : « Reworking Friday's reel caption ». Registre : `src/features/publishing/agent.tsx` et `script.ts`.

| Action | Risque | Cran | Verrou | Ce que fait Act |
|---|---|---|---|---|
| Build next week's plan | risky | Draft | | approuve le plan, programme la semaine ; Undo retire les posts |
| Move a post to a better slot (same day) | safe | Act | | déplace dans la journée vers le meilleur créneau (heure d'Iris) ; aussi les posts d'un jour calme |
| Recycle a top post (rewritten) | risky | Draft | | via Ideas |
| Publish trend posts | risky | Suggest | | via Ideas |
| Fill a slot left empty | risky | Draft | | remplit les créneaux et les files, pose un visuel de Media, échange un visuel dont la licence finit |
| Retry a failed post with a safe fix | safe | Draft | | republie avec le lien simple après un refus de X |
| Publish anything mentioning a competitor | destructive | Suggest | 🔒 | — |

Suggest : la carte attend dans Worth a look ; Draft : carte dans Needs you (les cartes post se groupent en lot) ; Act : Atlas fait, une ligne au journal, Undo 30 min qui restaure l'état (instantané par carte `byCard`).

Garde-fous **appliqués** : max 3 posts par profil et par jour partout (composer, plan, Desk, glisser-déposer, report groupé) · piliers et cadence lus chez Sage (`targetsOf`) · jamais de photo de banque d'images ni de licence échue · pendant une alerte critique d'Echo ou d'Iris, les posts des 24 h suivantes passent **Paused** (carte, reprise seule à la fin) · un jour noté « quiet day » reste vide · avec l'escalade « Price changes and promo codes », tout post d'Atlas qui cite un prix va à Claire.

Relais : lit le meilleur créneau chez Iris (`bestTime`), les piliers et temps forts chez Sage (`targetsOf`, `themesOf`), les concurrents chez Echo (`listening.watch`), les versions de clip chez Juno (`versionOf`). Expose `receivePosts`/`withdrawPosts` (Sage), `holdToday`/`releaseToday` (Echo), publie à l'heure (`publishDue`) pour Juno et Iris, et `ACCOUNTS` (profils).

**Idées (Publishing › Ideas).** Atlas cherche en continu quoi publier à partir de ce qui a marché (Iris), de ce qui monte (Echo), de la marque (Playbook, Strategy) et des trous du calendrier. Une idée est toujours en Suggest ; la rédaction suit le cran de l'action concernée (`atlas-trend`, `atlas-recycle`, `atlas-fill`) ; sur Act, Atlas programme lui-même et le journal garde un Undo réel. Jamais plus de 8 idées ouvertes : une idée plus forte ou urgente remplace la plus faible non rédigée, les idées à fenêtre expirent seules (« Expired: the #GR20 conversation dropped 40% »). Rien qui nomme un concurrent, jamais le Ridge 40L, jamais de stock (brief visuel à la place).

### Iris — Insights (Analytics)
Source unique des chiffres de performance (`src/features/insights/metrics.ts` : `kpis`, `rangeKpis`, `bestTime`, `bestSlotOf`, `heat`, `formats`, `tiktokViews`, `postPerf`, `clipPerf`, `clicksOf`, `fernwayRow`) : Explore, les rapports, le brief, le Chat et ⌘K citent les mêmes valeurs, lues dans l'état. Planning : brief au premier battement après 07:00 d'un nouveau jour, rapport hebdo le lundi, rapports programmés à 08:00 (lundi ou le 1er), règles d'alerte évaluées à chaque battement.

| Action | Risque | Cran | Verrou | Ce que fait chaque cran |
|---|---|---|---|---|
| Write and share the morning brief | safe | Act | | Suggest : chiffres seuls (journal) · Draft : carte « brief ready » · Act : brief écrit |
| Write and share the weekly report with Claire | risky | Draft | | Suggest : écrit, Sam l'envoie · Draft : carte « ready to send » · Act : envoyé dans la file de Claire, Undo qui le reprend ; vaut aussi pour les rapports programmés |
| Raise anomalies | safe | Act | | Suggest : listée dans Insights · Draft : carte Worth a look avec l'option d'Iris · Act : Iris fait l'option recommandée (ex. demande un post à Atlas), Undo réel ; une règle « → Desk and Claire » va dans la file de Claire |
| Recommend content from the audience | safe | Draft | | Suggest : visible dans Audience · Draft : carte « brief Atlas? » · Act : Iris briefe Atlas (brouillon chez Atlas), Undo |
| Recommend a paid boost | destructive | Suggest | 🔒 | Iris propose, Sam décide ; jamais recommandé par Act |

Garde-fous **appliqués** : partage uniquement à Sam et Claire · budget boost mensuel = dernier montant du garde-fou (€1,500), utilisé calculé depuis les boosts du mois (Desk, Insights, Chat passent tous par `recordBoost`), un boost au-delà est refusé avec la raison, l'Undo rend le budget · une règle d'alerte en pause ne se déclenche jamais.

Relais : lit les posts et liens d'Atlas, les clips de Juno, les campagnes de Sage (`s.strategy.campaigns`), les concurrents et la part de voix d'Echo (`competitorsOf`, `shareOfVoice`). Fournit `bestTime`/`bestSlotOf` à Atlas, `clipPerf`/`postPerf` à Juno, `writeCampaignReport` à Sage (bilan en fin de campagne), les faits Playbook « revenu par euro de boost » à Sage, les briefs d'audience à Atlas.

### Echo — Listening
Planning : 24/7. Activité type : « Watching Peakline's launch comments ». Echo écoute, trie, chiffre et alerte ; elle
transforme ce qu'elle entend en objets pour les autres (réponse ou DM chez Nova, post chez Atlas, brief chez Sage) et
apporte la conclusion plutôt que le flux. Tous ses chiffres (écran, ⌘K, Chat, Desk) se lisent dans `listening/model.ts`.

| Action | Risque | Cran | Ce que change le cran |
|---|---|---|---|
| Tag and file mentions | safe | Act | Suggest : « + tag » proposés sur chaque mention · Draft : carte « Tag N new mentions? » · Act : Echo tague, journal + Undo. Ce qu'elle classe seule compte comme vu |
| Raise competitor events | safe | Act | Suggest : ligne de digest · Draft/Act : carte Desk (concurrents ajoutés compris) |
| Hand a trend to Atlas | safe | Draft | |
| Propose a counter-move to a competitor | risky | Suggest | Verrouillé côté Atlas : tout ce qui répond à un concurrent, Sam le publie |
| Handle a negative spike | risky | Draft | Suggest : ligne de digest · Draft : carte Urgent à trois coups · Act : Echo met Atlas en pause et demande une déclaration à Claire, Undo 30 min |
| Tell the sales team (email digest) | risky | Draft | Suggest : ce qu'il faudrait dire, rien n'est envoyé · Draft : l'email en carte (« can't be unsent ») · Act : envoi direct |
| Shortlist creators for a collab | safe | Draft | Suggest : note · Draft : carte (DM, shortlist, pas un fit) · Act : shortlist + Undo. Le DM de Nova reste toujours une carte |

Garde-fous appliqués : seuil de pic = « 3× » lu dans le garde-fou (modifiable) sur une moyenne de 8 négatifs/h ·
concurrents suivis « 4 of 6 » et recherches actives « 11 of 15 » : le compte suit l'état, le plafond après « of » est
appliqué à l'ajout, à la création et à la reprise (refus inline avec lien vers le garde-fou). Règles d'alerte (onglet
Alerts) évaluées chaque minute sur le flux, une fois par heure (ou par jour) au plus.

### Sage — Strategy
Planning : à la demande pour les campagnes ; suit les campagnes live au fil des jours, lève les temps forts 3 semaines avant. Source unique des piliers, de la cadence et des campagnes (`targetsOf(s)`, `mixOf(s)`, `lastWeekOf(s)`, `themesOf(s)`), lus par Atlas et Iris.

| Action | Risque | Cran | Verrou |
|---|---|---|---|
| Turn a brief into a campaign plan | risky | Draft | |
| Adjust cadence when a network underperforms | risky | Draft | |
| Reallocate tasks between agents during a campaign | safe | Act | |
| Change the editorial pillars | destructive | Suggest | 🔒 |
| Plan for calendar moments | safe | Suggest | |

- **Plans** : Suggest = carte d'info, on lance depuis Strategy ; Draft = carte « Campaign plan ready » ; Act = Sage lance seul (Undo 30 min). Une campagne lancée met tous ses posts à venir au calendrier d'Atlas (`campaignId`, pilier, label) et demande à Nova, par une règle d'Inbox à elle, d'étiqueter ses conversations ; l'Undo retire posts et règle.
- **Cadence et trajectoire** (`sage-cadence`) : propositions de cibles, carte « Community pillar under target », et réajustement quand une campagne live sort de 85–120 % de sa trajectoire (déplacer des posts, relever ou baisser l'objectif) ; en Act, appliqués seuls avec Undo.
- **Piliers** : verrouillés ; Sam repondère et décrit, Sage vérifie la somme et chiffre l'impact ; « Put more Community in the mix » devient une proposition.
- **Temps forts** (`sage-moments`) : carte au Desk 3 semaines avant ; ajouté = idées pour Atlas par son `arriveIdeas`.
- **Chat et ⌘K** : « How is Trail Week doing? », « Is Community behind? », « Put more Community in the mix », brief de campagne ; chiffres lus dans l'état.

Garde-fous appliqués : un objectif chiffré par campagne · **Active campaigns: 2 max** (lu dans la valeur du garde-fou ; Approve désactivé avec la raison, carte renvoyée au Desk).

### Juno — Video
Planning : 24/7, vérifie la chaîne YouTube toutes les 15 min. Activité type : « Captioning the Repair Friday live ». Couleur : emerald ADS `#12A87A`, avatar avec un clap.

| Action | Risque | Cran | Verrou |
|---|---|---|---|
| Draft clips from new videos | risky | Draft | |
| Fix captions (product names, Playbook words) | safe | Act | |
| Reframe and apply the brand kit | safe | Act | |
| Translate and dub clips | risky | Draft | |
| Send her best clips (80+) to Atlas's calendar | risky | Draft | |
| Change words in someone's voice | destructive | Suggest | 🔒 |

Garde-fous : 15–60 s (90 s sur LinkedIn) · sous-titres toujours · brand kit sur chaque clip · 5 clips max par vidéo et par semaine · invités et clients à l'écran seulement avec autorisation signée.

Ce que chaque cran fait vraiment (code : `src/features/video/`, registre `agent.tsx`) :
- **Draft clips** : Suggest, Juno demande avant de découper (carte « New video ») ; Draft, carte « N clips … are ready » ; Act, elle découpe seule (journal).
- **Fix captions** : le speech-to-text se trompe sur des noms produits (« Ridge 28 », « PFOS-free », « Amber »). Act, Juno corrige (journal, Undo) ; Draft, une carte Desk dont l'approbation corrige ; Suggest, les mots restent soulignés dans l'éditeur avec « Fix it ».
- **Reframe and brand kit** (à la découpe) : cadrage, une version par réseau, couverture et habillage. Act, appliqués ; Draft, appliqués et « Framing to check » ; Suggest, clip brut et proposition « Apply ».
- **Translate and dub** : Act, Juno fait les langues du brand kit et les envoie avec le clip ; Draft, elles arrivent « to review » et seules les approuvées partent ; Suggest, elle les signale. Chaque langue envoyée devient ses propres posts.
- **Send 80+ to Atlas** : Act, Juno envoie seule ses clips à 80+ (journal, Undo 10 min).
- Les garde-fous s'appliquent à tout envoi (Sam, Desk, Act) : un clip qui montre Hugo (client, GR20) sans autorisation reste « Held » ; au-delà de 5 clips par vidéo sur 7 jours, Juno garde les meilleurs et dit pourquoi ; un réseau dont la durée sort de la spec ne reçoit pas de post.
- Elle suit ses clips : publié à l'heure du premier post, chiffres d'Iris (`clipPerf`), Good news réelle au-delà de 1,5× la moyenne du réseau ; le score intègre ensuite ce « Track record ».
- En ⌘K et Chat : « Clip the best 3 moments about the strap », « Why is the rain clip not going out? », « Which clip did best last week? », « Make a LinkedIn version of the bottle clip ».

---

## 5. Shell et navigation

- **Barre latérale** (repliable) : logo Protopulse + espace « Fernway » ; **Desk** ; groupe **Departments** : Inbox (Nova), Publishing (Atlas), Insights (Iris), Listening (Echo), Strategy (Sage), Video (Juno), chacun avec l'avatar de l'agent, un point d'état et le nombre de remontées en attente ; groupe **Team** : Agents (onglets Team · Shared rules · Escalation), Activity ; en bas : Settings (comptes connectés, notifications in-app) et l'avatar de Sam.
- **Barre supérieure** : fil d'Ariane, **barre de commande** (« Ask or brief an agent… » · ⌘K), état de Claire (« Claire · usually replies in ~1 min »), centre de notifications.
- **Raccourcis globaux** : ⌘K commande · G puis D/I/P/N/L/S/V/A/Y pour naviguer, G puis B pour Agents › Shared rules · F mode Focus · ? aide des raccourcis · ⇧D panneau modérateur (non listé dans l'aide).
- **Toasts** seulement pour les urgences et pour confirmer tes propres actions (avec Undo). Le travail des agents en arrière-plan arrive en silence dans la liste et le fil Live.

---

## 6. Écrans

### 6.0 Travail en volume (toutes les listes)

- **Sélection multiple partout** où l'on traite des éléments : Your day, lignes des lots, Inbox, calendrier (semaine, mois, liste), brouillons, mentions, anomalies. Case visible au survol, shift-clic pour une plage, « Select all » avec état partiel, Échap pour vider.
- **Barre d'actions groupées** flottante en bas de la liste : « 3 selected » puis les actions valables pour toute la sélection. Une action partielle le dit (« Approve 6 of 7 · decisions and missing info need you one by one »).
- Chaque action groupée écrit **une** ligne au journal et se défait d'**un** Undo (bandeau 10 s ou toast).
- **Tout se prévisualise au clic** : une ligne de lot s'ouvre sur le post rendu comme sur le réseau et sa carte de décision ; un post du calendrier ouvre un panneau d'aperçu (rendu réseau, stats, auteur, pilier, historique, actions).
- **Réseaux** : affichés par leur icône officielle seule (nom en infobulle), jamais « IG Instagram ».
- **Exports réels** : CSV des posts (Explore) et des mentions, rapport en Markdown.

### 6.1 Desk (accueil)

L'écran où Sam passe ses 10 minutes du matin. Disposition **liste + détail** : on voit toute la journée à gauche, on traite une chose à la fois à droite.

**Brief du matin** (rédigé par Iris, en haut, repliable en une ligne après « Got it ») : « Good morning, Sam. » avec une illustration du moment (montagne et lac, aube / jour / soir), 2-3 phrases rédigées sur la nuit, des compteurs **nommés en texte** (Handled alone · Need you · With Claire · Undone by you) et des lignes « Needs you / Done » avec une action chacune. Le **Shift board** (24 h d'activité des agents, une ligne colorée par agent) est repliable sous le brief.

**Liste « Your day »** (colonne de gauche), en **trois onglets toujours visibles avec leur compteur** (Needs you · Worth a look · Good news), pour que les signaux et les bonnes nouvelles ne soient jamais cachés sous une longue liste de décisions ; changer d'onglet ouvre son premier élément :
- **Needs you** : les décisions, triées par urgence. Les remontées semblables sont regroupées en **lots** (voir plus bas).
- **Worth a look** : signaux à lire sans décision obligatoire (anomalies, concurrents, tendances).
- **Good news** : ce qui a marché, avec une action utile (« Add to the weekly report », « Make a similar post »).
- Dans l'onglet Needs you, en bas : **Waiting on Claire**, **Later** (reportés, « Back at 14:00 ») et **Done** (coche + ce qui a été fait, cliquable pour revoir ou annuler).
- Chaque ligne : icône teintée du type (couleur de l'agent), titre, ligne de contexte, pastille d'urgence. Filtre par agent dans un menu compact.

**Colonnes à la hauteur de leur contenu** : liste de 400 px (titres sur deux lignes) plafonnée à la hauteur d'écran avec son propre défilement, panneau collé en haut ; Desk limité à 1320 px de large. **Panneau de détail** (une remontée à la fois, « 3 of 12 », avec en bas une seule ligne discrète « Next : <titre> → » vers la suivante du même onglet) :
- Phrase de routage : avatar(s) + « **Nova** needs you · Complaint · 07:41 » (relais = avatars empilés « Echo → Atlas »).
- Titre, contexte, aperçu selon le type (message + brouillon dans la couleur de l'agent, post avec aperçu réseau, mini-graphe, options numérotées avec une **Recommended**, champ à compléter, preuves pour une demande d'autonomie).
- **Sources** citées sous le brouillon (« Order #48213 · Shopify », « Exchange limit €150 · Playbook »). Sur les infos manquantes : « Atlas won’t guess. Tell it once and it goes into the Playbook facts » — la réponse devient un fait du Playbook.
- « Why you’re seeing this », règles du Playbook appliquées, confiance.
- Pied : « Nothing goes out until you confirm » + Snooze, Ask Claire, Open, Discuss, et l'action principale.
- Raccourcis : ↑/↓ ou J/K pour naviguer, **A** approuver (ou l'option recommandée), **E** éditer (⌘↵ valide l'édition), **R** puis 1-4 rejeter avec une raison, **S** puis 1-4 reporter, **C** demander à Claire, 1-9 choisir une option. Chaque décision passe automatiquement à l'élément suivant.

**Lots** (valider un ensemble plutôt que des items), dès 2 éléments semblables :
- **Inbox · Nova** : voies Leads / Ready / To decide (+ Spam masqué par Nova), « Send N ready » envoie seulement les brouillons sûrs (confiance ≥ 80, aucun passage incertain).
- **Posts to approve · Atlas** : « Schedule N ready ».
- **Playbook rules** proposées par les agents : « Add N rules ».
- « Review one by one » ouvre un tiroir avec chaque élément. Une validation en lot écrit **une** ligne au journal et se défait d'un seul Undo.

**All clear** : quand plus rien n'est dans Needs you, une illustration (tente sous un ciel calme), « Nothing needs you right now. Your agents will tap you when something does. » et trois chiffres : traités par toi, ton temps passé, traités seuls par les agents. Worth a look et Good news restent accessibles.

**Live et Team, en bas du Desk** (derniers éléments, côte à côte) : le fil des actions autonomes avec Undo et l'état de l'équipe. Ils restent secondaires par rapport à ce qui demande Sam. « Focus » est un bouton de l'en-tête de Your day.

**Mode Focus** (F) : plein écran, uniquement les Needs you, une à la fois, mêmes raccourcis, J/K et Z (annuler la dernière décision). Fin de file = l'écran All clear.

**Fil de discussion d'une remontée** (panneau latéral) : l'agent explique son raisonnement, Sam écrit (« why… », « make it shorter / warmer / more formal », « don’t… », « use … instead », « ask Claire »). Un « don’t… » devient une règle proposée « Add to Playbook », appliquée au brouillon.

### 6.2 Inbox — Nova

- **Disposition** : barre latérale du module — vues Needs you, To review, Nova's drafts, Handled by Nova, Hidden, All ; **Team** (Sam, Claire, Léo, Yanis : conversations ouvertes et « N over ») ; Saved views (Negative today + vues créées par Sam) ; **By post** (posts avec commentaires en attente) ; Labels (avec *Manage*) ; filtres (réseau, **profil**, type, sentiment, date, assigné, statut de revue, intention d'achat, *Save as view*). Puis une **liste pleine largeur** dense (case · avatar social · auteur · extrait · profil · type · sentiment · intention · statut · **attente** · revu · labels · assigné · heure), triable (Waiting longest, récent, ancien, urgence, intention d'achat). En-tête : **Saved replies** et **Rules**.
- **Vue Needs you = ce que Nova attend de Sam**, groupée : **Ready to send** (« Send all N »), **One passage to check**, **Your call** (sujets verrouillés et escalades, règle citée), **You're replying**, puis, hors compteur, **Waiting on Claire** et **With your team** (assigné à Léo ou Yanis). 3 lignes par groupe puis « Show N more » ; chaque ligne : auteur + message d'origine (langue notée), la réponse de Nova ou la question, **« Waiting 2 h 58 · over 1 h »** et la décision rapide.
- **Panneau de conversation** (~620 px, ↑/↓ ou J/K) : assigner (équipe de 4), sentiment, Mark reviewed, **Like**, **Moderate** (Reply in private, Report as spam, Ban, Delete… avec confirmation inline ; les avis ne se modèrent pas), labels ; suggestions de règle de Nova (Apply / Dismiss). Onglets **Conversation** (fil avec traductions anglaises sous les messages étrangers, notes internes, brouillon de Nova avec la réponse sauvegardée citée et sa version anglaise, pièces e-commerce, Send, Edit, Take over, Ask Claire, Hide ; composeur avec menu **Saved replies** ; « Save as reply » sous chaque réponse envoyée ; lien du post → tous ses commentaires) et **Contact** (commandes Shopify, historique, tags, lecture seule).
- **Panneaux** : *Rules* (règles de Nova, on/off, usages, ajout, cibles de réponse), *Saved replies* (8 réponses d'équipe, `{name}`), *Labels* (renommer partout, supprimer avec Undo).
- **Actions groupées** : Approve, Mark reviewed (et *Review all* dans To review), Assign, Label, Sentiment, Hide / Unhide, Like, Report as spam, Ban, Delete. Une ligne de journal, une barre d'Undo.
- **⌘K / Chat** : « reply to Léa (with the exchange saved reply) », « make Nova label … as … », « assign … to Yanis », « who is waiting longest? », « show me negative Instagram DMs this week » (ouvre l'Inbox filtrée ou enregistre la vue).
- **URL** : `?view=`, `?label=`, `?sort=waiting`, `?rules=1`, `?saved=1`, `?labels=1`, et les filtres (`network`, `type`, `sentiment`, `date`, `who`, `review`, `post`, `account`).
- **⇧D** : wrong colour, injury (escalade), German warranty, money-back question (règle), 1-star Google review, bots (spam), learned rule, response targets, buying intent, plus les événements toujours en carte (stove, collab, promotions, règle emoji).

### 6.3 Publishing — Atlas

Onglets : **Ideas** · **Calendar** · **Plan review** · **Drafts** · **Queues** · **Media**. Bouton « New post » partout.

- **Ideas** (premier onglet et page d'arrivée de Publishing : `/publishing` ; le calendrier est à `/publishing/calendar`) : une phrase d'Atlas qui résume (« 7 ideas this week, 2 ready to schedule. Community is behind target, so 3 of them are Community. »), puis **Ready to review** (brouillons complets), **New ideas** (l'angle et la preuve), **Series** (3 à 5 posts : teaser, preuve, voix client, appel).
  - trois niveaux pour rester lisible : **la liste** (une ligne par idée : titre, la preuve la plus forte avec son chiffre, réseaux, créneau, délai s'il y en a un, confiance), **le volet** (pourquoi et toutes les sources, l'aperçu, un seul champ pour réorienter), **à la demande** (modifier la légende, changer le créneau, variantes, historique) ;
  - actions sur la ligne : principale (**Schedule** / **Draft it** / **Add to next week's plan** pour le lot du jeudi / **Send to Sage** pour une série) et **Not now ▾** (revenir demain, ou écarter avec la raison en un clic : Off-brand, Not timely, Already covered, Wrong pillar ; « Dismissed · Undo »). Quand une idée est ouverte, la liste ne sert plus qu'à naviguer (motif Inbox) ; les actions sont dans le volet ;
  - sélection et action groupée « Schedule N ready », avec Undo 10 s qui remet les idées dans Ideas ;
  - volet latéral (comme l'Inbox), en trois zones qui ne se ressemblent pas :
    1. **Why Atlas suggests this** (sur la couleur d'Atlas) : son raisonnement en deux phrases, puis chaque preuve en chiffre lisible avec la mesure nommée et un lien vers l'écran d'origine (« 6.4% · engagement rate on the Storm Jacket carousel · Insights ↗ ») ;
    2. **The post** : l'aperçu fidèle du réseau en taille réelle, légende entière, puis quand / visuel / Playbook ; « Edit caption » ; le diff surligné de la dernière réorientation et les 3 variantes (garder l'une, ou l'accroche de l'une sur le corps d'une autre) s'affichent ici ;
    3. **Ask Atlas for changes**, ancré en bas comme une barre de chat : la dernière réponse d'Atlas en bulle (y compris un refus franc : « I can't mention the Ridge 40L: it isn't announced »), le champ libre, et en suggestions les angles en un clic et « 3 variants » ; la règle Playbook proposée après deux réorientations identiques apparaît là ; historique replié.
  - les idées « trou du calendrier » ne proposent jamais deux fois le même post et leur pourquoi est chiffré (posts prévus ce jour-là, retard sur la cadence de la semaine, pilier sous la cible, meilleur créneau).
  - le badge de l'onglet compte les idées prêtes à relire, pas le total.
- Les cases vides recommandées du calendrier montrent l'idée « gap » d'Atlas (« Idea from Atlas · Review the idea »), ou « Ask Atlas for an idea » qui en crée une.

- **Calendar** : semaine (par défaut), mois, liste. Statuts : `Scheduled` · `Published` · `Draft` · `Needs you` · `To approve` · `Paused` · `Failed`. Popover **Filters** (statut, label, campagne, pilier, auteur, profil). Notes de jour (« Trail Week starts » ; « quiet day » = Atlas n'y programme rien et déplace ce qui y est) et temps forts de Sage. Glisser-déposer vers un autre jour (Atlas commente le créneau, refuse un 4e post du profil). Badge needs-you = posts en échec.
- **Aperçu d'un post** (panneau) : aperçu fidèle (profil, format, premier commentaire, lien), statut, profil, labels éditables, format, lien suivi et UTM, **Results** d'un post publié face à la médiane du réseau avec « Recycle it », **Comments** (Atlas, Claire, vous), historique. Bloc **Failed** avec **Retry now** / Publish without the link / Skip ; bloc **Paused** avec Resume.
- **Plan review** : en-tête et cadence vs Sage, une case par post avec sa raison, **Approve plan (12 of 14)** · **Request changes** (v2 avec diff) · **Reject** puis « Ask Atlas for a new plan » (un vrai v2 : posts d'Atlas remplacés, Trail Week gardé).
- **Éditeur de post** : profils (dont **Instagram · Fernway Repair**) et **groupes** ; Atlas suggère Fernway Repair pour le pilier Repair & care ; texte commun puis variantes ; **Link** (UTM et lien court par Atlas, lien simple sur X, premier commentaire sur Instagram) ; **Per network** : format et premier commentaire pré-remplis ; visuel depuis Media (uploads compris) ; meilleur créneau d'Iris ; plafond de 3 signalé avec un jour proposé ; copilote (3 variantes construites depuis le texte, le pilier et le Playbook ; Shorten ; Adapt for LinkedIn) ; Playbook check live ; Schedule · Add to plan · Save draft · Ask Claire.
- **Drafts** : brouillons d'Atlas et de Sam, filtrables ; cartes en attente sur le Desk.
- **Queues** : « Tuesday tips » (LinkedIn, mar. 08:30) et « Sunday repair » (Fernway Repair, dim. 11:00), créneaux modifiables, deux semaines à venir ; Atlas les remplit (Draft : à approuver ; Act : programmés).
- **Media** : médiathèque (30 photos + uploads), recherche, tags éditables (Atlas tague les uploads), **Upload** ; bandeaux « Atlas needs a visual » (par post en attente) et « licence ends » avec un remplaçant.
- ⌘K / Chat : « Write a TikTok post about… », « Send Friday's post to Claire for approval », « Add a first comment with the size guide link », « Fill next week's Tips slots ».
- ⇧D : recycle, empty slot, better slot, queues, X rejected a post, ideas, rule proposal.

### 6.4 Insights — Iris

Onglets : **Reports** · **Explore** · **Audience** · **ROI** · **Anomalies** (badge = anomalies ouvertes ; celui de Reports = rapports en Draft qui attendent Sam).

- **Reports** : en tête, le champ **Ask Iris** (« A monthly report for Claire on Instagram and TikTok ») et les modèles sauvegardés, puis les **planifications** (fréquence, destinataire, prochaine date, ce que fera Iris au cran actuel ; pause, suppression). Liste : briefs du jour (un nouveau à chaque jour), rapports hebdo (le lundi), bilans de campagne, rapports demandés. Un rapport se lit comme un texte, chiffres **sourcés** (survol = donnée et période). Rapport demandé (**Report Studio agentique**) : chaque section monte, descend, se raccourcit ou s'allonge, se retire ; « Add a section » (Results, Top 3 posts, What didn't work, Best times, By pillar, Community, Campaign vs goal, Labelled posts, Website results, Audience, Benchmark) ; champ « Tell Iris what to change » (« make it shorter and add the top 3 posts ») ; chaque changement a son Undo. Une campagne de Sage nommée dans la demande impose sa fenêtre, ses réseaux et la section objectif vs réel ; « labelled X » lit les posts d'Atlas portant ce label. Panneau : Share with Claire (carte dans la file de Claire, sa réponse s'affiche dans le rapport), Save as template, Schedule (chaque lundi ou chaque mois, à Claire ou à soi), Download PDF (impression du rapport seul), Copy read-only link (`?view=read`, sans outils), Download .md, Ask a follow-up (mêmes chiffres qu'Explore).
- **Explore** : période 7 / 30 / 90 jours ou **Custom** (deux dates dans les 90 jours) ; filtre réseau ; KPI avec comparaison à la période précédente ; portée quotidienne ; **best time** par réseau (heatmap jour × créneau de 2 h, la note suit le filtre) ; perf par pilier contre la cible de Sage ; tableau des posts triable (réseau, date, pilier, auteur, reach, ER, clics), export CSV, une ligne ouvre le panneau du post (chiffres contre la moyenne du réseau, lecture d'Iris).
- **Audience** : abonnés (120 000, comme Listening), nouveaux abonnés, part des moins de 25 ans, pays et villes, âge et genre, par réseau ou tous ; la recommandation d'Iris quand l'audience ne colle pas au contenu (TikTok à 62 % de moins de 25 ans) avec « Brief Atlas ».
- **ROI** (GA4 mocké) : sessions, commandes, revenu, revenu par clic, par réseau (depuis les clics d'Explore), par campagne (revenu par euro de boost, boosts du mois compris), posts qui ont vendu ; « Tell Sage » en fait un fait Playbook (Undo).
- **Anomalies** : ouvertes / fermées, sélection multiple (Mark handled, Snooze a week, Reopen), graphe, cause probable, confiance, **règle qui l'a levée** (lien pour l'éditer), actions (Atlas, Sage, boost avec confirmation et budget restant). Les règles d'alerte se règlent sur la fiche d'Iris (onglet Alerts) et sont évaluées à chaque battement : une règle créée par Sam peut lever une anomalie dans la seconde.
- **⌘K et Chat** : « Iris, a monthly report for Claire… », « Make the report shorter and add the top 3 posts », « Send it to Claire every Monday », « How did TikTok do last week? », « When should I post on TikTok? », « Reels vs carousels », « How are we doing? », « Which network brings sales? », « Who follows us on TikTok? » : mêmes chiffres qu'à l'écran.
- **⇧D** : « LinkedIn follower spike » (passe par les règles et le cran), « TikTok audience doesn't match the content » ; Skip to tomorrow écrit le brief du jour (et le lundi le rapport hebdo et les rapports programmés).

### 6.5 Listening — Echo

Onglets : **Competitors** · **Mentions** · **Creators** · **Trends** · **Searches**. Les badges veulent dire « needs you » :
événements sans riposte, mentions non vues qui demandent un humain, créateurs à fit sans suite.

- **Gérer les concurrents** (« Manage competitors ») : site (lien réel), comptes par réseau, date de suivi, nombre
  d'événements ; ajouter (plafond du garde-fou), modifier, pause, retirer. Un concurrent ajouté est « lu » en 10 min
  (30 derniers jours) : ligne au Benchmark, fiche, part de voix, puis un premier événement dans l'heure.
- **Competitors · Events** : fil des événements (seedés et nés des concurrents ajoutés), page d'événement avec preuve,
  impact, lecture d'Echo et ripostes qui agissent : contre-post d'Atlas (Suggest verrouillé), brief Sage, email aux
  ventes selon le cran, Nova, leçon, rien. Régler un événement ici retire toutes ses cartes du Desk.
- **Competitors · Benchmark** : sélecteur de réseau (`?net=`). « All networks » : tableau comparatif, part de voix
  recalculée parmi les marques suivies (somme 100), top posts, leçons. Par réseau : Fernway (chiffres d'Iris, posts
  réels d'Atlas sur 7 jours) et les concurrents classés par taux d'engagement, meilleur post de chacun, lecture d'Echo,
  « Atlas tests their format ».
- **Mentions** : barre de sentiment, filtres sentiment / produit / tag, à risque, masquées ; non vues en gras (ouvrir =
  vu, « Mark N as seen ») ; sélection multiple (Nova reply, Hide, Hand to Atlas, Tag, corriger le sentiment), panneau
  de détail, export CSV. **Manage tags…** : tags éditables avec règle (produit, presse, créateur, concurrent, mots),
  appliquée à tout le flux avec Undo.
- **Creators** : auteurs de 5 000 personnes ou plus, audience, sentiment, concurrents qu'ils citent, verdict d'Echo
  (fit = positif, ≥ 10k, pas signé ailleurs) ; fiche ; Shortlist, « Propose a collab » (DM de Nova sur le Desk).
- **Trends** : tendances avec croissance, réseaux, adéquation, exemples ; Hand to Atlas.
- **Searches** : table (slots « N of 15 »), une nouvelle recherche collecte ~10 min puis affiche son volume. Chaque
  recherche ouvre sa page : lecture d'Echo (ce qui domine sur 24 h, le mot partagé par les plaintes, la voix la plus
  forte, les réponses en attente), quatre chiffres nommés, son propre fil. Mots-clés : tous les mots d'un mot-clé,
  n'importe quel mot-clé, moins les exclusions.
- **Pic négatif** (⇧D) : 27 vraies mentions entrent dans le flux ; le garde-fou lève la carte Urgent avec trois coups
  qui agissent (pause d'Atlas + déclaration chez Claire, une carte de réponses Nova pour les 27, surveiller 2 h puis
  rendre compte). Pas de Crisis room.
- ⌘K / Chat : « negative mentions », « Who are the creators talking about Peakline? », « How do we compare with
  Trailkind on TikTok? », « What is Peakline up to? » répondent avec les chiffres de l'écran.

### 6.6 Strategy — Sage

Onglets : **Campaigns** · **Pillars and cadence**.

- **Campaigns** : en tête, **Moments ahead** (Black Friday sans remise, première neige, dernière date de commande, première rando de l'année : raison chiffrée, piliers, idées pour Atlas, *Add to the calendar* / *Not this year*), puis les campagnes avec statut (`Plan to review` · `Live` · `Done`), objectif, progression, dates. Données : **Trail Week** live (24 nov – 7 déc, ralentit après un départ à 128 %), **Repair Friday** terminée avec bilan d'Iris, **Gift guide that lasts** à valider.
- **New campaign brief** : champ libre + *More details (optional)* (produit, date de lancement, objectif et unité, budget, audience, réseaux cochés depuis la cadence). Sage réfléchit (« Reading your last 3 launches · Checking pillars and cadence · Splitting the work between agents ») et, si l'objectif chiffré ou la date manquent, pose la question (trois réponses en un clic, saisie libre, *Let Sage decide*). Un brief venu d'un autre agent ne pose pas de question : la campagne affiche « Sage assumed ».
  - **Plan** : gabarit selon l'objectif (pré-commandes, commandes, revenu, inscriptions, demandes, abonnés), angles du produit, accroche de la saison, réseaux tirés de la cadence, un pilier par post ; objectif et KPI, messages, audience, frise des phases, posts par phase, *Who does what*, risques, budget.
  - **Approve campaign** (désactivé avec la raison au-delà de 2 campagnes live) · **Request changes** (v2 qui applique chaque demande de la note et la liste au diff) · **Discard**.
- **Campagne live** : progression et « % of trajectory », courbe plan vs réel qui avance avec les jours, ajustements de Sage (Apply / Decline, Undo au journal), **Campaign label** (posts d'Atlas, conversations de Nova), lien vers le calendrier. À la fin, **Recap by Sage, with Iris’s numbers** (objectif, réseau qui a porté, ajustements, coût par résultat) et une leçon en proposition.
- **Pillars and cadence** : parts réelles sur 30 jours calculées depuis les posts d'Atlas, cible, écart ; *Edit pillars* (parts et descriptions, contrôle de Sage) ; cadence par semaine (7 derniers jours calculés, cibles à steppers journalisées) ; propositions de Sage (Apply / Decline, Undo).

### 6.7 Agents

Une seule entrée du rail, trois onglets : **Team** (`/agents`), **Shared rules** (`/agents/rules`, §6.9) et **Escalation** (`/agents/escalation`). Le seul compteur d'onglet est celui de Shared rules : les règles proposées par les agents, qui attendent Sam. Les anciennes adresses `/playbook…` redirigent (`?tab=words|facts|voice` vers la section de Shared rules, `?tab=escalation` vers Escalation, `?tab=pillars` vers Strategy › Pillars).

- **Équipe** (onglet Team) : 5 cartes. Monogramme, nom, département, statut, activité en cours, planning, **jauge d'autonomie** (combien d'actions en Act / Draft / Suggest), track record sur 30 jours (handled alone, escalated, approved unchanged %, undone), bouton Pause/Resume.
- **Fiche agent** (`/agents/:id`, onglets Autonomy · Guardrails · Rules · Escalation · Alerts pour Iris et Echo · Track record · Activity) :
  - **Autonomy** (pattern *autonomy-dial*) : un réglage global (**Cautious** / **Balanced** / **Autonomous**, **Custom** dès qu'une action est réglée à la main) qui déplace les actions non verrouillées selon leur risque, avec Undo ; une phrase explique le preset et une seule ligne donne le volume (« 275 of 303 messages a week run on their own »). En dessous, une liste dense, une ligne par action, groupée par risque (**Low risk** · **Medium risk** · **Always you**) : icône teintée à la couleur de l'agent, nom, et un contrôle segmenté **Suggest · Draft · Act** dont le cran choisi prend la couleur de l'agent. Le détail est à la demande (chevron) : l'exemple Fernway, ce que produit chacun des trois crans (le cran actuel teinté), le volume et le taux d'approbation sans modification. Après un changement, une ligne sous l'action dit ce qui se passe désormais. Les actions 🔒 sont dans **Always you**, sans contrôle, avec la raison.
  - Effet immédiat et visible : passer une action en Act fait quitter le Desk aux remontées concernées, qui deviennent des entrées du journal (« Handled on its own after you switched to Act »).
  - **Promotion history** : demandes passées, acceptées ou refusées, rétrogradations.
  - **Guardrails** : éditables (plafonds, horaires, sujets toujours remontés).
  - **Rules** : toutes les règles et tous les faits du Playbook que l'agent applique, chacun avec sa portée écrite (« Nova only », « Shared with Atlas », « Shared · all agents »), en pause, modifiables et supprimables sur place (Undo) ; modifier une règle partagée dit pour qui d'autre elle change. « Add a rule for Nova » ajoute une règle pour cet agent seul. Les règles proposées qui le concernent s'affichent en tête ; le compteur de l'onglet est leur nombre. Une ligne « Also follows the brand voice and words » mène à Shared rules.
  - **Escalation** : en lecture, les règles que l'agent surveille, avec « Edit in Escalation » (liste filtrée sur l'agent).
  - **Track record** : graphe des 30 derniers jours, taux d'approbation sans modification par action, dernières annulations.
  - **Recent activity** : les 20 dernières actions.
- **Alerts** (Iris et Echo) : règles éditables (métrique ou recherche, condition, seuil, vers le Desk ou Claire, actif ou non).
- **Garde-fous** ajoutables, modifiables, supprimables. **Escalation** : règles structurées à partir de conditions prêtes à l'emploi (blessure ou sécurité, presse, menace juridique, créateur au-delà de N abonnés, remboursement au-delà de N €, plus de N mentions négatives par heure, mention d'un concurrent, dépense au-delà de N €, métrique en baisse de plus de N %), envoyées à Sam ou à Claire, activables et supprimables ; elles s'éditent à un seul endroit, l'onglet **Escalation** d'Agents : une liste filtrable par agent, où l'on choisit qui décide (You ou Claire), ajoute, active et supprime (Undo). La fiche agent et Settings › Approver la montrent en lecture avec un lien.
- **Demandes de promotion** (pattern *permission-request*) : un agent qui le mérite remonte une carte **Promotion request** sur le Desk : « Nova wants to answer complaints on her own. You approved 46 of her last 50 complaint replies without changes. » Preuves dépliables (les 50 réponses, les 4 modifiées avec le diff). Choix : **Allow** · **Try for a week** (revient automatiquement en Draft après 7 jours, avec un bilan) · **Not yet**.
- **Rétrogradation** : après 2 annulations sur la même action en 24 h, l'agent propose lui-même : « You undid 2 of my shipping refunds today. I'll go back to drafting them until you say otherwise. » Choix : OK · Keep me on Act.

### 6.8 Activity

Journal complet des agents (pattern *agent-ledger*) : horodatage, agent, action, objet (lien), raison, règle appliquée, statut (`Done` · `Approved by you` · `Edited by you` · `Rejected` · `Undone` · `Redone`), Undo/Redo tant que c'est réversible, avec le temps restant. Filtres : agent, statut, réversible seulement, période. Groupement par jour. Une ligne s'ouvre sur le détail (avant/après, sources). Données : ~120 entrées sur 3 jours.

### 6.9 Playbook (Agents › Shared rules)

La mémoire de marque, visible et éditable (pattern *memory-panel*). « Playbook » reste le nom de l'ensemble des règles (« Add to Playbook », « Playbook check ») ; l'écran qui les montre est l'onglet **Shared rules** d'Agents. Ce qui vaut pour un seul agent se lit aussi dans l'onglet Rules de sa fiche (§6.7).

- Sections (contrôle segmenté, `?section=`) : **Rules** (do / don't, avec en texte les agents qui les appliquent et leur nombre d'utilisations sur 30 jours, filtre par agent) · **Facts** (produits, prix, politiques de retour et garantie, horaires du support : ce que Nova cite) · **Words** (interdits et préférés) · **Voice** (curseurs : warm ↔ neutral, playful ↔ serious, short ↔ detailed, avec un exemple de phrase qui change en direct). L'escalade a son propre onglet (§6.7) ; les piliers ne vivent que dans Strategy.
- Chaque règle : texte, origine (« Added by you » · « Learned from your edit on Nov 18 » · « Onboarding »), agents concernés, utilisations, **Pause** et **Delete** avec Undo.
- **Règles proposées** par les agents, repérées dans les corrections de Sam : « You removed emojis from 9 of my last 10 LinkedIn drafts. Make it a rule? » → Add · Dismiss.
- Test en direct : un champ « Try a message » où Sam colle un texte et voit quelles règles il enfreint.

### 6.10 Barre de commande (⌘K)

- Navigation (« Go to Inbox »), actions (« New post », « New campaign brief », « Pause Atlas ») et **brief à un agent**. Le destinataire est détecté par nom ou par intention (pattern *agent-router*, réattribuable).
- Intentions scriptées (au moins 12) avec réponses crédibles et résultat concret :
  1. « Atlas, a post about the weekend sale on Friday » → brouillon dans Publishing + remontée.
  2. « Write a LinkedIn post about our repair programme » → idem, routé vers Atlas.
  3. « How did TikTok do last week? » → carte de réponse d'Iris avec graphe.
  4. « Best time to post on Instagram? » → réponse d'Iris avec heatmap.
  5. « What is Peakline up to? » → résumé d'Echo avec liens vers les événements.
  6. « Pause Atlas until Monday » → confirmation et changement d'état.
  7. « Nova, never offer codes on complaints » → règle proposée pour le Playbook.
  8. « Brief: launch the Storm Jacket in March, 300 pre-orders » → ouvre Strategy avec le brief pré-rempli et lance Sage.
  9. « What needs me today? » → résumé de la file du Desk.
  10. « What did Nova do overnight? » → résumé filtré du journal.
  11. « Reply to Léa » → ouvre la conversation dans l'Inbox.
  12. « Show me negative mentions this week » → Listening filtré.
- Repli pour le reste : « I'm not sure what you mean. I can draft posts, answer questions about performance, check competitors or change how agents work. » avec 3 suggestions cliquables. Jamais de réponse inventée sur des données.
- Réponses « streamées » mot à mot (simulé), avec une phase de réflexion courte.

### 6.11 Première expérience (signup → Desk Jour 1)

Objectif : en moins de 3 minutes, l'utilisateur voit ses agents travailler sur **ses** données. Une seule saisie (l'URL du site), tout le reste est déduit et proposé ; il confirme, corrige ou écarte, il ne remplit jamais de formulaire. Chaque écran a une décision évidente, tout se passe et tout se reprend. Plein écran, sans barre latérale ; en haut, le logo, une progression en 4 étapes (Account · Your brand · Your team · First results) et « Finish later » (démarre l'équipe avec ce qui est réglé, le reste attend dans la checklist). En bas de chaque écran, un lien discret « Running a test session? Skip to the 30-day workspace ». Pied d'écran collant : Back à gauche, la décision à droite. Chaque écran a sa route (`#/onboarding/signup`, `site`, `reading`, `accounts`, `playbook`, `team`, `results`) : le bouton retour du navigateur marche, un rechargement reprend au même écran, les réponses sont dans l'état persisté (`setup`).

1. **Signup** : « Meet the team that runs your social media ». « Continue with Google » (sélecteur de compte mocké : Sam Rivera, sam.rivera@fernway.co) ou e-mail pro (validation en ligne). Prénom, nom et site sont déduits de l'adresse (`sam.rivera@fernway.co` → Sam Rivera, fernway.co ; une messagerie grand public ne donne pas de site). À droite, une illustration (les 5 agents sur un sentier vers un sommet) et une ligne par agent.
2. **Site** : « What's your website, Sam? », pré-rempli depuis l'e-mail (« From your email address. »), sinon « Use fernway.co ». N'importe quelle URL lit Fernway, et l'écran le dit (« This test always reads Fernway, whatever the address. »). CTA orange « Read my brand ».
3. **Lecture en direct** (~13 s, « Skip the wait ») : à gauche 5 phases (site, centre d'aide, comptes, 200 derniers posts et réponses, concurrents) qui passent de la roue à la coche avec leur résultat ; à droite la fiche Fernway se construit au fil des découvertes : produits et prix, politiques, 9 comptes, voix, 4 concurrents. Fin : « Here's Fernway, as we read it » → « Review what we found ». La séquence est un modèle pur (`readingAt(ms)`).
4. **Comptes** : « We found your 9 accounts », tous cochés, chacun avec l'endroit où il a été trouvé (« Linked in your site footer », « Your checkout runs on Shopify »). Un clic, « Connect 9 accounts », connecte le lot en cascade. On peut continuer avec une partie, ou sans.
5. **Playbook** : « Here's how Fernway sounds », un ensemble à valider (§3.6) en sections Voice (avec l'exemple de réponse de Nova), Rules, Facts, Competitors, Always a person. Chaque ligne : case cochée, texte modifiable au clic (Entrée valide, Échap annule, « Restore » revient au texte proposé), et sa preuve (« Seen in 168 of your last 200 replies »). CTA « Add 15 to my Playbook ». Les 10 autres faits (catalogue, centre d'aide) entrent sans revue.
6. **Équipe et autonomie** : les 5 agents par ce qu'ils vont faire pour Fernway (« 3 questions from last night are waiting… »). Un seul réglage global Cautious (Recommended) / Balanced / Autonomous, sa phrase, et les compteurs nommés (Act alone · Draft for you · Suggest only) ; « Adjust per agent » ouvre un réglage par agent, optionnel. CTA orange « Start my team ».
7. **Premiers résultats** : une bande des 5 agents (roue « Reading messages » → coche « 3 replies ready »), puis une carte par agent, l'une après l'autre (~1,5 s chacune) : Nova a écrit les réponses à 3 questions de la nuit (« Send 3 replies » : le moment « aha », Undo 10 min ; « Edit on my Desk ») ; Atlas propose une idée avec sa preuve chiffrée (« Draft it » puis « Schedule for Thu 27, 18:30 », car il est en Suggest) ; Echo a repéré la baisse de prix de Peakline ; Iris sort un premier constat chiffré (Community : 4,4 % d'engagement pour 9 % des posts, barres par thème) ; Sage propose 4 piliers et une cadence. Ce sont de vraies cartes du Desk : les décider ici les décide partout. CTA « Open my Desk » avec « N things need you on your Desk ».

**Desk Jour 1.** État `phase: 'day1'`, construit par `buildDay1` à partir du seed Jour 30 : l'historique importé des réseaux reste (posts, conversations, analytics), ce que les agents ont fait en 30 jours disparaît (journal, track records, demandes de promotion, règles apprises, chats). Autonomie = le preset choisi ; règles = les propositions gardées ; concurrents suivis = ceux gardés ; une carte n'existe que si son réseau est connecté. Sur le Desk, jusqu'au premier brief : la carte « Welcome aboard, Sam. » (ce que chaque agent a fait, Review N / Open, « Your first morning brief arrives tomorrow at 07:00. ») et la checklist **Getting started**, repliable en une ligne, à côté : envoyer les premières réponses de Nova, décider de l'idée d'Atlas, connecter ce qui manque (connexion en ligne), vérifier le Playbook, voir l'autonomie des agents (cochés à la visite), lire le premier brief (demain 07:00). Chaque item dit ce qu'il débloque (« Then: after 20 approvals in a row, Nova can ask to answer on her own. »). Le moteur d'événements tourne mais saute les événements qui supposent un historique (promotion, rétrogradation, règles apprises, campagne). « Skip to tomorrow 08:00 » livre le premier brief, aux chiffres du Jour 1. Settings › Connected accounts montre les comptes non connectés avec « Connect ».

### 6.12 Settings

Comptes connectés (état, dernière synchro, reconnecter) · notifications in-app (quels types déclenchent un toast) · profil de Sam · Claire comme valideuse : résumé en lecture des sujets qui lui vont, lien « Edit in Escalation » (§6.7). Rien de plus.

---

### 6.13 Chats — parler à l'équipe

Pattern standard du marché (Hootsuite Wisdom, Sprout Trellis, Ask Vista, Emplifi Fuel AI), ici en version « équipe ».

- **Où** : une entrée **Chats** dans la barre latérale (liste des conversations, non lus, « New chat ») et un **tiroir** ouvrable depuis n'importe quelle page (bouton « Chat » dans la barre du haut). Le tiroir démarre la conversation avec le **contexte** de la page (« the Inbox · Broken strap on a 3-week-old Ridge 28L »). ⌘K reste pour les commandes rapides.
- **À qui** : à l'équipe. Protopulse route vers le bon agent ; une **@mention** (« @Atlas ») choisit. Plusieurs agents peuvent répondre dans le même fil (Echo repère Peakline, Atlas propose un contre-post).
- **Réponses en cartes riches**, toujours avec les sources : graphe d'Iris, brouillon de post avec réseau et créneau, réponse client avec l'avatar de l'auteur, liste d'éléments cliquables, règle proposée, brief de campagne.
- **Agir avec validation** : rien ne part sans un clic dans le fil. Schedule (le post rejoint le calendrier), Send (la réponse part, la carte du Desk se règle), Add to Playbook, Build the campaign plan (ouvre Sage), Boost. Edit et Shorter sur les brouillons.
- **Suivis proactifs** : un agent revient dans la conversation plus tard (« Early read on the post Atlas scheduled… boost it with €100 ? »), sans toast : la conversation passe en non lu.
- Deux conversations existent au départ (« Why is TikTok down? », « Weekend sale post »). Un état vide propose des exemples de demandes.

### 6.14 Video — Juno

Inspirations : Opus Clip (score de viralité, ClipAnything, auto-reframe, templates de sous-titres, B-roll, brand kit), ElevenLabs (doublage dans la même voix, Voice Isolator, overdub), Remotion (un clip est une composition : tout ce qui est à l'écran au temps t se calcule à partir du clip), Descript (on édite la vidéo en éditant le texte).

- **Médias réels** : 3 vidéos MP4 (footage libre de droits + voix off générée), transcript horodaté au mot, pistes `clean` (studio sound) et doublages FR/DE/ES/IT dans la même voix, posters et bandes de vignettes. Régénérés par `scripts/media/build.mjs`. Le live « Repair Friday » est affiché 52 min avec chapitres ; le fichier ne contient que les chapitres retenus.
- **Onglets** `/video` (Clips) · `/video/sources` · `/video/brand`. Phrase de Juno en tête.
- **Clips** : Ready to review (ligne : couverture du clip et durée, hook, « Virality 87 », preuve chiffrée, réseaux, langues (FR DE), vidéo d'origine, et ce que Juno laisse à Sam : « 1 caption to fix », « Framing to check », « 2 language versions to review », « Held: Hugo is on screen without a signed release » ; Review, Send to Atlas, Not now ▾ avec raisons), Being made (phase et progression), Later, Sent to Atlas (créneau), Published (vues, engagement, rétention, chiffres d'Iris). Sélection et « Send N to Atlas » avec un Undo. Filtre par vidéo.
- **Sources** : chaîne surveillée (switchs « Clip new uploads » et « Clip recorded lives and webinars »), Paste a link (validation, un lien privé échoue avec la raison et Retry ; le prototype ne peut pas ouvrir de lien : un échantillon est utilisé et l'écran le dit), Upload a file (fichier réel lu dans le navigateur pour la session ; le transcript est un échantillon et l'écran le dit). Fiche vidéo : lecteur, « n of 5 clips sent this week », transcript avec les moments choisis et leur score, chapitres, **Find clips about…** (sujet, longueur, nombre → nouveaux clips, chacun avec ses preuves : le moment, la tendance d'Echo qui recoupe, le clip publié le plus vu du pilier), **People on screen** (Hugo, autorisation signée ou non).
- **Éditeur pleine page** `/video/clips/:id` : transcript à gauche (mots cliquables, Delete / Restore, Fix spelling pour les sous-titres seulement, mots mal entendus soulignés avec « Fix it », Change the words verrouillé et confirmé par Sam, Remove fillers, Remove pauses, Start earlier / End later), lecteur au centre avec un **sélecteur de version** (All · TikTok · Reels · Shorts · LinkedIn feed · Facebook : 9:16, 4:5, 1:1, 16:9, hauteur des sous-titres, zones de sécurité propres à chaque app, « Juno's version »), inspecteur à droite (Captions : 5 templates, police, taille, position, mots par ligne, couleur, emoji, capitales, langue, export `.srt` réel · Layout : note de cadrage selon le cran, Auto-track, Fill, Fit, Split, position du sujet · Brand : logo, barre de progression, carte hook, carte de fin, B-roll suggéré sur les mots, musique et ducking · Audio : studio sound avec « Hear the original », doublages (Listen, Approve en Draft), mots re-voisés · Post : motif de retenue et « Release is signed », score et raisons avec « Track record », « Why this moment » sourcé et clip comparable, hooks, **Cover** (3 cadres, texte, titre YouTube), légende par réseau avec la vérification Playbook, durée et version hors spec par réseau, label et campagne de Sage, créneaux d'Atlas), timeline en bas (vidéo, sous-titres, B-roll déplaçable, musique, poignées de trim calées sur les mots, zoom), **Ask Juno** ancré (Shorter, Start with…, Remove the ums, Punchier captions, Pick a better cover, French version ; refus franc pour changer les mots de quelqu'un). Undo/Redo ⌘Z.
- **Desk** : carte « N clips from … are ready » (Juno → Atlas) dont l'approbation envoie les clips au calendrier ; carte « Fix … in N captions » en Draft ; Good news réelle quand un clip publié dépasse 1,5× la moyenne de son réseau. Undo d'une décision du Desk retire aussi les posts ou les corrections.

## 7. Proactivité simulée

Le prototype vit sans qu'on touche à rien.

- **Moteur d'événements** : toutes les 25 à 40 s (cadence réglable), un agent produit un événement scripté. Si l'action correspondante est en Act, il devient une entrée du journal avec toast et Undo. Sinon, il devient une remontée qui arrive en haut de la bonne file avec une animation.
- **Script** (au moins 20 événements, joués dans l'ordre puis en boucle avec des variantes) couvrant : nouvelle plainte, question produit, DM presse, avis 1 étoile, créateur qui mentionne la marque, pic de mentions négatives, baisse de prix chez Peakline, post viral chez Trailkind, anomalie de reach, post qui surperforme (boost ?), visuel manquant, code promo manquant, **demande de promotion** de Nova, **rétrogradation** proposée par Nova, ajustement de cadence par Sage, campagne Trail Week qui dépasse sa trajectoire, Claire qui répond, règle proposée pour le Playbook.
- **Agents en pause** : leurs événements ne se produisent pas, et la pilule Running now l'indique.
- **Vidéos** (événements `video` du script) : un nouvel upload YouTube passe par Transcribing · Finding moments · Reframing · Writing captions (~40 s), puis les clips arrivent. Suggest : Juno demande avant de découper ; Draft : carte Desk ; Act : clips faits seuls. Si l'envoi est en Act, Juno envoie elle-même les clips à 80+ (Undo au journal). Événement « Juno · product names misheard in captions » : relecture des sous-titres des clips à revoir, selon le cran de Fix captions. Un clip envoyé passe Published à l'heure de son premier post (« Skip to tomorrow 08:00 » pour le provoquer).
- **Idées proactives** (événements `idea` du script, dans le même moteur) : **flux continu** (un post d'Iris qui repart, une tendance d'Echo, une mention client : l'idée arrive en haut d'Ideas, datée et sourcée) ; **lot du jeudi** (« Ideas for next week », jusqu'à 6 idées qui peuvent rejoindre Plan review) ; **urgent → Desk** (fenêtre courte, ex. première neige : carte Needs you qui ouvre l'idée ; traitée d'un côté, elle disparaît de l'autre) ; **trou du calendrier** (jour à moins de 2 posts ou pilier sous la cible). Le battement de cœur fait expirer les idées à fenêtre et revenir les « Not now ».
- **Le temps avance** : l'horloge de l'app part de 08:12 et avance avec le temps réel. « Skip to tomorrow 08:00 » (panneau modérateur) génère un nouveau brief et une nouvelle file.

### 7.1 Claire simulée

« Ask Claire » envoie la remontée dans **Waiting on Claire**. Après 30 à 60 s, Claire répond : approuve (« Go. Keep it short. »), demande une modification (« Remove the price, legal hasn't confirmed it. ») qui renvoie la carte à Sam avec le commentaire, ou refuse (« Not now, we'll address it in Thursday's newsletter. »). La réponse dépend du type de remontée (table de réponses scriptées). Toast « Claire replied ».

---

## 8. Panneau modérateur (⇧D)

Caché, pour l'animateur du test.

- **Day 30 workspace** (reset, état initial Jour 30) · **Start onboarding** (ouvre le signup) · **Day 1 Desk** (saute le signup avec tous les défauts) · une ligne dit l'état courant. Tous gardent le tester log.
- Proactive feed : on/off, cadence (10 s / 30 s / 60 s), **Trigger now** avec un menu de tous les événements scriptés.
- Les quatre arrivées d'idées sont déclenchables une à une (marquées « idea » / « idea + Desk ») : knots carousel (flux), first snow (urgent), empty day (gap), Thursday batch (hebdo).
- L'arrivée d'une vidéo est marquée « video » : new YouTube upload (Storm Jacket on the GR20).
- Time : Skip to tomorrow 08:00.
- Scenario presets : « Calm morning » (4 remontées), « Busy morning » (12), « Competitor day » (Peakline + Trailkind), « Trust test » (2 demandes de promotion + 1 rétrogradation).
- **Tester log** : enregistre chaque action du testeur avec horodatage (navigation, approve/edit/reject/snooze/undo, changements d'autonomie, commandes tapées, temps passé par carte). Ideas : idée ouverte, réorientée (mode), décision `ideas/decision` (acceptée telle quelle / modifiée / rejetée avec la raison / envoyée à Sage) avec le temps jusqu'à la décision ; compteurs dédiés. Compteur « Onboarding screens » (écrans du parcours atteints). Compteurs en direct. **Export JSON** et **Clear**. Stocké en localStorage.

---

## 9. Données mockées

Un module de données par domaine, typé. Toutes les dates sont relatives au « maintenant » de l'app. Volumes minimum :
- 18 remontées initiales sur le Desk couvrant les 5 agents et tous les types, dont 3 « Good news » ;
- 55 conversations Inbox (8 réseaux, dont 3 sur Fernway Repair, 4 Trail Week, 4 en langue étrangère) + 15 contacts avec commandes, 8 règles d'Inbox, 8 réponses sauvegardées, 7 labels, une équipe de 4 ;
- Publishing : 34 posts (semaines passée et courante, dont 3 sur Fernway Repair, 3 brouillons), 14 items de plan + 14 d'un plan v2, 30 médias (1 licence de créateur qui finit en décembre), 2 files (8 textes), 1 note de calendrier, 7 profils dont Fernway Repair ;
- Insights : 4 rapports hebdo, 1 brief, 1 bilan de campagne (+ un brief par jour simulé, un hebdo le lundi), 6 anomalies (3 ouvertes) et 9 signaux mesurés pour les règles d'alerte, 4 règles d'alerte, 18 posts suivis, 90 jours de portée quotidienne, 7 profils de best time, audience de 6 réseaux (120 000 abonnés), entonnoir GA4 par réseau et 2 campagnes, 2 boosts du mois (€580 de €1,500) ;
- 4 concurrents (chiffres par réseau), 15 événements concurrents, 20 top posts concurrents, 8 leçons, 50 mentions (+ 27 du pic), 5 tags à règle, 5 fiches créateurs, 8 tendances, 12 recherches, 3 règles d'alerte ;
- 3 campagnes (1 live, 1 terminée, 1 à valider), 4 piliers, 6 cibles de cadence, 3 propositions, 4 temps forts ;
- 25 règles de Playbook, 3 règles proposées, 20 faits ;
- 120 entrées de journal ;
- 3 vidéos (2 traitées au départ, 1 qui arrive), 8 clips dont 6 à relire, 1 programmé, 1 publié ; 5 mots mal entendus par le speech-to-text ; 1 client à l'écran sans autorisation (Hugo, GR20) ; une version par réseau, une couverture et un « Track record » par clip.

Tous les textes sont crédibles, spécifiques et variés : pas de lorem ipsum, pas deux brouillons identiques, des noms et des handles réalistes, des chiffres cohérents entre les écrans (le reach du brief = celui d'Explore).

Visuels : scènes et photos produit **générées en SVG** dans le code (montagne, lac, sac, gourde, veste, atelier…), aucune image téléchargée. Clients : initiales ; agents : avatars illustrés (§10).

---

## 10. Direction visuelle — « Friendly, aux couleurs d'Agorapulse »

Un outil où l'on retrouve une équipe sympathique, pas un cockpit. Clair par défaut, un thème sombre au choix (bouton soleil/lune dans la barre du haut et dans Settings, choix mémorisé).

- **Palette Agorapulse** (valeurs `--ref-color-*` d'ADS, lues sur `agorapulse/design`) : canevas `grey-bg #F9F9FA`, cartes blanches **bordées en `grey-20 #D6DAE0`**, sans ombre (pas d'élévation imbriquée) ; fonds secondaires `grey-05` / `grey-10`. Sombre (ADS n'en a pas, dérivé) : nuit bleu marine construite depuis `grey-150` (`#121a28`).
- **Encre** : `grey-100 #344563` et `grey-80 #5D6A82`, jamais plus clair (`grey-60` = désactivé). Hiérarchie par taille et graisse. Tous les filets en `grey-20`.
- **Orange `#FF6726`** (`orange-100`, survol `orange-150`) pour l'action principale. **Bleu électrique `#178DFE`** pour tout ce qui est interactif : liens, actions tertiaires (`#0E72D6`), focus, sélection, contrôles, survol des cartes (bordure bleue). Jamais de bleu pour teinter une donnée : les graphes utilisent `data-navy #4A6ACC`. Statuts : `red`, `tag-orange`, `green` d'ADS.
- **Une couleur par agent**, utilisée partout où l'agent apparaît (avatar, tuiles d'icônes, libellé « Nova’s reply », lignes du Shift board, graphes qu'il signe) : couleurs data d'ADS — Nova peony `#CC2878`, Atlas tangerine `#DC6A30`, Iris `#8A62CC`, Echo cyan `#12AABA`, Sage lime `#42B85A` (pas de bleu, réservé à l'interactif). Chaque teinte a un lavis (fond) et une encre foncée (texte AA sur le lavis). Réseaux aux couleurs `--ref-color-<réseau>` d'ADS.
- **Avatars illustrés** : un petit personnage SVG par agent dans sa couleur, avec un trait distinctif (Nova une bulle, Atlas un avion en papier, Iris des lunettes, Echo des ondes, Sage une feuille ; Claire un avatar humain neutre). Tailles 22 / 28 / 44 / 96.
- **Icônes teintées** : chaque type de remontée a son icône dans une tuile aux couleurs de l'agent (message, calendrier, graphe, radar, flamme, bouclier, livre…). Les réseaux sont des pastilles à leur couleur.
- **Illustrations** plates et chaleureuses, construites avec les tokens (marchent dans les deux thèmes) : en-tête du brief (montagne, lac, soleil selon l'heure), All clear (tente), états vides (jumelles, plateau, calendrier, lune), onboarding (une scène par étape), fiches agents (l'agent dans son décor).
- **Typographie** : Geist, corps 14, échelle 12 · 13 · 14 · 16 · 19 · 24 · 32. Mono seulement pour les horodatages et les raccourcis, jamais pour les phrases.
- **Formes** : rayons 10 (contrôles), 16 (cartes), 20 (panneaux). Chips et pilules entièrement arrondies. Espacements généreux (cartes en 20 px).
- **Ce qui se clique se voit** — trois apparences seulement :
  - **Action** : bouton principal (orange plein, une seule par zone), secondaire (blanc, bordure `grey-20`), tertiaire (sans fond, texte et icône bleus, souligné au survol). Les boutons icône seule (fermer, supprimer) restent gris.
  - **Choix** (options d'une décision, ripostes) : ligne blanche avec bordure, touche numérique et flèche à droite ; survol = bordure bleue et fond `electric-blue-05` ; « Recommended » en texte bleu avec une étoile, sans pastille.
  - **Information** : jamais de fond ni de bordure — texte avec icône ou séparateur « · » (sources, règles appliquées, métadonnées). Les statuts restent de petites pastilles teintées, sans bordure ni ombre, plus petites que les boutons.
  - Texte d'action `electric-blue-150` ≥ 4,5:1 sur blanc. Le libellé blanc sur `orange-100` suit ADS (≈ 2,9:1, choix assumé du DS).
- **Règles conservées** : pas de labels en majuscules, pas de barre d'accent latérale sur un élément actif, boutons jamais pleine largeur, une métrique est toujours nommée en texte, couleurs de statut (urgent, attention, ok) réservées au statut.
- **Mouvement** : < 250 ms, `cubic-bezier(.23,1,.32,1)`, transform et opacity seulement ; le détail monte en cascade (30 ms), les éléments traités sont tamponnés puis glissent, les nouveaux arrivent par le haut. `prefers-reduced-motion` respecté.
- **Responsive** : pensé pour 1280-1600 px, utilisable à 375 px (barre latérale en tiroir, liste puis détail empilés, barre du haut compacte).
- **Accessibilité** : contrastes AA dans les deux thèmes, focus visibles, vrais boutons et liens, navigation clavier complète, `aria-live` pour les arrivées.

## 11. Composants de référence (affectDS)

`~/code/affectds` contient des recréations HTML/CSS/JS de patterns agentiques (AffectUI, MIT). **Reprendre leur comportement, leurs raccourcis et leurs états, pas leur style** (ils sont sur les tokens Agorapulse) : les porter en composants React stylés avec les tokens ci-dessus. Lire le `.js` de chacun avant de l'implémenter (contrat documenté en tête de fichier).

| Besoin Protopulse | Composant affectDS |
|---|---|
| Mode Focus | `review-center` |
| Carte de remontée, approbation | `approval-card`, `approval-gates` |
| Décision avec options et Recommended | `decision-card`, `decision-inbox` |
| Brief du matin | `away-summary` |
| Pilule Running now | `running-now` |
| Réglage d'autonomie | `autonomy-dial` |
| Demande de promotion | `permission-request` |
| Journal avec Undo/Redo | `agent-ledger` |
| Shift board | `agent-lanes`, `agent-timing` |
| Relais entre agents | `agent-handoff` |
| Fil d'une remontée | `comment-thread` |
| Correction appliquée à un brouillon | `inline-diff` |
| Suggestion avec confiance et alternatives | `smart-recommendation` |
| Réponses d'Iris sourcées | `cited-answer`, `ai-answer` |
| Phase de réflexion | `thinking-loader` |
| Barre de commande et routage | `command-menu`, `agent-router` |
| Playbook (Agents › Shared rules) | `memory-panel` |
| Répartition des tâches de campagne | `delegate-board`, `agent-plan` |
| Suivi de campagne | `plan-vs-actual`, `kpi-chart` |
| KPI et graphes | `stat-card`, `trend-chart`, `change-summary`, `breakdown-chart` |
| Variantes de post | `experiment-card` |
| Onboarding | `setup-guide`, `stepper-form`, `integration-picker` |
| Toasts, raccourcis | `toaster`, `kbd` |

---

## 12. Contraintes techniques

- **Vite + React 18 + TypeScript strict**, CSS natif avec custom properties (un fichier de tokens, des CSS par domaine). Pas de framework CSS.
- Primitives accessibles quand le natif ne suffit pas (menus, popovers, dialogues, combobox) : Radix UI. `cmdk` pour la barre de commande. `lucide-react` pour les icônes. Graphes en SVG maison (sparklines, courbes, barres, heatmap) : pas de librairie de charts.
- **HashRouter** (GitHub Pages sans config 404). Chaque écran et chaque objet a une URL (`#/inbox/c12`, `#/strategy/campaigns/trail-week`).
- État global : `useReducer` + contexte, découpé par domaine. Persistance en `localStorage` (l'état survit au rechargement, le Reset du panneau le vide). Pas de backend, aucun appel réseau à part les assets.
- Polices auto-hébergées (`@fontsource-variable/geist`, `@fontsource-variable/geist-mono`).
- Déploiement : GitHub Actions → GitHub Pages à chaque push sur `main` (`base: '/protopulse/'`).
- `npm run build` passe sans erreur ni warning TypeScript. Un test minimal (`node --test` ou Vitest) couvre le reducer : transitions d'autonomie, Undo, moteur d'événements, réponses de Claire.

---

## 13. Définition de « terminé »

- Les 12 écrans et sous-vues de §6 existent, sont reliés, avec états vide, chargement et erreur là où ça a du sens.
- Aucun bouton visible sans effet. Aucun « coming soon ».
- Le Desk se traite entièrement au clavier en mode Focus.
- Passer une action en Act modifie le Desk et le journal immédiatement. Une demande de promotion et une rétrogradation se produisent pendant le scénario « Trust test ».
- Un brief tapé dans ⌘K produit un plan de campagne validable, dont les posts apparaissent ensuite dans le calendrier.
- Une riposte concurrentielle confiée à Atlas apparaît comme brouillon dans Publishing et comme remontée sur le Desk.
- Claire répond aux escalades.
- Le panneau modérateur exporte un journal JSON exploitable.
- Une vidéo déclenchée au modérateur produit des clips éditables (sous-titres, coupes, format, doublage audible) qui, envoyés à Atlas, apparaissent dans le calendrier et s'annulent d'un Undo.
- Le site est en ligne sur GitHub Pages et fonctionne à 1440 px et 375 px.

## 14. Hors périmètre

Agence multi-clients · agents Creative (images), Paid, Creators · rendu vidéo réel (l'export d'un clip est simulé) · Crisis room dédiée · vrai LLM ou backend · vue jouable côté Claire · constructeur de rapports · notifications hors de l'app (Slack, email, push) · thème clair.
