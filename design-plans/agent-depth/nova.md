# Protopulse — profondeur d'agent : Nova (Community · Inbox)

> Lis d'abord `design-plans/agent-depth/_common.md` : contexte, méthode, pitch, circuit Git, propriété des
> fichiers et garde-fous y sont, dont le **pitch obligatoire avant chaque nouvelle feature**.
> Ce fichier ne donne que ton périmètre. Port : **5181**
> (`protopulse-nova`). Préfixe de branche et de commit : `nova`.

## Mission
Faire de l'Inbox de Protopulse l'équivalent agentique de l'Inbox d'Agorapulse : une boîte unifiée
où **Nova fait le tri, l'étiquetage, l'assignation, les réponses et la modération** selon des règles
qu'elle propose et que Sam valide, où chaque conversation a un client derrière (CRM), un délai qui
court (SLA) et une trace d'équipe. Sam ne lit que ce que Nova ne peut pas trancher.

Test visé : un SMM habitué à l'Inbox d'Agorapulse (labels, review, assignation, saved replies,
inbox assistant) retrouve tout ce qu'il fait d'habitude, et voit que Nova le fait à sa place.

## Ce qui existe (inventaire du 25/11/2026 — revérifie)
- `src/features/inbox/Page.tsx` : vues Needs you (4 groupes : Ready to send, One passage to check,
  Your call, You're replying), Nova's drafts, Handled by Nova, Hidden, All ; vues enregistrées
  codées en dur (Assigned to me, Assigned to Claire, Negative today) ; labels avec création seule ;
  filtres réseau / type / sentiment / intention d'achat / recherche ; tris ; barre d'actions groupées
  avec Undo ; panneau conversation (fil, notes internes, brouillon avec passages signalés, pièces
  e-commerce, règles appliquées, Send / Edit / Take over / Ask Claire / Hide) ; onglet Contact en
  lecture seule.
- `src/features/inbox/slice.ts` (dont `inboxNeedsCount` / `NEEDS_YOU`, à garder), `src/data/inbox.ts`
  (40 conversations, 15 contacts, 5 labels en chaînes, assignés `'sam' | 'claire'` seulement).
- `src/data/agents.ts` (bloc Nova) : 8 actions, garde-fous **affichés mais jamais appliqués**
  (200 réponses publiques / jour, pas de LinkedIn 23:00–07:00, remboursements ≤ €300 / jour).
- Desk : lot « Inbox · Nova » (`src/features/desk/Batch.tsx`), cartes seed dans `src/data/desk.ts`,
  9 événements Nova dans le script. ⌘K « Reply to X » ne connaît que 7 noms (`src/data/command.ts`).

## À corriger d'abord
1. Passer une action de Nova en Act laisse la conversation liée en `draft` dans Needs you et dans
   le badge (la Phase 0 corrige le Desk ; vérifie que la conversation suit).
2. Une action en Act ne crée **aucune** conversation : Handled by Nova ne grossit jamais pendant une
   session. Chaque événement Nova traité seul doit produire sa conversation `auto` avec la réponse.
3. Approuver depuis le Desk crée une conversation `type: 'dm', sentiment: 'negative'` en dur
   (`slice.ts`, ~l.216) même pour un avis Google : reprendre type, réseau et sentiment de la carte.
4. Ternaire mort `'neutral' : 'neutral'` (`slice.ts`, ~l.57) : le sentiment des conversations
   virtuelles est deviné par regex ; le rendre explicite sur la carte.
5. Le groupe « Waiting on Claire » de PROMPT.md §6.2 n'existe pas (le commentaire `Page.tsx` ~l.22
   annonce une vue qui n'existe pas non plus) : les conversations `claire` ne sont visibles que dans All.
6. `inbox/send` sur une conversation sans carte n'écrit aucune ligne de journal.
7. « See them » du couloir Spam du lot Desk mène à `/inbox` au lieu de la vue Hidden.
8. ⌘K « Reply to X » : chercher dans les contacts et auteurs réels, pas une table de 7 noms.

## Backlog d'amorce (à compléter par ton audit de parité)
| Capacité Agorapulse | Version agentique |
|---|---|
| **Inbox assistant** (règles auto-label / auto-review / auto-assign / auto-hide par mot-clé, réseau, type) | Nova applique les règles en Act et le journal le dit (« Labelled Refund · rule “refund, money back” ») ; elle **propose** une règle quand Sam répète trois fois le même geste (carte Desk « Add N rules » existante) ; écran de règles avec compteur d'usages ; chaque règle s'annule |
| **Saved replies** | Bibliothèque de réponses ; Nova choisit et adapte la plus proche, la cite en source sous le brouillon ; Sam peut en créer depuis une réponse envoyée (« Save as reply ») |
| **Labels** (gérer, renommer, couleur, supprimer) | Gestion dans la barre latérale ; Nova étiquette elle-même à l'arrivée (règles + intention) ; les labels alimentent Iris (perf par label) |
| **Review / Done** | Statut de revue distinct du statut de réponse ; vues Unread, To review, Done ; Nova marque revu ce qu'elle a traité en Act ; « Mark all reviewed » groupé |
| **Équipe et assignation** | Roster (Sam, Claire, + 1–2 coéquipiers fictifs crédibles) ; Nova assigne selon des règles (presse → Claire, B2B → coéquipier) ; vue charge par personne ; réassignation |
| **SLA / temps de réponse** | Délai qui court par conversation, tri « Overdue », seuil par type (DM 1 h, avis 24 h) ; Nova remonte avant dépassement (Desk Needs you) ; les chiffres sont exposés pour Iris |
| **CRM contacts** | Liste des contacts (recherche, filtres, tags), fiche éditable (tags, notes datées, coordonnées), timeline (conversations, commandes, mentions d'Echo) ; Nova crée la fiche d'un nouveau contact et la complète depuis la commande Shopify ; doublons fusionnables |
| **Modération** | Supprimer, bannir / bloquer, signaler spam, liker, répondre en privé à un commentaire ; Nova le fait en Act sur le spam et les bots, chaque action dit si elle est réversible avant |
| **Fils sous le post** | Commentaires groupés sous leur post d'origine (aperçu du post, autres commentaires), vraies ad comments (pas seulement du spam) |
| **Traduction** | Message d'origine traduit à la volée ; Nova répond dans la langue du client et montre la version anglaise |
| **Garde-fous appliqués** | Compteurs réels du jour (réponses publiques, remboursements cumulés) ; quiet hours LinkedIn : la réponse est programmée à 07:00 et le dit ; au plafond, Nova repasse en Draft et le journal explique |
| **Filtres** | Plage de dates, par compte, par assigné, par label, par statut de revue ; vues enregistrées créées par Sam |
| **Volume crédible** | Seed porté à ~80 conversations avec fils plus longs, tous réseaux (TikTok et YouTube aujourd'hui maigres), nouvelles conversations qui arrivent avec le moteur d'événements |

## Contrats avec les autres agents
- **Expose** (lecture) : temps de réponse, volumes par type/réseau/membre, taux traités seuls → pour
  le rapport community d'Iris. Annonce la forme dans une demande `requests/iris-from-nova-*.md`.
- **Reçoit** : mentions d'Echo à traiter → conversation Inbox (`type: 'mention'`) plutôt qu'une carte
  Desk. Écris le contrat d'entrée (une action `inbox/` publique) et préviens Echo par une demande.
- **Lit** : le Playbook (règles, faits, escalades) — les escalades doivent être **appliquées** par
  Nova (blessure, avocat, journaliste, créateur > 50k → Your call).

## Scénarios de test à ajouter (PROMPT.md §1)
« Make Nova label refund requests on her own » · « Find who is waiting longest » · « Reply to Léa
with the exchange saved reply » · « What did Nova do with the spam overnight? ».
