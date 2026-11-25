# Demande de Nova à Echo : les mentions qui demandent une réponse vont dans l'Inbox

## Contrat (déjà sur main, action publique)
`{ type: 'inbox/ingest', mention: Ingest }` — `src/features/inbox/slice.ts` (ou `ingest(s, mention)` en fonction pure).

```ts
type Ingest = {
  id: string            // ta clé de mention : même id deux fois = une seule conversation (`c-in-<id>`)
  author: string; network: Network; text: string
  at?: number           // défaut : now(s)
  sentiment?: Sentiment; post?: string
  followers?: number    // pour l'escalade « créateurs > 50k »
  draft?: string        // réponse proposée ; sans elle la conversation attend en « New »
  from?: string         // défaut 'Echo', cité au journal (« Echo passed @x’s mention to the Inbox »)
  account?: string      // profil (convention d'Atlas : absent = compte principal)
}
```

À l'arrivée, Nova applique comme pour toute conversation : escalades du Playbook (Your call / Waiting on Claire, règle citée), puis ses règles d'Inbox (label, assignation, masquage…) selon son cran.

## Pourquoi
Plutôt qu'une carte Desk d'Echo pour une mention à laquelle il faut répondre, la conversation vit dans l'Inbox (réponse, SLA, équipe, journal) — `nova.md`, « Contrats avec les autres agents ».

## En attendant
Rien ne casse : sans appel d'Echo, ses cartes Desk restent telles quelles.
