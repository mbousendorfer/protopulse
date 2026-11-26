# Protopulse — profondeur des agents : tronc commun

> À lire en entier par chaque session « profondeur d'agent » avant son propre prompt
> (`nova.md`, `atlas.md`, `iris.md`, `echo.md`, `sage.md`, `juno.md`). Ce fichier fait foi pour la
> méthode, le circuit Git et les garde-fous ; le prompt de l'agent fait foi pour le périmètre.

Tu travailles sur Protopulse (`~/code/protopulse`, live sur https://mbousendorfer.github.io/protopulse/) :
un prototype cliquable mocké de gestion des réseaux sociaux par agents IA, aux couleurs d'Agorapulse.
Vite 5 + React 18 + TypeScript strict, CSS natif à custom properties, Radix, lucide-react, cmdk,
HashRouter, état `useReducer` + contexte persisté en `localStorage`, déployé par GitHub Actions à
chaque push sur `main`. L'UI est en anglais, la spec en français.

**Cinq autres sessions travaillent en même temps que toi sur `main`**, une par agent. Tu en es une.

## Mission partagée
Amener chaque agent au niveau fonctionnel d'Agorapulse sur son module (Inbox, Publishing, Reports,
Listening, stratégie de campagne, vidéo), mais **agentic-first** : là où Agorapulse donne un outil à
l'humain, Protopulse donne le travail à l'agent et ne remonte à Sam que ce qui demande un humain,
avec la raison. La profondeur, c'est : des données qui vivent (elles changent quand les agents
agissent), des réglages qui changent vraiment le comportement, des règles réellement appliquées,
des relais entre agents qui produisent des objets (un post, une conversation, un rapport), pas des
cartes en l'air.

La barre reste celle de PROMPT.md §0 : un social media manager doit croire, pendant 45 minutes de
test en manipulation libre, qu'il utilise un vrai produit. Pas de cul-de-sac, pas de « coming soon ».

## Sources de vérité (dans cet ordre)
1. Les décisions déjà prises (section suivante) — ne pas les rediscuter.
2. `PROMPT.md` : §1 (ce que le test valide), §3 (principes produit), §4 (ton agent), §6 (ton écran
   et §6.0 travail en volume), §7 (proactivité simulée), §9 (données), §10 (direction visuelle),
   §12 (contraintes techniques), §13 (définition de « terminé »).
3. Le code tel qu'il est : primitives `src/ui/index.tsx` (Btn, Pill, Seg, Tabs, Filters, Menu, Pop,
   Sheet, Modal, PageHead, Empty, Thinking, Switch, Tip, Kbd, Mark, Net), `src/ui/Selection.tsx`
   (BulkBar, SelectBox, useSelection), `src/ui/charts.tsx`, `src/ui/Illustrations.tsx`, helpers de
   `src/app/core.ts` (`pushHandoff`, `pushLog`, `notify`, `setAutonomy`, `addRule`, `updateHandoff`,
   `removeHandoff`, `uid`, `now`, `agentOf`, `actionOf`). **Le registre de ton agent** créé par la
   Phase 0 : c'est là que tu branches tout, sans toucher au cœur.
   - Ton module : `src/features/<ton dossier>/agent.tsx` (export par défaut, type `AgentModule` de
     `src/app/agent-module.ts`). Champs, tous optionnels : `script` (tes événements, dans
     `src/features/<ton dossier>/script.ts`), `onResolve(s, h, d)` (appelé pour **toute** carte réglée :
     par Sam, Claire, un lot ou Act), `onUndo(s, entry)`, `due(s, t)` + `tick(s, t)` (battement de cœur),
     `intents` (⌘K et Chat : `defineIntent({ kind, owner, order, parse, bar, chat })`), `previews` (rendu
     Desk de tes types de preview), `batches` (lots du Desk), `profileTabs`, `testerStats`, `presets`.
   - La liste : `src/app/agents-registry.ts` (`registry()`, `scriptEvents()`, `intentDef()`). Tu n'y
     touches pas : ton module y est déjà. Lis-la toujours par ces fonctions, jamais au chargement.
   - Événement : `order` le place dans le fil commun (multiples de 10 existants ; glisse le tien entre
     deux). Un type d'événement à toi = un `run: (s, manual) => State` sur l'événement (voir
     `ideaScript`, `videoScript`), et `tag` pour le panneau modérateur.
   - Types ouverts, étendus depuis ton module par `declare module` (voir `video/agent.tsx`) : nouveau
     type de preview (`interface PreviewTypes` dans `src/app/types.ts`), nouvel intent
     (`interface IntentTypes` dans `src/data/command.ts`), champ propre sur `Handoff` ou `LogEntry`.
     Ordre de `parse` du cœur : pause 10, resume 20, rule 30, needs 70, overnight 80 ; ceux des agents
     sont dans leurs modules.
   - Act : passer une action en Act fait régler ses cartes par `resolve()` (comme une approbation de
     Sam, Undo compris). Ton `onResolve` fait donc l'action ; pour que l'Undo restaure vraiment l'état,
     inverse ton effet dans `onUndo` (à partir de `entry.restore`).
