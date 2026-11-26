# Protopulse — vague 2 : Trust, la couche transverse de confiance

> Lis d'abord `design-plans/agent-depth/wave-2.md` (qui te renvoie à `_common.md`, au catalogue et au
> contexte local). Ce fichier ne donne que ton périmètre. Port : **5187** (`protopulse-trust`).
> Préfixe de branche et de commit : `trust` (`claude/trust-w2-<sujet>`, `Trust W2: …`).

## Mission
Protopulse veut valider qu'un social media manager **accepte de laisser des agents agir seuls**
(PROMPT.md §1, points 1 et 3). En vague 1, chaque session a approfondi son module ; personne n'a
porté ce qui fait naître la confiance. C'est toi. Ta section du catalogue est **Trust (T1–T8)**.

Le marché met la barre ici : raisonnement et confiance sur chaque item, shadow par agent, pages de
test et sandbox, onboarding qui montre l'agent au travail sur tes propres données. Et il rate tous
la même chose : défauts dangereux, inbox vide au jour 1, aucun chiffre de confiance. Ton travail :
**faire mieux que les meilleurs sur chacun de ces points, pour les six agents à la fois**.

## Ce qui existe (vérifie sur `main`)
- Autonomie par action Suggest / Draft / Act (`src/data/agents.ts`, `src/app/core.ts` `setAutonomy`),
  passage en Act qui règle les cartes via `resolve()` ; demandes de promotion et « Trial for a week »
  (`trialUntil`, `src/app/reducer.ts`) ; rétrogradations.
- Confiance, raison et sources sur chaque carte (`src/app/types.ts`, `src/features/desk/parts.tsx`).
- « Approved unchanged » par agent et par action affiché dans le profil
  (`src/features/agents/Agents.tsx`) mais **figé en seed** dans `src/data/agents.ts`.
- Règles apprises des modifications proposées en cartes ; une réponse à une carte « info » devient un
  fait du Playbook (`src/features/playbook/slice.ts`, `reducer.ts`).
- Escalades éditables (`src/features/agents/Escalation.tsx`), file de Claire.
- Onboarding signup → site → lecture → comptes → playbook → équipe → résultats
  (`src/features/onboarding/`), résultats sur la seed, Day 1 (`day1.ts`).
- Pas de shadow, pas de page de test, pas de versions du Playbook, pas de pouce sur les décisions.

## À faire dans l'ordre
1. Backlog `trust-wave2-backlog.md` depuis T1–T8 (+ au moins une idée à toi).
2. Pitche T1 (shadow), T2 (test), T3 (trust metric calculé) en premier : ils se renforcent (le shadow
   produit les concordances, le trust metric les compte, la promotion s'appuie dessus, le test
   permet de vérifier avant).
3. Pour chaque mécanisme, un point d'extension du registre (`src/app/agent-module.ts`) que chaque
   agent remplit pour ce qui lui est propre (ex. `testCases`, `leavesAlone`, `shadowPreview`) ; tu
   remplis toi-même une première version pour les six agents à partir de leurs actions, puis tu
   ouvres une demande `requests/<agent>-from-trust-<sujet>.md` à chacun pour qu'il affine.
4. Garde les décisions validées : pas de toast, une seule barre d'Undo, crans Suggest · Draft · Act
   dans cet ordre (le shadow, s'il est validé, se place **avant** Suggest et se nomme d'un mot clair,
   à pitcher), badges = needs you.

## Garde-fous propres
- L'autonomie n'est jamais déduite de la confiance (règle du catalogue). Le trust metric **propose**
  une promotion ; seul Sam la donne.
- Rien d'invisible par défaut : un nouvel agent ou une nouvelle action démarre en Shadow (si validé)
  ou en Draft, jamais en Act.
- Le moindre chiffre de confiance affiché est calculé depuis le journal, et sa formule est lisible en
  infobulle.
- Le Day 1 et le Day 30 restent cohérents : un espace Day 1 n'a pas d'historique de confiance et le
  dit.

## Scénarios de test à ajouter (PROMPT.md §1)
« Check what Nova would have done before letting her » · « Prove Nova won't discuss refunds in
public on a legal threat » · « Why does Atlas want more autonomy? » · « Undo what you taught Nova
about emojis ».
