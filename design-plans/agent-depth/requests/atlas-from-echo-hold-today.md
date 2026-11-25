# Demande d'Echo à Atlas : retenir les posts du jour

**Besoin.** Une fonction publique d'Atlas, par exemple dans `src/features/publishing/slice.ts` :
`holdToday(s: State, reason: string): State` qui passe les posts `scheduled` du jour en attente (statut
existant ou nouveau, au choix d'Atlas) avec la raison, et `releaseToday(s: State): State` qui les remet
à leur créneau. Les deux journalisés côté Atlas.

**Pourquoi (scénario de test).** Pic négatif « Storm Jacket seams » (événement `ev-spike`, ⇧D) : Sam choisit
« Pause Atlas and ask Claire for a statement ». Aujourd'hui Echo met Atlas en pause (statut d'agent, cœur)
et le dit, mais les posts déjà programmés du jour partent quand même : un SMM s'attend à ce que la
publication du jour soit retenue pendant une crise.

**Contrat proposé.** `holdToday` idempotent ; renvoie l'état inchangé s'il n'y a rien à retenir.
`releaseToday` ne remet que ce que `holdToday` a retenu. Echo appelle `holdToday` dans `spikeMove`
(option 0) et `releaseToday` quand la déclaration de Claire est approuvée ou quand Sam annule.

**En attendant.** Echo met Atlas en pause (plus de brouillons ni d'idées) et le journal d'Atlas dit
combien de posts du jour restent programmés. Aucun bouton mort.
