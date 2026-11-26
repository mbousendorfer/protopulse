# Protopulse — profondeur des agents, vague 2 : des features que le marché n'a pas encore

> Prompt commun aux **sept sessions** de la vague 2 : Nova, Atlas, Iris, Echo, Sage, Juno, et
> **Trust** (la couche transverse, prompt `trust.md`). Elles tournent en parallèle sur `main`.

## À lire avant tout, dans cet ordre
1. `design-plans/agent-depth/_common.md` : contexte, grille agentic-first, circuit Git, propriété
   des fichiers, relais, garde-fous. **Tout s'applique**, sauf l'étape 1 « audit de parité »,
   remplacée ci-dessous.
2. `design-plans/agent-depth/market-ideas.md` : le préambule (ce que l'humain valide et coupe, ce qui
   est déjà refusé, la règle d'autonomie, les anti-patterns) **et** ta section.
3. **Contexte interne, local et confidentiel** : `~/code/protopulse-notes/market-context.md` (verdicts
   de l'équipe sur les concurrents, direction produit interne, veille, liens vers les sources). Lis-le
   pour pitcher juste. **N'en recopie jamais rien dans le repo** (voir « Confidentialité »).
4. Ta vague 1 : `design-plans/agent-depth/<agent>-backlog.md`, `<agent>-log.md`,
   `docs/agent-depth/<agent>.html` (Trust : lis les sept logs en diagonale, surtout les pitchs).
5. Les sources brutes si une idée demande de la précision : l'artifact et les notes Slite listés
   dans le fichier local (outil Artifact `read`, outils Slite `get-note`).

## Mission
La vague 1 a porté la parité avec Agorapulse. La vague 2 porte **ce qui change la façon de
travailler** : des agents qui se mettent en shadow, se testent, s'expliquent, apprennent, se passent
des objets entre eux et vont du commentaire à la vente. La barre : **mieux que la référence du
marché** sur l'idée choisie (plus sûr, plus explicable, plus relié aux autres agents), et visible par
un testeur en une session.

## Étape 1 — Backlog de vague 2 (remplace l'audit de parité)
Écris `design-plans/agent-depth/<agent>-wave2-backlog.md` :
`# · Idée · Référence marché · Notre carte · Cran par défaut · Ce que voit le testeur · Touche hors de
ton dossier · Taille · Statut`.
- Pars de ta section de `market-ideas.md`. Vérifie chaque idée dans le code de `main` (certaines
  existent en partie : dis-le).
- Ajoute **au moins une idée à toi**, hors catalogue, qui passe les cinq tests ci-dessous.
- Classe par force (ce qui changerait le plus l'expérience du testeur), pas par facilité.
- Commit ce fichier dans ta première PR.

## Étape 2 — Pitch, avec cinq tests
La section « Pitcher une feature » de `_common.md` s'applique, durcie ainsi. **Un pitch ne part que
s'il passe les cinq tests** ; sinon retravaille-le ou écarte l'idée (`skipped — échoue au test N`).
1. **Agent-first** : l'agent fait le travail, Sam décide par exception. Une fonction de parité (filtre,
   tri, export, écran de réglages) n'est pitchable que si elle débloque un comportement d'agent, et le
   pitch le dit.
2. **Ancré** : une ligne « Référence marché » (qui le fait, comment, en une phrase) ; ou « Personne ne
   le fait » avec la raison de le croire. Une idée sans référence est assumée comme « hors marché ».
3. **Notre carte** : une ligne qui dit en quoi on fait mieux que la référence.
4. **Visible en une session** : le testeur le voit arriver, le cran Suggest / Draft / Act le change,
   Undo le défait, ⇧D le déclenche.
5. **Pas déjà refusé** : vérifié contre « Déjà refusé » du catalogue et ton log de vague 1. Un Later
   ne revient que changé de nature, et le pitch le dit en première ligne.

Ordre : pitche d'abord **les trois idées les plus fortes**, une par une. Après la troisième réponse,
demande si l'humain veut la suite (« 4 more ideas ready: go on? ») plutôt que d'enchaîner seul.

Format du pitch (dans la question et l'aperçu de l'option recommandée, un écran maximum) :
problème (une phrase, preuve dans le code) · référence marché · notre carte · ce que fait l'agent et à
quel cran · ce que voit le testeur (esquisse ASCII) · taille et ce que ça touche · alternative.
Options : **Go** · **Go, plus simple** · **Later** · **Drop**, la recommandée en premier.

## Étape 3 — Construire, merger
Comme en vague 1 (`_common.md`, étape 2 et circuit Git). Branches `claude/<agent>-w2-<sujet>`,
commits et PR préfixés `<Agent> W2: …`.

## Étape 4 — Clôture
Mets à jour la sous-section de ton agent dans PROMPT.md (§4 et son écran §6.x) ; publie
`docs/agent-depth/<agent>-wave2.html` (même style que le rapport de vague 1) : chaque idée avec sa
référence marché, ce qui a été construit, captures avant / après, ce qui reste.

## Confidentialité (le repo est public)
Dans le repo — code, seed, textes d'UI, fichiers `design-plans/`, messages de commit, **corps de
PR** — n'écris jamais : le nom de projet interne de l'inbox agentique, des noms de collègues, des
liens Slite ou d'artifact, des chiffres internes (shadow, précision, métriques), des pistes de
pricing, des dates de roadmap, ni les avis de l'équipe sur les concurrents. Tu peux écrire : le nom
d'un concurrent et ce que fait son produit (observable publiquement), et notre raisonnement produit.
En cas de doute, reformule en « référence marché » / « notre carte ».

## Propriété (ajout à `_common.md`)
La session **Trust** possède la couche transverse : `src/features/agents/`, `src/features/playbook/`,
`src/features/onboarding/`, `src/features/desk/`, et l'autonomie dans `src/app/core.ts`
(`setAutonomy`) et `src/app/reducer.ts` (promotions). Une session d'agent qui a besoin d'y toucher
passe par une demande `requests/trust-from-<agent>-<sujet>.md`. Trust branche ses mécanismes
(shadow, test, trust metric, apprentissage) **pour tous les agents** via les points d'extension du
registre, et demande aux agents ce qui leur est propre (cas de test, ligne « leaves alone »).

## Ports
Nova 5181 · Atlas 5182 · Iris 5183 · Echo 5184 · Sage 5185 · Juno 5186 · Trust 5187
(configs `protopulse-<agent>` dans `.claude/launch.json`).
