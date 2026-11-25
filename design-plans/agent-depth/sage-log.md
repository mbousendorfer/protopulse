# Sage — journal de décisions

`date · capacité · choisi · écarté · pourquoi`

- 25/11/2026 · Campagne → calendrier · Sage écrit les posts dans le calendrier d'Atlas en ligne (`toAtlas` / `fromAtlas`, marqués `ponytail:`) en attendant `receivePosts` / `withdrawPosts` d'Atlas (demande `requests/atlas-from-sage-campaign-posts.md`) · une carte Desk par post · le contrat d'Atlas dit « posts, pas cartes Desk » et le testeur doit voir toute la campagne au calendrier.
- 25/11/2026 · Campagne → calendrier · seuls les posts dont le créneau est encore à venir partent ; un post déjà au calendrier (Trail Week `p-21`, `p-25`) est mis à jour par `postId`, jamais dupliqué · tout renvoyer · un post passé ne se programme pas.
- 25/11/2026 · Garde-fou « Active campaigns 2 max » · compte les campagnes `live` quelle que soit leur date, lu dans la valeur du garde-fou (`g2`) que Sam peut changer ou supprimer · chevauchement de dates · plus lisible pour le testeur, et « active » = approuvée et pas finie. Une campagne live se ferme seule à sa date de fin (battement de cœur).
- 25/11/2026 · Plan en Act · à Act, Sage lance seul un plan neuf si le garde-fou le permet (journal, Undo 30 min) ; à Suggest, la carte est une info « Review the plan », le lancement se fait depuis Strategy · garder la même carte aux trois crans · le cran doit changer le comportement réel.
- 25/11/2026 · Brief auto en dev · le brief lancé par ⌘K restait bloqué en StrictMode (le nettoyage annulait les minuteurs sans relancer) ; corrigé en remettant le verrou à zéro au nettoyage.
- 25/11/2026 · Test partagé · `registry.test.ts` listait exactement les modules à `tick` ; PR à part #28 pour qu'il accepte les ajouts des autres agents.
