# Protopulse — vague 2 : catalogue d'idées ancrées dans le marché

> Lu par les sept sessions de la vague 2 (`wave-2.md`). Chaque section donne des idées classées, de
> la plus forte à la moins forte. Ce sont des **amorces de pitch**, pas des specs : la session vérifie
> l'état du code, affine, et pitche. Le repo est public : ce fichier ne contient que ce que font des
> produits du marché (observable publiquement) et notre raisonnement produit. Le contexte interne
> (avis, chiffres, sources) est dans un fichier local dont le chemin est donné dans `wave-2.md`.

## Pourquoi une vague 2
La vague 1 a surtout porté la **parité avec Agorapulse**, avec une couche d'agent mince (« Nova
étiquette à l'arrivée »). Ce qui manque : des idées qui **changent la façon de travailler** de Sam,
et qui tiennent face aux outils agentiques du marché (Pinpoint, ReplyZen, Blabla.ai, SmartReply,
EngageBeast, Vista Social). La vague 2 vise ça. La parité n'est plus un motif de pitch.

## Ce que l'humain valide, ce qu'il coupe (lu dans les ~80 réponses de la vague 1)
- **Go** : ce qu'un testeur **voit un agent faire** pendant une session, quand le cran
  Suggest / Draft / Act change le comportement, avec un Undo. Les relais entre agents qui produisent
  un objet. Il a surclassé une seule fois vers plus (multi-profils d'Atlas, version complète).
- **Drop / Later** : l'étendue et l'admin (exports, import CSV, fuseaux, glisser à l'heure, CRM
  complet), le réalisme de données pour lui-même (données « live », séries temporelles, volume
  crédible), le « plus de la même chose » (bibliothèques élargies, coupes analytiques en plus), les
  couches d'approbation qui doublonnent les escalades et les crans (validation Claire au-dessus d'un
  budget, garde-fous Nova appliqués, flouter une personne).
- Lecture : **un pitch gagne quand il montre un agent qui agit, s'explique et s'annule**. Il perd
  quand il ajoute un outil, un écran de réglages ou de la donnée.

## Déjà refusé — ne pas re-pitcher
Un **Drop** ne revient jamais. Un **Later** ne revient que s'il a changé de nature (nouvelle preuve
marché, nouvel angle agentique) et le pitch le dit en première ligne.
| Agent | Drop | Later |
|---|---|---|
| Nova | garde-fous appliqués (plafonds, quiet hours) | CRM contacts, volume crédible, export CSV |
| Atlas | — | glisser-déposer à l'heure, import CSV, fuseaux horaires |
| Iris | données qui vivent, historique des boosts | rapport community (re-pitché, toujours Later), chiffres par profil |
| Echo | séries temporelles, par produit | requête avancée, rapport Listening, mention → Inbox |
| Sage | validation par Claire au-dessus d'un budget | tâches qui avancent, revue mensuelle, budget, UTM de campagne |
| Juno | flouter / couper sans autorisation, clips pendant un live, intervenants nommés, bibliothèques élargies | — |

## Règle d'autonomie (tranchée)
L'autonomie reste **par action**, en trois crans **Suggest · Draft · Act**. Elle n'est **jamais
déduite d'un score de confiance** (un outil du marché règle l'autonomie par un seuil 50/65/80/95 % :
on ne le copie pas). La confiance **s'affiche** sur chaque item et peut **router** un item vers
Needs you (« I'm 58% sure, so it's yours »), jamais changer un cran.

## Anti-patterns du marché à ne jamais reproduire
- **Défauts dangereux** : un agent dont la première action est invisible (masquer des commentaires
  par défaut), toutes les actions activées d'office, des automatisations pré-cochées sans mode revue.
- **Masquer une critique légitime** pour « protéger la conversion ». Une plainte dure mais juste reste
  visible.
