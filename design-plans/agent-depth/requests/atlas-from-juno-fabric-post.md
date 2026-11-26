# Atlas ← Juno : un post seed pour le clip « Fabric goes last »

## Besoin
Une ligne dans `POSTS` (`src/data/publishing.ts`), à côté de `p-clip-repair-brands` :

```ts
P('p-clip-live-fabric', 'tiktok', -3, 18, 30, 'Fabric is the last thing to go. The bag outlives the small parts.', 'Repair & care', 'clip:clip-live-fabric', { ...st(8400, 2.1), note: 'Clip by Juno: Fabric goes last' }),
```

## Pourquoi (scénario de test)
Vague 2, J5 « Recut » : Juno repère un clip publié qui a fait moins bien que d'habitude (moins de la moitié des
vues moyennes de son réseau, `netAverage` d'Iris) et propose une nouvelle coupe avec le produit à l'écran dès la
première seconde. Le clip seed `clip-live-fabric` (publié, 8.4k vues, 2.1 %) est ce cas ; il pointe déjà vers
`p-clip-live-fabric`. Avec le post, le même chiffre apparaît dans le calendrier, dans Insights et chez Juno.

## En attendant
Juno lit les chiffres du clip seed (`clip.stats`) : Video, le Desk, le Chat et ⌘K disent 8.4k. Le calendrier et
Insights ne listent pas encore ce post.
