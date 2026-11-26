# Protopulse — vague 2 : idées simples, vues sur le marché

> Lu par les sept sessions de la vague 2 (`wave-2.md`). Le repo est public : on n'écrit ici que ce
> que font des produits du marché et notre raisonnement. Le contexte interne est dans le fichier local
> indiqué dans `wave-2.md`.

## La règle n°1 : simple
L'humain a trouvé la première version de ce catalogue « extrêmement capillotractée, ultra compliquée
ne serait-ce qu'à comprendre ». Donc :
- **Une idée = une phrase** qu'un social media manager comprend en 5 secondes, avec un exemple
  Fernway.
- **Pas de jargon** dans un pitch ni dans l'UI : pas de « shadow », « trust metric », « hypothèse »,
  « dimension », « contrat », « registre », « punching weight ».
- **Un seul agent**, sauf si le relais est évident (« Nova envoie le lien du produit »).
- **Petit d'abord** : la version la plus simple qui se voit dans une session de test.
- Si l'idée ne se dit pas simplement, elle ne part pas.

## Ce que l'humain valide, ce qu'il coupe (vague 1)
- **Oui** : voir un agent faire quelque chose pendant le test, le niveau d'autonomie (Suggest /
  Draft / Act) qui change ce qu'il fait, et un Undo.
- **Non** : les écrans de réglages, l'admin (exports, imports, fuseaux), les données « plus
  réalistes », le « plus de la même chose », les validations en plus.

## Déjà refusé — ne pas re-pitcher
Un **Drop** ne revient jamais. Un **Later** ne revient que s'il a vraiment changé, et on le dit.
| Agent | Drop | Later |
|---|---|---|
| Nova | garde-fous appliqués (plafonds, quiet hours) | CRM contacts, volume crédible, export CSV |
| Atlas | — | glisser-déposer à l'heure, import CSV, fuseaux horaires |
| Iris | données qui vivent, historique des boosts | rapport community, chiffres par profil |
| Echo | séries temporelles, par produit | requête avancée, rapport Listening, mention → Inbox |
| Sage | validation par Claire au-dessus d'un budget | tâches qui avancent, revue mensuelle, budget, UTM de campagne |
| Juno | flouter / couper sans autorisation, clips pendant un live, intervenants nommés, bibliothèques élargies | — |

## Autonomie
Elle reste réglée **action par action** (Suggest · Draft · Act). Un pourcentage de confiance
s'affiche, et un agent peu sûr te passe la main, mais la confiance ne change jamais le réglage.

## Ce que le marché fait mal (ne pas copier)
- Un agent qui masque des commentaires par défaut, sans le dire.
- Tout activé d'office.
- Masquer une critique juste.
- Une menace juridique traitée en DM mais pas en commentaire public.
- Une inbox vide le premier jour.
- Une erreur de connexion qui ne dit pas quoi faire.

---

## Trust (session `trust`)
| # | Idée, en une phrase | Exemple | Vu chez |
|---|---|---|---|
| T1 | **Essai à blanc** : avant de laisser un agent agir seul, tu vois ce qu'il aurait fait, sans rien envoyer. | « Cette semaine, Nova aurait masqué ces 6 messages. Tu aurais fait pareil pour 5. » | Pinpoint |
| T2 | **Tester un agent** : tu tapes un faux message et tu vois ce que l'agent ferait. | Tu écris « Je vais porter plainte » → Nova te montre qu'elle te le passerait, sans répondre. | ReplyZen, SmartReply |
| T3 | **Le vrai chiffre de confiance** : la part des brouillons que tu as envoyés sans les modifier, calculée pour de vrai. | « Tu as envoyé 46 des 50 brouillons de Nova sans rien changer. » | Personne ne le montre |
| T4 | **Quand l'agent ne sait pas, il demande** une seule fois, et retient ta réponse. | « Nova ne connaît pas la température de lavage de l'Ember Fleece. » → tu réponds → elle répond aux 4 clients qui attendaient. | Pinpoint, Blabla.ai |
| T5 | **Démarrage sur tes vrais messages** : à l'inscription, tu vois ce que les agents auraient fait la semaine passée. | « Nova aurait pu traiter 14 de tes 20 derniers messages. » | Blabla.ai |

## Nova — Inbox
| # | Idée, en une phrase | Exemple | Vu chez |
|---|---|---|---|
| N1 | **Lien du produit en DM** quand quelqu'un demande quel produit c'est. | « C'est quelle veste ? » → Nova répond et envoie le lien de la Storm Jacket en DM. | Pinpoint |
| N2 | **Message d'attente** quand Nova te passe un client : il n'attend pas dans le silence. | « On regarde ça et on revient vers vous dans l'heure. » | SmartReply |
| N3 | **« Plus que 2 h pour répondre »** : alerte avant la fin du délai de réponse aux DM d'Instagram. | Le DM de Léa remonte en haut avec « 2 h left ». | ReplyZen |
| N4 | **Nova ne répond pas à tout** : elle like les simples compliments au lieu de répondre. | « 6 compliments likés, 2 réponses. » | ReplyZen |

## Atlas — Publishing
| # | Idée, en une phrase | Exemple | Vu chez |
|---|---|---|---|
| A1 | **10 minutes pour arrêter** un post qu'Atlas programme tout seul. | « Part dans 10 min · Arrêter. » | Vista Social |
| A2 | **Atlas relance un compte qui ne poste plus.** | « Fernway Repair n'a rien publié depuis 9 jours : voici 2 posts. » | Vista Social |

## Iris — Insights
| # | Idée, en une phrase | Exemple | Vu chez |
|---|---|---|---|
| I1 | **Ce que les agents ont fait cette semaine** : combien ils ont traité seuls, combien tu as validé, combien de temps ça t'a fait gagner. | « Nova a traité 212 messages seule, tu en as validé 38 : environ 4 h gagnées. » | Personne ne le montre clairement |
| I2 | **Les ventes venues des DM de Nova.** | « Les liens envoyés par Nova ont rapporté 1 240 € cette semaine. » | Blabla.ai, Pinpoint |

## Echo — Listening
| # | Idée, en une phrase | Exemple | Vu chez |
|---|---|---|---|
| E1 | **Trier les demandes de créateurs** : oui, peut-être, non, avec la raison. | « @trail.marie : oui, 38k abonnés, randonnée, déjà cliente. » | Pinpoint |
| E2 | **Ce qu'un concurrent fait mieux**, en une phrase, avec une idée pour Atlas. | « Norrø publie moitié moins et obtient 3× plus de réactions : des carrousels plus longs. » | Pinpoint |

## Sage — Strategy
| # | Idée, en une phrase | Exemple | Vu chez |
|---|---|---|---|
| S1 | **Le code promo de la campagne voyage tout seul** : Nova le met dans ses DM, et il disparaît à la fin de la campagne. | « Trail Week : TRAIL15 ajouté aux réponses de Nova jusqu'à dimanche. » | Pinpoint |
| S2 | **Un objectif chiffré par campagne, et où on en est.** | « Trail Week : 240 ventes sur 300, en retard de 2 jours. » | — |

## Juno — Video
| # | Idée, en une phrase | Exemple | Vu chez |
|---|---|---|---|
| J1 | **Répondre avec le bon passage d'une vidéo.** | « Comment on nettoie la gourde ? » → Nova répond avec le passage de 0:42 de la vidéo de Juno. | — |
| J2 | **Juno décrit les photos et vidéos reçues** pour que Nova comprenne. | « La photo montre la couture de l'épaule déchirée. » | Pinpoint |
