# InfluenceTrack – interface de suivi des influenceurs

Cette application React/TypeScript permet de rechercher des influenceurs, de lier leurs comptes sociaux et de visualiser leurs métriques clés.

## Prérequis
- Node.js 18+ (recommandé : 20)
- npm 9+

## ⚡️ Test rapide en local

1. **Installer les dépendances**

   ```bash
   npm install
   ```

2. **Créer votre fichier d'environnement** – Dupliquez `.env.example` en `.env.local` puis adaptez les valeurs :

   ```bash
   cp .env.example .env.local
   # éditez ensuite .env.local pour pointer vers votre backend
   ```

   Par défaut, `VITE_SOCIAL_API_URL` est configurée sur `http://localhost:3031` (le proxy live). Remplacez-la par l'URL de votre backend si nécessaire.

3. **Démarrer votre backend** – Assurez-vous que l'API répond bien depuis votre machine (ex. `http://localhost:4000`).

4. **Lancer le frontend**

   ```bash
   npm run dev
   ```

   Ouvrez ensuite [http://localhost:5173](http://localhost:5173) dans votre navigateur. Si l'API ne répond pas, la console affichera l'erreur détaillée ; tant que vous n'avez pas remis `VITE_ALLOW_MOCK_FALLBACK=true`, aucune donnée mock ne masquera le problème.

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
# macOS / Linux
VITE_SOCIAL_API_URL=http://localhost:3031 npm run dev

# Windows (PowerShell)
$env:VITE_SOCIAL_API_URL="http://localhost:3031"; npm run dev

# Windows (Invite de commandes)
set "VITE_SOCIAL_API_URL=http://localhost:3031" && npm run dev
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
# macOS / Linux
VITE_SOCIAL_API_URL=http://localhost:3030 npm run dev

# Windows (PowerShell)
$env:VITE_SOCIAL_API_URL="http://localhost:3030"; npm run dev

# Windows (Invite de commandes)
set "VITE_SOCIAL_API_URL=http://localhost:3030" && npm run dev
```

### 3. Avec votre propre backend

Pour brancher l'interface sur une API que vous contrôlez :

1. **Exposer les routes attendues** – Le frontend consomme les endpoints suivants sur `VITE_SOCIAL_API_URL` :
   - `GET /search/influencers?q=<terme>&platform=<optionnel>&limit=<optionnel>`
   - `GET /influencers/profile?platform=<plateforme>&handle=<@pseudo>`
   - `GET /platforms/{platform}/posts?handle=<@pseudo>&limit=<optionnel>`
   - `GET /platforms/{platform}/followers?handle=<@pseudo>&weeks=<optionnel>`
   - `GET /platforms/{platform}/engagement?handle=<@pseudo>`
   - `GET /platforms/{platform}/metrics?handle=<@pseudo>`
   Chaque route doit retourner du JSON structuré comme dans `src/api/*.ts`. Inspirez-vous des données présentes dans `src/data/mockSocialData.json` pour les champs attendus (identifiants, followers, posts, etc.).
2. **Autoriser le CORS** – Lorsque vous développez en local, ajoutez `http://localhost:5173` (ou le domaine de votre déploiement) dans la liste des origines autorisées de votre backend. Sans cela, la requête échoue avec `Failed to fetch`.
3. **Définir l'URL côté frontend** – Créez un fichier `.env.local` (vous pouvez partir du modèle `.env.example`) ou exportez les variables dans votre terminal :

   ```bash
   # .env.local (exemple)
   VITE_SOCIAL_API_URL=https://mon-backend.exemple.com
   VITE_ALLOW_MOCK_FALLBACK=false   # optionnel, force l'utilisation exclusive de votre backend
   ```

   Relancez ensuite Vite :

   ```bash
   npm run dev
   ```

   > Préférez `.env.local` pour éviter de retaper les variables à chaque session. Sous Windows PowerShell, utilisez `Set-Content -Path .env.local -Value "VITE_SOCIAL_API_URL=https://mon-backend.exemple.com``nVITE_ALLOW_MOCK_FALLBACK=false"`.
4. **Vérifier la connectivité** – Avant d'actualiser l'interface, testez votre backend avec `curl` ou un navigateur :

   ```bash
   curl -H "Origin: http://localhost:5173" "https://mon-backend.exemple.com/search/influencers?q=doe"
   ```

   Vous devez obtenir une réponse JSON (`{ "results": [...] }`). Si la requête échoue, inspectez les logs serveur, la configuration TLS et les en-têtes CORS.

#### Dépanner l'erreur « Failed to fetch »

Lorsque cette erreur s'affiche dans l'UI, suivez les points ci-dessous :

1. **Variable manquante** – Vérifiez avec `echo $VITE_SOCIAL_API_URL` (ou `Get-Item Env:VITE_SOCIAL_API_URL` sous PowerShell) que la variable est bien définie avant de lancer `npm run dev`.
2. **Mauvaise URL** – L'URL doit inclure le schéma (`http://` ou `https://`) et être accessible depuis le navigateur. Testez-la directement dans le navigateur ou via `curl`.
3. **Erreur TLS ou certificat auto-signé** – En développement, utilisez `http://` ou configurez votre navigateur pour accepter le certificat.
4. **CORS** – Si la console réseau affiche `CORS error`, ajoutez l'origine du frontend dans les en-têtes `Access-Control-Allow-Origin` et autorisez les méthodes `GET`/`OPTIONS`.
5. **Fallback mock** – Dès qu'une URL personnalisée est fournie dans `VITE_SOCIAL_API_URL`, l'application désactive automatiquement les données mockées afin que vous puissiez tester votre backend sans effet de masque. Si vous souhaitez tout de même garder une solution de repli, définissez `VITE_ALLOW_MOCK_FALLBACK=true` dans `.env.local` puis redémarrez Vite.

## Scripts utiles
- `npm run dev` : démarre Vite (penser à définir `VITE_SOCIAL_API_URL` si besoin)
- `npm run live:api` : démarre le proxy qui interroge les réseaux sociaux en direct
- `npm run mock:api` : lance l'API mock basée sur `src/data/mockSocialData.json`
- `npm run build` : compile l'application pour la production
- `npm run preview` : prévisualise le build de production
- `npm run lint` : exécute ESLint

## Fallback mock
Sans configuration particulière (`VITE_SOCIAL_API_URL` vide), l'application charge automatiquement les données de démonstration pour être utilisable immédiatement. Dès qu'une URL personnalisée est renseignée, le fallback est désactivé afin de faciliter les tests locaux de votre backend. Pour forcer explicitement un comportement donné :

- Activer les données mockées même avec un backend personnalisé : `VITE_ALLOW_MOCK_FALLBACK=true`
- Désactiver les données mockées dans tous les cas : `VITE_ALLOW_MOCK_FALLBACK=false`

```bash
VITE_ALLOW_MOCK_FALLBACK=false
```

Pour forcer le fallback mock tout en conservant une URL distante (par exemple en environnement de recette), définissez :

```bash
VITE_ALLOW_MOCK_FALLBACK=true
```

Les données de démonstration sont stockées dans `src/data/mockSocialData.json`.

## Tester en environnement réel

Pour valider l'application avec des données de production, suivez les étapes ci-dessous :

1. **Préparer les accès** – Collectez les identifiants listés dans le tableau ci-dessus et exportez-les dans votre shell (ou votre `.env.local`). Sans ces valeurs, les plateformes refuseront la plupart des appels live.
2. **Lancer le proxy social** – Exécutez `npm run live:api` pour démarrer `scripts/social-live-api.mjs`. Vérifiez dans la console que chaque connecteur démarre sans erreur 4xx/5xx.
3. **Démarrer l'interface** – Dans un second terminal, définissez `VITE_SOCIAL_API_URL` (voir exemples ci-dessus) puis lancez `npm run dev` afin de pointer l'UI vers le proxy live. Naviguez vers `http://localhost:5173` (par défaut) et recherchez un influenceur réel pour confirmer la récupération des métriques.
4. **Analyser les journaux** – Surveillez le terminal du proxy : vous y verrez les requêtes effectuées vers les réseaux sociaux ainsi que les éventuelles erreurs de permission ou de quota. Corrigez les identifiants si nécessaire.
5. **Désactiver le fallback mock** – Pour vous assurer que seules les données réelles sont utilisées, définissez `VITE_ALLOW_MOCK_FALLBACK=false` avant de relancer `npm run dev`.

Ces actions reproduisent les conditions de production tout en restant sur votre machine de développement. Une fois validées, vous pouvez déployer le proxy et l'interface sur votre infrastructure cible.

## Déploiement

### Publier sur Vercel pas à pas

1. **Préparer le projet**  
   Vérifiez que le dépôt Git contient bien le code à déployer et que le fichier `package.json` définit les scripts standards (`npm run build`, `npm run dev`, etc.). Commitez vos derniers changements puis poussez-les vers le dépôt distant (GitHub, GitLab, Bitbucket ou Vercel Git).
2. **Créer/relier le projet Vercel**  
   - _Depuis l'interface web_ : rendez-vous sur [vercel.com](https://vercel.com), cliquez sur **New Project** puis importez votre dépôt.  
   - _Via le CLI_ : installez l'outil avec `npm i -g vercel`, exécutez `vercel login` puis `vercel` à la racine du projet pour lier le répertoire courant à un projet Vercel.
3. **Configurer la construction**  
   Vercel détecte automatiquement Vite. Vérifiez néanmoins dans **Settings → Build & Development → Build Command** que la commande est `npm run build` et que le dossier de sortie est `dist`. Si vous utilisez le CLI, répondez `npm run build` à la question *"What is your Build Command?"* et `dist` pour *"Output Directory"* lors du premier déploiement.
4. **Définir les variables d'environnement**
   Dans **Settings → Environment Variables**, renseignez explicitement les couples **Key/Value** ci-dessous. Répétez l'opération pour les environnements **Production**, **Preview** et **Development** (les valeurs peuvent différer si vous disposez d'APIs de recette) :

   | Key | Exemple de valeur | À quoi cela correspond ? |
   | --- | ----------------- | ------------------------- |
   | `VITE_SOCIAL_API_URL` | `https://social-proxy.mondomaine.com` | URL publique de votre backend ou du proxy `npm run live:api`. Elle doit être accessible par le frontend déployé. |
   | `VITE_ALLOW_MOCK_FALLBACK` | `false` | Forcer l'interface à utiliser uniquement les données live. Passez la valeur à `true` si vous voulez autoriser le fallback sur les données mockées. |
   | `INSTAGRAM_SESSION_ID` | `sessionid=...` | Cookie `sessionid` d'une session Instagram valide, utilisé par le proxy pour requêter l'API web. |
   | `FACEBOOK_ACCESS_TOKEN` | `EAABsbCS1iHgBA...` | Jeton d'accès Graph API (Page/App) avec les scopes nécessaires pour récupérer les métriques d'influenceurs. |
   | `YOUTUBE_API_KEY` | `AIzaSyC-...` | Clé API YouTube Data v3 autorisant la lecture des statistiques publiques. |
   | `TWITTER_BEARER_TOKEN` *(optionnel)* | `AAAAAAAA...` | Jeton Bearer de l'API X (Twitter). Permet de récupérer les tweets récents ; sans lui seules les métadonnées publiques sont disponibles. |

   > Que faire dans la fenêtre « Add Environment Variable » ?
   > 1. Choisissez l'environnement concerné (**Production**, **Preview** ou **Development**) et, si besoin, ciblez une branche spécifique via **Select a custom Preview branch**.
   > 2. Saisissez la valeur de la colonne **Key** dans le champ **Key** (ex. `VITE_SOCIAL_API_URL`).
   > 3. Renseignez la valeur correspondant à votre infrastructure dans le champ **Value** (ex. `https://social-proxy.mondomaine.com`).
   > 4. Cliquez sur **Save**. Répétez jusqu'à ce que toutes les variables listées plus haut soient ajoutées.
5. **Lancer le déploiement**  
   - _Via Git_ : chaque `git push` sur la branche principale déclenche un déploiement de production ; les autres branches génèrent des aperçus (Preview).  
   - _Via CLI_ : exécutez `vercel --prod` pour déployer la branche courante en production, ou simplement `vercel` pour créer un aperçu.
6. **Vérifier le résultat**  
   Une fois le build terminé, ouvrez l'URL fournie par Vercel. Testez les flux critiques (recherche d'influenceurs, affichage des métriques) et contrôlez la console navigateur pour détecter d'éventuelles erreurs CORS ou d'URL.

> 💡 Le proxy social (`npm run live:api`) n'est pas déployé automatiquement sur Vercel. Hébergez-le sur une plateforme compatible Node (Vercel functions, Fly.io, Railway, etc.) ou sur votre infrastructure. Pointez ensuite `VITE_SOCIAL_API_URL` vers cette instance publique.

### Autres plateformes

1. Construire le bundle : `npm run build`
2. Déployer le dossier `dist` sur la plateforme de votre choix (Netlify, Cloudflare Pages, etc.)
3. Configurer la variable d'environnement `VITE_SOCIAL_API_URL` vers votre API publique si vous souhaitez utiliser des données temps réel.

## Prochaines étapes suggérées

Pour aller au-delà de l'intégration de base, voici l'ordre recommandé :

1. **Vérifier les identifiants live** – Testez chaque connecteur via `npm run live:api` en ciblant un handle réel par plateforme pour confirmer que vos tokens/clé API sont valides (erreurs 4xx sont souvent liées aux permissions ou à des scopes manquants).
2. **Activer la persistance** – Une fois les données récupérées correctement, ajoutez un stockage (base de données ou cache) côté backend pour historiser les métriques et éviter de solliciter inutilement les APIs sociales à chaque chargement.
3. **Brancher l'interface sur votre backend** – Déployez votre passerelle sociale, exposez les mêmes routes que celles attendues par `src/api` puis pointez `VITE_SOCIAL_API_URL` vers cette URL.
4. **Surveiller et journaliser** – Ajoutez de la télémétrie (logs structurés, traces) dans `scripts/social-live-api.mjs` ou votre implémentation pour faciliter le diagnostic en production.
5. **Durcir la sécurité** – Lorsque vous hébergez le proxy, sécurisez l'accès (authentification, quotas) et stockez les secrets dans un coffre-fort ou un service de gestion de secrets.

Ces étapes garantissent une transition progressive d'une maquette alimentée par des données mockées vers une exploitation fiable des données sociales réelles.

## Annexes Git

### Fusionner une branche de fonctionnalité dans `main`

1. **Mettre `main` à jour**
   ```bash
   git checkout main
   git pull --ff-only
   ```
   Cette étape garantit que votre branche principale reflète bien l'état du dépôt distant avant toute fusion.

2. **Préparer la branche à fusionner**
   ```bash
   git checkout ma-branche
   git merge main        # ou git rebase main
   ```
   Résolvez les conflits éventuels, exécutez les tests puis commitez les corrections. L'objectif est de vous assurer que la branche est compatible avec la dernière version de `main` avant de l'y intégrer.

3. **Fusionner dans `main`**
   ```bash
   git checkout main
   git merge ma-branche
   ```
   Git créera un commit de fusion si nécessaire. Vérifiez le résultat (tests, lint, build) pour confirmer que l'intégration est saine.

4. **Pousser la branche principale mise à jour**
   ```bash
   git push origin main
   ```
   Pensez à supprimer la branche locale/distante devenue obsolète si la fonctionnalité est terminée : `git branch -d ma-branche` puis `git push origin --delete ma-branche`.

> 💡 Astuce : utilisez `git switch` à la place de `git checkout` si vous préférez la syntaxe moderne (`git switch main`, `git switch ma-branche`).

