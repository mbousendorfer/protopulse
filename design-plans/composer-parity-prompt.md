# Composer parity: sub-agent prompt

Prompt pour amener le composer "New post" au niveau du composer Agorapulse (file d'attente, légende par réseau, multi-médias, options par réseau, approbation, commentaires, historique) sans perdre la couche Atlas.
À coller dans une nouvelle session Claude Code. Routes en HashRouter : `/protopulse/#/publishing/new`.

```
Tu travailles dans le repo Protopulse (Vite + React + TS, tokens CSS écrits à la main dans src/styles/tokens.css
qui reprennent la palette ADS d'Agorapulse). Lis README.md, PROMPT.md §0-2, design-plans/composer-rework.md
(parcours actuel, à garder), puis src/features/publishing/Composer.tsx, Previews.tsx, publishing.css,
src/data/publishing.ts (Post, Media, Queue, BEST_SLOT) et les helpers déjà là : accounts.ts (ACCOUNTS, GROUPS),
formats.ts (FORMATS, FIRST_COMMENT), links.ts (UTM, short link), labels.ts (knownLabels, editLabels),
queues.ts (upcoming, inSlot), approvals.ts (sendToClaire), notes.ts (isQuiet), media.ts (search), checks.ts,
guards.ts, visuals.ts (readImage, libraryOf), src/ui/index.tsx (Btn, Seg, Switch, Tabs, Menu, Pop, Sheet, Modal,
Filters, Pill, Net). Charge les skills agorapulse-product (module Publishing) et design-guidelines avant d'écrire.

But : le composer "New post" doit offrir ce que fait le composer Agorapulse, sans perdre le parcours Atlas
(variantes, Playbook, créneau, readiness line). Un social media manager qui vient d'Agorapulse doit y retrouver
tous ses réflexes. Réutilise les helpers ci-dessus, n'en réécris aucun.

À construire, dans cet ordre (chaque lot doit tourner avant le suivant) :

Lot 1 — Destination et légende
1. Mode en tête : Seg "Profiles | Queue". Queue = choisir une file (queues.ts) ; le When affiche alors
   "Next free slot: Thu 27 Nov, 18:30 in Trail stories queue" (upcoming + inSlot) au lieu du créneau.
2. Sélecteur de profils compact : chips icône + nom court sur une ligne, "+N" au-delà, recherche et groupes
   dans un Pop (ferme le point ouvert "7 profils wrap à 1440"). Compteur "3 profiles" à côté du titre.
3. Légende commune + onglets par réseau sélectionné ("All networks · Instagram · LinkedIn…"). Un onglet réseau
   montre la légende commune tant qu'on ne l'a pas modifiée ; dès qu'on tape, "Own caption" + "Reset to shared".
   Réutilise l'état `variants` existant.
4. Barre d'outils sous le champ : Emoji (Pop avec grille), Hashtags (jeux enregistrés par pilier + suggestions
   d'Atlas, insérés au curseur), @Mention (liste de comptes mockés ; sur les réseaux qui ne relient pas la
   mention, dire "Plain text on X"), Atlas (variantes/Shorten existants). Compteur par réseau avec la limite
   réelle (X 280, Instagram 2 200, LinkedIn 3 000, TikTok 2 200, Facebook 63 206, YouTube titre 100) ;
   dépassement = nommé dans la readiness line avec "Fix".
5. Lien : garder UTM et short link existants, ajouter la carte d'aperçu (Facebook, LinkedIn) avec titre,
   description et image modifiables.

Lot 2 — Médias et options par réseau
6. Plusieurs médias : jusqu'à 10 (carrousel Instagram/LinkedIn), réordonnables (drag + flèches clavier),
   Remove par vignette, Alt text par image (Pop), vidéo avec choix de couverture (3 images proposées).
   Sources : Upload (readImage) et Library (libraryOf, avec search). Ratio hors limites pour un réseau =
   avertissement nommé sous la vignette ("Instagram crops 16:9 to 4:5"). Contrat : ajoute
   `assets?: { src: string; alt?: string }[]` à Post et garde `media` = premier asset pour que calendrier,
   aperçus et tests continuent de marcher.
7. Options du réseau à l'écran, dans la colonne aperçu sous format et premier commentaire, repliées par défaut
   ("More Instagram options") :
   - Instagram : collaborateurs, lieu, tag de comptes, "Also share to feed" pour un Reel, rappel mobile pour
     Story (badge "Mobile reminder").
   - TikTok : qui peut voir (Public/Friends/Only me), Allow comments/Duet/Stitch, Branded content.
   - YouTube : titre (obligatoire), visibilité, catégorie, tags, playlist, Made for kids, miniature.
   - LinkedIn : titre du document (format Document).
   - Facebook : lieu.
   - X : thread — "Split into thread" découpe la légende en posts de 280, chacun éditable et compté.
   Contrat : `options?: Partial<Record<Network, Record<string, string | boolean | string[]>>>` sur Post.
   Un champ obligatoire vide bloque, et la readiness line le nomme avec "Fix".

Lot 3 — Quand, organisation, équipe
8. When : "Publish now", "Schedule" (créneau-phrase + Change actuel), "Add another time" (jusqu'à 5 dates,
   crée un post par date), chips de meilleur moment (BEST_SLOT, raison d'Iris en title), fuseau affiché
   ("Europe/Paris"), jour calme (isQuiet) signalé.
9. Organisation, une ligne repliable "Labels · Campaign" sous When : labels multiples (knownLabels, création
   inline), campagne (Post.campaign). Save draft demande une catégorie de brouillon (Menu, défaut "Uncategorized").
10. Équipe : "Send for approval" (approbateur Claire + message, via sendToClaire, statut To approve), "Assign to".
    Onglets en tête de la colonne aperçu en édition : Preview · Comments (Post.comments, @mention, Enter envoie)
    · History (Post.history).
11. Pied de page : readiness line à gauche ; à droite Save draft (secondaire) et un seul primaire dont le libellé
    suit le mode (Schedule / Add to queue / Publish now / Send for approval si un moderator ou le Playbook l'exige),
    les autres actions dans More ▾. Fermer avec des changements non sauvés demande "Discard changes?".
12. Tests : ajoute des asserts pour le découpage en thread, les limites de caractères par réseau et le passage
    `assets` → `media` dans les fichiers *.test.ts voisins.

Hors périmètre (ne pas construire) : Pinterest et Google Business Profile (absents de PUBLISH_NETWORKS),
Canva, Google Drive, sondages, ciblage d'audience, boost. Pas de nouvelle dépendance.

Règles (non négociables) : uniquement les tokens existants, jamais de valeur inventée. Encre de texte --ink ou
--ink-2. Bordures --line. Bleu électrique uniquement pour l'interactif. Pas de labels en majuscules, pas de
bordure gauche colorée, pas d'ombre dans une carte, boutons jamais pleine largeur, chaque chiffre nommé en texte,
dropdowns = Menu/Pop du kit, jamais de <select> nu. Progressive disclosure : à l'ouverture, le composer ne doit
pas paraître plus chargé qu'aujourd'hui ; le reste se déplie. Libellés EN d'Agorapulse (Schedule, Add to queue,
Publish now, Save draft, Send for approval, First comment, Label). Textes UI en anglais, courts.

Vérifie : npm test, npm run build, puis le serveur de preview "protopulse" (.claude/launch.json) sur
/protopulse/#/publishing/new et l'édition d'un post existant. Scénarios : Instagram carrousel 3 images avec alt
text + LinkedIn avec légende propre ; TikTok + YouTube avec un titre manquant (bloqué, Fix) ; un thread X ;
ajouter à une file ; envoyer à Claire puis commenter. Clavier, thème sombre, 375 px. Rapporte des captures et ce
que tu n'as pas pu vérifier. Ne commit pas.
```
