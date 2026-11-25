# Atlas — journal de décisions

`date · capacité · choisi · écarté · pourquoi`

- 25/11/2026 · Undo des cartes Desk · instantané par carte (`byCard`) : posts et idées avant, posts ajoutés, plan · inverser à la main chaque branche de `onResolve` · une seule règle couvre toutes les cartes (plan, post généré, post lié, Sage cadence, idées), Act et approbation de Sam compris
- 25/11/2026 · Nouveau plan après rejet · deuxième plan écrit (`PLAN_B`), mêmes créneaux, posts Trail Week gardés, 10 posts d'Atlas remplacés, alterne v1/v2 · regénérer depuis les idées ouvertes · la cadence de Sage reste respectée et les textes restent crédibles ; les posts de campagne appartiennent à Sage
- 25/11/2026 · Visuel manquant en Act · Atlas agit depuis son battement de cœur (`due`/`tick`), passe par `onResolvePublishing` et écrit sa ligne de journal avec Undo 30 min · changer `actDecision` du cœur pour qu'il prenne les cartes `info` · le cœur exclut les cartes `info` pour tous les agents ; seule celle-ci a une réponse qu'Atlas peut trouver seul
- 25/11/2026 · Choix du visuel · score par tags du pilier puis mots partagés, le moins utilisé d'abord, licences expirées et stock exclus · un visuel codé en dur par carte · marche pour toute carte « Missing visual » future
- 25/11/2026 · Upload dans Media · image réduite à 640 px en JPEG (data URL) gardée dans l'état sauvegardé, `Photo` l'affiche (PR #29) · URL blob de session comme Juno · un visuel posé sur un post doit survivre au rechargement
