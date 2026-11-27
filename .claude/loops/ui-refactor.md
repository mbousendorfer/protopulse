# Loop — UI refactor (protopulse)

Objectif : l'interface est trop complexe, mélange plusieurs métiers sur un même écran et tient mal quand le volume
grandit. Chaque tick prend **une** surface, la réévalue à partir des objectifs de l'utilisateur, et la restructure
(split de vue, onglets, modale, panneau, regroupement, suppression) pour que **chaque objectif ait le chemin le plus
court et le plus évident possible**. Toutes les surfaces passent, puis on recommence avec une barre plus haute.

Pendant que cette loop tourne, la loop UI next level est en pause (fichier `ui-refactor-active`, voir §0).

## 0. Garde-fous de début de tick
- `FLAG=$(git rev-parse --git-common-dir)/ui-refactor-active` : crée-le (`touch`) s'il n'existe pas. Il met UI next
  level en pause. Ne le supprime que sur demande de Matt.
- Une PR `claude/ui-refactor-*` encore ouverte → reprends-la (checks, merge main, merge) au lieu d'en créer une
  autre. Arbre de travail sale non lié à la loop → `PushNotification`, fin du tick.
- `git fetch origin main --quiet`, `git switch --detach origin/main`. `node_modules` absent → `npm ci`.

## 1. Inventaire (premier tick, puis tenu à jour)
Le registre `design-plans/ui-refactor/ledger.md` est la mémoire de la loop. S'il n'existe pas, construis-le :
- **Surfaces** : chaque route, onglet, panneau latéral, sheet d'objet, modale, drawer, popover riche, barre de
  commande, état plein écran (Focus), onboarding, Settings, moderator. Sources : PROMPT.md §5 et §6, le router et
  le shell (`src/app`), chaque `src/features/<module>`. Une ligne par surface : id, chemin pour l'ouvrir, fichiers,
  statut (`todo` / `done pass N`), score, date, PR.
- **Objectifs utilisateur** : pour Sam (PROMPT §2) et chaque surface, les objectifs réels en une phrase
  (« répondre à un avis négatif », « décaler le post de jeudi », « savoir si la campagne marche »). Pour chacun : le
  chemin actuel mesuré en vrai dans le navigateur (écrans traversés, clics, décisions à prendre, informations à
  chercher ailleurs) et le chemin cible.
- Commit le registre seul dans la première PR (`UI refactor: ledger`), puis passe au §2 au tick suivant.

