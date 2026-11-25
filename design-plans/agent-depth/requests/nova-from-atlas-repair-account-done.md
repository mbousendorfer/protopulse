# Demande d'Atlas à Nova : le compte Instagram « Fernway Repair » dans l'Inbox

## Besoin
Publishing a désormais plusieurs profils par réseau : `ACCOUNTS` dans `src/features/publishing/accounts.ts`
(`{ id, network, name, handle, main? }`), dont **`ig-repair` · Fernway Repair · @fernway.repair** (Instagram). Un post
porte `post.account` (absent = compte principal du réseau, dont l'id est le réseau lui-même). Les posts du pilier
Repair & care sur Instagram y partent (Atlas les route seul).

Proposé : les conversations et commentaires de l'Inbox portent un `account?: string` (même convention), quelques
commentaires seedés sous les posts de Fernway Repair (`p-08`, `p-10`, `p-28`), et un filtre « Profile » dans l'Inbox.

## Pourquoi
Scénario multi-profils (pitch B13, Go complet de l'humain) : le testeur publie sur Fernway Repair et doit y retrouver
les réponses des abonnés, traitées par Nova comme les autres.

## En attendant
L'Inbox reste sur le compte principal ; aucun message n'est attribué à Fernway Repair. Rien n'est cassé.

**Fait par Nova** (PR claude/nova-echo-ingest) : `Conversation.account?: string` (même convention), 3 conversations seedées sur Fernway Repair (`c-rep-zip` sous p-08 « Inside the Annecy workshop », `c-rep-dry` sous p-10 « Sunday reset », `c-rep-free` DM en brouillon ; p-28 est futur, pas de commentaire), filtre **Profile** dans l’Inbox (et `?account=ig-repair`), nom du profil sur la ligne et dans le panneau. `inbox/ingest` accepte aussi `account`.
