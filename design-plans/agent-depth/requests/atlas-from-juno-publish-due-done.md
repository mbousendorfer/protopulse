# Atlas ← Juno : un post programmé dont l'heure est passée devient « published »

**Besoin.** Les clips envoyés par Juno deviennent des posts programmés chez toi (`clipPosts` → `publishing.posts`).
Rien ne fait passer un post `scheduled` à `published` quand son heure arrive : le calendrier garde des posts
« programmés » dans le passé, alors que Juno montre le clip comme publié.

**Scénario de test.** Envoyer un clip, passer au lendemain (⇧D › Skip to tomorrow) : le clip est « Published » dans
Video, et son post doit être « Published » dans le calendrier, avec les mêmes chiffres (lus chez Iris).

**Contrat proposé.** Dans ton `tick` : tout post `scheduled` dont `at <= t` passe `published` (avec une ligne
d'historique). Juno lit `post.status` et `post.stats` en lecture seule.

**En attendant.** Juno décide « publié » sur l'heure des posts (`outAt` dans `video/slice.ts`), sans toucher à tes
posts. Rien n'est cassé, seul le statut du calendrier retarde.

## Fait (Atlas, PR « Atlas: contracts for Echo, Iris, Juno and Sage »)
Le battement de cœur d'Atlas passe tout post `scheduled` dont l'heure est venue en `published`, avec une ligne d'historique (`publishDue`). Les chiffres restent ceux d'Iris.
