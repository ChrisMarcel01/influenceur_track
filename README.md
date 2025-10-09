# Guide complet pour utiliser l'application web

Ce document décrit **pas à pas** tout ce qu'il faut faire pour tester l'application en local, connecter vos propres API pour chaque réseau social, puis préparer un déploiement. Chaque étape est écrite pour qu'une personne débutante puisse la suivre sans connaissances techniques préalables.

---

## Partie A — Préparer l'environnement de travail

### Étape A1 · Installer les outils indispensables
1. Ouvrez votre navigateur et rendez-vous sur [https://nodejs.org](https://nodejs.org/).
2. Téléchargez la version **LTS** (long term support) de Node.js, au minimum la version 18 (la 20 est recommandée).
3. Lancez l'installateur téléchargé et suivez toutes les étapes par défaut. L'installateur installe aussi `npm`, le gestionnaire de paquets nécessaire.
4. Une fois l'installation terminée, ouvrez un terminal (PowerShell sur Windows, Terminal sur macOS/Linux) et tapez :
   ```bash
   node -v
   npm -v
   ```
   ✅ **Résultat attendu :** deux numéros de version s'affichent (ex. `v20.x.x` et `10.x.x`). Si une erreur apparaît, redémarrez votre ordinateur et réessayez.

### Étape A2 · Télécharger les dépendances du projet
1. Ouvrez un terminal et placez-vous dans le dossier du projet (utilisez `cd chemin/vers/le/dossier`).
2. Exécutez la commande suivante pour télécharger toutes les bibliothèques JavaScript dont l'application a besoin :
   ```bash
   npm install
   ```
3. Attendez la fin de la commande.
   ✅ **Résultat attendu :** la commande se termine sans erreur et affiche un résumé du type « added XXX packages ».

---

## Partie B — Configurer les variables d'environnement

### Étape B1 · Créer le fichier de configuration local
1. À la racine du projet, copiez le modèle fourni :
   ```bash
   cp .env.example .env.local
   ```
   > Sous Windows PowerShell, la commande équivalente est `Copy-Item .env.example .env.local`.
   ✅ **Résultat attendu :** un fichier `.env.local` apparaît à la racine du projet.

### Étape B2 · (Optionnel) Activer les données de démonstration
1. Ouvrez le fichier `.env.local` dans un éditeur de texte (Bloc-notes, VS Code, etc.).
2. Si vous souhaitez utiliser la base d'exemples fournie, ajoutez ou vérifiez les lignes suivantes :
   ```ini
   VITE_SOCIAL_API_URL=http://localhost:3030
   VITE_ALLOW_MOCK_FALLBACK=true
   ```
   Laissez `VITE_ALLOW_MOCK_FALLBACK` vide ou à `false` si vous voulez privilégier les données réelles.
3. Enregistrez le fichier.
   ✅ **Résultat attendu :** les variables reflètent votre choix : `true` pour activer le mock, `false` (ou vide) pour forcer les données live.

### Étape B3 · (Optionnel) Préparer vos propres API par réseau
Si vous disposez déjà de services distincts pour Instagram, Facebook, X (Twitter), TikTok ou YouTube, vous pouvez préparer leurs URL dès maintenant.

1. Dans `.env.local`, ajoutez ou modifiez les lignes suivantes en remplaçant `https://mon-api/...` par vos propres URL :
   ```ini
   VITE_SOCIAL_API_URL_INSTAGRAM=https://mon-api.example/instagram
   VITE_SOCIAL_API_URL_FACEBOOK=https://mon-api.example/facebook
   VITE_SOCIAL_API_URL_X=https://mon-api.example/twitter
   VITE_SOCIAL_API_URL_TIKTOK=https://mon-api.example/tiktok
   VITE_SOCIAL_API_URL_YOUTUBE=https://mon-api.example/youtube
   ```
2. Ne laissez aucun espace inutile. Si vous ne possédez pas de service pour un réseau, laissez la ligne vide (ex :`VITE_SOCIAL_API_URL_X=`).
3. Conservez `VITE_SOCIAL_API_URL` comme valeur de secours : le frontend l'utilise si un réseau n'a pas d'URL dédiée.
   ✅ **Résultat attendu :** chaque plateforme possède sa propre URL (ou une ligne vide), prête à être utilisée par le frontend.

### Étape B4 · Renseigner les clés officielles pour la recherche fédérée
1. Toujours dans `.env.local`, ajoutez les identifiants nécessaires aux API officielles fournies par YouTube, X et Facebook :
   ```ini
   YOUTUBE_API_KEY=cle-fournie-par-google
   X_BEARER_TOKEN=token-oauth2-fournit-par-x
   FB_APP_ID=identifiant-de-votre-app-facebook
   FB_APP_SECRET=secret-de-votre-app-facebook
   ```
   > Si vous disposez déjà d’un `FACEBOOK_ACCESS_TOKEN`, laissez-le : il sera utilisé si `FB_APP_ID`/`FB_APP_SECRET` sont absents.
2. Enregistrez le fichier après avoir collé vos clés.
   ✅ **Résultat attendu :** chaque variable sensible pointe vers une clé valide prête à être utilisée par le serveur (`/api/search`).

---

## Partie C — Lancer l'application en mode démonstration

Cette partie démarre les deux serveurs nécessaires : l'API de démonstration et le frontend Vite.

### Étape C1 · Démarrer l'API mock
1. Ouvrez un **premier terminal** à la racine du projet.
2. Tapez :
   ```bash
   npm run mock:api
   ```
3. Laissez ce terminal ouvert : il doit rester actif tant que vous testez l'application.
   ✅ **Résultat attendu :** le terminal affiche `Mock social API listening on http://localhost:3030` sans message d'erreur.

### Étape C2 · Lancer le serveur de développement Vite
1. Ouvrez un **deuxième terminal** (ou un nouvel onglet) toujours à la racine du projet.
2. Lancez le frontend :
   ```bash
   npm run dev
   ```
3. Lorsque Vite a fini de compiler, il affiche `Local: http://localhost:5173/`. Copiez cette adresse.
   ✅ **Résultat attendu :** Vite termine la compilation et montre une URL locale (généralement `http://localhost:5173/`) sans erreurs.

### Étape C3 · Vérifier l'interface
1. Ouvrez votre navigateur et rendez-vous sur `http://localhost:5173/`.
2. Activez ou désactivez les réseaux à interroger à l’aide des pastilles situées au-dessus du champ de recherche (YouTube, X, Facebook, etc.).
3. Dans la barre de recherche, tapez au moins **deux lettres** (par exemple « in »). Les suggestions d'influenceurs doivent apparaître immédiatement pour les réseaux sélectionnés.
4. Cliquez sur un résultat : la fiche détaillée s'affiche avec les indicateurs mock.
5. Si aucune donnée ne remonte, vérifiez que le terminal de l'étape C1 affiche toujours « listening » et qu'aucune erreur rouge n'est apparue.
   ✅ **Résultat attendu :** les suggestions s'affichent après deux lettres selon les réseaux activés, et la fiche détaillée d'un influenceur mock apparaît après le clic.

---

## Partie D — Brancher vos propres services

### Étape D1 · Remplacer l'API par défaut par votre backend unique
1. Ouvrez `.env.local`.
2. Remplacez `VITE_SOCIAL_API_URL` par l'URL de votre API (ex :`https://api.mondomaine.com/social`).
3. Pour empêcher tout retour aux données de démonstration, assurez-vous que `VITE_ALLOW_MOCK_FALLBACK` est laissé vide ou à `false` (valeur par défaut).
4. Redémarrez les serveurs (`Ctrl+C` dans chaque terminal, puis relancez les étapes C1 et C2) pour prendre en compte les nouveaux réglages.
   ✅ **Résultat attendu :** le frontend interroge désormais votre API principale ; les suggestions reflètent vos données si l'endpoint répond correctement.
   > ℹ️ **Sans backend personnalisé** : si vous construisez puis lancez `npm run start` sans configurer de proxy, le serveur Node intégré interroge automatiquement Instagram (recherche et fiches publiques) pour fournir des données réelles.

### Étape D2 · Configurer une URL par réseau
1. Dans `.env.local`, remplissez les variables `VITE_SOCIAL_API_URL_<RÉSEAU>` créées à l'étape B3 avec les URL réelles de vos services.
2. Exemple complet :
   ```ini
   VITE_SOCIAL_API_URL_INSTAGRAM=https://api.mondomaine.com/instagram
   VITE_SOCIAL_API_URL_FACEBOOK=https://api.mondomaine.com/facebook
   VITE_SOCIAL_API_URL_X=https://api.mondomaine.com/twitter
   VITE_SOCIAL_API_URL_TIKTOK=https://api.mondomaine.com/tiktok
   VITE_SOCIAL_API_URL_YOUTUBE=https://api.mondomaine.com/youtube
   ```
3. Redémarrez `npm run dev`. Le frontend choisira automatiquement l'URL correspondant au réseau que vous interrogez.
   ✅ **Résultat attendu :** chaque réseau interroge le bon service et renvoie vos données réelles lors des recherches.

### Étape D3 · Préparer la couche proxy pour le déploiement
1. Les variables `SOCIAL_PROXY_TARGET_<RÉSEAU>` sont lues par le serveur Node utilisé en production (`npm run start`). Elles doivent être définies dans **le même fichier `.env.local`** que les autres clés.
2. Ajoutez, si nécessaire :
   ```ini
   SOCIAL_PROXY_TARGET_INSTAGRAM=https://api.mondomaine.com/instagram
   SOCIAL_PROXY_TARGET_FACEBOOK=https://api.mondomaine.com/facebook
   SOCIAL_PROXY_TARGET_X=https://api.mondomaine.com/twitter
   SOCIAL_PROXY_TARGET_TIKTOK=https://api.mondomaine.com/tiktok
   SOCIAL_PROXY_TARGET_YOUTUBE=https://api.mondomaine.com/youtube
   ```
3. Si vous avez une seule API pour tous les réseaux, laissez simplement `SOCIAL_PROXY_TARGET=https://api.unique.com/social` sans renseigner les variables spécifiques.
   ✅ **Résultat attendu :** les variables de proxy sont prêtes pour que le serveur de production redirige correctement chaque réseau.

### Étape D4 · Tester vos API
1. Pour chaque URL que vous avez configurée, testez la réponse avec `curl` (ou votre navigateur) avant de relancer l'application :
   ```bash
   curl -i https://api.mondomaine.com/instagram/influencers?query=nom
   ```
2. Vérifiez que le code HTTP est `200` et qu'un JSON est renvoyé. Si une erreur apparaît, corrigez votre backend avant d'avancer.
   ✅ **Résultat attendu :** chaque requête `curl` répond avec un statut `200` et un corps JSON lisible.

---

## Partie E — Construire et servir la version prête au déploiement

### Étape E1 · Générer les fichiers de production
1. Arrêtez les serveurs de développement (`Ctrl+C`).
2. Lancez :
   ```bash
   npm run build
   ```
3. La commande doit afficher `✓ built in ...` et créer un dossier `dist/` contenant les fichiers optimisés.
   ✅ **Résultat attendu :** Vite termine avec un message `✓ built in ...` et un dossier `dist/` apparaît à la racine.

### Étape E2 · Démarrer le serveur Node de production
1. Dans le même terminal, exécutez :
   ```bash
   npm run start
   ```
2. Le serveur écoute sur `http://localhost:4173`. Il charge automatiquement `.env.local` et relaie les requêtes `/api/social` vers `SOCIAL_PROXY_TARGET` ou `SOCIAL_PROXY_TARGET_<RÉSEAU>`.
3. Ouvrez `http://localhost:4173` dans votre navigateur et vérifiez que les recherches fonctionnent comme attendu.
   ✅ **Résultat attendu :** la console affiche `Server ready on http://localhost:4173`, et la recherche fonctionne via l'interface servie par ce port.

### Étape E3 · Vérifier la configuration proxy
1. Depuis un autre terminal, vérifiez par exemple :
   ```bash
   curl -i http://localhost:4173/api/social/instagram/search?query=nom
   ```
2. Si la réponse est 200, le proxy est correctement configuré. En cas de 502 ou 404, revoyez les variables `SOCIAL_PROXY_TARGET_*`.
   ✅ **Résultat attendu :** la commande renvoie un statut `200` et un JSON cohérent, preuve que le proxy relaie bien les requêtes.

---

## Partie F — Conseils de déploiement

1. **Plateformes Node (Vercel, Render, Railway, etc.)** : déployez le contenu du dossier et assurez-vous que la commande de démarrage soit `npm run start`. Déclarez toutes les variables présentes dans `.env.local` sur l'interface de la plateforme (notamment `SOCIAL_PROXY_TARGET_<RÉSEAU>` si vous utilisez plusieurs services).
2. **Hébergement statique (Netlify, S3, etc.)** : construisez avec `npm run build` et déployez le dossier `dist/`. Dans ce cas vous devez exposer vous-même un backend accessible publiquement (ou un middleware) pour `/api/social`, car le proxy Node ne sera pas disponible.
3. **Tests post-déploiement** :
   - Ouvrez l'URL de production et testez une recherche sur chaque réseau.
   - Surveillez la console du navigateur (F12) pour détecter d'éventuelles erreurs CORS ou 404.

---

## Partie G — Dépannage rapide

| Symptôme | Diagnostic | Solution détaillée |
| --- | --- | --- |
| « Failed to fetch » lors d'une recherche | Le backend n'est pas accessible ou refuse la requête | Vérifiez que `npm run mock:api` est actif ou que vos URL `VITE_SOCIAL_API_URL_*` répondent en testant avec `curl`. Positionnez `VITE_ALLOW_MOCK_FALLBACK=true` uniquement si vous souhaitez basculer temporairement sur les données de démonstration. |
| Aucune suggestion n'apparaît | Moins de deux caractères saisis | Tapez au moins deux lettres. Vérifiez dans `.env.local` que les URL sont correctes et redémarrez `npm run dev`. |
| Erreur CORS dans la console | Votre API bloque les requêtes provenant du navigateur | Ajoutez `Access-Control-Allow-Origin: *` (ou votre domaine) côté backend, puis réessayez. |
| Les URL personnalisées ne sont pas prises en compte | Le serveur n'a pas été relancé après modification | Appuyez sur `Ctrl+C` dans les terminaux, relancez `npm run mock:api` puis `npm run dev` (ou `npm run start`) afin de recharger la configuration. |

---

## Partie H — Créer ou brancher votre propre API

Si vous avez besoin d'aller plus loin que l'API mock, consultez le guide détaillé [docs/CREER_API_PERSONNALISEE.md](docs/CREER_API_PERSONNALISEE.md). Vous y trouverez :

1. **Le contrat d'API complet** (endpoints, paramètres, réponses attendues).
   ✅ **Résultat attendu :** vous savez exactement quels champs renvoyer pour que le frontend fonctionne sans modification.
2. **Un exemple d'implémentation Node.js** prêt à copier/coller.
   ✅ **Résultat attendu :** `node server.mjs` affiche `Custom social API ready on http://localhost:4000` et répond aux requêtes.
3. **Des commandes de vérification (`curl`)** pour tester votre backend avant de le brancher.
   ✅ **Résultat attendu :** chaque appel renvoie un JSON valide (pas d'erreur 404/500).
4. **La procédure de connexion** au frontend et au proxy de production.
   ✅ **Résultat attendu :** la recherche dans l'interface récupère vos données réelles.

Ce document complète le README sans le surcharger et vous accompagne jusqu'à l'utilisation d'un backend professionnel.

En suivant chacune de ces étapes dans l'ordre, vous disposez d'un environnement complet prêt à être testé localement puis déployé avec vos propres services sociaux.
