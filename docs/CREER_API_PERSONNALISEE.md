# Créer ou brancher votre propre API sociale

Ce guide complète le README en vous accompagnant pas à pas dans la création d'un backend compatible avec l'application et dans sa connexion au frontend. Chaque étape inclut un résultat attendu pour confirmer que tout fonctionne.

---

## 1. Comprendre le contrat d'API attendu

Le frontend appelle toujours les endpoints suivants. Quel que soit votre langage, il suffit de respecter ces routes, leurs paramètres et les structures de réponse.

> ⚠️ **Nouveau — recherche fédérée :** la barre de recherche interroge désormais un endpoint unique `/api/search` qui retourne une liste normalisée pour chaque réseau (nom, handle, avatar, URL de profil, followers). Si vous exposez vos propres services, veillez à renvoyer ce format.

| Méthode & chemin | Paramètres | Réponse attendue | Résultat attendu |
| --- | --- | --- | --- |
| `GET /api/search` | `q` (requis) : texte recherché<br>`platforms` (optionnel) : liste séparée par des virgules (`youtube,x,facebook`…)<br>`limit` (optionnel) | `{ "q": string, "platforms": string[], "results": FederatedResult[] }` où `FederatedResult` contient `id`, `platform`, `name`, `handle`, `avatar`, `profileUrl`, `followers`, `verified`, `note?` | ✅ Chaque réseau renvoie des suggestions cohérentes (nom + handle + avatar + compteur d'abonnés le cas échéant). |
| `GET /influencers/profile` | `platform` (requis)<br>`handle` (requis) | `InfluencerProfile` complet | ✅ Le JSON décrit un influenceur précis, notamment `accounts`, `summary`, `platforms`, `posts`. |
| `GET /platforms/:platform/posts` | `handle` (requis)<br>`limit` (optionnel) | `PostSummary[]` | ✅ Tableau de posts pour le réseau demandé. |
| `GET /platforms/:platform/metrics` | `handle` (requis) | `PlatformMetrics` | ✅ Objet contenant `followers`, `weeklyDelta`, `avgEngagement`, `posts7d`. |
| `GET /platforms/:platform/followers` | `handle` (requis)<br>`weeks` (optionnel) | `FollowersPoint[]` | ✅ Tableau ordonné des points d'historique (`period`, `followers`). |
| `GET /platforms/:platform/engagement` | `handle` (requis) | `Record<string, number>` | ✅ Objet associant chaque format de contenu à un pourcentage d'engagement. |

> ✨ Astuce : si vous créez d'autres endpoints, l'application les ignorera. Concentrez-vous sur ceux listés ci-dessus.

---

## 2. Construire une API minimaliste avec Node.js (exemple clé en main)

Ces étapes créent une API fonctionnelle en moins de 5 minutes. Vous pourrez ensuite remplacer les données d'exemple par vos propres sources (base de données, CRM, etc.).

### Étape 2.1 · Préparer un dossier indépendant
1. Dans un terminal, placez-vous dans le dossier parent de votre projet puis créez un nouveau dossier :
   ```bash
   mkdir -p custom-social-api
   cd custom-social-api
   ```
2. Initialisez un projet Node minimal :
   ```bash
   npm init -y
   ```
   ✅ **Résultat attendu :** un fichier `package.json` apparaît dans `custom-social-api/`.

### Étape 2.2 · Installer les dépendances utiles
1. Installez Express (serveur HTTP) et CORS (autoriser les requêtes du navigateur) :
   ```bash
   npm install express cors
   ```
   ✅ **Résultat attendu :** la commande se termine sans erreur et crée un dossier `node_modules/`.

### Étape 2.3 · Créer le serveur
1. Toujours dans `custom-social-api/`, créez un fichier `server.mjs` avec le contenu suivant :
   ```js
   import express from "express";
   import cors from "cors";

   const app = express();
   const port = process.env.PORT || 4000;

   app.use(cors());
   app.use(express.json());

   // Données d'exemple à personnaliser
   const influencers = [
     {
       id: "amelia-dupont",
       platform: "instagram",
       handle: "@amelia.dupont",
       displayName: "Amelia Dupont",
       followers: 182000,
       engagementRate: 5.2,
       accounts: {
         instagram: { handle: "@amelia.dupont" },
       },
       summary: {
         growthSeries: [
           { period: "2024-W01", followers: 175000 },
           { period: "2024-W02", followers: 178000 },
           { period: "2024-W03", followers: 180500 },
           { period: "2024-W04", followers: 182000 },
         ],
         engagementByFormat: {
           "Photo": 4.8,
           "Vidéo": 5.6,
           "Story": 3.9,
         },
       },
       platforms: {
         instagram: {
           metrics: {
             followers: 182000,
             weeklyDelta: 1200,
             avgEngagement: 5.2,
             posts7d: 4,
           },
           posts: [
             {
               id: "insta-1",
               platform: "instagram",
               title: "Look du jour",
               likes: 15432,
               comments: 623,
               date: "2024-05-12",
               url: "https://instagram.com/p/insta-1",
             },
           ],
           followersSeries: [
             { period: "2024-W01", followers: 175000 },
             { period: "2024-W02", followers: 178000 },
             { period: "2024-W03", followers: 180500 },
             { period: "2024-W04", followers: 182000 },
           ],
           engagementByFormat: {
             "Photo": 4.8,
             "Vidéo": 5.6,
             "Story": 3.9,
           },
         },
       },
     },
   ];

   function findInfluencer(platform, handle) {
     const normalizedPlatform = platform?.toLowerCase();
     const normalizedHandle = handle?.replace(/^@+/, "").toLowerCase();
     return influencers.find((item) =>
       item.platform === normalizedPlatform && item.handle.replace(/^@+/, "").toLowerCase() === normalizedHandle
     );
   }

   app.get("/search/influencers", (req, res) => {
     const query = String(req.query.q || "").toLowerCase();
     const platform = String(req.query.platform || "").toLowerCase();
     const limit = Number(req.query.limit || 8);

     const results = influencers
       .filter((item) => {
         if (platform && item.platform !== platform) return false;
         if (!query) return true;
         return (
           item.displayName.toLowerCase().includes(query) ||
           item.handle.toLowerCase().includes(query) ||
           String(item.followers).includes(query)
         );
       })
       .slice(0, limit)
       .map(({ accounts, summary, platforms, ...rest }) => rest);

     res.json({ results });
   });

   app.get("/influencers/profile", (req, res) => {
     const { platform, handle } = req.query;
     const influencer = findInfluencer(platform, handle);
     if (!influencer) {
       res.status(404).json({ error: "Influenceur introuvable" });
       return;
     }

     res.json({
       displayName: influencer.displayName,
       accounts: influencer.accounts,
       summary: influencer.summary,
       platforms: influencer.platforms,
       posts: influencer.platforms.instagram.posts,
     });
   });

   app.get("/platforms/:platform/posts", (req, res) => {
     const influencer = findInfluencer(req.params.platform, req.query.handle);
     if (!influencer) {
       res.status(404).json({ error: "Aucun post" });
       return;
     }

     const limit = Number(req.query.limit || 50);
     const posts = influencer.platforms?.[req.params.platform]?.posts || [];
     res.json(posts.slice(0, limit));
   });

   app.get("/platforms/:platform/metrics", (req, res) => {
     const influencer = findInfluencer(req.params.platform, req.query.handle);
     const metrics = influencer?.platforms?.[req.params.platform]?.metrics;
     if (!metrics) {
       res.status(404).json({ error: "Métriques indisponibles" });
       return;
     }
     res.json(metrics);
   });

   app.get("/platforms/:platform/followers", (req, res) => {
     const influencer = findInfluencer(req.params.platform, req.query.handle);
     const series = influencer?.platforms?.[req.params.platform]?.followersSeries || [];
     const weeks = Number(req.query.weeks || series.length);
     res.json(series.slice(-weeks));
   });

   app.get("/platforms/:platform/engagement", (req, res) => {
     const influencer = findInfluencer(req.params.platform, req.query.handle);
     const engagement = influencer?.platforms?.[req.params.platform]?.engagementByFormat;
     if (!engagement) {
       res.status(404).json({ error: "Engagement indisponible" });
       return;
     }
     res.json(engagement);
   });

   app.listen(port, () => {
     console.log(`Custom social API ready on http://localhost:${port}`);
   });
   ```
   ✅ **Résultat attendu :** le fichier est enregistré sans erreur. Vous pouvez remplacer l'objet `influencers` par vos propres données.

### Étape 2.4 · Démarrer l'API
1. Dans le même dossier, lancez :
   ```bash
   node server.mjs
   ```
2. Le terminal doit afficher :
   ```
   Custom social API ready on http://localhost:4000
   ```
   ✅ **Résultat attendu :** le serveur reste actif et prêt à répondre.

---

## 3. Vérifier que l'API répond correctement

Exécutez ces commandes dans un autre terminal (laissez le serveur ouvert).

```bash
curl -s "http://localhost:4000/search/influencers?q=amelia" | jq
curl -s "http://localhost:4000/influencers/profile?platform=instagram&handle=@amelia.dupont" | jq
curl -s "http://localhost:4000/platforms/instagram/metrics?handle=@amelia.dupont" | jq
```

✅ **Résultat attendu :** chaque commande renvoie du JSON cohérent (pas d'erreur HTML ou 500). Adaptez les paramètres `handle` et `platform` à vos données réelles.

---

## 4. Brancher l'API au frontend

1. Ouvrez le fichier `.env.local` du projet frontend.
2. Remplacez la ligne générale :
   ```ini
   VITE_SOCIAL_API_URL=http://localhost:4000
   ```
3. Si vous avez plusieurs services (un par réseau), utilisez plutôt :
   ```ini
   VITE_SOCIAL_API_URL_INSTAGRAM=http://localhost:4000
   VITE_SOCIAL_API_URL_FACEBOOK=https://mon-backend.facebook.local
   # etc.
   ```
4. Redémarrez `npm run dev` (ou `npm run start` côté production).
5. Dans l'interface, effectuez une recherche : les résultats renvoyés proviennent désormais de votre backend.
   ✅ **Résultat attendu :** la barre de recherche affiche vos influenceurs, et les métriques correspondent à votre API.

---

## 5. Préparer le proxy de production (optionnel)

Si vous déployez le serveur Node fourni par ce dépôt (`npm run start`), ajoutez également :

```ini
SOCIAL_PROXY_TARGET=http://localhost:4000
```

Ou, pour des services séparés :

```ini
SOCIAL_PROXY_TARGET_INSTAGRAM=http://localhost:4000
SOCIAL_PROXY_TARGET_FACEBOOK=https://mon-backend.facebook.local
```

✅ **Résultat attendu :** lors d'un `npm run start`, le terminal affiche `Proxy target set to ...` et les recherches en production utilisent votre API.

---

En suivant ces étapes, vous disposez d'un backend personnalisable conforme aux attentes du frontend. Remplacez progressivement les données statiques par vos propres sources (base de données, API tierces, fichiers CSV, etc.) sans modifier le contrat d'API.

---

## 6. Construire des APIs dédiées par réseau

Si vous préférez séparer vos services (un backend par réseau social), vous pouvez partir du squelette précédent et conserver uniquement les données pertinentes pour chaque plateforme. Voici comment procéder et pourquoi chaque API est essentielle.

### 6.1 · Instagram — suivi de l'engagement visuel
1. **Copiez** `server.mjs` dans un nouveau dossier `api-instagram/` et ne laissez dans le tableau `influencers` que les profils Instagram.
2. **Exposez** uniquement les routes `GET /search/influencers`, `GET /influencers/profile` et `GET /platforms/instagram/*`.
3. **Mesurez** l'engagement par format (`Photo`, `Story`, `Reels`) dans `engagementByFormat` afin d'alimenter les graphes du frontend.
   ✅ **Résultat attendu :** une requête `curl http://localhost:4001/platforms/instagram/metrics?handle=@...` renvoie les métriques du compte.

> 💡 **Pourquoi c'est important ?** Instagram est souvent la source principale de campagnes influenceurs ; fournir des chiffres précis garantit que vos équipes marketing visualisent la croissance, le reach et l'engagement visuel directement dans l'app.

### 6.2 · Facebook — audiences et démographie
1. **Créez** un dossier `api-facebook/` et ajustez le port (par exemple `process.env.PORT || 4002`).
2. **Ajoutez** des champs spécifiques comme `pageId`, `audienceSplit` ou `paidReach` dans `platforms.facebook.metrics` si vous les collectez.
3. **Assurez-vous** que `followersSeries` couvre des périodes hebdomadaires pour alimenter le graphique d'historique.
   ✅ **Résultat attendu :** `curl http://localhost:4002/platforms/facebook/followers?handle=@...&weeks=8` retourne une série ordonnée.

> 💡 **Pourquoi c'est important ?** Facebook concentre souvent des audiences plus âgées ou localisées. En exposant ces métriques séparément, vous pouvez piloter vos campagnes multi-réseaux sans mélanger des indicateurs hétérogènes.

### 6.3 · X (Twitter) — temps réel et viralité
1. **Dupliquez** le squelette dans `api-x/` (port `4003`).
2. **Complétez** `posts` avec les champs adaptés (`retweets`, `quotes`, `likes`, `impressions`).
3. **Retournez** une série de métriques courte (7 à 14 jours) pour refléter la nature temps réel du réseau.
   ✅ **Résultat attendu :** `curl http://localhost:4003/platforms/x/posts?handle=@...&limit=5` fournit les derniers tweets structurés.

> 💡 **Pourquoi c'est important ?** L'application affiche les formats les plus performants pour X. Sans ces chiffres, vous ne pouvez pas détecter rapidement les publications virales ou les baisses d'engagement.

### 6.4 · TikTok — performances vidéo
1. **Isoler** l'API dans `api-tiktok/` (port `4004`) et stocker les KPI spécifiques (`avgWatchTime`, `shares`, `plays`).
2. **Adapter** `engagementByFormat` pour refléter vos catégories (par exemple `Live`, `Short`, `Collab`).
3. **Garder** des `posts` avec URL directe vers les vidéos pour que les équipes puissent vérifier les contenus.
   ✅ **Résultat attendu :** `curl http://localhost:4004/platforms/tiktok/engagement?handle=@...` renvoie les pourcentages par format.

> 💡 **Pourquoi c'est important ?** TikTok est piloté par la performance vidéo. Les données par format et les courbes de followers permettent de valider l'efficacité d'une stratégie de contenus courts.

### 6.5 · YouTube — profondeur analytique
1. **Créer** `api-youtube/` (port `4005`) et renseigner `platforms.youtube.metrics` avec `subscribers`, `avgViewDuration`, `videos30d`, etc.
2. **Structurer** `posts` pour inclure `title`, `views`, `likes`, `comments`, `publishedAt`, `thumbnail`.
3. **Fournir** `followersSeries` basée sur des périodes mensuelles ou hebdomadaires selon votre reporting.
   ✅ **Résultat attendu :** `curl http://localhost:4005/platforms/youtube/metrics?handle=@...` renvoie les KPI vidéo clés.

> 💡 **Pourquoi c'est important ?** YouTube offre des métriques longues traînes (watch time, fidélité). Les exposer clairement aide vos analystes à comparer la performance des vidéos longues face aux formats courts d'autres plateformes.

### 6.6 · Brancher les APIs multiples
1. **Renseignez** côté frontend :
   ```ini
   VITE_SOCIAL_API_URL_INSTAGRAM=http://localhost:4001
   VITE_SOCIAL_API_URL_FACEBOOK=http://localhost:4002
   VITE_SOCIAL_API_URL_X=http://localhost:4003
   VITE_SOCIAL_API_URL_TIKTOK=http://localhost:4004
   VITE_SOCIAL_API_URL_YOUTUBE=http://localhost:4005
   ```
2. **Configurez** le proxy de production (`server/.env`) avec les variables `SOCIAL_PROXY_TARGET_<RÉSEAU>` correspondantes.
3. **Relancez** `npm run dev` (ou `npm run start`) puis testez chaque moteur de recherche dans l'interface.
   ✅ **Résultat attendu :** la barre de recherche renvoie les profils spécifiques à la plateforme sélectionnée et les graphes affichent les données propres à chaque API.

> 💡 **Pourquoi c'est important ?** Segmenter les APIs par réseau simplifie la maintenance (déploiements indépendants, quotas adaptés) et vous permet d'activer/mettre en pause un canal sans impacter les autres. L'application détecte automatiquement la meilleure source via les variables d'environnement.
