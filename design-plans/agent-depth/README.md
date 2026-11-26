# Profondeur des agents — mode d'emploi

Sept prompts pour amener chaque agent de Protopulse au niveau fonctionnel d'Agorapulse, en restant
agentic-first. Chaque session crée ses PR et les merge elle-même sur `main`.

| Fichier | Session | Port |
|---|---|---|
| [`phase-0.md`](phase-0.md) | Plomberie : registres par agent, autonomie qui agit, contrats partagés, CI de PR | 5180 |
| [`nova.md`](nova.md) | Nova — Inbox | 5181 |
| [`atlas.md`](atlas.md) | Atlas — Publishing | 5182 |
| [`iris.md`](iris.md) | Iris — Insights | 5183 |
| [`echo.md`](echo.md) | Echo — Listening | 5184 |
| [`sage.md`](sage.md) | Sage — Strategy | 5185 |
| [`juno.md`](juno.md) | Juno — Video | 5186 |
| [`_common.md`](_common.md) | Tronc commun, lu par les six sessions d'agent | |

## Ordre de lancement
1. **Phase 0 seule.** Ouvre une session (worktree) avec :
   > Lis `design-plans/agent-depth/phase-0.md` et exécute-le jusqu'au bout.
2. Attends que sa PR soit mergée et le déploiement Pages vert.
3. **Les six en parallèle**, une session (worktree) par agent, avec :
   > Lis `design-plans/agent-depth/_common.md` puis `design-plans/agent-depth/<agent>.md` et
   > exécute-les jusqu'au bout.

## Ce qu'on te demande pendant le run
Chaque session corrige seule ses bugs listés, puis **te pitche chaque nouvelle feature** (problème,
ce que fait Agorapulse, version agentique, ce que verra le testeur, taille) et attend ta réponse :
Go · Go, plus simple · Later · Drop, ou ta propre version en texte libre. Rien n'est construit sans
ton Go. La Phase 0 ne pitche pas (plomberie sans changement visible).

## Vague 2 — features ancrées dans le marché
La vague 1 a porté la parité avec Agorapulse. La vague 2 vise ce que les outils agentiques du marché
font de mieux, en faisant mieux qu'eux.

| Fichier | Rôle |
|---|---|
| [`wave-2.md`](wave-2.md) | Prompt commun aux sept sessions : backlog de vague 2, pitch à cinq tests, confidentialité |
| [`market-ideas.md`](market-ideas.md) | Catalogue d'idées par agent + Trust, ce que l'humain valide / coupe, déjà refusé, anti-patterns |
| [`trust.md`](trust.md) | 7e session : shadow, test, trust metric, apprentissage, onboarding (port 5187) |

Le contexte interne (avis de l'équipe, direction produit, sources) vit **hors du repo**, dans un
fichier local lu par les sessions : le repo est public.

Lancement : sept sessions neuves en parallèle (worktree chacune), avec :
> Lis `design-plans/agent-depth/wave-2.md` et exécute-le pour <agent>
> (Trust : `wave-2.md` puis `trust.md`).

Chaque session pitche d'abord ses trois idées les plus fortes, chacune avec sa référence marché et
« notre carte », puis te demande si elle continue.

## Ce que tu relis après coup
- `design-plans/agent-depth/<agent>-backlog.md` : parité visée, ce qui est fait, ce qui est écarté.
- `design-plans/agent-depth/<agent>-log.md` : chaque choix produit pris seul, avec l'alternative.
- `design-plans/agent-depth/requests/` : ce que les agents se sont demandé entre eux.
- `docs/agent-depth/<agent>.html` : rapport final avant/après.