## 2. Choisir la surface
- La surface `todo` dont les objectifs ont le chemin le plus long ou le score le plus bas. Les surfaces partagées
  (shell, sheet d'objet, Desk) d'abord : leur refonte se propage.
- Toutes les surfaces `done pass N` → passe N+1 : re-mesure tout, remets en `todo` celles dont un objectif peut
  encore perdre une étape ou dont le score est < 4/5, avec une barre plus haute qu'à la passe précédente.
- Lis le registre en entier avant de choisir : ne défais pas une décision d'une passe précédente sans nouvelle preuve.

## 3. Évaluer (trois lentilles, sur la surface rendue, pas sur le code seul)
- `preview_start` `protopulse`. Remplis les données qui peuvent être vides (Publishing › Queues « Ask Atlas to
  fill », etc.). Captures 1440×900 et 375×812 de chaque état : vide, normal, chargé (beaucoup d'éléments), erreur.
- `/anthropic-skills:ux-heuristics` sur la surface et sur chaque objectif du registre : Nielsen 10 + Krug,
  walkthrough cognitif objectif par objectif, sévérité 0-4. Note pour chaque objectif : étapes, décisions, endroits
  où l'utilisateur hésite ou doit se souvenir de quelque chose.
- Diagnostic de structure, à répondre explicitement dans le plan :
  1. **Combien de métiers** cette surface sert-elle ? Plus d'un objectif principal en concurrence → split (vues
     séparées, onglets, ou sous-route).
  2. **Qu'est-ce qui est rarement utilisé** et occupe de la place au repos ? → repli, menu « More », modale,
     panneau à la demande, ou suppression.
  3. **Qu'est-ce qui casse à 10× le volume** (200 posts, 50 conversations, 12 campagnes) ? → liste virtualisable,
     regroupement, filtres, recherche, pagination, sélection multiple (PROMPT §6.0).
  4. **Où le même objet a-t-il plusieurs représentations** ou plusieurs chemins concurrents ? → une seule (sheet
     d'objet commune, un seul point d'entrée par action).
  5. **Panneau, modale, page ou onglet ?** Tâche courte qui garde le contexte → panneau latéral ou popover ; décision
     bloquante → modale ; travail long ou partageable → page/route ; vues sœurs d'un même objet → onglets.
- `/anthropic-skills:frontend-design` pour la direction de la refonte (mise en page, hiérarchie, densité), en
  **lecture de relecture seulement** : les tokens, primitives et conventions restent ceux du projet.
- Score /5 de la surface (clarté de l'objectif principal, longueur des chemins, scalabilité, cohérence).

## 4. Plan
`design-plans/ui-refactor/<surface>.md` : objectifs et chemin avant → après (en nombre d'étapes), findings
(heuristique / preuve capture / fix), structure cible (croquis ASCII de la nouvelle découpe), ce qui disparaît, ce
qui bouge où, ce qui a été écarté et pourquoi. Pas de goût non sourcé.

## 5. Implémenter
- Branche `claude/ui-refactor-<surface>` depuis `origin/main`. Refonte franche et visible : nouvelle découpe,
  autre primitive, copy réécrite, suppression de ce qui n'aide aucun objectif. Diff le plus court qui atteint la
  structure cible ; réutilise les primitives `src/ui` et les motifs déjà présents ailleurs.
- Références qui font foi, dans l'ordre : PROMPT.md §3 et §10, `design-plans/consistency-matrix.md`, règles UI de
  `~/.claude/CLAUDE.md` sauf exception écrite dans la matrice, `src/styles/tokens.css`. Aucune valeur inventée.
- Un motif structurel nouveau (ex. « les sheets d'objet ont des onglets Overview / Activity ») → applique-le
  partout où il vaut et écris la règle dans la matrice.
- PROMPT §3 tient : pas de bouton mort, tout s'explique, tout s'annule. Aucun objectif ne doit perdre de chemin :
  chaque objectif du registre reste atteignable, raccourcis clavier et ⌘K compris.
- **Mets à jour PROMPT.md §5/§6** dans la même PR quand la structure d'un écran change.
- Ne touche pas à `src/data` ni au moteur (`src/app/store|reducer|engine`) sauf si la refonte l'exige ; dis-le.

## 6. Vérifier
- `npx tsc --noEmit`, `npm test`, `npm run build` verts.
- Navigateur, surface refaite + toutes celles qui la partagent, 375 / 1000 / 1440, clair et sombre : pas d'erreur
  console, pas de scroll horizontal de page, rien qui dépasse de sa carte, pas de texte coupé sans ellipse, focus
  visible, contraste AA. Rejoue chaque objectif du registre et compte les étapes : aucune ne doit augmenter.
- Captures avant/après pour chaque objectif.
- Échec non résolu en deux essais → PR en draft, `PushNotification` avec la cause, surface notée `blocked` dans le
  registre, fin du tick.

## 7. Livrer
- Registre mis à jour (statut, score avant/après, chemins avant/après, PR). Commit en anglais, sujet
  `UI refactor: <surface> — <résumé>`. Push, `gh pr create` : corps = objectifs et chemins avant → après,
  findings, structure, écarté, captures.
- Juste avant de merger : `git fetch`, `git merge origin/main`, relance `npx tsc --noEmit`, `npm run build`,
  `npm test`. Rouge → corrige, repousse, recommence.
- `gh pr merge --squash --delete-branch` (Matt l'a autorisé le 27/11 pour les PR de cette loop). Puis
  `git switch --detach origin/main`. CI de main rouge au tick suivant → correctif en priorité.

## Garde-fous
- Une surface et une PR par tick. Jamais de force-push, jamais de modif de `main` hors PR.
- Une refonte confiée à une autre session réserve sa surface tant que sa PR est ouverte.
- Si une refonte supprime une fonction que PROMPT.md §1 demande de tester, ne la supprime pas : déplace-la.
