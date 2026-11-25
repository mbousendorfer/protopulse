# Protopulse — Ideas : la boîte à idées proactive d'Atlas

Tu travailles sur Protopulse (`~/code/protopulse`, live sur https://mbousendorfer.github.io/protopulse/) :
prototype cliquable mocké d'un outil de gestion des réseaux sociaux par une équipe d'agents IA, aux
couleurs d'Agorapulse, pour une marque outdoor fictive, Fernway. Vite 5 + React 18 + TypeScript strict,
CSS natif à tokens, Radix, lucide-react, HashRouter, état `useReducer` persistant en localStorage, aucun
backend, aucun appel LLM : toute « intelligence » est simulée de façon déterministe à partir des données
mockées. UI en anglais. La spec produit est `PROMPT.md` (en français) ; lis §3, §4 (Atlas), §6.3
(Publishing), §7 (proactivité simulée), §10 (direction visuelle) avant de commencer.

## Ce qu'on construit
Aujourd'hui Atlas attend qu'on lui demande. On veut l'inverse : **Atlas cherche en continu quoi publier,
le prépare, et Sam n'a plus qu'à relire, réorienter ou dire non.** Un onglet **Ideas**, premier onglet de
Publishing (`/publishing/ideas`, puis Calendar, Plan review, Drafts, Media).

Le test utilisateur doit valider trois choses :
1. Sam comprend en 5 secondes **pourquoi** Atlas propose chaque idée (la preuve est là, chiffrée, sourcée).
2. Sam réoriente une idée **sans réécrire** : un clic, une phrase, ou un choix entre variantes.
3. Sam fait confiance au brouillon préparé au point de le programmer tel quel.

## Où Atlas trouve ses idées (données déjà présentes, à réutiliser)
Chaque idée cite au moins une source, avec le chiffre qui la justifie et un lien vers l'écran d'origine.
- **Ce qui a marché** (Iris, `src/data/insights.ts`) : posts au-dessus de la moyenne dans `POSTS`
  (reach, ER, clics) → « Recycle » ou « Suite » ; `PILLAR_PERF` (Community : 9 % des posts mais le
  meilleur ER) → idées pour le pilier sous-exposé ; `ANOMALIES` avec action « Ask Atlas… » ; meilleurs
  créneaux `HEAT` / `BEST_SLOT`.
- **Ce qui monte** (Echo, `src/data/listening.ts`) : `TRENDS` à fit High/Medium avec `fitWhy` ;
  `LESSONS` (chacune a déjà `evidence` et `idea`) ; `TOP_POSTS` concurrents avec leur takeaway ;
  `EVENTS` et leurs ripostes ; `MENTIONS` positives à transformer en contenu client (UGC).
  Tout ce qui nomme un concurrent reste verrouillé en Suggest (`atlas-competitor`, locked).
- **La marque** (`src/data/playbook.ts`, `src/data/strategy.ts`) : `PRODUCTS` (audience, messages),
  `FACTS` (réparation à vie, histoire de la fondatrice, Trail Week et code TRAIL10, Ridge 40L **non
  annoncé : ne jamais en parler**), `VOICE`, `RULES`, `BANNED` / `PREFERRED`, piliers et cadence de
  Strategy (`PILLARS`, `CADENCE`), moments saisonniers (hiver, guide cadeaux, randonnée de décembre).
- **Le calendrier** : `recommend()` dans `src/features/publishing/Page.tsx` (réseau le plus en retard sur
  `CADENCE`, jours à moins de 2 posts) remplace les idées codées en dur de `publishing/askFill`.

Garde la provenance lisible comme ailleurs dans l'app : « Spotted by Echo → drafted by Atlas », avec les
marques d'agent existantes.

## Le modèle (dans `src/features/publishing/`, étendu, pas dupliqué)
Ajoute à `PublishingState` une liste `ideas`. Une idée :
- `kind` : `post` (un post) ou `series` (3 à 5 posts avec un fil : teaser, preuve, voix client, appel).
- `title` (l'angle en une ligne), `why` (une phrase), `sources[]` (type analytics | listening | brand |
  calendar, libellé, preuve chiffrée, lien), `confidence`, `pillar`, `networks`, `freshness` (une idée de
  tendance expire : « good until Thu »), `origin` (continuous | weekly | gap | urgent).
- `draft` : par réseau, le texte, le média (`MEDIA` avec droits, sinon un **brief visuel** — Atlas
  n'utilise jamais de stock), le créneau proposé, les checks Playbook (réutilise ceux du Composer).
- `versions[]` : chaque réorientation crée une version avec ce qui a changé et pourquoi.
- `status` : new → drafting → ready → scheduled ; ou snoozed, dismissed (avec raison), sent-to-sage.
Génère les brouillons et les réécritures de façon déterministe, comme `generatePlan` / `revisePlan`
(`src/data/strategy.ts`) et le copilote du Composer : des fonctions pures, testées.

## L'écran Ideas
- **Haut de page** : une phrase d'Atlas qui résume (« 6 ideas this week, 2 ready to schedule. Community is
  behind target, so 3 of them are Community. »), puis les groupes :
  - **Ready to review** : brouillons complets, prêts à programmer.
  - **New ideas** : l'angle et la preuve, pas encore rédigés.
  - **Series** : les séries proposées.
- **Carte d'idée** (motif « Choix » de §10, pas une carte décorée) : angle, pourquoi, sources cliquables,
  confiance, pilier, réseaux, fraîcheur ; si rédigée, aperçu par réseau (`NetworkPreview` de
  `Previews.tsx`) avec le média et le créneau.
- **Actions**, toujours dans cet ordre : action principale (« Schedule » si prête, « Draft it » sinon),
  « Redirect », « Not now » (snooze), « Dismiss » (avec raison en un clic : off-brand, not timely,
  already covered, wrong pillar). Pour une série : « Send to Sage » quand elle mérite un objectif et un
  budget (passe par `briefSage`, `src/features/strategy/slice.ts`), sinon « Schedule the series ».
- **Le détail** s'ouvre dans le volet latéral, comme le panneau de l'Inbox : brouillon éditable par
  réseau, checks Playbook, créneau modifiable, historique des versions.
- Toute la sélection et les actions groupées réutilisent `useSelection` / `BulkBar`
  (`src/ui/Selection.tsx`) : « Schedule 3 ready ».

## Réorienter sans réécrire (les quatre modes)
1. **Angles en un clic** : chips « Shorter », « More playful », « Customer angle », « Repair angle »,
   « As a carousel », « For LinkedIn »… Atlas réécrit en place (moins d'une seconde de réflexion via
   `Thinking`) et montre ce qui a changé (diff surligné, comme le diff de Plan review).
2. **Consigne libre** : un champ « Tell Atlas what to change » → nouvelle version + diff + une phrase
   d'Atlas sur ce qu'il a compris. Une consigne qu'il ne sait pas appliquer est dite franchement
   (« I can't add a price, Trail Week has no public price yet »), jamais collée dans la légende.
3. **Variantes côte à côte** : « Show 3 variants » → trois versions côte à côte (accroche, format, ton
   différents), on en garde une ou on prend l'accroche de l'une et le corps d'une autre.
4. **Apprendre** : quand Sam réoriente ou rejette deux fois dans le même sens (même chip, même raison),
   Atlas propose une règle Playbook sur la carte (« Always lead with the repair story on LinkedIn? »,
   « Add to Playbook » / « No »), via le mécanisme de proposition de règle existant (`ev-rule-emoji`,
   `playbook/addRule`). Les idées suivantes en tiennent compte et le disent (« Following your rule… »).

## La proactivité (le cœur)
Branche les arrivées sur le moteur d'événements existant (`fire()` dans `src/app/reducer.ts`, script dans
`src/data/script.ts`, panneau modérateur ⇧D pour les déclencher en entretien) :
- **Flux continu** : au fil de la journée, une idée arrive quand un signal tombe (un post qui surperforme
  chez Iris, une tendance qui monte chez Echo, une mention client enthousiaste). Elle arrive en haut avec
  l'animation d'arrivée existante, datée (« 10 min ago ») et sourcée.
- **Lot hebdo** : le jeudi (shift d'Atlas, §4), « Ideas for next week » rassemble 5 à 8 idées et alimente
  Plan review : une idée acceptée peut rejoindre le plan (`publishing/addToPlan`).
- **Urgent → Desk** : une idée à fenêtre courte (tendance qui passe, actualité) crée aussi une carte Needs
  you sur le Desk qui ouvre l'idée (`/?card=` existe déjà) ; elle disparaît du Desk dès qu'elle est
  traitée dans Ideas, et inversement.
- **Trous du calendrier** : un jour vide ou un pilier sous la cible fait arriver une idée « gap »,
  affichée aussi dans la case vide du calendrier à la place de l'actuel « Ask Atlas to fill ».
- Atlas ne noie pas Sam : 8 idées ouvertes au plus, il retire lui-même les idées périmées (« Expired:
  the #GR20 trend dropped 40% ») et le dit dans le journal.
- **Autonomie** (`src/data/agents.ts`, actions d'Atlas) : les idées sont toujours en Suggest ; la
  rédaction suit le niveau de l'action concernée (`atlas-trend`, `atlas-recycle`, `atlas-fill`) ; sur Act,
  Atlas programme lui-même et le journal garde un Undo réel.

## Garde-fous
- Règles visuelles : §10 de `PROMPT.md` et le skill `design-guidelines` (encre grey-80 à grey-100, filets
  grey-20, bleu électrique pour l'interactif seulement, orange = action principale, une par zone, pas de
  labels en majuscules, pas de barre d'accent, boutons jamais pleine largeur, métrique toujours nommée).
- **Pas de toast** : retour inline avec les primitives partagées de `src/ui/Feedback.tsx` (`UndoBar`,
  `Notice`, `InlineConfirm`, `Reopen` pour « Dismissed · Undo », `CountBadge`). Suis la variante
  canonique de chaque motif dans `design-plans/consistency-matrix.md` (issue de la passe qualité UI).
- Un compteur de badge veut toujours dire « needs you » : l'onglet Ideas affiche le nombre d'idées prêtes
  à relire, pas le total.
- Atlas ne publie jamais rien que Sam n'a pas vu, sauf sur Act ; rien qui nomme un concurrent sans Sam ;
  jamais de stock photo ; respecte `BANNED`, le non-annonce du Ridge 40L, 3 posts max par réseau et par jour.
- Réutilise avant de créer : `PreviewBlock`, `Sources`, `WhyLine`, `Confidence` (`src/features/desk/parts.tsx`),
  `NetworkPreview`, `Photo`, `Thinking`, `Sheet`, `Tabs`, `Filters`, les checks du Composer.
- Tout changement de motif en dehors de ce brief (Desk, Plan review, navigation) : montre un avant / après
  et demande d'abord.

## Méthode
1. Lis les fichiers cités, puis écris un court plan (modèle, écrans, événements, tests) dans
   `design-plans/publishing-ideas-plan.md`. Montre une maquette rendue de l'écran Ideas (une carte prête,
   une carte nouvelle, une série, le volet avec les quatre modes de réorientation) et fais-la valider
   avant de coder l'UI.
2. Modèle et fonctions pures d'abord, avec tests Vitest : sélection des idées depuis les sources,
   génération du brouillon, chaque réorientation, apprentissage en règle, expiration, plafond de 8.
3. Écran Ideas, volet de détail, réorientation, actions groupées.
4. Proactivité : événements du script, lot hebdo, Desk urgent, idées dans les cases vides du calendrier.
5. Mets à jour `PROMPT.md` (§4 Atlas, §6.3 Publishing, §7 proactivité, §8 panneau modérateur) et ajoute
   au scénario de test les tâches : « Find out why Atlas suggests this », « Make this post about repair »,
   « Schedule the two ready ideas », « Turn this series into a campaign ».
6. Instrumente pour les entretiens (`core/track`) : idée ouverte, réorientée (mode), acceptée telle
   quelle / modifiée / rejetée (raison), temps jusqu'à la décision.

## Définition de « fini »
- Au chargement de la démo, Ideas contient au moins 6 idées couvrant les quatre sources, dont 2 prêtes,
  1 série et 1 idée qui expire bientôt ; chacune montre sa preuve chiffrée et un lien vers sa source.
- Les quatre modes de réorientation marchent et produisent une version visible avec ce qui a changé.
- Deux réorientations identiques font proposer une règle Playbook, et l'idée suivante l'applique.
- Une idée acceptée devient un post programmé dans le calendrier, avec média ou brief visuel et créneau ;
  Undo la remet en Ideas.
- Une série part chez Sage et revient comme campagne dans Strategy.
- Pendant le scénario, au moins une idée arrive seule (flux), une passe par le Desk (urgent), une remplit
  un trou du calendrier ; le panneau ⇧D peut déclencher chacune.
- 1440 et 375 px, clair et sombre, clavier, AA. `npx tsc -b`, `npx vitest run`, `npm run build` verts.
- Commits sur une branche, PR vers `main` (ne pas pousser sur `main` : c'est le déploiement).
