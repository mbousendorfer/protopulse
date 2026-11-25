# Protopulse — fusionner Playbook dans Agents

Tu travailles sur Protopulse (`~/code/protopulse`, live sur https://mbousendorfer.github.io/protopulse/) :
prototype cliquable mocké d'un outil de gestion des réseaux sociaux par une équipe d'agents IA (Nova,
Atlas, Iris, Echo, Sage) aux couleurs d'Agorapulse, pour une marque outdoor fictive, Fernway. Vite 5 +
React 18 + TypeScript strict, CSS natif à tokens, Radix, lucide-react, HashRouter, état `useReducer`
persistant en localStorage, aucun backend. UI en anglais. La spec produit est `PROMPT.md` (en français).

## Pourquoi
Agents et Playbook se recoupent : l'escalade existe à trois endroits (profil d'agent, Playbook, Settings ›
Approver), les règles sont étiquetées par agent mais vivent loin de l'agent, et les piliers du Playbook
doublonnent Strategy. Sam doit pouvoir répondre à « que sait et que fait Nova ? » en un seul endroit, et à
« quelles règles valent pour toute l'équipe ? » en un seul autre. Rien ne doit apparaître deux fois en
édition.

## Décisions prises (ne pas rediscuter)
- **Une seule entrée dans la barre latérale : « Agents »**. L'entrée « Playbook » disparaît.
- La page Agents a trois onglets : **Team** (les cartes d'agents actuelles), **Shared rules** (tout ce qui
  vaut pour toute l'équipe), **Escalation** (la liste unique).
- **Profil d'agent** : Autonomy · Guardrails · **Rules** · Escalation · Alerts (Iris et Echo) · Track
  record · Activity. L'onglet Rules montre toutes les règles qui s'appliquent à cet agent, chacune marquée
  « Shared · all agents » ou « {Agent} only », modifiables sur place.
- **Escalade : une seule liste partagée**, filtrable par agent, où l'on choisit qui décide (You ou
  Claire), ajoute, active, supprime. L'onglet Escalation du profil la montre en lecture pour cet agent avec
  un lien « Edit in Escalation » ; Settings › Approver devient un résumé en lecture avec le même lien.
- **Les piliers vivent seulement dans Strategy** : l'onglet Pillars du Playbook disparaît.

## État actuel à lire d'abord
- `src/features/agents/Agents.tsx` : `Team`, `AgentProfile` (onglets `autonomy | guardrails | escalation
  | alerts | record | activity`), `AutonomyBoard`, `Promotions`, `Guardrails`, `Escalation` (lecture +
  lien vers le Playbook), `AgentAlerts`, `Record`, `AgentActivity`, `PauseMenu`.
- `src/features/playbook/Page.tsx` : onglets `rules | words | facts | voice | escalation | pillars` ;
  `Proposals` (règles proposées par les agents), `TryMessage`, `RuleList`, `AddRule`, `Words`,
  `VoicePanel`, `Escalation` (édition complète), `Pillars`. État dans `src/features/playbook/slice.ts`
  (`s.playbook` : `rules`, `banned`, `preferred`, `escalate`…), données dans `src/data/playbook.ts`.
- `src/features/settings/Page.tsx` (`Approver`), `src/app/Shell.tsx` (rail, `CRUMB`, `GOTO` dont
  `b → /playbook`, aide des raccourcis), `src/features/command/CommandBar.tsx` (entrée « Playbook »,
  « Open the Playbook »), `src/data/script.ts` (`link: '/playbook'` des propositions de règle),
  `src/main.tsx` (routes).
- Règles de design : `PROMPT.md` §10, `design-plans/consistency-matrix.md` (variante canonique de chaque
  motif), primitives `src/ui/index.tsx` et `src/ui/Feedback.tsx` (`UndoBar`, `Notice`, `InlineConfirm`,
  `Reopen`, `CountBadge`), skill `design-guidelines` (règles maison Agorapulse).

