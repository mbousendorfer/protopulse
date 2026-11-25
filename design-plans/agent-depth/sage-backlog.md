# Sage (Strategy) — backlog de profondeur

Audit du 25/11/2026 sur `origin/main` 73a7ba2. Trié par valeur ; les corrections « À corriger d'abord »
en tête. Référence de parité : Agorapulse n'a pas d'objet « campagne stratégique » (sa Campaign est
l'Advocacy) ; ses équivalents sont **Labels** (partagés Inbox / Publishing, rapports par label),
**Calendar notes** (notes datées et colorées du calendrier), le **link tracking UTM** (Social Media
ROI) et les **Playbooks** d'Archie. Le reste vient de Sprout et Later (campagnes, piliers, objectifs).

| # | Capacité | État actuel (fichier:ligne) | Version agentique (qui fait quoi, à quel cran) | Valeur | Taille | Statut |
|---|---|---|---|---|---|---|
| F1 | **Campagne → calendrier** (bug) | `strategy/slice.ts:51-59` : seul le 1er post part, en carte Desk | À l'approbation, tous les posts arrivent chez Atlas (`campaignId`, pilier, label) ; Undo et Discard les retirent | 3 | M | done (#30) |
| F2 | **Propositions et cadence qui agissent** (bug) | `slice.ts:99-104` Apply ne change rien ; `slice.ts:131-136` toute carte Pillars ajoute +2 Instagram, Day 1 compris ; steppers sans journal | Chaque proposition porte son effet (cibles de piliers, cadence) ; Apply l'applique, journal + Undo ; la carte Day 1 pose ses piliers et sa cadence | 3 | S | done (#46) |
| F3 | **Ajustements génériques** (bug) | `slice.ts:112-124` câblés `adj1`/`adj2` ; Apply sans Undo | Un ajustement porte ses déplacements de posts ; Apply les fait (campagne + calendrier d'Atlas), journal avec Undo réel | 3 | S | done (#46) |
| F4 | **Garde-fou « 2 campagnes actives max »** (bug) | `data/agents.ts:135` affiché, jamais appliqué | Approve refusé avec la raison inline si 2 campagnes live couvrent déjà ces dates ; en Act, la carte revient avec la raison | 3 | S | done (#30) |
| F5 | **Recap et objectif sans code en dur** (bug) | `Page.tsx:239` lien Repair Friday ; `slice.ts:127-129` regex sur le titre | `reportId` sur la campagne ; la carte d'objectif porte la campagne et la nouvelle cible | 2 | S | done (#46) |
| F6 | **Carte Desk depuis /strategy/new** (bug) | `slice.ts:67-70` `strategy/create` ne pousse pas de carte | Même chemin que `briefSage` : carte « Campaign plan » à régler au Desk ou sur la page | 2 | S | done (#30) |
| F7 | **« Actual » calculés** (bug) | `data/strategy.ts:161-172` parts et 7 derniers jours statiques | Part des piliers sur 30 jours et posts des 7 derniers jours calculés depuis les posts d'Atlas (+ historique antérieur au calendrier) | 3 | S | done (#39) |
| F8 | **Sage en Chat et ⌘K** (bug) | `strategy/agent.tsx:12-20` : un seul intent, le brief | « How is Trail Week doing? », « Is Community behind? » : réponses chiffrées lues dans l'état | 3 | M | done (#42) |
| 1 | **Brief complet** | `Page.tsx:80-149` texte + budget | Champs optionnels (dates, produit, objectif, audience, réseaux) ; Sage pose les questions manquantes au lieu de deviner | 3 | M | done |
| 2 | **Générateur de plan crédible** | `data/strategy.ts:200-262` 10 titres fixes ; `revisePlan` par regex | Le plan varie par produit, objectif, saison et réseaux, dans les piliers et la cadence ; v2 qui comprend la demande | 3 | L | done |
| 3 | **Objectifs et KPI vivants** | `data/strategy.ts:77-78` `actual` figé | KPI qui bougent avec le temps et les chiffres d'Iris ; Sage propose un réajustement (Desk) quand la trajectoire dévie | 3 | M | done |
| 4 | **Tâches qui avancent** | `Page.tsx:324-354` statuts figés | Une tâche passe « done » quand l'agent livre (post publié, rapport partagé) ; réallocation en Act quand un agent est en pause | 2 | M | go — en cours |
| 5 | **Piliers éditables** | `Page.tsx:357-385` lecture seule | Ajouter, renommer, repondérer par proposition verrouillée (Suggest) que Sam valide | 2 | M | go — en cours |
| 6 | **Validation par Claire** | absent | Campagne au-dessus d'un budget (règle Playbook) : passe par Claire avant lancement | 2 | S | go — en cours |
| 7 | **Bilan de campagne** | `data/strategy.ts:116-120` recap seed seulement | À la fin d'une campagne, Sage la passe « Done » et rédige le bilan avec Iris, lien vers le rapport | 2 | M | go — en cours |
| 8 | **Thèmes de calendrier** (≈ Calendar notes) | absent | Temps forts (Repair Friday, première neige, Black Friday) proposés par Sage, visibles au calendrier d'Atlas | 2 | M | go — en cours |
| 9 | **Revue mensuelle du 1er** | absent (annoncée `data/agents.ts:122`) | Sage livre sa revue (piliers, cadence, campagnes, propositions) ; déclenchable au modérateur | 2 | M | go — en cours |
| 10 | **Budget** | `Page.tsx:248` budget seul | Dépensé, engagé, rythme ; boosts d'Iris imputés à la campagne | 1 | M | go — en cours |
| 11 | **Labels de campagne** (≈ Labels) | `Post.labels` posé, sans UI | Label de campagne partagé (posts d'Atlas, conversations de Nova, rapports d'Iris) | 1 | M | go — en cours |
| 12 | **UTM de campagne** (≈ link tracking) | absent | Sage fixe `utm_campaign` ; Atlas l'applique ; Iris l'attribue | 1 | S | go — en cours |
