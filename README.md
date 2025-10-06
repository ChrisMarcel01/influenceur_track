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
### 1. Avec l'API de démonstration incluse
Une API mock est fournie pour tester l'interface sans backend externe.

```bash
npm run mock:api
```

Par défaut elle écoute sur `http://0.0.0.0:3030`. Dans un second terminal, démarrez l'interface :

```bash
VITE_SOCIAL_API_URL=http://localhost:3030 npm run dev
```

### 2. Avec votre propre backend
Exposez des endpoints compatibles avec ceux utilisés dans `src/api` puis définissez l'URL :

```bash
VITE_SOCIAL_API_URL=https://mon-backend.exemple.com npm run dev
```

Si la variable n'est pas définie ou que le service est indisponible, l'application basculera automatiquement sur le dataset de démonstration embarqué.

## Scripts utiles
- `npm run dev` : démarre Vite (penser à définir `VITE_SOCIAL_API_URL` si besoin)
- `npm run mock:api` : lance l'API mock basée sur `src/data/mockSocialData.json`
- `npm run build` : compile l'application pour la production
- `npm run preview` : prévisualise le build de production
- `npm run lint` : exécute ESLint

## Structure des données mock
Les données de démonstration se trouvent dans `src/data/mockSocialData.json`. Elles alimentent :
- Les résultats de recherche (handles, topics, métriques)
- Les profils détaillés (séries de croissance, posts récents, formats)

Vous pouvez enrichir ce fichier pour ajouter d'autres influenceurs ou plateformes.

## Déploiement
1. Construire le bundle : `npm run build`
2. Déployer le dossier `dist` sur la plateforme de votre choix (Netlify, Vercel, etc.)
3. Configurer la variable d'environnement `VITE_SOCIAL_API_URL` vers votre API publique si vous souhaitez utiliser des données temps réel.

