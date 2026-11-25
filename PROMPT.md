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

Hypothèses de marché (issues du benchmark) que le proto incarne : un réglage d'autonomie lisible par l'utilisateur métier, la validation d'un plan, un journal de ce que l'agent a fait avec annulation, un brief livré avant la journée, une mémoire de marque visible. Anti-patterns à éviter : autopilote sans revue sur le contenu public, promesse « autopilot » opaque, crédits IA opaques, fonctions annoncées non livrées.

---

## 2. Personas et contexte

- **Sam Rivera**, Social Media Lead chez **Fernway**. C'est l'utilisateur, le testeur joue Sam. Il gère seul les réseaux de la marque avec ses agents. Il ouvre Protopulse vers 8 h avec son café, a 10 minutes avant son premier call, puis revient quand une alerte tombe.
- **Claire Dubois**, Head of Brand. Elle valide ce que Sam lui escalade (budget, presse, sujets sensibles, déclarations). Elle n'est **pas jouable** : c'est un personnage simulé (voir §9.3).
- **Fernway** : marque DTC d'équipement outdoor, basée à Annecy, vend en ligne en Europe. Produits : sac **Ridge 28L** (€140), gourde **Summit Bottle** (€35, garantie à vie), veste imperméable **Storm Jacket** (€220), polaire **Ember Fleece** (€95). Coloris : Moss, Ember, Slate, Glacier. Politique : retours 30 jours, échange gratuit, garantie à vie sur les gourdes, programme de réparation des sacs.
- **Comptes connectés** : Instagram (48k), TikTok (31k), LinkedIn (9k), Facebook (22k), YouTube (6k), X (4k), Google Reviews, Trustpilot.
- **Concurrents suivis** : Peakline (le plus gros, agressif sur les prix), Norrø (premium scandinave, très durable), Trailkind (challenger TikTok-native), Basecamp Co. (grande distribution).
- **Moment du test** : mardi 25 novembre, 08:12. L'espace tourne depuis 30 jours, les agents ont un historique.

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

---

## 4. Les agents

