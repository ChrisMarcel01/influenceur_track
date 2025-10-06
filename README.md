# InfluenceTrack – interface de suivi des influenceurs

Cette application React/TypeScript permet de rechercher des influenceurs, de lier leurs comptes sociaux et de visualiser leurs métriques clés.

## Prérequis
- Node.js 18+ (recommandé : 20)
- npm 9+

## Installation
```bash
npm install
```

## Lancer l'application
### 1. Avec l'API "live" incluse (connexion directe aux réseaux)
Un serveur Node (`scripts/social-live-api.mjs`) interroge les API publiques/officielles de chaque plateforme.

```bash
# variables minimales à fournir (voir tableau ci-dessous)
export INSTAGRAM_SESSION_ID="..."
export FACEBOOK_ACCESS_TOKEN="..."
export YOUTUBE_API_KEY="..."
export TWITTER_BEARER_TOKEN="..."   # optionnel mais recommandé

npm run live:api
```

Par défaut le serveur écoute sur `http://0.0.0.0:3031`. Lancez ensuite l'interface :

```bash
VITE_SOCIAL_API_URL=http://localhost:3031 npm run dev
```

| Réseau     | Variables requises | Remarques |
|------------|--------------------|-----------|
| Instagram  | `INSTAGRAM_SESSION_ID` | Session Instagram valide (cookie `sessionid`) pour accéder à l'API web. |
| TikTok     | *(aucune)*         | Le connecteur utilise les endpoints web publics. |
| Facebook   | `FACEBOOK_ACCESS_TOKEN` | Jeton généré via le Graph API (Page ou App). |
| X (Twitter)| `TWITTER_BEARER_TOKEN` *(optionnel)* | Permet de récupérer les tweets récents. Sans jeton seules les méta-données publiques sont disponibles. |
| YouTube    | `YOUTUBE_API_KEY`  | Clé API YouTube Data v3. |

Vous pouvez compléter ces variables dans un fichier `.env.local` ou via votre outil d'orchestration.

### 2. Avec l'API mock
Si vous ne disposez pas encore des identifiants nécessaires, le serveur de démonstration reste disponible :

```bash
npm run mock:api
```

Il écoute sur `http://0.0.0.0:3030`. Démarrez l'interface dans un autre terminal :

```bash
VITE_SOCIAL_API_URL=http://localhost:3030 npm run dev
```

### 3. Avec votre propre backend
Exposez des endpoints compatibles avec ceux utilisés dans `src/api` puis définissez l'URL :

```bash
VITE_SOCIAL_API_URL=https://mon-backend.exemple.com npm run dev
```

## Scripts utiles
- `npm run dev` : démarre Vite (penser à définir `VITE_SOCIAL_API_URL` si besoin)
- `npm run live:api` : démarre le proxy qui interroge les réseaux sociaux en direct
- `npm run mock:api` : lance l'API mock basée sur `src/data/mockSocialData.json`
- `npm run build` : compile l'application pour la production
- `npm run preview` : prévisualise le build de production
- `npm run lint` : exécute ESLint

## Fallback mock
Si aucune URL d'API (`VITE_SOCIAL_API_URL`) n'est configurée, l'application utilise automatiquement le dataset embarqué pour rester exploitable immédiatement. Une fois un backend live branché, vous pouvez désactiver ce fallback en définissant explicitement `VITE_ALLOW_MOCK_FALLBACK=false`.

Pour forcer le fallback mock tout en conservant une URL distante (par exemple en environnement de recette), définissez :

```bash
VITE_ALLOW_MOCK_FALLBACK=true
```

Les données de démonstration sont stockées dans `src/data/mockSocialData.json`.

## Déploiement
1. Construire le bundle : `npm run build`
2. Déployer le dossier `dist` sur la plateforme de votre choix (Netlify, Vercel, etc.)
3. Configurer la variable d'environnement `VITE_SOCIAL_API_URL` vers votre API publique si vous souhaitez utiliser des données temps réel.

## Prochaines étapes suggérées

Pour aller au-delà de l'intégration de base, voici l'ordre recommandé :

1. **Vérifier les identifiants live** – Testez chaque connecteur via `npm run live:api` en ciblant un handle réel par plateforme pour confirmer que vos tokens/clé API sont valides (erreurs 4xx sont souvent liées aux permissions ou à des scopes manquants).
2. **Activer la persistance** – Une fois les données récupérées correctement, ajoutez un stockage (base de données ou cache) côté backend pour historiser les métriques et éviter de solliciter inutilement les APIs sociales à chaque chargement.
3. **Brancher l'interface sur votre backend** – Déployez votre passerelle sociale, exposez les mêmes routes que celles attendues par `src/api` puis pointez `VITE_SOCIAL_API_URL` vers cette URL.
4. **Surveiller et journaliser** – Ajoutez de la télémétrie (logs structurés, traces) dans `scripts/social-live-api.mjs` ou votre implémentation pour faciliter le diagnostic en production.
5. **Durcir la sécurité** – Lorsque vous hébergez le proxy, sécurisez l'accès (authentification, quotas) et stockez les secrets dans un coffre-fort ou un service de gestion de secrets.

Ces étapes garantissent une transition progressive d'une maquette alimentée par des données mockées vers une exploitation fiable des données sociales réelles.

