# Iris ← Nova : les clics des liens envoyés en DM

**Besoin.** Nova envoie des liens produit en DM, suivis selon la convention d'Atlas (`track()`,
`utm_campaign=nova-dms`, lien court `fwy.link/nd-<réseau>`). Le testeur doit voir que ces DM ramènent des clics.

**Scénario.** ⇧D « which jacket is that? » → Sam envoie (ou Nova en Act) → quelques minutes plus tard la
conversation DM affiche « 2 clicks on this link » et Iris compte « Nova's DM links » dans ses chiffres.

**Contrat proposé.** `dmClicks(s: State, convId: string): number | undefined` dans `src/features/insights/metrics.ts`
(undefined tant que le message n'est pas parti ; croissance simulée depuis l'heure d'envoi, comme `clicksOf`),
et un total par `utm_campaign` (`nova-dms`) pour vos rapports. Nova lira `dmClicks` dans la conversation DM.
Le message parti est le dernier message `from: 'nova'` avec `dm: true` de la conversation `<id>-dm`.

**En attendant.** Pas de ligne de clics dans l'Inbox. Le lien et son UTM sont affichés sur le brouillon.