4. **Ce que fait Agorapulse** : charge le skill `agorapulse-product` pour savoir ce que le module
   équivalent offre vraiment (écrans, objets, statuts, rôles, libellés officiels). C'est ta
   référence de parité.
5. **Comment ça doit s'afficher** : charge le skill `design-guidelines` avant toute décision
   visuelle. Puis `design-plans/consistency-matrix.md` (variante canonique de chaque motif) et
   `design-plans/ui-quality-pass.md` (décisions UI).
6. `docs/ux-audit.html` (« Still open ») et `docs/ui-quality.html` : la dette connue.

## Décisions déjà prises (ne pas défaire)
- Pas de toast. Le retour d'une action est inline, là où elle a eu lieu ; une seule barre d'Undo,
  une seule confirmation inline (voir la matrice).
- Encre `grey-80` à `grey-100` seulement ; hiérarchie par taille et graisse. Filets en `grey-20`.
  Pas d'élévation imbriquée, pas de labels en majuscules, pas de barre d'accent latérale, boutons
  jamais pleine largeur, une métrique toujours nommée en texte.
- Orange = action principale (une par zone). Bleu électrique = interactif, jamais une donnée.
  Graphes en `--chart`. Une couleur par agent, en petites marques seulement.
- Réseaux affichés par leur icône seule (nom en infobulle).
- Les trois crans d'autonomie s'appellent **Suggest · Draft · Act**, dans cet ordre, partout.
- Chaque badge de compteur veut dire « needs you ».
- Desk (brief + Your day + volet), Inbox Needs you groupée, Ideas d'Atlas : mises en page validées.
- Hors périmètre maintenu : multi-clients/agence, vrai LLM ou backend, appels réseau, notifications
  hors de l'app, rendu vidéo réel. **Tout le reste de PROMPT.md §14 peut être rouvert** si la
  fonction se fait sous forme agentique (ex. « Report Studio » = on demande un rapport à Iris et on
  l'édite section par section, pas un builder glisser-déposer ; « Paid » = Iris recommande et
  consomme un budget boost, pas un gestionnaire de campagnes publicitaires).

## La grille agentic-first
Chaque capacité que tu portes depuis Agorapulse doit répondre, dans le code, à ces sept questions.
Une réponse manquante = capacité pas finie.

1. **Que fait l'agent seul ?** Quelle action de `src/data/agents.ts` la porte, à quel cran par
   défaut, verrouillée ou non. Nouvelle capacité risquée → nouvelle action avec son risque.
2. **Le cran change-t-il le comportement réel ?** Suggest : l'agent propose, Sam fait. Draft :
   l'agent prépare, Sam valide (carte Desk, groupe Needs you, lot). Act : l'agent exécute, une ligne
   au journal avec Undo réel. Passer une action en Act depuis le profil fait **l'action**, pas
   seulement disparaître la carte.
3. **Que remonte-t-il, et où ?** Carte Desk (Needs you / Worth a look / Good news), lot, groupe de la
   vue Needs you du module. Toujours avec la raison.
