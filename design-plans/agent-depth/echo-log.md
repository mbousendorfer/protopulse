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
- 25/11/2026 · Pitch F3 Requête avancée et filtrage · **Later** · – · réponse de l'humain
- 25/11/2026 · Pitch F7 Benchmark par réseau · **Go** (tel que pitché) · – · réponse de l'humain
- 25/11/2026 · Pitch F8 Tags et tagging auto · **Go** (tel que pitché) · – · réponse de l'humain
- 25/11/2026 · Pitch F9 Rapport Listening · **Later** · – · réponse de l'humain
- 25/11/2026 · F6 Mention → Inbox · skipped sans pitch · – · Nova affiche déjà en conversation (`virtualConvs`) toute carte de réponse née d'une mention ; rien à construire côté Echo
- 25/11/2026 · F7 benchmark par réseau · chiffres de Fernway lus chez Iris (`NET_SHARE`, `POSTS`) et chez Sage (`lastWeekOf`, posts réels des 7 derniers jours), concurrents seedés par réseau (totaux = table All) · demande à Iris · le contrat existe déjà en lecture, pas besoin d'attendre ; rang par taux d'engagement · rang par abonnés · c'est la question que pose le SMM (« who works better »)
- 25/11/2026 · F8 tags · cinq règles seed (produit, créateur, presse, mots « support », concurrent) appliquées au flux seed ; les nouvelles mentions passent par `echo-file` (Act : tag + Undo, Draft : carte « Tag N new mentions? », Suggest : boutons « + tag » sur la mention) · tags calculés à l'affichage · un tag d'Echo doit pouvoir s'annuler et s'approuver ; une règle créée ou modifiée par Sam s'applique tout de suite (c'est sa demande), avec Undo
- 25/11/2026 · Pitch F10 Vu / non vu · **Go** (tel que pitché) · – · réponse de l'humain
- 25/11/2026 · F10 vu / non vu · « needs you » = négatif, à risque ou question, sans réponse ; vu = ouvert, marqué, antérieur au dernier brief, ou traité seul par Echo ; non vu = graisse (convention Inbox) · pastille de couleur · le badge de l'onglet veut dire « needs you » (décision prise)
- 25/11/2026 · ⌘K concurrent · réponse lue dans les événements ouverts (même état que Listening › Competitors) · texte Peakline figé · « les chiffres cités en ⌘K sont ceux de l'écran »
- 25/11/2026 · Clôture · PROMPT.md §1 (scénarios Listening), §4 Echo, §6.5, §9 réécrits ; rapport `docs/agent-depth/echo.html` avec captures avant (73a7ba2) / après · – · fin de session
- 25/11/2026 · Déclencheurs ⇧D (« Hard to see ») · ajout Norrø (ripostes, email ventes selon le cran), Trailkind → benchmark TikTok, tendance repair · – · règle de la Phase 0 : chaque capacité difficile à croiser a un déclencheur ; recherche qui se remplit, concurrent ajouté et alertes passent par les boutons de temps
- 26/11/2026 · Pitch F6 Mention → Inbox (contrat `inbox/ingest` de Nova, #128) · **Later** · – · réponse de l'humain ; « Ask Nova to reply » garde ses cartes Desk (conversations virtuelles côté Inbox)
