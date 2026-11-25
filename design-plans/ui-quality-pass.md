# Protopulse — passe qualité UI : cohérence, finition, plaisir

Tu travailles sur Protopulse (`~/code/protopulse`, live sur https://mbousendorfer.github.io/protopulse/) :
un prototype cliquable mocké de gestion des réseaux sociaux par agents IA, aux couleurs d'Agorapulse.
Vite 5 + React 18 + TypeScript strict, CSS natif à custom properties, Radix, lucide-react, HashRouter,
déployé par GitHub Actions à chaque push sur `main`. L'UI est en anglais.

## Mission
Amener toute l'interface à un niveau produit fini : propre, cohérente d'un écran à l'autre, prête pour
la prod, agréable à utiliser. **La cohérence est le premier levier** : un même concept a un seul nom,
une seule apparence, un seul comportement, partout. On ne réinvente pas le produit : on garde son
identité (équipe d'agents sympathique, couleurs Agorapulse, illustrations) et on la rend irréprochable.

## Sources de vérité (dans cet ordre)
1. Les décisions déjà prises (section suivante) — ne pas les rediscuter.
2. `PROMPT.md` §3 (principes produit), §5-6 (écrans), §10 (direction visuelle : palette, encre, les
   trois apparences Action / Choix / Information, formes, mouvement, responsive, accessibilité).
3. `src/styles/tokens.css` et `src/styles/base.css` (tokens et classes de base), `src/ui/index.tsx`
   (primitives : Btn, Pill, Seg, Tabs, Filters, Menu, Pop, Sheet, Modal, PageHead, Empty, Thinking,
   Switch, Tip, Kbd, Mark, Net), `src/ui/Selection.tsx` (BulkBar, SelectBox, useSelection),
   `src/ui/charts.tsx`, `src/ui/Illustrations.tsx`.
4. Les règles maison Agorapulse : charge le skill `design-guidelines` (house-rules) avant toute
   décision visuelle. Les valeurs ADS se lisent à distance (`gh api repos/agorapulse/design/...`),
   jamais depuis un clone local.
5. `docs/ux-audit.html` : la section « Still open » liste la dette connue.

## Décisions déjà prises (ne pas défaire)
- Pas de toast. Le retour d'une action est inline, là où l'action a eu lieu.
- Encre `grey-80` à `grey-100` seulement ; hiérarchie par taille et graisse, jamais par un gris plus clair.
  Tous les filets en `grey-20`. Pas d'élévation imbriquée, pas de labels en majuscules, pas de barre
  d'accent latérale, boutons jamais pleine largeur, une métrique toujours nommée en texte.
- Orange = action principale (une seule par zone). Bleu électrique = tout ce qui est interactif, jamais
  une donnée. Graphes en `--chart`. Une couleur par agent, en petites marques seulement (pas de grands
  fonds teintés).
- Ce qui se clique se voit ; ce qui ne se clique pas n'a ni fond ni bordure.
- Chaque badge de compteur veut dire « needs you ». L'Inbox badge et la vue Needs you partagent
  `inboxNeedsCount` / `NEEDS_YOU` (`src/features/inbox/slice.ts`).
- Desk : la mise en page actuelle (brief + Your day + volet de détail) reste. Inbox : la vue Needs you
  groupée (bandeau par groupe, lignes sur deux lignes, 3 lignes puis « Show N more ») est validée.
- La pilule « Running now » a été retirée de la barre du haut ; ne pas la remettre.

## Méthode

### Phase 1 — Inventaire de cohérence (lecture seule)
Construis `design-plans/consistency-matrix.md`. Pour chaque motif ci-dessous, liste **toutes** les
variantes en usage (fichier:ligne), choisis la variante canonique en citant la règle qui la justifie
(§10, house rule, primitive existante), et liste les écarts à migrer :
- Boutons : variantes, tailles, ordre dans les pieds de modale/feuille (Cancel puis action, à droite),
  un seul primaire par zone, icône + libellé.
- En-têtes de page et de section : `PageHead`, `card-head`, `section-title`, titres de groupes.
- Onglets et filtres : `Tabs`, `Filters`, `Seg`, onglets maison (`day-tab`, `ib-view`) ; ce que
  signifie le chiffre d'un onglet (total ou « needs you »).
- Listes et lignes cliquables : survol, sélection, état courant, cases de sélection, méta à droite.
- Cartes : bordure, rayon, padding, survol (bordure bleue).
- Statuts : `Pill` et ses tons, pastilles, compteurs (`count`, `ib-need-n`, `num`).
- Retour d'action : barre d'Undo (aujourd'hui `pb-undo` détournée hors Playbook, `ib-undo-strip`,
  `pub-undo` avec compte à rebours), confirmation inline (boost Insights, boost Chats), tampons
  (« Approved · 09:12 »), états « Done ».
- États vides, réflexion (`Thinking`), erreurs de formulaire, champs et aides (`field`, `hint`).
- Menus, popovers, feuilles, modales.
- Typographie (échelle 12 · 13 · 14 · 16 · 19 · 24 · 32), espacements, rayons (10 / 16 / 20),
  tailles d'icônes (12 / 14 / 16), couleurs d'agent.
- Vocabulaire : un glossaire verbe → usage. Base déjà en place : Send (réponses), Approve (posts,
  plan), Apply / Decline (propositions de Sage), Snooze a week, Discuss, Ask Claire, Take it back,
  Undo, Dismiss, Suggest / Draft / Act (autonomie). Relève chaque synonyme restant.
Mesures de départ à faire baisser (à recompter) : `style={{` inline, hex hors `tokens.css`,
`font-size` en px littéral, appels `pushToast` / `core/toast`.

### Phase 2 — Revue écran par écran (avec rendu)
Lance le serveur (`preview_start` « protopulse », port 5179) et passe chaque surface à 1440×900 et
375×812, en clair et en sombre, avec ses états : vide, chargement / réflexion, erreur, sélection,
survol et focus clavier, contenu long. Surfaces : barre latérale et barre du haut ; ⌘K ; Desk (brief,
Your day, détail, lots, Done) ; Focus ; Inbox (Needs you, liste, panneau, contact) ; Publishing
(calendrier semaine/mois/liste, Plan review, Drafts, Media, composer, actions groupées) ; Insights
(rapports, Explore, anomalies, alertes) ; Listening (concurrents, benchmark, mentions, tendances,
recherches, gestion) ; Strategy (campagnes, nouveau brief, plan, piliers) ; Chats et tiroir de chat ;
Agents (équipe, profil et ses onglets) ; Activity ; Playbook ; Settings ; Onboarding ; panneau
modérateur (⇧D).
Pour chaque constat, garde-le seulement s'il a : (1) une règle ou une contradiction visible qui le
fonde, (2) la preuve qu'il est bien rendu à l'écran, (3) une seule correction déterminée. Note la
sévérité (1 cosmétique → 4 bloquant). Consigne le tout dans `design-plans/surface-review.md`.

### Phase 3 — Corrections, par passes
Ordre imposé, un commit par passe, build + tests verts avant chaque commit :
1. **Tokens et primitives.** Remplace les valeurs en dur par les tokens existants. N'introduis un
   composant partagé que si au moins deux écrans en ont besoin et qu'aucune primitive ne l'exprime.
   Candidats probables : `UndoBar` (une seule barre d'Undo pour tout l'app, avec compte à rebours),
   `InlineConfirm` (dépense, suppression définitive), `CountBadge`. Ajoute-les dans `src/ui/`.
2. **Migration des écrans** vers les variantes canoniques de la matrice.
3. **Retour d'action sans toast.** Pour chaque `pushToast` restant, donne au retour une place inline
   (tampon sur la carte, ligne d'Undo en tête de liste, état du bouton) puis supprime l'appel. Quand
   il n'en reste aucun, supprime `Toasts`, `core/toast`, `pushToast` et la case Notifications
   « Shown as… » si elle n'a plus de sens.
4. **Vocabulaire.** Applique le glossaire aux boutons, titres, états vides, messages du journal.
   Une seule échelle de noms pour l'autonomie, dans le même ordre partout (onboarding compris).
5. **Finition et plaisir**, dans les règles de mouvement de §10 (< 250 ms, transform et opacity,
   `prefers-reduced-motion`) : états vides illustrés partout où une liste peut être vide, micro-retours
   sur les décisions (tampon, glissement), transitions d'onglets et de volets, skeletons courts là où
   un agent « réfléchit ». Pas d'effet gratuit : chaque animation dit ce qui vient de se passer.
6. **Responsive et sombre.** Rien ne déborde à 375 px, la barre de filtres de l'Inbox ne repousse pas
   la liste hors du premier écran, chaque surface est lisible en sombre (AA).

### Garde-fous
- Petite correction conforme à la matrice → fais-la. **Changement de motif ou de mise en page** (ce que
  l'utilisateur voit différemment, pas seulement plus propre) → arrête-toi, montre un avant / après
  rendu, et demande avant d'implémenter.
- Ne casse aucun comportement : les 28 tests Vitest restent verts, et toute nouvelle logique non
  triviale a son test.
- Pas de nouvelle dépendance. Pas de valeur inventée quand un token existe. Pas de copie de composant :
  on étend la primitive.
- Respecte les remarques de la dette connue (« Still open » de `docs/ux-audit.html`) : traite celles
  qui relèvent de la cohérence (toasts, vocabulaire d'autonomie, boutons doublés des lots, escalade en
  trois endroits, invite native « New label… », titres de rapport qui répètent leur type, créneau
  Iris vs Atlas) ; propose sans les faire celles qui changent un parcours (Desk premier écran, un seul
  lieu pour parler aux agents).

## Définition de « fini »
- Matrice : chaque motif a une seule variante en usage, ou une exception écrite et justifiée.
- Zéro appel de toast ; une seule barre d'Undo ; une seule confirmation inline.
- `style={{` inline réservé aux valeurs vraiment dynamiques (positions, hauteurs calculées, couleur
  d'agent passée en variable) ; zéro hex hors `tokens.css` et illustrations ; zéro `font-size` en px
  hors échelle.
- Glossaire appliqué : aucun synonyme restant pour un même verbe.
- Chaque écran vérifié à 1440 et 375, clair et sombre, sans débordement ni texte coupé, focus
  visible, contrastes AA.
- `npx tsc -b`, `npx vitest run`, `npm run build` verts ; déployé ; URL live vérifiée.
- Rapport final dans `docs/ui-quality.html` : mesures avant / après, ce qui a changé par motif,
  captures avant / après des trois écrans les plus améliorés, ce qui reste ouvert et pourquoi.