4. **Comment s'explique-t-il ?** Pourquoi, règle du Playbook appliquée, confiance, sources chiffrées
   qui renvoient à l'écran d'origine.
5. **Comment ça s'annule ?** Journal (`pushLog`, `undoMinutes`), Undo qui restaure vraiment l'état.
   Ce qui ne s'annule pas le dit avant.
6. **Comment on le lui demande ?** Une phrase en ⌘K ou dans Chat (@mention) produit l'objet. Les
   chiffres cités en Chat et ⌘K sont **les mêmes** que ceux de l'écran (lus dans l'état, pas recopiés).
7. **Comment le testeur le provoque ?** Un événement de script déclenchable au panneau modérateur
   (⇧D), et si utile un preset de scénario.

Et : **un garde-fou affiché est un garde-fou appliqué** (plafonds, heures, quotas). Une règle
d'alerte créée est évaluée. Un compteur affiché est calculé.

## Méthode

### Étape 1 — Audit de parité (lecture seule, une fois au début)
Écris `design-plans/agent-depth/<agent>-backlog.md`, un tableau trié par valeur :
`Capacité Agorapulse · État actuel (fichier:ligne) · Version agentique (qui fait quoi, à quel cran) ·
Valeur pour le test (1–3) · Taille (S/M/L) · Statut`. Pars du backlog d'amorce de ton prompt, vérifie
chaque ligne dans le code (l'inventaire date du 25/11/2026, des lignes ont pu bouger), complète avec
ce que le skill `agorapulse-product` montre et qui manque. Les **bugs listés dans ton prompt passent
en tête**. Commit ce fichier dans ta première PR.

### Étape 2 — Boucle de construction (jusqu'à épuisement du backlog)
Pour chaque ligne, dans l'ordre :
1. Lis tes demandes entrantes (`design-plans/agent-depth/requests/<agent>-from-*.md`) : une demande
   d'un autre agent passe avant le reste de ton backlog si elle le débloque.
2. **Pitch avant de construire** (voir « Pitcher une feature » plus bas) : toute **nouvelle feature**
   attend le feu vert de l'humain. Les corrections de la section « À corriger d'abord » de ton
   prompt et les demandes d'autres agents qui ne font qu'exposer un contrat n'ont pas besoin de pitch.
3. Branche depuis `origin/main` à jour : `claude/<agent>-<sujet>`.
4. Construis : modèle et slice d'abord (avec leur test Vitest), puis l'écran, puis le branchement
   agentique (registre : événement, intent, réponse, hooks), puis les données seed.
5. Vérifie dans le navigateur sur **ton port** (`preview_start` avec la config de ton agent dans
   `.claude/launch.json`) : 1440×900 et 375×812, clair et sombre, états vide / chargement / erreur /
   sélection / focus clavier. Déclenche ton événement depuis ⇧D, passe l'action dans les trois crans.
6. Merge (circuit ci-dessous), puis ligne suivante. Une capacité = une PR. Si une ligne gonfle au-delà
   d'environ une journée de travail, découpe-la.

Une ligne que tu décides de ne pas faire reste dans le backlog avec `Statut : skipped — <raison>`.

### Pitcher une feature
Avant d'écrire la moindre ligne d'une nouvelle feature, pitche-la à l'humain avec l'outil
`AskUserQuestion` et **attends sa réponse**. Une feature par pitch ; jamais de feu vert supposé, ni
reporté d'un pitch à l'autre. Le pitch tient en un écran, dans la question et l'aperçu des options :
- **Le problème** : ce que le testeur ne peut pas faire aujourd'hui, en une phrase, avec la preuve
  (fichier:ligne ou capture).
- **Référence marché** : qui le fait et comment, en une phrase (Agorapulse d'après le skill
  `agorapulse-product`, ou un outil agentique du catalogue `market-ideas.md`) ; ou « personne ne le
  fait », avec la raison de le croire.
- **Notre carte** : en quoi on fait mieux que cette référence (plus sûr, plus explicable, plus relié
  aux autres agents). Une simple copie de parité n'est pas un pitch : elle doit débloquer un
  comportement d'agent, et le pitch le dit.
- **La version agentique** : ce que l'agent fait seul et à quel cran (Suggest / Draft / Act), ce qu'il
  remonte à Sam, comment ça s'annule — les sept questions de la grille, en bref.
- **Ce que le testeur verra** : où (écran, onglet, carte Desk), et une esquisse ASCII ou une capture
  de l'état actuel annotée dans l'aperçu de l'option recommandée.
- **Taille** (S / M / L) et **ce que ça touche** hors de ton dossier (cœur partagé, autre agent).
- **L'alternative** la plus sérieuse, si elle existe.

Options proposées, la recommandée en premier : **Go** (tel que pitché) · **Go, plus simple**
(la version réduite que tu proposes) · **Later** (reste au backlog, `Statut : later`) · **Drop**
(`Statut : dropped — <raison de l'humain>`). Si l'humain répond par du texte libre, c'est sa
version qui fait foi. Note sa décision dans le journal.

Avant d'envoyer, vérifie que l'idée n'a pas déjà été refusée (« Déjà refusé » de
`market-ideas.md` et ton log) : un Drop ne revient jamais ; un Later seulement s'il a changé de
nature, dit en première ligne. En vague 2, `wave-2.md` ajoute cinq tests obligatoires.

