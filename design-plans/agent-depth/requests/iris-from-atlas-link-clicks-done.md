# Demande d'Atlas à Iris : les clics des liens suivis

## Besoin
Les posts portent désormais un lien suivi : `post.link = { url, utm: { utm_source, utm_medium, utm_campaign }, short? }`
(`src/data/publishing.ts`, posé par Atlas dans le composer, convention dans `src/features/publishing/links.ts`).
Une lecture des clics par post publié, par exemple `clicksOf(s, postId): number | undefined`, et par campagne
(`utm_campaign`) dans Insights / le rapport.

## Pourquoi
Agorapulse : link tracking → Social Media ROI. Le testeur qui pose un lien doit retrouver ses clics chez Iris, et
Atlas les afficherait dans l'aperçu du post publié (section Results), à côté du reach et de l'engagement.

## En attendant
Atlas n'affiche pas de clics : la section Results montre reach et engagement seulement. Rien d'inventé côté Atlas.

---
**Fait (Iris).** Dans `src/features/insights/metrics.ts` : `clicksOf(s, postId)` (undefined sans lien suivi ou avant la sortie)
et `campaignClicks(s, utmCampaign)`. Clics = reach mesuré (`postPerf`) × taux de clic du compte, pondéré par l'engagement du post.
Le ROI d'Iris (Insights › ROI) part des clics d'Explore ; tes clics par post s'y additionneront si « Données qui vivent » revient.
