# Protopulse — Phase 0 : préparer le terrain pour six sessions en parallèle

Tu travailles sur Protopulse (`~/code/protopulse`, live sur https://mbousendorfer.github.io/protopulse/) :
un prototype cliquable mocké de gestion des réseaux sociaux par agents IA, aux couleurs d'Agorapulse.
Vite 5 + React 18 + TypeScript strict, CSS natif à custom properties, Radix, lucide-react, cmdk,
HashRouter, état `useReducer` + contexte persisté en `localStorage`, déployé par GitHub Actions à
chaque push sur `main`. L'UI est en anglais, la spec en français.

## Mission
Juste après toi, **six sessions** (une par agent : Nova, Atlas, Iris, Echo, Sage, Juno, prompts dans
ce dossier) vont approfondir chacune leur agent **en même temps**, et merger chacune sur `main`.
Aujourd'hui, toute fonctionnalité d'agent oblige à modifier les mêmes fichiers centraux, à la main,
au même endroit : six sessions s'y battraient. Ta mission : **rendre le cœur extensible par agent,
corriger les défauts transverses que toutes les sessions rencontreraient, et poser la CI**, sans
changer ce que voit le testeur.

Lis aussi `_common.md` (circuit Git, garde-fous) : il s'applique à toi, sauf la partie backlog.
Tu es seul sur `main` pendant ton travail.

## Les points chauds (état au 25/11/2026, revérifie les lignes)
| Fichier | Ce que chaque feature y ajoute aujourd'hui |
|---|---|
| `src/app/reducer.ts` | ligne de dispatch par préfixe (`reduceAll`), appel `onResolveX` dans `resolve()` (~l.118-124), branche d'Undo dans `core/undo` (~l.312-324 : `reverseDecision`, `undoDeskClips`, `unscheduleIdea`, `unsendClips`), tick dans `core/heartbeat` (~l.366-402 : `deliverFollowUps`, `tickIdeas`, `tickVideo`), branche de `fire()` par type d'événement (~l.159-191 : `handoff`, `idea`, `video`), presets (`TRAIL_SCRIPT_PRESETS` ~l.237-250) |
| `src/app/store.tsx` | liste `SLICES` (l.11), tests « due » du battement de cœur (`hasDueFollowUps`, `ideasDue`, `videoDue`, ~l.51-64) |
| `src/data/script.ts` | un seul tableau `SCRIPT` partagé, joué dans l'ordre |
| `src/data/command.ts` | union `Intent` (~l.4-20), map `OWNER`, `parse()` |
| `src/features/command/CommandBar.tsx` | `switch` sur `intent.kind` (~l.160-285) |
| `src/features/chats/respond.ts` | `switch` de `respond()` sur l'intent |
| `src/features/desk/parts.tsx`, `Batch.tsx` | rendu par type de preview (`PreviewBlock`), matchers de lot par agent (~l.39, 46) |
| `src/app/types.ts` | union `Preview`, champs optionnels propres à une feature sur `Handoff` / `LogEntry` |
| `src/features/agents/Agents.tsx` | onglets de profil propres à un agent (ex. Alerts pour Iris et Echo) |
| `src/features/moderator/Moderator.tsx` | lignes de stats du tester log par feature |

## Travail

### 1. Un registre par agent
Crée pour chaque agent un module unique qui déclare tout ce que son agent branche dans le cœur, par
exemple `src/features/<dossier>/agent.ts` (dossiers : `inbox`, `publishing`, `insights`, `listening`,
`strategy`, `video`), et un index `src/app/agents-registry.ts` qui les rassemble. Contenu d'un module
(tous les champs optionnels) :
- `script` : ses `ScriptEvent[]` (déplace-les depuis `src/data/script.ts` ; `SCRIPT` devient la
  concaténation, **ordre de jeu préservé** à l'identique — ajoute un champ d'ordre si nécessaire) ;
- `onResolve(s, h, d)`, `onUndo(s, entry)`, `tick(s)` et `due(s)` (battement de cœur) ;
- `fire` pour un type d'événement qui lui est propre (aujourd'hui `idea`, `video`) ;
- `intents` : ses intents ⌘K (forme, `parse` local, action dans la barre) et ses réponses de chat ;
- `previews` : le rendu Desk de ses types de preview, et ses matchers de lot ;
- `profileTabs` : ses onglets de profil spécifiques ;
- `testerStats` : ses lignes du tester log.

`reducer.ts`, `store.tsx`, `CommandBar.tsx`, `respond.ts`, `parts.tsx`, `Batch.tsx`, `Agents.tsx`,
`Moderator.tsx` **itèrent sur le registre** au lieu d'appels câblés. Après ça, une session d'agent
ne doit plus toucher ces fichiers pour brancher une capacité : seulement son module.

Ne sur-construis pas : pas de framework de plugins, pas de chargement dynamique. Un objet typé par
agent, un tableau, des boucles. Si un point d'extension n'a aujourd'hui qu'un seul utilisateur et
qu'il est improbable que d'autres agents en aient besoin, garde-le là où il est.

