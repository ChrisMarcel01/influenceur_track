# Lancer l'application en environnement réel

Ce guide vous accompagne pas à pas pour exécuter l'application avec vos propres APIs et des données d'influenceurs réelles. Chaque étape inclut le résultat attendu afin que vous puissiez valider immédiatement votre configuration.

---

## 1. Pré-requis
1. Installez [Node.js](https://nodejs.org/) en version **18** ou supérieure (la LTS 20 est recommandée).
2. Ouvrez un terminal et vérifiez l'installation :
   ```bash
   node -v
   npm -v
   ```
   ✅ **Résultat attendu :** deux numéros de version s'affichent (ex. `v20.x.x` et `10.x.x`).

---

## 2. Installer les dépendances
1. Placez-vous à la racine du projet.
2. Installez les bibliothèques JavaScript :
   ```bash
   npm install
   ```
   ✅ **Résultat attendu :** la commande se termine sans erreur avec un message du type « added XX packages ».

---

## 3. Configurer l'environnement
1. Copiez le modèle d'environnement :
   ```bash
   cp .env.example .env.local
   ```
   (PowerShell : `Copy-Item .env.example .env.local`)
   ✅ **Résultat attendu :** un fichier `.env.local` apparaît à la racine.
2. Ouvrez `.env.local` et renseignez les variables suivantes :

   | Variable | Rôle | Exemple |
   | --- | --- | --- |
   | `VITE_SOCIAL_API_URL` | URL de votre backend fédéré (`/api/social`) si vous en avez un. Laissez vide si vous utilisez des URLs par réseau. | `https://api.mondomaine.com/social` |
   | `VITE_SOCIAL_API_URL_<RÉSEAU>` | (Optionnel) URL dédiée pour un réseau (`INSTAGRAM`, `FACEBOOK`, `X`, `TIKTOK`, `YOUTUBE`). Utilisée directement par le frontend. | `https://api.mondomaine.com/instagram` |
   | `SOCIAL_PROXY_TARGET` | (Optionnel) URL principale que le serveur Node utilisera en production (`npm run start`). | `https://api.mondomaine.com/social` |
   | `SOCIAL_PROXY_TARGET_<RÉSEAU>` | (Optionnel) Proxy par réseau pour le serveur Node (`INSTAGRAM`, `FACEBOOK`, `X`, `TIKTOK`, `YOUTUBE`). | `https://api.mondomaine.com/facebook` |
   | `YOUTUBE_API_KEY` | Clé officielle YouTube Data API v3 (obligatoire pour les recherches YouTube). | `AIza...` |
   | `X_BEARER_TOKEN` | Jeton OAuth 2.0 pour l'API X/Twitter v1.1 `users/search`. | `AAAAAAAA...` |
   | `FB_APP_ID` / `FB_APP_SECRET` **ou** `FACEBOOK_ACCESS_TOKEN` | Identifiants nécessaires à la recherche de pages Facebook. | `123456789` / `xxxxxxxx` |
   | `INSTAGRAM_SESSION_ID` (ou `INSTAGRAM_COOKIE`) | Cookie de session Instagram valide pour interroger les profils publics. | `sessionid=...` |
   | `INSTAGRAM_USER_AGENT` (optionnel) | User-Agent personnalisé pour Instagram. | `Mozilla/5.0 ...` |

   ✅ **Résultat attendu :** toutes les variables requises pour vos réseaux sont renseignées sans espaces superflus.

3. Sauvegardez le fichier avant de poursuivre.

---

## 4. Lancer l'application en mode développement
1. Vérifiez que vos APIs live répondent (ex. `curl https://api.mondomaine.com/social/health`).
2. Démarrez Vite :
   ```bash
   npm run dev
   ```
3. Ouvrez le navigateur à l'adresse affichée (généralement `http://localhost:5173`).
   ✅ **Résultat attendu :** l'interface se charge et chaque recherche déclenche des appels vers vos endpoints live. En cas d'erreur, le message indique quel réseau doit être reconfiguré.

---

## 5. Tester la version production locale
1. Construisez l'application :
   ```bash
   npm run build
   ```
2. Lancez le serveur Node embarqué :
   ```bash
   npm run start
   ```
   Le serveur lit `.env.local`, sert le dossier `dist` et relaie `/api/social` vers les cibles configurées.
3. Accédez à `http://localhost:4173` dans votre navigateur.
   ✅ **Résultat attendu :** l'application rendue est identique à la version de développement, avec des données réelles pour chaque réseau correctement configuré.

---

## 6. Vérifications rapides
- **Recherche fédérée :** tapez au moins deux lettres et activez les filtres plateformes. Les résultats proviennent de YouTube, X ou Facebook selon les clés fournies.
- **Profils Instagram :** saisissez un `@handle` exact pour afficher la fiche détaillée et les métriques en direct.
- **Autres réseaux :** si un message « non configuré » apparaît, complétez la variable `SOCIAL_PROXY_TARGET_<RÉSEAU>` ou mettez en place votre propre service.

---

## 7. Préparer le déploiement
- Reproduisez les mêmes variables d'environnement sur votre plateforme d'hébergement (Vercel, Render, serveur maison, etc.).
- Exécutez `npm run build` pendant le déploiement puis lancez `npm run start` pour servir `dist` et proxyfier vos APIs.
- Vérifiez les logs du serveur : chaque cible configurée est listée. Sans proxy, seules les fonctionnalités Instagram directes restent actives.

En suivant ces étapes, l'application est prête pour des tests en environnement réel, connectée exclusivement à vos propres sources de données.
