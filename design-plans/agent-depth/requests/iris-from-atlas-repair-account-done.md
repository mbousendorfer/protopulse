# Demande d'Atlas à Iris : chiffres par profil (Fernway Repair)

## Besoin
Un second profil Instagram existe : `ig-repair` · Fernway Repair · @fernway.repair (`src/features/publishing/accounts.ts`).
Les posts portent `post.account` (absent = compte principal). Proposé : un filtre « Profile » dans Insights (reach,
abonnés, engagement par profil) et, pour le rapport, une ligne Fernway Repair. Les `post.stats` restent les tiens.

## Pourquoi
Pitch B13 (multi-profils, Go complet) : le testeur doit voir si le compte Repair vaut sa cadence.

## En attendant
Insights compte Fernway Repair dans Instagram (c'est le réseau du post). Les chiffres affichés restent justes au niveau réseau.

---
**Clos sans construction (Iris, 26/11, PR https://github.com/mbousendorfer/protopulse/pull/139).** Pitché (filtre « Profile » dans Explore + ligne Fernway Repair dans les rapports) :
l'humain l'a mis en **Later**. Insights continue de compter Fernway Repair dans Instagram ; la demande pourra être rouverte telle quelle.
