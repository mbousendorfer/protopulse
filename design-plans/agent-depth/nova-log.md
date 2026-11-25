# Nova · journal de décisions

`date · capacité · choisi · écarté · pourquoi`

- 25/11 · B1 Act · le cœur passe `act: true` dans la décision (PR #23) ; la conversation passe en « Nova · auto » · deviner Act par le cran courant de l'action · une carte `nova-faq` (déjà en Act) approuvée par Sam aurait été comptée comme réponse de Nova.
- 25/11 · B2 événements en Act · `run` sur les événements Nova (même règles que `fire`) qui crée la conversation `auto` · modifier `fire` dans le cœur · reste dans mon module, sans toucher au moteur partagé.
- 25/11 · B2 réponse seule · Nova en Act envoie une version corrigée (`conv.reply`) plutôt que le brouillon avec ses passages douteux · envoyer le brouillon tel quel · en Act elle a levé son doute (Playbook) ; le brouillon douteux reste ce que Sam voit en Draft.
- 25/11 · ev-german · nouvelle cliente (Lena W., question sur le sac) au lieu de Jonas K. · garder Jonas · Jonas existe déjà dans le seed avec la même question : la carte était invisible dans l'Inbox (dédoublonnée) et créait un doublon à l'approbation.
- 25/11 · ev-stove / ev-collab · `ref` vers `c-pierre` / `c-theo` · carte sans conversation · la décision du Desk (holding reply, Claire) met à jour la vraie conversation.
- 25/11 · B5 Waiting on Claire · groupe en bas de Needs you, compteur gris (pas de badge) · vue séparée · §6.2 le place dans Needs you ; un badge veut dire « needs you », Claire ne l'est pas.
- 25/11 · B8 ⌘K Reply to · recherche à l'exécution (contacts, auteurs, sans accents) ; le parse ne garde que le nom · table de noms · le parse n'a pas l'état ; la conversation qui attend Sam passe en premier.
- 25/11 · pitch Garde-fous appliqués · **Drop** (sans commentaire) · — · réponse de l'humain ; la ligne reste au backlog en `dropped`.
- 25/11 · pitch Escalades du Playbook · **Go** · — · tel que pitché.
- 25/11 · pitch Inbox rules · **Go** · — · tel que pitché, deux PR.
- 25/11 · pitch Review / To review · **Go** · — · tel que pitché.
- 25/11 · Review · répondre (Send, approuver, Desk) marque revu par Sam · laisser « to review » après réponse · « To review » = ce qu'une personne n'a pas encore regardé ; une réponse envoyée a été regardée.
- 25/11 · Review · états sauvegardés d'avant : réponses auto et spam caché par Nova comptent comme revus par Nova (`withTeam`) · bump de version d'état · un bump efface la session du testeur.
- 25/11 · Escalades · mots-clés par règle intégrée (blessure, presse, juridique, budget, prix), seuils pour créateur (> 50k) et remboursement (> €150), mots longs du libellé pour une règle ajoutée par Sam · vrai classifieur · prototype mocké ; une règle ajoutée a quand même un effet visible.
- 25/11 · Escalades · vérifiées à l'arrivée (événements Nova) seulement, pas sur les conversations du seed · re-scanner le seed · le seed est déjà trié à la main ; re-trier changerait le Desk validé.
