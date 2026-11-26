# Trust ← Nova : une ligne sous le brouillon de réponse, sur le Desk

**Besoin.** Une réponse de Nova sur un message public peut maintenant avoir deux moitiés : une ligne publique
(« Thomas, we've sent you a DM. ») et un DM qui porte le reste (`Handoff.conv.dm`, champ de Nova). L'Inbox
montre les deux ; la carte Desk (`PreviewBlock`, branche `reply`, `src/features/desk/parts.tsx`) ne montre que
la ligne publique. N2 (product discovery) aura la même forme : réponse publique + DM avec le lien produit.

**Scénario de test.** ⇧D « legal threat in a public comment » → la carte Desk doit montrer ce qui partira en
public **et** en privé avant que Sam (ou Claire) approuve.

**Contrat proposé (extension, rien de renommé).**
- `src/app/agent-module.ts` : champ optionnel `replyExtra?: (h: Handoff) => ReactNode` sur `AgentModule`.
- `src/features/desk/parts.tsx`, branche `reply` de `PreviewBlock`, juste après le paragraphe du brouillon (hors
  mode édition) : `{registry().map(m => m.replyExtra?.(h))}`.
- Nova remplit `replyExtra` dans `src/features/inbox/agent.tsx` (« Then by DM » + le texte).

**En attendant.** Le « why » de la carte dit que le reste part en DM ; le DM est lisible dans l'Inbox
(conversation, « In public » / « Then by DM »). Aucun bouton mort.
