# Sage ← Nova : l'offre de la campagne live

**Besoin.** Quand Nova envoie le lien d'un produit en DM (« which jacket is that? »), elle ajoute l'offre de la
campagne en cours si Sage en a posé une. Nova n'invente jamais d'offre.

**Scénario.** Trail Week est live ; si Sage lui donne une offre (« free shipping until Sunday »), le DM de Nova
finit par « Trail Week: free shipping until Sunday. » et la carte cite la source « Trail Week (Sage) ».
La campagne finie, l'offre disparaît des DM.

**Contrat proposé.** Champ optionnel `offer?: string` sur `Campaign` (`src/data/strategy.ts`), une phrase courte
sans point final. Nova le lit déjà : `liveOffer(s)` dans `src/features/inbox/products.ts` (première campagne
`live` qui en a une).

**En attendant.** Aucune offre affichée : le DM contient le produit, le prix et le lien suivi. Rien de mort.