### 2. L'autonomie qui agit
`setAutonomy` (`src/app/core.ts`, ~l.52-63) : passer une action en Act retire ses cartes du Desk
et écrit « Handled on its own », **sans faire l'action**. Effets constatés : le plan d'Atlas reste
« proposed », le rapport hebdo d'Iris n'est pas partagé, la conversation de Nova reste en brouillon
dans Needs you, la question du code promo disparaît alors qu'Atlas « n'invente jamais de code ».
Corrige à la source : une carte prise par Act passe par le `onResolve` de son agent comme une
approbation (même effet que si Sam avait approuvé, journal compris, Undo réel). Les cartes qui
demandent un choix ou une information (`option` sans recommandée, `info`, sujets verrouillés)
**restent** sur le Desk : Act ne décide pas à la place de Sam ce qu'il n'a jamais su décider seul.
Teste les deux cas.

### 3. Contrats de données partagés
- **Piliers et cadence : une seule source**, propriété de Sage (`state.strategy`). Aujourd'hui trois
  sources divergent : `src/data/strategy.ts` (~l.160-170), `CADENCE` dans `src/data/publishing.ts`
  (~l.30, sans cible X) et `PILLARS` dans `src/data/playbook.ts` (~l.84-89) ; les cibles diffèrent
  (Trail stories 30 % vs 25 %, Repair & care 15 % vs 20 %). Choisis les valeurs de Strategy, fais lire
  Atlas (Ideas, Plan review) et le Playbook depuis l'état de Sage via un sélecteur exporté. Journalise
  le choix dans le corps de la PR.
- **Chemin générique « post approuvé »** (`src/features/publishing/slice.ts`, ~l.311-313) : il force
  le pilier « Trail stories » et perd la campagne. Il doit reprendre pilier et campagne de la carte
  (ajoute les champs optionnels sur `Handoff` si besoin).
- **Champs de `Post`** attendus par plusieurs agents, ajoutés optionnels et vides, sans UI :
  `labels?: string[]`, `link?: { url: string; utm?: Record<string, string> }`,
  `format?: 'post' | 'carousel' | 'reel' | 'story' | 'short' | 'video' | 'document'`,
  `campaignId?` (en plus du libellé `campaign` existant). Rien d'autre : chaque session ajoutera
  ce qui lui est propre.
- Ne change pas `STATE_VERSION` : `mergeSaved` donne leurs défauts aux nouveaux champs. Écris en
  tête de `src/app/state.ts` la règle « on ne bump la version que si une forme existante change ».

### 4. CI sur les PR
Ajoute `.github/workflows/ci.yml` : sur `pull_request` vers `main`, `npm ci`, `npm test`,
`npm run build` (Node 22, cache npm, comme `deploy.yml`). Ne touche pas à `deploy.yml`.

### 5. Ports et dossiers
- `.claude/launch.json` : garde `protopulse` (5179) et ajoute `protopulse-phase0` (5180),
  `protopulse-nova` (5181), `protopulse-atlas` (5182), `protopulse-iris` (5183), `protopulse-echo`
  (5184), `protopulse-sage` (5185), `protopulse-juno` (5186), même commande `npx vite --port <port>`.
- Crée `design-plans/agent-depth/requests/.gitkeep`.

### 6. Tests
- Les ~88 tests existants restent verts **sans modification de leurs attentes** (le comportement ne
  change pas, sauf le point 2).
- Ajoute : un test que le script joue dans le même ordre qu'avant ; un test que chaque hook du
  registre est appelé (résolution, Undo, battement de cœur) ; les deux tests du point 2 ; un test
  que les piliers lus par Atlas sont ceux de Sage.

## Méthode
1. Branche `claude/phase-0-registry` depuis `origin/main`.
2. Commits séparés par point (1 à 5), build et tests verts à chaque commit.
3. Vérifie dans le navigateur (port 5180) le parcours de bout en bout : Desk, ⌘K (« what did Nova
   do overnight », un brief de campagne), Chat avec @mention, ⇧D Trigger now sur un événement de
   chaque agent, une vidéo, une idée, Undo depuis le journal, passage d'une action en Act.
4. Une seule PR « Phase 0: per-agent registry, autonomy that acts, shared contracts, PR CI », avec
   dans le corps : la carte « où brancher quoi » (tableau point d'extension → champ du registre),
   les décisions prises. Merge (`gh pr merge --merge --delete-branch`), vérifie le déploiement.

## Définition de « fini »
- Une capacité d'agent se branche en ne touchant que son dossier, son module de données et son
  registre — démontré dans la PR par un exemple (un événement ajouté à un agent sans toucher au cœur,
  retiré avant merge).
- Act fait l'action ; les décisions restent à Sam.
- Piliers/cadence : une source ; post approuvé : pilier et campagne conservés.
- CI de PR active, `launch.json` à 8 configs, dossier `requests/` présent.
- Tests verts, build vert, déployé, URL live vérifiée.
- `_common.md` mis à jour si le nom ou la forme du registre diffère de ce qu'il annonce
  (section « Sources de vérité », point 3).
