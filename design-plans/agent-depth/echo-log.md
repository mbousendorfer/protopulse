# Echo — journal de décisions

`date · capacité · choisi · écarté · pourquoi`

- 25/11/2026 · C1 pic négatif · l'événement `ev-spike` dépose les 27 mentions dans le flux, puis le garde-fou (3× la moyenne de 8/h) décide · carte figée en dur · les chiffres de la carte, de ⌘K et de l'onglet viennent des mêmes mentions
- 25/11/2026 · C1 pic négatif · action renommée « Handle a negative spike », risque `risky`, cran par défaut Draft (était Act/safe) · garder Act par défaut · en Act Echo met désormais Atlas en pause seule : un preset « balanced » ne doit pas l'activer par défaut
- 25/11/2026 · C1 pic négatif · pause d'Atlas par son statut d'agent (cœur) + demande `atlas-from-echo-hold-today` · écrire dans les posts d'Atlas · fichier d'Atlas ; en attendant le journal d'Atlas dit combien de posts du jour restent programmés
- 25/11/2026 · C1 pic négatif · « ask Claire » = carte de déclaration dans la file Claire ; son approbation remet Atlas en service · simple ligne de journal · boucle agentique complète, réponse de Claire déjà scriptée (`CLAIRE['Negative spike']`)
- 25/11/2026 · C1 pic négatif · option Nova = une seule carte de réponse pour les 27 mentions · 27 cartes · Desk lisible ; à l'approbation les 27 mentions passent « replied »
- 25/11/2026 · C4 compteurs · ⌘K sur 7 jours glissants, Chat sur la journée · « 388 » en dur · même source `model.ts`
- 25/11/2026 · C2 digest ventes · Suggest = Echo dit quoi dire sans envoyer ; Draft = carte Desk avec l'email (« can't be unsent » dit avant) ; Act = envoi + notice · Suggest = carte aussi · le cran doit changer le comportement réel ; rejet de la carte rouvre l'événement
- 25/11/2026 · C3 événement réglé · retrait de toutes les cartes Competitor du même événement (via `EVENT_OF`) · liste d'ids en dur · couvre les cartes du script comme celles du seed
- 25/11/2026 · C6 recherche · le volume d'une nouvelle recherche se calcule à l'affichage (10 min de collecte, cible déterministe depuis les mots-clés) · un tick qui écrit dans l'état · zéro coût au battement de cœur, même résultat à chaque rechargement
- 25/11/2026 · C8 règles d'alerte · évaluées chaque minute, silence d'1 h (règles horaires) ou 24 h, seuil atteint = déclenché (≥) · « strictement plus que » · « 1 mention from press » doit se déclencher à la première ; la règle presse PFAS est marquée déjà levée (carte PFAS de Nova au seed) pour ne rien ajouter au démarrage
- 25/11/2026 · C8 règles d'alerte · la règle « négatif marque » rejoint la carte du pic au lieu d'en créer une seconde ; « Desk and Claire » = carte + ligne « Copied Claire » · deux cartes pour un même fait
- 25/11/2026 · C9 garde-fous · le compte suit l'état, le plafond après « of » reste celui de Sam et s'applique (création, reprise, ajout de concurrent) ; seuil de pic lu dans g1 · garde-fous figés · « un garde-fou affiché est un garde-fou appliqué » ; plafonds 15 recherches (slots Agorapulse) et 6 concurrents (plan Advanced)
- 25/11/2026 · C5 concurrent ajouté · chiffres générés depuis le nom (déterministes), visibles après 10 min de « lecture des 30 derniers jours », premier événement à 25 min, carte selon le cran `echo-events` · attendre 7 jours comme l'annonçait le texte · le testeur doit voir le résultat pendant sa session ; texte d'annonce aligné
- 25/11/2026 · C5 share of voice · recalculé parmi les marques suivies (somme 100) · valeurs seed figées · ajouter ou mettre en pause un concurrent doit bouger la part de Fernway ; `shareOfVoice(s)` est le contrat pour Iris
- 25/11/2026 · Pitch F1 Search view · **Go** (tel que pitché) · – · réponse de l'humain
- 25/11/2026 · Pitch F2 Séries temporelles · **Drop** (sans commentaire) · – · réponse de l'humain
- 25/11/2026 · Pitch F4 Par produit · **Drop** (sans commentaire) · – · réponse de l'humain
- 25/11/2026 · Pitch F5 Créateurs · **Go** (tel que pitché) · – · réponse de l'humain
- 25/11/2026 · F1 search view · mots-clés : toutes les mentions d'un mot-clé, n'importe quel mot-clé (≈ groupes de mots-clés d'Agorapulse) · sous-chaîne littérale · « storm jacket seams » doit attraper « Seams on my Storm… » ; volume de la table = volume seed + mentions arrivées pendant la session, même chiffre sur la page
- 25/11/2026 · F1 search view · ratios (négatif, auteurs, reach) nommés « latest N filed » · les présenter comme des totaux 7 j · le flux est un échantillon, le libellé le dit
- 25/11/2026 · F5 créateurs · nouvelle action `echo-creators` (safe, Draft) : Suggest note, Draft carte à trois choix, Act met sur la liste avec Undo ; le contact (DM de Nova) reste toujours une carte à approuver · Act qui envoie le DM · contacter un créateur engage la marque
- 25/11/2026 · F5 créateurs · liste dérivée du flux (auteurs @ ≥ 5 000 personnes) + fiches seed pour 5 créateurs ; « fit » = positif, ≥ 10k, pas signé chez un concurrent · liste figée · même règle à l'écran, en ⌘K et en Chat ; la carte seed `h-creator` « Add her to the creator list » remplit maintenant la vraie liste
