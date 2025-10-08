# Créer ou brancher votre propre API sociale

Ce guide complète le README en vous accompagnant pas à pas dans la création d'un backend compatible avec l'application et dans sa connexion au frontend. Chaque étape inclut un résultat attendu pour confirmer que tout fonctionne.

---

## 1. Comprendre le contrat d'API attendu

Le frontend appelle toujours les endpoints suivants. Quel que soit votre langage, il suffit de respecter ces routes, leurs paramètres et les structures de réponse.

| Méthode & chemin | Paramètres | Réponse attendue | Résultat attendu |
| --- | --- | --- | --- |
| `GET /search/influencers` | `q` (requis) : texte recherché<br>`platform` (optionnel) : `instagram`, `facebook`, `x`, `tiktok`, `youtube`<br>`limit` (optionnel) | `{ "results": Influencer[] }` | ✅ Le JSON contient un tableau `results` avec au moins les champs `id`, `platform`, `handle`, `displayName`, `followers`, `engagementRate`. |
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