- **Escalade incohérente** : une menace juridique escaladée en DM mais pas en commentaire public.
- **Inbox vide au jour 1** : l'historique lu pour entraîner l'IA mais pas montré.
- **Boîte noire** : une configuration que le client ne comprend pas et « croit » qui marche.
- **Échec silencieux** : une connexion ou une synchro qui échoue sans dire quoi ni comment réparer.
- **Checklist qui se coche toute seule.**
- **Facturer la prudence** : un brouillon non envoyé compté comme une action.
- **Alerte urgente hors de l'app seulement** (Slack sans repli dans le produit).
- **Avatars humains et « temps gagné » non sourcés.**

---

## Trust — la couche transverse (session `trust`)
Aucun agent ne la portait en vague 1. C'est là que le marché met la barre et que Protopulse peut
le plus se démarquer : **faire confiance à un agent doit se gagner, se voir et se tester**.

**T1. Shadow par action — « ce que j'aurais fait »**
- Référence marché : Pinpoint met chaque agent en Active / Shadow / Inactive (« runs without
  acting »). Personne ne montre clairement ce que l'agent *aurait* fait.
- Notre carte : un quatrième état visible avant Suggest, **par action**, avec un fil « Would have
  done » (ce que l'agent aurait envoyé, masqué, programmé), comparé à ce que Sam a fait à la place.
  Après N concordances, la demande de promotion arrive avec la preuve (« 18 of 20 matched what you
  did »).
- Testeur : passe « Hide spam » en Shadow, déclenche 3 événements, lit le fil, accepte la promotion.
- Touche : `src/app/core.ts` (`setAutonomy`), profil d'agent, Desk (carte de promotion existante).

**T2. Page de test d'un agent (sandbox)**
- Référence marché : ReplyZen a une page de test (on tape un message, on voit les étapes horodatées,
  rien n'est publié, on modifie les instructions en direct) ; SmartReply un sandbox par plateforme
  avec clients et commandes de test ; Pinpoint un bouton Test sur chaque règle.
- Notre carte : un « Try it » dans le profil de chaque agent **et** sur chaque règle du Playbook :
  message libre ou cas prêts (plainte, menace légale, question produit, troll, injection de prompt),
  client et commande Shopify fictifs, timeline (lit → règle appliquée → décide → brouillon), cran qui
  s'appliquerait, sources. Modifier une règle rejoue le cas.
- Testeur : « Make sure Nova never discusses refunds in public on a legal threat » → il le prouve.

**T3. Trust metric calculé, qui pilote les promotions**
- Référence marché : aucun outil ne montre la part des actions acceptées sans modification.
- Notre carte : « Approved unchanged » calculé depuis le journal (aujourd'hui des chiffres seed,
  `src/data/agents.ts`), par action et par semaine, plus le volume délégué ; les demandes de
  promotion et les rétrogradations s'appuient dessus (« 94% unchanged over 3 weeks »).
- Testeur : approuve, modifie, annule ; voit le chiffre bouger et la promotion arriver ou partir.

**T4. « Ce que j'ai appris de toi »**
- Référence marché : ReplyZen met un pouce haut/bas sur chaque décision « pour guider les
  suivantes » ; un outil apprend des réponses passées mais le cache.
- Notre carte : un pouce sur chaque décision d'agent (pas seulement les réponses) ; une page par
  agent qui liste ce qu'il a appris, **avec la source** (« You edited 3 replies to remove emojis on
  LinkedIn »), modifiable et révocable, qui devient des règles du Playbook.

**T5. Trous de connaissance → tâche « Write it »**
- Référence marché : Pinpoint transforme une question sans réponse en « knowledge gap » dans son
  Action Center ; Blabla.ai répond « write it » quand il ne trouve la réponse ni dans les posts ni
  sur le site.
- Notre carte : quand un agent ne sait pas, il ne devine jamais ; une carte Desk « Nova doesn't know
  the Ember Fleece washing temperature » ; la réponse de Sam devient un fait et l'agent répond aux 4
  personnes qui attendaient. (Une partie existe : une réponse à une carte « info » devient un fait.)

**T6. Onboarding qui montre l'agent au travail sur tes données**
- Référence marché : Blabla.ai lit le site et 6 mois d'historique en secondes, devine le type
  d'activité, propose 5 réponses FAQ sourcées à approuver (« I don't know yet » possible), puis
  prévisualise chaque automatisation sur les vrais derniers commentaires ; ReplyZen ouvre une démo
  pré-remplie avec un simple email. Tous laissent l'inbox vide au jour 1.
