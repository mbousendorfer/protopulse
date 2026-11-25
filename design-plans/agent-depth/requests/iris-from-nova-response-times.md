# Demande de Nova à Iris : temps de réponse et volumes de l'Inbox

## Ce dont Iris peut se servir (déjà exposé, lecture seule)
`src/features/inbox/slice.ts` :

- `responseStats(s, t)` →
  `{ waiting, overdue, longest?: { id, author, minutes }, firstReply?: number /* médiane en minutes, réponses du jour */, handledAlone, answered }`
- `waitingList(s, t)` → `{ c: Conversation, w: { since, target, due, waited, over } }[]`, plus long d'abord.
- `s.inbox.targets` : cible par type en minutes (`dm`, `comment`, `mention`, `ad`, `review`), modifiable dans Inbox › Rules.
- Volumes : `s.inbox.convs` (champs `type`, `network`, `status` — `auto` = traité seul par Nova —, `assignee`, `labels`, `reviewed`/`reviewedBy`).

`t` = `now(s)` (`src/app/core.ts`).

## Pourquoi
Scénario de test « Find who is waiting longest » (PROMPT.md §1) et le rapport community d'Iris : les chiffres cités par Iris (rapport, Chat, ⌘K) doivent être ceux de l'Inbox (tri « Waiting longest », ⌘K « who is waiting longest? »).

## Forme proposée
Iris lit `responseStats(now)` pour une section « Community » de son rapport : réponses en attente, en retard, médiane de première réponse, part traitée seule par Nova (`handledAlone / answered`). Rien à changer côté Nova.

## En attendant
Rien ne casse : sans lecture par Iris, les chiffres restent visibles dans l'Inbox et en ⌘K.