Cinq agents préconfigurés, chacun responsable d'un département. Un agent a : un nom, une couleur et un avatar illustré (§10), un département, une ligne de rôle, un statut (`On shift` / `Paused` / `Off shift`), un planning, une activité en cours, des **actions** avec leur cran d'autonomie, des **garde-fous**, et un **track record** (géré seul, remonté, taux d'approbation sans modification, annulations).

### Nova — Community (Inbox)
Planning : 24/7. Activité type : « Watching 8 inboxes ».

| Action | Risque | Cran par défaut | Verrou |
|---|---|---|---|
| Answer product and shipping questions | safe | Act | |
| Hide spam and bots | safe | Act | |
| Answer complaints | risky | Draft | |
| Send an exchange or a replacement (≤ €150) | risky | Draft | |
| Refund shipping costs (≤ €15) | risky | Act | |
| Send a discount code (≤ 15 %) | risky | Draft | |
| Reply to reviews (Google, Trustpilot) | risky | Draft | |
| Reply to press, legal, safety, injuries | destructive | Suggest | 🔒 |

Garde-fous : max 200 réponses publiques par jour · aucune réponse LinkedIn entre 23:00 et 07:00 · remboursements cumulés ≤ €300 par jour · escalade obligatoire : blessure, avocat, journaliste, créateur > 50k abonnés.

### Atlas — Publishing
Planning : lun.–ven., prépare la semaine suivante le jeudi. Activité type : « Reworking Friday's reel caption ».

| Action | Risque | Cran | Verrou |
|---|---|---|---|
| Build next week's plan | risky | Draft | |
| Move a post to a better slot (same day) | safe | Act | |
| Recycle a top post (rewritten) | risky | Draft | |
| Publish trend posts | risky | Suggest | |
| Fill a slot left empty | risky | Draft | |
| Publish anything mentioning a competitor | destructive | Suggest | 🔒 |

Garde-fous : max 3 posts par réseau et par jour · respecte les piliers et la cadence de Strategy · jamais de photo de banque d'images · se met en pause pendant une alerte critique.

**Idées (Publishing › Ideas).** Atlas cherche en continu quoi publier à partir de ce qui a marché (Iris), de ce qui monte (Echo), de la marque (Playbook, Strategy) et des trous du calendrier. Une idée est toujours en Suggest ; la rédaction suit le cran de l'action concernée (`atlas-trend`, `atlas-recycle`, `atlas-fill`) ; sur Act, Atlas programme lui-même et le journal garde un Undo réel. Jamais plus de 8 idées ouvertes : une idée plus forte ou urgente remplace la plus faible non rédigée, les idées à fenêtre expirent seules (« Expired: the #GR20 conversation dropped 40% »). Rien qui nomme un concurrent, jamais le Ridge 40L, jamais de stock (brief visuel à la place).

### Iris — Insights (Analytics)
Planning : brief à 07:00, rapport hebdo le lundi 08:00, bilans de campagne en fin de campagne.

| Action | Risque | Cran | Verrou |
|---|---|---|---|
| Write and share the morning brief | safe | Act | |
| Write and share the weekly report with Claire | risky | Draft | |
| Raise anomalies | safe | Act | |
| Recommend a paid boost | risky | Suggest | 🔒 |

Garde-fous : partage uniquement à Sam et Claire · budget boost mensuel affiché (€1,500, €580 utilisés).

### Echo — Listening
Planning : 24/7. Activité type : « Watching Peakline's launch comments ».

| Action | Risque | Cran | Verrou |
|---|---|---|---|
| Tag and file mentions | safe | Act | |
| Raise competitor events | safe | Act | |
| Hand a trend to Atlas | safe | Draft | |
| Propose a counter-move to a competitor | risky | Suggest | |
| Raise a negative spike | safe | Act | |
| Tell the sales team (email digest) | risky | Draft | |

Garde-fous : seuil de pic = 3× le volume négatif habituel en 1 h · 4 concurrents · 12 recherches actives.

### Sage — Strategy
Planning : revue mensuelle le 1er, à la demande pour les campagnes.

| Action | Risque | Cran | Verrou |
|---|---|---|---|
| Turn a brief into a campaign plan | risky | Draft | |
| Adjust cadence when a network underperforms | risky | Draft | |
| Reallocate tasks between agents during a campaign | safe | Act | |
| Change the editorial pillars | destructive | Suggest | 🔒 |

Garde-fous : un objectif chiffré par campagne · jamais plus de 2 campagnes actives.

---

## 5. Shell et navigation

- **Barre latérale** (repliable) : logo Protopulse + espace « Fernway » ; **Desk** ; groupe **Departments** : Inbox (Nova), Publishing (Atlas), Insights (Iris), Listening (Echo), Strategy (Sage), chacun avec l'avatar de l'agent, un point d'état et le nombre de remontées en attente ; groupe **Team** : Agents, Activity, Playbook ; en bas : Settings (comptes connectés, notifications in-app) et l'avatar de Sam.
- **Barre supérieure** : fil d'Ariane, **barre de commande** (« Ask or brief an agent… » · ⌘K), état de Claire (« Claire · usually replies in ~1 min »), centre de notifications.
- **Raccourcis globaux** : ⌘K commande · G puis D/I/P/N/L/S/A/Y pour naviguer · F mode Focus · ? aide des raccourcis · ⇧D panneau modérateur (non listé dans l'aide).
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

- **Disposition** : barre latérale du module (vues Needs you, Nova's drafts, Handled by Nova, Hidden, All ; vues enregistrées Assigned to me, Assigned to Claire, Negative today ; labels avec compteurs ; filtres), puis une **liste pleine largeur** dense (case · avatar social avec badge réseau · auteur · extrait · type · sentiment · intention d'achat · statut · revu · labels · assigné · heure), triable (récent, ancien, urgence, intention d'achat).
- **Vue Needs you = ce que Nova attend de Sam**, groupée par type d'input plutôt qu'en liste uniforme : **Ready to send** (Nova est sûre ; « Send all N » en tête de groupe), **One passage to check** (le passage marqué et la note de Nova, ex. « Check “GR20”. Léa wrote GR20 but tagged the TMB »), **Your call** (sujets verrouillés : presse, sécurité, juridique, créateur, avec la raison), **Waiting on Claire**. Chaque groupe a un **bandeau d'en-tête** (icône teintée selon le type, titre, compteur, explication) et n'affiche que **3 lignes**, puis « Show N more ». Chaque ligne tient sur **deux lignes** : auteur + message d'origine, puis la réponse de Nova ou la question (« Check “GR20” … », « Safety topic … ») ; à droite l'heure et **la décision rapide** (Edit · Send ; Edit · Send as is ; More (I'll reply, Ask Claire) · Holding reply). Cliquer la ligne ouvre le panneau ; panneau ouvert, la liste se resserre (qui et quoi seulement).
- **Panneau de conversation** ancré à droite (~620 px, ↑/↓ ou J/K pour passer à la suivante) avec une barre d'outils (assigner, sentiment, Mark reviewed, labels) et deux onglets : **Conversation** (fil, brouillon de Nova dans sa couleur, règles appliquées, pièces jointes e-commerce, Approve & send, Edit, Take over, Ask Claire, Hide) et **Contact** (commandes Shopify, historique, tags).
- **Type et sentiment lisibles d'un coup d'œil** : tag avec icône (Comment, Message, Review, Mention) et sentiment en couleur avec visage (Positive, Neutral, Negative).
- **Notes internes** : bascule « Reply / Note for the team » dans le composeur ; les notes (de Sam ou de Claire) ont leur propre style dans le fil.
- **Actions groupées** : Approve Nova's drafts (seulement celles qui ont un brouillon ; règle aussi les cartes du Desk), Hide / Unhide, Mark as reviewed, Assign to Claire / to me, Add label, Set sentiment. Undo groupé.
- Données : 40+ conversations, labels (Refund, Product issue, Press, Creator, Lead), assignations, notes.

### 6.3 Publishing — Atlas

Onglets : **Calendar** · **Plan review** · **Drafts** · **Media**. Bouton « New post » partout.

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

- **Calendar** : vue semaine (par défaut) et mois. Chaque post : réseau, heure, vignette, statut (`Scheduled` · `Published` · `Draft` · `Needs you` · `Failed`), auteur (Atlas ou Sam), campagne et pilier. Glisser-déposer pour déplacer (Atlas commente : « 18:30 gets 2.1× the reach on Fridays »). Les créneaux recommandés vides sont marqués en pointillé avec « Ask Atlas to fill ».
- **Plan review** (validation d'un plan, pas d'items) :
  - en-tête : « Next week · 14 posts · 5 networks », répartition par pilier et par réseau vs la cadence cible de Sage, posts recyclés, posts de tendance, posts de campagne ;
  - vue semaine avec une case à cocher par post, et pour chaque post la raison de sa présence (« Recycled: 210k views on TikTok in October ») ;
  - résumé de ce qui change si on décoche (« Instagram drops below cadence: 4 of 5 posts ») ;
  - **Approve plan (12 of 14)** · **Request changes** (champ libre → Atlas renvoie une v2 avec un diff : ajoutés, retirés, modifiés) · **Reject**.
- **Éditeur de post** (panneau large) :
  - sélection des comptes, texte commun puis variantes par réseau ;
  - **aperçu fidèle** par réseau (Instagram feed/reel, TikTok, LinkedIn, Facebook, X, YouTube Shorts) ;
  - **Atlas copilote** dans l'éditeur : 3 variantes proposées (hook, ton), « Shorten », « Adapt for LinkedIn », meilleur créneau suggéré avec la raison ;
  - **vérification Playbook en direct** : mots interdits soulignés, règles respectées cochées, longueur par réseau ;
  - médias depuis la médiathèque ;
  - actions : Schedule · Add to plan · Save draft · Send to Claire.
- **Drafts** : brouillons d'Atlas et de Sam, filtrables.
- **Media** : médiathèque de marque (~30 photos produits et lifestyle, tags, droits, utilisations passées). Atlas signale les visuels manquants.

### 6.4 Insights — Iris

Onglets : **Reports** · **Explore** · **Anomalies**.

- **Reports** : liste (brief du jour, rapports hebdo des 4 dernières semaines, bilan de campagne). Un rapport se lit comme un texte : titre, résumé en 3 phrases, sections rédigées (ce qui a marché, ce qui n'a pas marché, ce qu'on change), graphes intégrés, **chiffres sourcés** (survol d'un chiffre = la donnée et la période, pattern *cited-answer*). Actions : Share with Claire (statut d'envoi, Claire réagit), Ask a follow-up, Export PDF (mock : toast).
- **Explore** : sélecteur de période (7 j, 30 j, 90 j, personnalisé) et de réseaux ; KPI avec tendance et comparaison à la période précédente (Reach, Engagement rate, Followers, Link clicks, Replies handled, Median reply time, Sentiment) ; courbes ; **tableau des posts** triable (réseau, date, reach, ER, clics, pilier, auteur Atlas/Sam) ; **meilleurs créneaux** (heatmap jour × heure) ; performance par pilier.
- Sélection multiple des anomalies : Mark handled, Snooze a week, Reopen. Les **règles d'alerte** d'Iris se règlent sur sa fiche agent (onglet Alerts), pas ici ; un lien y mène.
- **Anomalies** : liste avec graphe, explication d'Iris (cause probable, confiance), actions proposées (« Ask Atlas to test a new hook format », « Ignore for a week »), historique des anomalies passées et de ce qui a été fait.
- **Questions à Iris** (barre de commande ou fil) : « How did TikTok do last week? », « Best time to post on LinkedIn? », « Compare reels vs carousels » → carte de réponse avec graphe, chiffres sourcés et relances proposées.

### 6.5 Listening — Echo

Onglets : **Competitors** · **Mentions** · **Trends** · **Searches**. La veille concurrentielle est le cœur, avec deux sous-vues aussi profondes l'une que l'autre.

- **Gérer les concurrents** (« Manage competitors ») : liste des concurrents suivis avec site, comptes par réseau (icône + handle), date de début de suivi, nombre d'événements ; ajouter (nom, site, comptes), modifier, mettre en pause ou retirer (avec confirmation). Les événements et filtres ne montrent que les concurrents suivis.
- **Competitors · Events** (réagir) :
  - fil d'événements détectés chez les 4 concurrents : lancement produit, baisse de prix, nouvelle campagne, post viral, bad buzz, partenariat créateur, changement de cadence ;
  - chaque événement : concurrent, type, preuve (post ou page source avec aperçu), impact estimé, ce qu'Echo en pense ;
  - **ripostes proposées**, confiées en un clic : « Counter-post by Atlas » (crée un brouillon côté Publishing, verrouillé en Suggest parce qu'il mentionne un concurrent), « Brief Sage » (crée un brief de campagne), « Tell sales » (email mocké, aperçu), « Nothing to do » ;
  - suivi de chaque riposte (« Counter-post published · 3.2% ER vs 2.1% average »).
- **Competitors · Benchmark** (apprendre) :
  - tableau comparatif Fernway vs concurrents : abonnés et croissance, cadence par réseau, engagement moyen, formats dominants, part de voix ;
  - **top posts des concurrents** (30 derniers jours) avec ce qu'Echo en tire : « Trailkind's 3-second hooks get 2× completion » ;
  - **leçons** d'Echo, chacune avec une action : « Test it » (envoie l'idée à Atlas) ou « Dismiss » ;
  - fiche concurrent : profil, comptes, derniers événements, posts, positionnement prix.
- **Mentions** : sélection multiple (Ask Nova to reply crée des brouillons sur le Desk, Hide/Unhide, Tag, corriger le sentiment, Hand to Atlas), panneau de détail, export CSV. Les **règles d'alerte** d'Echo (seuils sur la marque, les concurrents ou une recherche, vers le Desk ou Claire) se règlent sur sa fiche agent, onglet Alerts.
- **Mentions** : fil avec sentiment, source, portée, filtres ; mentions de produits ; les mentions à risque montent sur le Desk.
- **Trends** : tendances détectées avec croissance, réseaux, adéquation à la marque (High / Medium / Low avec raison), exemples ; **Hand to Atlas**.
- **Searches** : recherches actives (marque, produits, concurrents, thèmes comme « PFAS rainwear », « GR20 »), mots-clés et exclusions, volume ; créer, éditer, mettre en pause une recherche.
- Une **alerte de pic négatif** reste une remontée Urgent sur le Desk avec actions (pause d'Atlas, réponse d'attente de Nova, demander une déclaration à Claire). Pas de Crisis room dédiée.

### 6.6 Strategy — Sage

Onglets : **Campaigns** · **Pillars & cadence**.

- **Campaigns** : liste avec statut (`Brief` · `Plan to review` · `Live` · `Done`), objectif, progression vs objectif, dates. Données : une campagne **Live** (« Trail Week », teasing dès le 20 novembre, du 24 au 30 novembre, relance jusqu'au 7 décembre), une **Done** avec bilan d'Iris (« Black Friday? No: Repair Friday »), une **Plan to review** créée pendant le test.
- **Nouveau brief** : champ libre en 2-3 lignes (+ champs optionnels : dates, produit, budget, objectif). Exemple pré-rempli en placeholder : « Launch the new Storm Jacket on March 15, goal 300 pre-orders. »
  - Sage « réfléchit » (pattern *thinking-loader* avec phases : « Reading last launches · Checking cadence · Splitting work between agents »), puis rend :
  - **Plan de campagne** : objectif chiffré et KPI de suivi, messages clés, cible, phases (Teasing / Launch / Follow-up) sur une frise, posts par phase et par réseau, **répartition des tâches entre agents** (pattern *delegate-board* : qui fait quoi, réattribuable par glisser-déposer), risques identifiés, budget boost proposé ;
  - validation : **Approve campaign** · **Request changes** (v2 avec diff) · **Discard**. Une fois approuvée, Atlas reçoit les posts dans son plan et les autres agents leurs tâches.
- **Page Campagne Live** : objectif et progression (« 212 / 300 pre-orders · day 4 of 7 »), courbe vs trajectoire prévue (pattern *plan-vs-actual*), posts publiés et à venir, tâches des agents et leur état, ajustements proposés par Sage (« Instagram underperforms, move 2 posts to TikTok? »), bilan final rédigé par Iris quand la campagne est terminée.
- **Pillars & cadence** : 4 piliers éditoriaux (Gear that lasts · Trail stories · Repair & care · Community) avec description, part cible et part réelle sur 30 jours ; cadence cible par réseau ; propositions d'ajustement de Sage (Draft). Les piliers sont verrouillés en Suggest.

### 6.7 Agents

- **Équipe** : 5 cartes. Monogramme, nom, département, statut, activité en cours, planning, **jauge d'autonomie** (combien d'actions en Act / Draft / Suggest), track record sur 30 jours (handled alone, escalated, approved unchanged %, undone), bouton Pause/Resume.
- **Fiche agent** :
  - **Autonomy** (pattern *autonomy-dial*) : un réglage global (**Cautious** / **Balanced** / **Autonomous**, **Custom** dès qu'une action est réglée à la main) qui déplace les actions non verrouillées selon leur risque, avec Undo ; une phrase explique le preset et une seule ligne donne le volume (« 275 of 303 messages a week run on their own »). En dessous, une liste dense, une ligne par action, groupée par risque (**Low risk** · **Medium risk** · **Always you**) : icône teintée à la couleur de l'agent, nom, et un contrôle segmenté **Suggest · Draft · Act** dont le cran choisi prend la couleur de l'agent. Le détail est à la demande (chevron) : l'exemple Fernway, ce que produit chacun des trois crans (le cran actuel teinté), le volume et le taux d'approbation sans modification. Après un changement, une ligne sous l'action dit ce qui se passe désormais. Les actions 🔒 sont dans **Always you**, sans contrôle, avec la raison.
  - Effet immédiat et visible : passer une action en Act fait quitter le Desk aux remontées concernées, qui deviennent des entrées du journal (« Handled on its own after you switched to Act »).
  - **Promotion history** : demandes passées, acceptées ou refusées, rétrogradations.
  - **Guardrails** : éditables (plafonds, horaires, sujets toujours remontés).
  - **Track record** : graphe des 30 derniers jours, taux d'approbation sans modification par action, dernières annulations.
  - **Recent activity** : les 20 dernières actions.
- **Alerts** (Iris et Echo) : règles éditables (métrique ou recherche, condition, seuil, vers le Desk ou Claire, actif ou non).
- **Garde-fous** ajoutables, modifiables, supprimables. **Escalation** : règles structurées à partir de conditions prêtes à l'emploi (blessure ou sécurité, presse, menace juridique, créateur au-delà de N abonnés, remboursement au-delà de N €, plus de N mentions négatives par heure, mention d'un concurrent, dépense au-delà de N €, métrique en baisse de plus de N %), envoyées à Sam ou à Claire, activables et supprimables ; ce sont les mêmes règles que l'onglet Escalation du Playbook.
- **Demandes de promotion** (pattern *permission-request*) : un agent qui le mérite remonte une carte **Promotion request** sur le Desk : « Nova wants to answer complaints on her own. You approved 46 of her last 50 complaint replies without changes. » Preuves dépliables (les 50 réponses, les 4 modifiées avec le diff). Choix : **Allow** · **Try for a week** (revient automatiquement en Draft après 7 jours, avec un bilan) · **Not yet**.
- **Rétrogradation** : après 2 annulations sur la même action en 24 h, l'agent propose lui-même : « You undid 2 of my shipping refunds today. I'll go back to drafting them until you say otherwise. » Choix : OK · Keep me on Act.

### 6.8 Activity

Journal complet des agents (pattern *agent-ledger*) : horodatage, agent, action, objet (lien), raison, règle appliquée, statut (`Done` · `Approved by you` · `Edited by you` · `Rejected` · `Undone` · `Redone`), Undo/Redo tant que c'est réversible, avec le temps restant. Filtres : agent, statut, réversible seulement, période. Groupement par jour. Une ligne s'ouvre sur le détail (avant/après, sources). Données : ~120 entrées sur 3 jours.

### 6.9 Playbook

La mémoire de marque, visible et éditable (pattern *memory-panel*).

- Sections : **Voice** (curseurs : warm ↔ neutral, playful ↔ serious, short ↔ detailed, avec un exemple de phrase qui change en direct) · **Rules** (do / don't, avec les agents qui les appliquent et leur nombre d'utilisations sur 30 jours) · **Words** (interdits et préférés) · **Facts** (produits, prix, politiques de retour et garantie, horaires du support : ce que Nova cite) · **Escalation** (ce qui remonte toujours à Sam, ce qui remonte à Claire) · **Pillars** (lecture seule, lien vers Strategy).
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

### 6.11 Onboarding (« Start from scratch »)

Parcours séparé, accessible depuis Settings et le panneau modérateur, en 5 étapes (pattern *setup-guide* + *stepper-form*) :
1. **Connect accounts** (pattern *integration-picker*) : réseaux, Shopify, Google Reviews, Trustpilot. Connexion simulée avec chargement.
2. **Build your Playbook** : Protopulse « lit » les 200 derniers posts et réponses (progression), puis propose voix, règles et faits à valider un par un.
3. **Meet your team** : les 5 agents présentés, chacun avec ce qu'il fera dès demain.
4. **Set autonomy** : par agent, réglage global Cautious / Balanced / Autonomous avec la liste des actions concernées. Recommandation : tout en Cautious la première semaine.
5. **First brief** : « Your agents start tonight. Your first brief arrives tomorrow at 07:00. » → bascule vers l'espace Jour 30.

### 6.12 Settings

Comptes connectés (état, dernière synchro, reconnecter) · notifications in-app (quels types déclenchent un toast) · profil de Sam · Claire comme valideuse (sujets qui lui vont). Rien de plus.

---

### 6.13 Chats — parler à l'équipe

Pattern standard du marché (Hootsuite Wisdom, Sprout Trellis, Ask Vista, Emplifi Fuel AI), ici en version « équipe ».

- **Où** : une entrée **Chats** dans la barre latérale (liste des conversations, non lus, « New chat ») et un **tiroir** ouvrable depuis n'importe quelle page (bouton « Chat » dans la barre du haut). Le tiroir démarre la conversation avec le **contexte** de la page (« the Inbox · Broken strap on a 3-week-old Ridge 28L »). ⌘K reste pour les commandes rapides.
- **À qui** : à l'équipe. Protopulse route vers le bon agent ; une **@mention** (« @Atlas ») choisit. Plusieurs agents peuvent répondre dans le même fil (Echo repère Peakline, Atlas propose un contre-post).
- **Réponses en cartes riches**, toujours avec les sources : graphe d'Iris, brouillon de post avec réseau et créneau, réponse client avec l'avatar de l'auteur, liste d'éléments cliquables, règle proposée, brief de campagne.
- **Agir avec validation** : rien ne part sans un clic dans le fil. Schedule (le post rejoint le calendrier), Send (la réponse part, la carte du Desk se règle), Add to Playbook, Build the campaign plan (ouvre Sage), Boost. Edit et Shorter sur les brouillons.
- **Suivis proactifs** : un agent revient dans la conversation plus tard (« Early read on the post Atlas scheduled… boost it with €100 ? »), sans toast : la conversation passe en non lu.
- Deux conversations existent au départ (« Why is TikTok down? », « Weekend sale post »). Un état vide propose des exemples de demandes.

## 7. Proactivité simulée

Le prototype vit sans qu'on touche à rien.

- **Moteur d'événements** : toutes les 25 à 40 s (cadence réglable), un agent produit un événement scripté. Si l'action correspondante est en Act, il devient une entrée du journal avec toast et Undo. Sinon, il devient une remontée qui arrive en haut de la bonne file avec une animation.
- **Script** (au moins 20 événements, joués dans l'ordre puis en boucle avec des variantes) couvrant : nouvelle plainte, question produit, DM presse, avis 1 étoile, créateur qui mentionne la marque, pic de mentions négatives, baisse de prix chez Peakline, post viral chez Trailkind, anomalie de reach, post qui surperforme (boost ?), visuel manquant, code promo manquant, **demande de promotion** de Nova, **rétrogradation** proposée par Nova, ajustement de cadence par Sage, campagne Trail Week qui dépasse sa trajectoire, Claire qui répond, règle proposée pour le Playbook.
- **Agents en pause** : leurs événements ne se produisent pas, et la pilule Running now l'indique.
- **Idées proactives** (événements `idea` du script, dans le même moteur) : **flux continu** (un post d'Iris qui repart, une tendance d'Echo, une mention client : l'idée arrive en haut d'Ideas, datée et sourcée) ; **lot du jeudi** (« Ideas for next week », jusqu'à 6 idées qui peuvent rejoindre Plan review) ; **urgent → Desk** (fenêtre courte, ex. première neige : carte Needs you qui ouvre l'idée ; traitée d'un côté, elle disparaît de l'autre) ; **trou du calendrier** (jour à moins de 2 posts ou pilier sous la cible). Le battement de cœur fait expirer les idées à fenêtre et revenir les « Not now ».
- **Le temps avance** : l'horloge de l'app part de 08:12 et avance avec le temps réel. « Skip to tomorrow 08:00 » (panneau modérateur) génère un nouveau brief et une nouvelle file.

### 7.1 Claire simulée

« Ask Claire » envoie la remontée dans **Waiting on Claire**. Après 30 à 60 s, Claire répond : approuve (« Go. Keep it short. »), demande une modification (« Remove the price, legal hasn't confirmed it. ») qui renvoie la carte à Sam avec le commentaire, ou refuse (« Not now, we'll address it in Thursday's newsletter. »). La réponse dépend du type de remontée (table de réponses scriptées). Toast « Claire replied ».

---

## 8. Panneau modérateur (⇧D)

Caché, pour l'animateur du test.

- Reset demo (état initial Jour 30) · Start onboarding.
- Proactive feed : on/off, cadence (10 s / 30 s / 60 s), **Trigger now** avec un menu de tous les événements scriptés.
- Les quatre arrivées d'idées sont déclenchables une à une (marquées « idea » / « idea + Desk ») : knots carousel (flux), first snow (urgent), empty day (gap), Thursday batch (hebdo).
- Time : Skip to tomorrow 08:00.
- Scenario presets : « Calm morning » (4 remontées), « Busy morning » (12), « Competitor day » (Peakline + Trailkind), « Trust test » (2 demandes de promotion + 1 rétrogradation).
- **Tester log** : enregistre chaque action du testeur avec horodatage (navigation, approve/edit/reject/snooze/undo, changements d'autonomie, commandes tapées, temps passé par carte). Ideas : idée ouverte, réorientée (mode), décision `ideas/decision` (acceptée telle quelle / modifiée / rejetée avec la raison / envoyée à Sage) avec le temps jusqu'à la décision ; compteurs dédiés. Compteurs en direct. **Export JSON** et **Clear**. Stocké en localStorage.

---

## 9. Données mockées

Un module de données par domaine, typé. Toutes les dates sont relatives au « maintenant » de l'app. Volumes minimum :
- 18 remontées initiales sur le Desk couvrant les 5 agents et tous les types, dont 3 « Good news » ;
- 40 conversations Inbox + 15 contacts avec commandes ;
- 30 posts dans le calendrier de la semaine courante et passée, 14 dans le plan proposé, 30 médias ;
- 4 rapports hebdo, 1 brief, 1 bilan de campagne, 6 anomalies (3 ouvertes) ;
- 4 concurrents, 15 événements concurrents, 20 top posts concurrents, 8 leçons, 50 mentions, 8 tendances, 12 recherches ;
- 3 campagnes, 4 piliers ;
- 25 règles de Playbook, 3 règles proposées, 20 faits ;
- 120 entrées de journal.

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
| Playbook | `memory-panel` |
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
- Le site est en ligne sur GitHub Pages et fonctionne à 1440 px et 375 px.

## 14. Hors périmètre

Agence multi-clients · agents Creative, Paid, Creators · Crisis room dédiée · vrai LLM ou backend · vue jouable côté Claire · constructeur de rapports · notifications hors de l'app (Slack, email, push) · thème clair.
