# Nova · Inbox — backlog de parité

> Audit du 25/11/2026 sur `origin/main` 73a7ba2. Référence : skill `agorapulse-product` (module Inbox).
> Tri : corrections d'abord, puis valeur pour le test (3 = un SMM le cherche dans les 10 premières minutes).
> Statut : `todo` · `pitch` (en attente de réponse) · `done (PR)` · `later` · `dropped — raison` · `skipped — raison`.

## À corriger d'abord (pas de pitch)

| # | Bug | État actuel (fichier:ligne) | Correction | Val. | Taille | Statut |
|---|---|---|---|---|---|---|
| B1 | Act ne fait pas suivre la conversation | `inbox/slice.ts:202` `onResolveInbox` ne sait pas qu'une carte est prise par Act : la conversation passe en « You replied » (approuvé par Sam), et l'Undo du journal ramène la carte sans rouvrir la conversation (aucun `onUndo`) | Le cœur passe `act: true` dans la décision ; la conversation passe en `auto` (réponse « Nova · auto ») et `onUndo` la remet en brouillon | 3 | S | done (#31) |
| B2 | Un événement Nova en Act ne crée aucune conversation | `reducer.ts:203` : seule une ligne de journal ; « Handled by Nova » ne grossit jamais | Les événements Nova portent leur `run` : en Act, conversation `auto` + journal lié à la conversation, Undo réel | 3 | S | done (#31) |
| B3 | Approuver depuis le Desk crée un DM négatif en dur | `inbox/slice.ts:216` (`type: 'dm', sentiment: 'negative'`) | Type, réseau et sentiment lus sur la carte (`conv` sur la carte) | 3 | S | done (#31) |
| B4 | Sentiment deviné par regex, ternaire mort | `inbox/slice.ts:57` | Champ explicite `conv: { type, sentiment }` sur les cartes Nova (événements) ; regex gardée en repli pour les vieux états | 2 | S | done (#31) |
| B5 | Pas de groupe « Waiting on Claire » | `inbox/Page.tsx:22` (commentaire), §6.2 | Groupe en bas de Needs you, hors compteur « needs you » | 2 | S | done (#31) |
| B6 | `inbox/send` sans carte n'écrit rien au journal | `inbox/slice.ts:150` | Ligne de journal « You replied to X » | 2 | S | done (#31) |
| B7 | « See them » du couloir Spam mène à `/inbox` | `desk/Batch.tsx:105` | `/inbox?view=hidden`, la page lit `view` | 2 | S | done (#31) |
| B8 | ⌘K « Reply to X » ne connaît que 7 noms | `inbox/agent.tsx:12` | Recherche dans les contacts et les auteurs réels | 3 | S | done (#31) |

## Parité Agorapulse → version agentique

| Capacité Agorapulse | État actuel (fichier:ligne) | Version agentique (qui fait quoi, à quel cran) | Val. | Taille | Statut |
|---|---|---|---|---|---|
| Garde-fous appliqués | `data/agents.ts:41-45` affichés, jamais lus | Compteurs du jour réels (réponses publiques, remboursements cumulés) ; quiet hours LinkedIn → réponse programmée à 07:00 ; au plafond Nova repasse en Draft et le journal explique | 3 | M | dropped — refusé au pitch (sans commentaire) |
| Escalades du Playbook appliquées | `nova-sensitive` verrouillée, mais aucun test de mots (blessure, avocat, journaliste, créateur > 50k) sur les conversations entrantes | Nova lit les règles `escalate` du Playbook et passe en Your call ce qui matche, avec la règle citée | 3 | S | done (PR Escalations) |
| Automated moderation (« Inbox assistant ») : règles mot-clé / réseau / type → label, review, assign, hide | absent | Nova applique les règles en Act (journal « Labelled Refund · rule … ») ; propose une règle après 3 gestes identiques de Sam ; écran de règles avec compteur d'usages ; chaque règle s'annule | 3 | L | done (#56 + PR règle apprise) |
| Review / To review / Review all | `reviewed` existe (`data/inbox.ts:35`, bouton panneau `Page.tsx:378`), pas de vue To review, Nova ne marque rien revu | Vues To review / Reviewed ; Nova marque revu ce qu'elle a traité en Act ; « Review all » groupé | 3 | M | done (PR Review) |
| Saved replies | absent | Bibliothèque ; Nova choisit et adapte la plus proche et la cite en source ; « Save as reply » depuis une réponse envoyée ; ⌘K « Reply to Léa with the exchange saved reply » | 3 | M | done (PR Saved replies) |
| SLA / temps de réponse | absent | Délai qui court par conversation, seuils par type (DM 1 h, avis 24 h), tri « Waiting longest », Nova remonte avant dépassement ; chiffres exposés pour Iris | 3 | M | done (PR SLA) |
| Équipe et assignation | `Assignee = 'sam' \| 'claire'` (`data/inbox.ts:39`) | Roster (Sam, Claire + 2 coéquipiers) ; Nova assigne par règle ; vue charge par personne | 2 | M | done (PR Team) |
| CRM contacts | onglet Contact en lecture seule (`Page.tsx:494`) | Liste de contacts, fiche éditable (tags, notes datées), timeline ; Nova crée la fiche d'un nouveau contact | 2 | L | later — réponse au pitch |
| Labels (gérer, renommer, supprimer) | création seule (`Page.tsx:317`) | Gestion dans la barre latérale ; Nova étiquette à l'arrivée ; labels lus par Iris | 2 | S | done (#93) |
| Modération : supprimer, bannir, spam, liker, répondre en privé | Hide seulement | Nova le fait en Act sur spam et bots ; chaque action dit avant si elle est réversible | 2 | M | done (PR Moderation) |
| Filtres (date, assigné, label, revue) et vues enregistrées par Sam | vues codées en dur (`Page.tsx:28-30`) | Filtres manquants + « Save view » | 2 | M | todo |
| Fils sous le post (Filter items by post) | `post` = texte libre (`data/inbox.ts:24`) | Commentaires groupés sous leur post, aperçu du post | 2 | M | todo |
| Volume crédible | 45 conversations, TikTok/YouTube maigres | ~80 conversations, fils plus longs, arrivées par le moteur | 2 | M | todo |
| Traduction | absent (Jonas en allemand sans traduction) | Message traduit à la volée ; Nova répond dans la langue du client et montre la version anglaise | 1 | S | todo |
| Contrat → Iris (temps de réponse, volumes, taux traités seuls) | absent | Sélecteurs purs dans `inbox/slice.ts` + demande `requests/iris-from-nova-*.md` | 2 | S | done (PR SLA) |
| Contrat ← Echo (mentions → conversation) | absent | Action publique `inbox/ingest` + demande `requests/echo-from-nova-*.md` | 2 | S | todo |
| Export CSV | absent | — | 1 | S | todo (à trancher) |
| Inbox approval workflows | — | Couvert par les crans : Draft = approbation, « Ask Claire » = approbateur | — | — | skipped — les crans Suggest · Draft · Act sont l'équivalent agentique |
| Custom inboxes | — | Une seule marque, filtre réseau suffisant | — | — | skipped — hors périmètre multi-comptes |
| Reply suggestion (IA) | brouillons de Nova | déjà le cœur du produit | — | — | skipped — existe (brouillons de Nova) |
| Live collision detection | — | pas de vraie équipe en temps réel | — | — | skipped — pas de multi-utilisateur simulable crédiblement |
