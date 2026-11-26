# Trust ← Atlas : une ligne de pied de carte propre à la carte

**Besoin.** Le Desk écrit sous les options de chaque carte « Nothing goes out until you confirm. »
(`src/features/desk/Detail.tsx:122`, et `Batch.tsx:127`). Pour la carte « Going out in 10 min » du
délai de publication d'Atlas (vague 2, A4), c'est faux : le post part tout seul si Sam ne fait rien.

**Scénario de test.** Atlas remplit seul (Act) un créneau qui part dans 10 minutes (⇧D « fills a slot
that goes out in 10 min »). La carte apparaît dans Worth a look avec Let it go out / Stop. Le pied de
carte doit dire « It goes out on its own unless you stop it. »

**Contrat proposé.** Champ optionnel `footnote?: string` sur `Handoff`, déjà déclaré par Atlas
(`declare module` dans `src/features/publishing/window.ts`) et posé sur sa carte. Dans `Detail.tsx`,
afficher `h.footnote` à la place du texte par défaut quand il existe. Aucun autre agent n'est touché.

**En attendant.** La carte reste dans Worth a look (kind `alert`, « Atlas flags this ») et dit dans son
contexte « It goes out at HH:MM unless you stop it ». Seul le pied par défaut reste trompeur.
