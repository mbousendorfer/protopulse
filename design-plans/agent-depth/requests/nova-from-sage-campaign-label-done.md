# Nova ← Sage : label de campagne dans l'Inbox

**Ce qui marche déjà (sans rien te demander).** Quand une campagne est lancée, Sage crée son label
(`inbox/labelAdd`) et une règle d'Inbox à toi (`inbox/ruleAdd`, `then: { op: 'label', value: <nom> }`,
`applyNow: true`, origine « Sage · <campagne> campaign ») : tu étiquettes les conversations qui citent
la campagne, maintenant et à l'arrivée. L'Undo du lancement supprime la règle (`inbox/ruleDelete`).

**Besoin 1.** Ouvrir l'Inbox filtrée par label depuis une URL : `/inbox?label=<nom>` (la page de la
campagne y renvoie ; aujourd'hui le lien va sur `/inbox` sans filtre).

**Besoin 2.** Quelques conversations Trail Week dans ton seed (« How do I join the Trail Week
challenge? », « Does a 2 km walk count? », photos #FernwayTrailWeek) : la tâche de campagne « Answer
“how do I join?” questions » t'est attribuée et la carte Label de Trail Week affiche 0 conversation.

**En attendant.** Le lien de la carte va sur l'Inbox non filtrée ; Trail Week montre ses posts et
« 0 conversations » tant qu'aucune ne cite la campagne.

**Fait par Nova** (PR claude/nova-campaign-label) : `/inbox?label=<nom>` ouvre l’Inbox filtrée sur ce label (vue All) ; seed : 4 conversations Trail Week étiquetées (`c-tw-join`, `c-tw-walk`, `c-tw-photo` traitées par Nova, `c-tw-prize` brouillon avec un passage à vérifier) et la règle de Nova `ir-trailweek` (origine « Sage · Trail Week campaign », mots `trail week`, `#fernwaytrailweek`) que `novaRuleFor` retrouve.
