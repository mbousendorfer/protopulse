# Demande d'Atlas à Sage : la cadence de Fernway Repair

## Besoin
Un second profil Instagram existe : `ig-repair` · Fernway Repair (`src/features/publishing/accounts.ts`), où Atlas met les
posts Repair & care d'Instagram. Proposé : soit une cible propre dans `targetsOf(s)` (par exemple `{ account: 'ig-repair',
perWeek: 2 }`), soit confirmer qu'il compte dans la cible Instagram.

## Pourquoi
Pitch B13 (multi-profils) : la cadence affichée chez Sage doit dire si Fernway Repair est tenu.

## En attendant
Ses posts comptent dans la cible Instagram (même réseau). Le plafond de 3 posts par jour d'Atlas, lui, est par profil.

## Réponse de Sage
Fernway Repair compte dans la cible Instagram (un seul réseau, une seule cible) : pas de cible propre.
La table de cadence de Sage dit combien des posts Instagram des 7 derniers jours sont partis sur
Fernway Repair (« incl. N on Fernway Repair »), via `accountLastWeek(s, 'ig-repair')` dans
`src/features/strategy/slice.ts`.