## Ce qu'il faut construire
1. **Routes** : `/agents` (Team), `/agents/rules` (Shared rules), `/agents/escalation`, `/agents/:id`
   (profil, `?tab=` comme aujourd'hui, avec `rules`). Les anciennes adresses restent valides et
   redirigent : `/playbook` → `/agents/rules`, `/playbook?tab=escalation` → `/agents/escalation`,
   `?tab=words|facts|voice` → la section correspondante de Shared rules, `?tab=pillars` →
   `/strategy/pillars`. Les ids d'agents ne doivent jamais entrer en collision avec `rules` ou `escalation`.
2. **Shared rules** : en tête, les règles proposées par les agents (`Proposals`) ; puis Rules (règles
   valables pour tous et filtre par agent), Words, Facts, Voice avec « Try a message ». Réutilise les
   composants du Playbook tels quels, déplacés, pas recopiés.
3. **Profil › Rules** : la liste filtrée sur l'agent (règles et facts qu'il applique), avec l'étiquette de
   portée, l'ajout d'une règle pour cet agent seul, et une ligne « Also follows the brand voice and words »
   qui mène à Shared rules. Les propositions de règle de cet agent s'affichent aussi ici. Écris la
   sélection « règles qui s'appliquent à un agent » comme une fonction pure, testée.
4. **Escalation** : une seule liste qui réunit l'édition du Playbook (on/off, You/Claire) et l'ajout depuis
   les conditions prêtes à l'emploi du profil (`CONDITIONS` dans `Agents.tsx`, avec seuil et doublons
   refusés), filtrable par agent. Suppression avec `UndoBar`.
5. **Nettoyage** : supprime l'onglet Pillars, l'entrée Playbook du rail, le raccourci `G then B` (ou
   remappe-le sur `/agents/rules` et mets à jour l'aide), mets à jour `CRUMB`, ⌘K, les liens de
   `script.ts`, Settings, les messages qui disent « Playbook » dans l'UI (le mot peut rester comme nom des
   règles partagées seulement si la matrice de cohérence le garde ; sinon « Shared rules »). Garde le
   store `s.playbook` tel quel : c'est un changement d'interface, pas de données.
6. **Spec** : mets à jour `PROMPT.md` (§5 navigation, §6 écrans Agents et Playbook, raccourcis) pour
   décrire la nouvelle organisation.

## Garde-fous
- Pas de toast ; retour inline avec les primitives de `src/ui/Feedback.tsx`.
- Encre grey-80 à grey-100, filets grey-20, bleu électrique seulement pour l'interactif, un seul bouton
  orange par zone, pas de labels en majuscules, pas de barre d'accent latérale, boutons jamais pleine
  largeur, une métrique toujours nommée.
- Un compteur d'onglet veut dire « needs you » ou il n'y en a pas (cf. matrice).
- Aucune fonctionnalité perdue : tout ce qu'on peut faire aujourd'hui dans Playbook et Agents se fait
  encore, à un seul endroit.
- Tout ce qui sort de ces décisions (renommer d'autres écrans, changer le contenu d'un onglet existant au-delà
  de ce brief) : montre un avant / après et demande d'abord.

## Méthode
1. Lis les fichiers cités. Écris un court plan dans `design-plans/agents-playbook-merge-plan.md` : routes,
   ce qui déplace quoi, liens à mettre à jour (liste exhaustive via `grep -rn "playbook" src`).
2. Montre une maquette rendue de trois écrans (Agents › Team avec les trois onglets, Agents › Shared
   rules, profil de Nova › Rules) et attends l'OK de l'utilisateur avant de coder l'UI.
3. Fonction pure + tests, puis routes et redirections, puis déplacement des composants, puis nettoyage
   des liens, puis `PROMPT.md`.
4. Vérifie dans le navigateur (lance `npx vite --port <port libre>` depuis ton worktree) à 1440 et 375 px,
   clair et sombre, et teste chaque ancienne adresse.

## Définition de « fini »
- Le rail n'a plus d'entrée Playbook ; Agents a Team, Shared rules, Escalation.
- Le profil de chaque agent a un onglet Rules juste, avec portée lisible et édition sur place.
- L'escalade ne s'édite qu'à un endroit ; profil et Settings y mènent.
- Pillars n'existe que dans Strategy.
- Toutes les anciennes adresses `/playbook…` arrivent au bon endroit ; aucun lien interne ne pointe encore
  vers `/playbook`.
- `npx tsc -b`, `npx vitest run`, `npm run build` verts.
- Commits sur ta branche de worktree, branche poussée, PR ouverte vers `main`. Ne pousse jamais sur `main`
  et ne merge pas la PR : l'utilisateur relit et merge (`main` déploie sur GitHub Pages).