- Notre carte : l'onboarding (`src/features/onboarding/`) montre **ce que les agents auraient fait
  la semaine passée** sur l'historique importé, carte par carte, avec « does / leaves alone » ; FAQ
  à calibrer ; tout démarre en Shadow ou Draft (rien d'invisible) ; une offre en contexte sur le Desk
  du jour 1 : « Nova could have handled these 14 messages — let her? ».

**T7. Versions du Playbook et des réglages**
- Référence marché : SmartReply garde des versions de configuration avec points de restauration
  quotidiens sur 7 jours.
- Notre carte : chaque changement de règle ou de cran crée une version ; « What changed » et
  « Restore this version » ; l'agent dit quelle version a produit une décision.

**T8. Cartes « fait / laisse tranquille »**
- Référence marché : Blabla.ai décrit chaque automatisation par ce qu'elle fait **et ce qu'elle ne
  touche pas** (« Polite criticism stays », « No DM for opinions on price »).
- Notre carte : chaque action d'agent a sa ligne « leaves alone », visible dans le profil, la carte
  Desk et le test ; elle se modifie en langage courant.

---

## Nova — Inbox
**N1. Escalade complète : carte, réponse d'attente, mêmes règles partout**
- Référence marché : SmartReply escalade un DM risqué dans une carte (résumé, file, Approve /
  Decline, statut) et envoie au client une réponse d'attente ; mais en commentaire public la même
  menace n'est pas escaladée. Pinpoint ajoute une description IA du média (story) et une règle
  « compte au-dessus de 100k abonnés ».
- Notre carte : **mêmes règles en commentaire et en DM** ; réponse d'attente publique sobre
  (« We've sent you a DM ») + DM au client ; carte avec le profil du fan, son activité, la
  description du média, « why I escalated » ; jamais de discussion de remboursement en public sur une
  menace juridique.

**N2. Product discovery : du commentaire à la vente**
- Référence marché : Pinpoint répond publiquement et envoie en DM le lien du produit trouvé dans le
  catalogue, avec prix et autres candidats affichés, plus un « add-on » (code, livraison offerte).
- Notre carte : Nova reconnaît le produit (« which jacket is that? »), répond, envoie le lien suivi ;
  le code vient de la **campagne en cours de Sage** ; les clics remontent chez Iris (contrats
  existants : liens et UTM d'Atlas, `clicksOf` d'Iris). Cran par défaut Draft.

**N3. File « Window closing » (fenêtre de 24 h de Meta)**
- Référence marché : ReplyZen classe les DM en Needs you / Drafts ready / Handed off / Window closing
  avec le temps restant.
- Notre carte : groupe « Window closing » dans Needs you, compte à rebours, et Nova envoie seule une
  réponse d'attente sûre avant la fermeture si l'action est en Act.

**N4. Comment-to-DM relié aux campagnes**
- Référence marché : Blabla.ai et Pinpoint : « commente GO » → lien en DM + réponse en commentaire,
  liens courts suivis, collecte d'email.
- Notre carte : le mot-clé et l'offre sont posés par **Sage** sur la campagne ; Nova exécute ; Iris
  compte ; le testeur voit le funnel bout en bout.

**N5. Rythme humain visible**
- Référence marché : ReplyZen règle un délai « naturel », une fréquence, des instructions sur un
  pourcentage de réponses.
- Notre carte : Nova **ne répond pas à tout** (elle like un compliment au lieu d'y répondre, varie ses
  formules, étale) et le journal le dit (« Liked 6 compliments, replied to 2 »).

**N6. Leads : détection et leads perdus**
- Référence marché : les outils e-commerce vendent « turn every conversation into revenue ».
- Notre carte : Nova marque l'intention d'achat (existe), propose la prochaine étape la plus proche
  de la conversion, et une vue « Lost leads » des intentions restées sans suite.

**N7. Ad comments comme vraie voie**
- Référence marché : tous les outils e-commerce en font leur argument (« most tools ignore ad
  comments »).
- Notre carte : un groupe Ads avec le budget de l'annonce affiché, modération plus stricte, réponses
  orientées produit (N2), et Iris qui relie au ROAS.

**N8. Mode fidèle et injections de prompt**
- Référence marché : Blabla.ai « faithful mode » envoie une réponse approuvée mot pour mot ;
  ReplyZen masque une tentative d'injection de prompt.
- Notre carte : réponses verrouillées (retours, garantie) envoyées telles quelles, signalées comme
  telles ; injections masquées et expliquées.

---

## Atlas — Publishing
**A1. Expériences à hypothèse**
- Référence marché : des plateformes « agentic CRO » génèrent une campagne avec son hypothèse et son
  audience ; dans le social, personne ne boucle hypothèse → test → règle.
- Notre carte : Atlas propose « Hooks with a question get 1.4× saves? Let me test it on 2 reels »,
  programme les variantes, lit le résultat chez Iris, conclut et propose une règle au Playbook.

**A2. Semaine en Shadow**
- Référence marché : le Shadow de Pinpoint, appliqué à l'inbox.
- Notre carte : Atlas « aurait publié » la semaine suivante ; Sam compare au plan validé ; base pour
  passer « Build next week's plan » en Act.

**A3. Une seule voix, avec dérive détectée**
- Référence marché : les outils séparent la voix des réponses et celle de la publication.
- Notre carte : une voix de marque partagée (Playbook) ; Atlas signale quand ses posts dérivent de la
  voix des réponses de Nova (« 3 posts this week used 'epic', banned in replies ») et propose la
  correction.

**A4. Délai de publication et kill switch**
- Référence marché : Vista Social offre un délai avant publication et un arrêt d'urgence par groupe
  de profils.
- Notre carte : chaque post programmé par Atlas en Act part avec une fenêtre « Going out in 10 min ·
  Stop » ; un « Pause all publishing » d'urgence relié aux alertes d'Echo (existe en partie).

**A5. Moments et recyclage proactifs**
- Référence marché : Vista Social a des agents planifiés pour les trous du calendrier, les profils
  silencieux, le recyclage evergreen, les moments calendaires.
- Notre carte : Atlas couvre déjà trous et recyclage ; ajouter le « profil silencieux » (Fernway
  Repair n'a rien posté depuis 9 jours) et les moments calendaires reliés aux thèmes de Sage.

---

## Iris — Insights
**I1. Rapport de l'équipe d'agents (« Handled by »)**
- Référence marché : aucun outil ne montre clairement ce que l'IA a fait vs l'humain ; Vista Social
  affiche « What your AI is worth » (non sourcé).
- Notre carte : dimension **Handled by** (Agent / Human / Agent + approval) sur tous les chiffres ;
  entonnoir d'approbation (proposé → approuvé tel quel / modifié / rejeté / annulé) ; temps gagné
  **sourcé** (formule affichée) ; couverture hors heures ; temps de réponse agent vs humain. C'est le
  rapport qui manque à tout le marché. (Le « rapport community » est Later : celui-ci est différent,
  il parle des agents, pas de l'équipe humaine — à dire en tête du pitch.)

**I2. Analyse contre les objectifs déclarés**
- Référence marché : les outils rapportent des chiffres, pas un écart à une cible.
- Notre carte : Iris lit les objectifs de Sage (S1) et ouvre chaque rapport par « on track / behind »
  avec la cause et l'agent qui peut agir.

**I3. Résultat business des conversations**
- Référence marché : liens courts avec UTM et suivi de clics dans les DM, collecte d'emails ;
  Shopify / GA4 souvent « coming soon ».
- Notre carte : chaîne complète commentaire → DM de Nova (N2/N4) → clic → commande, attribuée à
  l'agent ; « Nova's DMs drove €1,240 this week ».

**I4. Sentiment de chaque item**
- Référence marché : Pinpoint a un agent Sentiment qui note chaque commentaire, DM et mention avec
  l'action prise.
- Notre carte : vue unifiée du sentiment Inbox + Listening, avec ce que les agents ont fait de chaque
  négatif (répondu, escaladé, masqué).

---

## Echo — Listening
**E1. Visibilité dans les réponses des IA**
- Référence marché : apparaît dans les veilles comme bloc de reporting ; personne ne l'écoute en
  continu.
- Notre carte : Echo pose régulièrement des questions types aux assistants IA (« best waterproof
  jacket for the GR20 ») et suit si Fernway est cité, à quel rang, face à Peakline et Norrø ; une
  baisse devient une alerte avec une proposition d'Atlas (contenu à publier). Données mockées, bien
  sûr.

**E2. Tri des demandes de créateurs et d'affiliés**
- Référence marché : Pinpoint classe les demandes entrantes Qualified / Maybe / Unqualified avec
  confiance, résumé du compte et réponse par palier.
- Notre carte : Echo trie, Nova répond selon le palier, Sage rattache les qualifiés à une campagne.
  Relie la liste de créateurs d'Echo (existe) à l'inbox.

**E3. « Punching weight » et mix de contenu**
- Référence marché : le benchmark de Pinpoint mesure la part d'engagement, le volume, l'engagement
  par post, la croissance, et le poids relatif.
- Notre carte : Echo dit ce que Fernway devrait faire de différent (« Norrø gets 3× engagement per
  post with half the volume: fewer, longer carousels ») et le passe à Atlas en idée.

**E4. Scout**
- Référence marché : Pinpoint a un agent « Scout » côté créateurs.
- Notre carte : Echo repère les créateurs qui parlent déjà de la catégorie sans connaître Fernway, et
  propose un premier contact (Draft) avec la raison.

---

## Sage — Strategy
**S1. L'objet Objectif, lu par tous les agents**
- Référence marché : les outils rangent les objectifs dans des rapports, pas dans le comportement.
- Notre carte : un objectif (métrique, cible, période, périmètre) que chaque agent lit et qui change
  ce qu'il fait : Atlas priorise le pilier en retard, Nova pousse le lien de la campagne, Iris ouvre
  ses rapports dessus.

**S2. Campagnes à hypothèse**
- Référence marché : génération de campagne avec hypothèse et audience (CRO agentique).
- Notre carte : chaque plan de Sage énonce son hypothèse (« repair content converts better than
  discounts for returning buyers ») et la teste ; le bilan de campagne conclut et met à jour le
  Playbook.

**S3. L'offre de campagne qui voyage**
- Référence marché : l'« add-on » de Pinpoint (code, livraison offerte) ajouté à chaque DM.
- Notre carte : Sage pose l'offre sur la campagne ; Nova l'ajoute aux DM (N2, N4), Atlas aux posts,
  Iris en mesure l'effet. Fin de campagne = l'offre disparaît partout.

**S4. Amplification payante avec Confirm** *(Budget est Later : ne le pitcher que si S1–S3 sont
faits, et le dire)*
- Référence marché : l'Ads Manager de Vista Social lance des campagnes payantes avec cartes Confirm
  et plafonds.
- Notre carte : Sage propose d'amplifier le post qui surperforme, plafond et durée, carte Confirm,
  Iris rend le résultat.

---

## Juno — Video
**J1. UGC : la vidéo d'un client devient un clip**
- Référence marché : les outils de clipping travaillent sur les vidéos de la marque ; Meta pousse
  les créateurs et le contenu natif.
- Notre carte : une story ou vidéo client qui mentionne Fernway (Echo) → Nova demande l'autorisation
  en DM (Draft) → Juno en tire un clip avec le crédit → Atlas le programme. Le garde-fou
  d'autorisation signée existe déjà.

**J2. Description des médias pour les autres agents**
- Référence marché : Pinpoint décrit le média d'une story mentionnée pour l'escalade.
- Notre carte : Juno décrit chaque image et vidéo entrante (Nova, Echo) ; l'escalade et le tri
  utilisent la description (« shows the jacket seam torn at the shoulder »).

**J3. Clip-to-DM**
- Notre carte : quand un fan demande « how do you clean the Summit Bottle? », Nova répond avec le
  clip existant de Juno au bon moment (timestamp), pas un texte.
