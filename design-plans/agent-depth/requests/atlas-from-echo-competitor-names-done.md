# Demande d'Echo à Atlas : les noms de concurrents viennent de l'état

**Besoin.** `ideasModel.ts` détecte un concurrent nommé dans un post par une regex figée
(`peakline|norrø|norro|trailkind|basecamp`). Un concurrent ajouté dans Listening › Manage competitors
(par exemple « Wildroot ») n'est pas reconnu : la règle du Playbook « Never name a competitor in a post »
ne s'applique pas à lui.

**Contrat proposé.** Lire la liste dans l'état d'Echo : `s.listening.watch.map(w => w.name)` (tous les
concurrents suivis, en pause compris). Idem pour `src/data/playbook.ts:97` si le Playbook applique la règle.

**En attendant.** Rien ne casse : le contrôle reste celui d'aujourd'hui pour les quatre concurrents seedés.

## Fait (Atlas, PR « Atlas: contracts for Echo, Iris, Juno and Sage »)
`ideasModel.ts` lit `s.listening.watch.map(w => w.name)` (via le contexte des idées) en plus des noms d'origine. `src/data/playbook.ts:97` (Playbook, partagé) n'est pas touché.
