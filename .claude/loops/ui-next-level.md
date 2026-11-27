# Loop — UI next level (protopulse)

Objectif constant : chaque changement mergé dans main ressort ultra qualitatif, delightful, compréhensible au premier
regard, simple en surface et profond quand on creuse, parfaitement cohérent avec le reste du produit.

## 0. Pause
- `$(git rev-parse --git-common-dir)/ui-refactor-active` existe → la loop UI refactor tourne : ne fais rien,
  `ScheduleWakeup` 1800 s, fin du tick.

## 1. Détecter ce qui est nouveau
- `git fetch origin main --quiet`.
- STATE=`$(git rev-parse --git-common-dir)/ui-loop-last-reviewed`. S'il n'existe pas : base = `origin/main~1`
  (première passe = dernière PR mergée).
- Liste `git log --first-parent --format='%H %s' <base>..origin/main`. Retire les commits dont le sujet commence par
  `UI next level:` ou `Merge pull request … from …/claude/ui-next-level-`.
- Rien qui reste → écris `origin/main` dans STATE, `ScheduleWakeup` 300 s, fin du tick.
- Calcule les fichiers touchés par les commits restants. Aucun fichier sous `src/features`, `src/ui`, `src/styles`,
  `src/app/Shell*` → avance STATE, wakeup, fin.
- Déduis les surfaces (routes) concernées à partir de `src/features/<module>` et du router.

## 2. Préparer la branche
- Arbre propre sinon stop + notification. `git switch -c claude/ui-next-level-<sha7> origin/main`.
- `node_modules` absent → `npm ci`.

## 3. Review (deux lentilles, scope = surfaces touchées + ce qu'elles partagent)
- Lance `/improve-ui` sur ces surfaces. Pré-sélection : **toutes les findings de sévérité ≥ 2, 6 max, les plus
  graves d'abord** → ne t'arrête pas pour demander, écris directement les plans dans `design-plans/`.
- Lance `/anthropic-skills:ux-heuristics` sur les mêmes parcours (Nielsen + Krug, scénarios de test de PROMPT.md §1).
  Garde ce qui touche la compréhension, la confiance, l'annulation, les états vides/chargement/erreur.
- Références qui font foi, dans cet ordre : PROMPT.md §3 et §10, `design-plans/consistency-matrix.md` (exceptions
  écrites incluses), règles UI de `~/.claude/CLAUDE.md` sauf exception écrite dans la matrice, `src/styles/tokens.css`
  + primitives `src/ui`. Pas de valeur inventée, pas de nouveau composant si une primitive existe.
- Une finding = une règle + une preuve à l'écran + un fix. Pas de goût personnel non sourcé.
- Cohérence : chaque fix vérifie si le même motif existe ailleurs et le corrige partout (fix à la racine, dans la
  primitive partagée, pas écran par écran).
- Delight : au plus une amélioration de « moment » par passe (micro-interaction, copy plus humaine, état vide plus
  utile), uniquement si elle sert la compréhension.
- **Redesign, pas seulement des retouches** (demande de Matt, 25/11) : regarde chaque surface touchée en vrai
  (screenshots 1440 et 375) et demande-toi si un utilisateur la trouverait bonne au premier regard. Si un bloc est
  faible (hiérarchie confuse, densité qui noie l'info, contrôle illisible ou mal choisi, parcours qui fait réfléchir),
  redessine-le franchement : nouvelle mise en page, autre primitive, copy réécrite. Au moins une amélioration
  visible par passe quand la surface le mérite ; les détails invisibles (1 px, un token équivalent) ne suffisent pas
  seuls. Garde-fous inchangés : tokens et primitives du DS, PROMPT §10, matrice ; la preuve est la capture avant/après
  et la règle ou l'heuristique qu'elle sert. Une refonte qui change un parcours ou un écran entier → PR en draft et
  notification, pas de merge automatique.
- Aucune finding qui survit → avance STATE, supprime la branche, wakeup, fin.

## 4. Implémenter
- Exécute les plans de `design-plans/` écrits à l'étape 3. Diff le plus court qui règle la cause.
- Ne casse aucune règle de PROMPT.md §3 (pas de bouton mort, tout s'explique, tout s'annule).
- Met à jour `consistency-matrix.md` seulement si une règle ou exception change.

## 5. Vérifier
- Balayage systématique (demandé après les bugs Queues et Insights du 25/11) : remplis d'abord les données qui
  peuvent être vides (Publishing › Queues « Ask Atlas to fill »), puis visite TOUS les onglets de tous les modules à
  375, 1000 et 1440, et signale tout élément qui dépasse de sa carte sans conteneur de défilement, et tout scroll
  horizontal de page. Un onglet ou un état vide n'est pas une preuve.
  Signale aussi le texte coupé par son conteneur sans points de suspension (`scrollWidth > clientWidth`,
  `overflow` ≠ visible/auto/scroll, `text-overflow` ≠ ellipsis), hors `.sr-only` : c'est ce qui avait caché
  « Ridge 28L on the Écrins loo » / « 1 wa » dans l'Inbox (#121).
- `npm test` et `npm run build` verts.
- `preview_start` `protopulse`, chaque surface touchée en 1440×900 et 375×812, clair et sombre : pas d'erreur console,
  pas de scroll horizontal, focus visible, contraste AA du texte, fix visible. Screenshots avant/après.
- Un échec que tu ne sais pas corriger en deux essais → PR en draft, `PushNotification` avec la cause, avance STATE,
  wakeup, fin.

## 6. Livrer
- Commit (message en anglais, sujet `UI next level: <résumé>`), push, `gh pr create` : titre identique, corps =
  commits relus, findings (règle / preuve / fix), ce qui a été écarté et pourquoi, captures avant/après.
- Juste avant de merger : `git fetch` puis `git merge origin/main` dans la branche, et relance `npx tsc --noEmit`,
  `npm run build` et `npm test` sur le résultat (deux PR vertes chacune peuvent casser main ensemble : #37 + #50).
  Rouge → corrige, repousse, recommence.
- Main bouge plus vite qu'un cycle complet (plusieurs sessions mergent chaque minute) : si `origin/main` a avancé
  pendant les vérifs, refais `git merge origin/main` + `npx tsc --noEmit` seulement, pousse et merge tout de suite ;
  puis lance `npm run build` et `npm test` sur main. Rouge → PR de correctif en priorité, avant toute autre chose.
- Une refonte confiée à un sous-agent (ex. Composer, 25/11) réserve sa surface : la loop n'y touche pas tant que sa
  PR est ouverte.
- `gh pr merge --squash --delete-branch` (Matt l'a autorisé le 25/11 pour les PR de la loop). Puis
  `git switch --detach origin/main` après fetch. Vérifie que le CI de main repasse vert au tick suivant.
- Écris dans STATE le SHA de `origin/main` **que tu as relu** (celui d'où la branche est partie), jamais le main du
  moment du merge : d'autres PR arrivent pendant le tick et doivent être relues au suivant. Ton propre commit est
  ignoré au tick suivant (sujet `UI next level:`).
- `ScheduleWakeup` 300 s.

## Garde-fous
- Une seule PR par tick. Jamais de force-push, jamais de modification de `main` hors PR.
- Ne touche pas aux données mock (`src/data`) ni au moteur (`src/app/store|reducer|engine`) sauf si la finding
  l'exige, et dis-le dans la PR.
- Une PR de la loop encore ouverte → ne crée rien, notifie, wakeup.
