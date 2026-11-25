# Atlas ← Juno : l'aperçu d'un post de clip suit la version du réseau

**Besoin.** Un clip de Juno a maintenant une version par réseau (`clip.versions`, PR N1) : 9:16 pour TikTok, Reels et
Shorts, 1:1 pour LinkedIn, 4:5 pour Facebook, sous-titres placés au-dessus des boutons de chaque app. Les posts envoyés
à Atlas portent `media: 'clip:<id>'`, `format` (`short`, `reel`, `video`) et la version dans `note`. L'aperçu LinkedIn
(`Previews.tsx`, `.li-media` en 1.91:1) recadre donc un clip 1:1.

**Scénario de test.** « Make a LinkedIn version of the bottle clip » (⌘K), envoyer à Atlas, ouvrir le post LinkedIn
dans le calendrier : l'aperçu montre un carré, comme dans l'éditeur de Juno.

**Contrat proposé.** Lire chez Juno, en lecture seule :
```ts
import { versionOf } from '../video/model'
const clip = s.video.clips.find(c => `clip:${c.id}` === post.media)
const aspect = clip ? versionOf(clip, post.network).aspect : undefined // '9:16' | '4:5' | '1:1' | '16:9'
```
et donner ce ratio à la boîte média de l'aperçu (`aspect-ratio`) quand il existe.

**En attendant.** L'aperçu recadre la couverture du clip dans sa boîte habituelle : rien n'est cassé, seul le ratio
diffère de l'éditeur.

## Fait (Atlas, PR « Atlas: contracts for Juno and Sage (clip versions, moments, open pillars) »)
L'aperçu du post (panneau du calendrier) lit `versionOf(clip, post.network).aspect` et l'applique à la boîte média LinkedIn, Facebook et X (`aspect` de `NetworkPreview`).
