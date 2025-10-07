# Comment lancer l'application

Ce guide décrit chaque action à réaliser pour tester l'application avec les données de démonstration fournies. Même si vous n'avez jamais utilisé Node.js ou Vite, suivez simplement les étapes dans l'ordre indiqué.

## 1. Installer les outils nécessaires
- [Node.js](https://nodejs.org/) version 18 ou supérieure (20 recommandé).
- npm 9 ou supérieur (livré avec Node.js).

Vous pouvez vérifier vos versions avec :
```bash
node -v
npm -v
```

## 2. Récupérer les dépendances du projet
Dans un terminal ouvert à la racine du projet :
```bash
npm install
```
Cette commande télécharge tout ce dont l'application a besoin.

## 3. Préparer la configuration
1. Copiez le fichier d'exemple :
   ```bash
   cp .env.example .env.local
   ```
2. Ouvrez `.env.local` dans un éditeur de texte et vérifiez que ces deux lignes sont présentes :
   ```ini
   VITE_SOCIAL_API_URL=http://localhost:3030
   VITE_ALLOW_MOCK_FALLBACK=true
   ```
   > Ces valeurs pointent vers l'API de démonstration et réactivent automatiquement les données mock si votre backend n'est pas disponible.

## 4. Lancer l'API de démonstration (nouveau terminal)
1. Ouvrez un **deuxième terminal** à la racine du projet.
2. Démarrez l'API mock :
   ```bash
   npm run mock:api
   ```
   Vous devez voir un message indiquant que le serveur écoute sur `http://localhost:3030`. **Laissez ce terminal ouvert** pendant toute la durée de vos tests.

## 5. Lancer le frontend Vite (premier terminal)
Dans le **premier terminal**, exécutez :
```bash
npm run dev
```
Vite affiche alors une URL du type `http://localhost:5173/`.

## 6. Ouvrir l'application
Dans votre navigateur, saisissez `http://localhost:5173`. Effectuez une recherche : les résultats proviennent de l'API de démonstration. Si vous ne voyez rien, vérifiez que l'API mock du point 4 fonctionne toujours.

---

## Aller plus loin
- **Utiliser votre propre backend** : modifiez `VITE_SOCIAL_API_URL` dans `.env.local` pour qu'il pointe vers votre API et, si besoin, remettez `VITE_ALLOW_MOCK_FALLBACK=false` pour désactiver les données de secours.
- **Connecter chaque réseau à un service dédié** :
  1. Dans `.env.local`, ajoutez les couples `VITE_SOCIAL_API_URL_<RÉSEAU>` (ex. `VITE_SOCIAL_API_URL_INSTAGRAM=https://mon-api.example/instagram`). La barre de recherche et les graphiques utiliseront automatiquement l'URL correspondant au réseau sélectionné (Instagram, Facebook, X, TikTok, YouTube).
  2. En production (`npm run start`), vous pouvez router chaque réseau vers une cible différente via `SOCIAL_PROXY_TARGET_<RÉSEAU>` dans `.env.local`. Le serveur Node relayera alors `/api/social/...` vers les URLs configurées, réseau par réseau.
  3. Si aucune URL n'est fournie pour un réseau, l'application retombera sur `VITE_SOCIAL_API_URL` (ou sur les données de démonstration si le fallback est actif).
- **Tester le proxy live** : remplissez les jetons requis dans `.env.local`, lancez `npm run live:api` dans un terminal dédié (au lieu de `npm run mock:api`), puis suivez les étapes 5 et 6.
- **Construire la version prête au déploiement** :
  ```bash
  npm run build
  npm run start
  ```
  Le serveur de production écoute sur `http://localhost:4173` et peut relayer les requêtes `/api/social` vers un backend défini par `SOCIAL_PROXY_TARGET` dans `.env.local`.
