# Iris — journal de décisions

`date · capacité · choisi · écarté · pourquoi`

- 25/11 · Source unique des chiffres · `src/features/insights/metrics.ts`, sélecteurs purs sur les données d'Iris · calculer tout de suite depuis les posts d'Atlas · c'est la feature « Données qui vivent », qui demande un pitch ; la correction F3 se limite à une seule fonction lue partout.
- 25/11 · Chute TikTok · −38 % contre une médiane de 2 970 vues (7 vidéos avant) · −80 % contre 9 000 · « 38 % » était déjà partout (Desk, rapport, Chat, exemple d'action) ; seul « 9 000 » contredisait le calcul.
- 25/11 · Best time · jours par réseau (Instagram ven., TikTok jeu., LinkedIn mar., Facebook mer., YouTube dim., X mar.), heures = celles d'Atlas · garder un seul créneau global · le filtre réseau doit changer la réponse ; Atlas reste maître de ses heures, demande ouverte pour qu'il lise `bestTime`.
- 25/11 · Moteur d'anomalies · règles évaluées au battement contre des « signaux » (valeur du jour vs niveau habituel, par métrique et réseau), dédoublonnage par clé `métrique:réseau` sur 7 jours · des séries quotidiennes complètes · suffisant pour qu'une règle créée par Sam se déclenche ou non selon les données ; les séries viendront avec « Données qui vivent ».
- 25/11 · Crans de « Raise anomalies » · Suggest = listée dans Insights + journal ; Draft = carte Desk avec l'option recommandée ; Act = Iris fait l'option recommandée (via `resolve`, Undo réel) · Act = carte sur le Desk (ancien texte) · Act doit faire l'action (grille Q2). Un boost n'est jamais recommandé : il reste à Sam. Textes `says` réécrits.
- 25/11 · ev-linkedin · événement `run` qui allume le signal ; ce sont les règles d'alerte d'Iris qui décident · carte forcée (`always`) · une règle désactivée doit être respectée ; si aucune règle ne couvre le pic, le journal le dit (pas de déclenchement muet au ⇧D).
- 25/11 · Règle « → Desk and Claire » · la carte part directement dans la file de Claire et n'est jamais exécutée seule · exécuter en Act puis prévenir Claire · le destinataire choisi par Sam est un garde-fou.