Pendant que tu attends une réponse, ne commence pas la feature. Si le backlog contient encore des
corrections « À corriger d'abord », fais-les d'abord pour ne pas bloquer, puis pitche.

### Étape 3 — Clôture
Quand le backlog est épuisé : réécris la sous-section de ton agent dans PROMPT.md §4 et son écran
§6.x pour qu'ils décrivent ce qui existe, mets à jour ta ligne de volumes §9, et publie le rapport
`docs/agent-depth/<agent>.html` (même style que `docs/ui-quality.html`) : parité avant/après par
capacité, captures avant/après des trois écrans les plus changés, ce qui reste ouvert et pourquoi.

## Circuit Git (parallèle)
- Tu travailles dans ton propre worktree. S'il n'a pas de `node_modules`, lance `npm ci`.
- **Avant chaque merge** : `git fetch origin && git merge origin/main` dans ta branche, résous les
  conflits (garde les deux intentions ; ne supprime jamais l'ajout d'un autre agent), puis
  `npm test` et `npm run build` verts, puis revérifie ton écran.
- Ouvre la PR (`gh pr create`, titre `<Agent>: <capacité>`, corps : ce qui change pour le testeur,
  la grille agentic-first remplie, captures), attends la CI de PR verte, puis
  `gh pr merge --merge --delete-branch`.
- Après le merge : `git fetch && git checkout origin/main && npm test` ; vérifie que le workflow
  « Deploy to GitHub Pages » passe (`gh run list --branch main --limit 3`). **Si `main` est rouge,
  quel qu'en soit l'auteur, le réparer devient ta priorité** : PR `Fix main: <cause>` minimale.
- Jamais de force-push, jamais de rebase d'une branche déjà poussée, jamais de commit direct sur
  `main`. Messages de commit en phrases simples préfixées (`Nova: …`).

## Propriété des fichiers
- **À toi** : `src/features/<ton dossier>/` (dont `agent.tsx` et `script.ts`, ton registre), `src/data/<ton module>.ts`,
  ta sous-section de PROMPT.md, tes fichiers `design-plans/agent-depth/<agent>-*.md`,
  `docs/agent-depth/<agent>.html`, ton entrée dans `src/data/agents.ts` (actions, garde-fous).
- **Partagé, touche minimale** : `src/app/*`, `src/ui/*`, `src/styles/tokens.css` / `base.css`,
  `src/app/types.ts`, `src/features/desk/*`, `src/features/agents/*`, `src/features/moderator/*`,
  `src/main.tsx`, `src/app/Shell.tsx`. Un changement ici part dans **sa propre petite PR, mergée
  tout de suite**, jamais mêlée à une feature ; elle étend (nouveau champ optionnel, nouvelle
  variante) sans renommer ni changer ce qui existe. Ajoute en fin de liste, jamais au milieu.
- **Chez un autre agent** : tu n'y écris pas. Tu consommes son état et ses contrats en lecture.

## Relais entre agents
Besoin d'une chose qui appartient à un autre agent (un champ, un hook, un événement, une donnée) :
crée `design-plans/agent-depth/requests/<destinataire>-from-<toi>-<sujet>.md` (un fichier par demande,
pour n'avoir aucun conflit) avec : ce dont tu as besoin, pourquoi (quel scénario de test), la forme
proposée du contrat, et ce que tu fais en attendant (dégradation propre, jamais un bouton mort).
Merge-le dans ta prochaine PR. Le destinataire le traite, puis renomme le fichier en `…-done.md`
avec le lien de sa PR.

Contrats déjà attribués (source unique, les autres lisent) :
| Donnée | Propriétaire | Lecteurs |
|---|---|---|
| Piliers, cadence cible, campagnes (`targetsOf(s)` dans `strategy/slice.ts`) | Sage | Atlas, Iris |
| Posts, calendrier, créneaux | Atlas | Sage, Iris, Juno |
| Conversations, contacts, temps de réponse | Nova | Iris, Echo |
| Chiffres de performance (reach, engagement, perfs de posts et de clips) | Iris | tous (Chat et ⌘K compris) |
| Mentions, concurrents, tendances | Echo | Atlas, Sage, Iris, Nova |
| Clips, sources vidéo | Juno | Atlas, Iris |
| Règles, faits, escalades (Playbook) | partagé via `src/features/playbook/slice.ts` (Trust en vague 2) | tous |
| Autonomie, promotions, shadow, test, trust metric (vague 2) | Trust | tous |

## Journal de décisions
L'humain tranche les features (pitch) ; tu tranches seul tout le reste, sans t'arrêter. Chaque choix
produit non évident va dans `design-plans/agent-depth/<agent>-log.md`, une ligne :
`date · capacité · choisi · écarté · pourquoi`, y compris la réponse à chaque pitch (Go / Go plus
simple / Later / Drop et son commentaire). Exemples de choix à journaliser : un nouveau cran par
défaut, une capacité Agorapulse volontairement non portée, un écart à la matrice de cohérence. Un
choix qui change ce que l'humain a validé dans un pitch (nouvel écran, cran différent, parcours
différent) se re-pitche.

## Garde-fous
- Ne casse aucun comportement : tous les tests restent verts ; toute logique non triviale ajoutée a
  son test (reducer de slice, modèle, évaluation de règle, garde-fou).
- Pas de nouvelle dépendance. Pas de valeur visuelle inventée quand un token existe. On étend une
  primitive, on ne la copie pas.
- Données crédibles et cohérentes (PROMPT.md §9) : un même chiffre est identique sur tous les écrans,
  en Chat et en ⌘K. Pas de lorem, pas deux brouillons identiques.
- Toute fonction visible marche. Si tu ne la finis pas, elle n'est pas dans l'UI.
- Le Day 1 (onboarding, `src/features/onboarding/day1.ts`) doit rester cohérent avec ce que tu ajoutes.
- Le panneau modérateur garde son tester log : toute nouvelle décision du testeur y est tracée.

## Définition de « fini » (par session)
- Backlog épuisé (chaque ligne `done`, `later`, `dropped — raison` ou `skipped — raison`), chaque
  feature construite ayant reçu un Go explicite, demandes entrantes traitées.
- Les sept questions de la grille ont une réponse dans le code pour chaque capacité.
- Chaque action de ton agent change réellement le comportement dans ses trois crans ; chaque
  garde-fou affiché est appliqué.
- `npm test` et `npm run build` verts sur `main`, déploiement passé, URL live vérifiée.
- Vérifié à 1440 et 375, clair et sombre, focus visible, contrastes AA.
- PROMPT.md à jour pour ton agent, rapport `docs/agent-depth/<agent>.html` publié.
