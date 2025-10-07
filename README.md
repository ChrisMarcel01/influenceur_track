# Comment lancer l'application

## Prérequis
- Node.js 18 ou plus (20 recommandé)
- npm 9 ou plus

## Étapes
1. **Installer les dépendances**
   ```bash
   npm install
   ```
2. **Préparer la configuration**
   ```bash
   cp .env.example .env.local
   # éditez ensuite .env.local si vous souhaitez pointer vers un autre backend
   ```
3. **Choisir la source de données**
   - **API mock fournie**
     ```bash
     npm run mock:api
     # garantit que VITE_SOCIAL_API_URL=http://localhost:3030 dans .env.local
     ```
   - **Proxy live fourni**
     ```bash
     # remplissez d'abord INSTAGRAM_SESSION_ID, FACEBOOK_ACCESS_TOKEN, YOUTUBE_API_KEY, etc. dans .env.local
     npm run live:api
     # laissez VITE_SOCIAL_API_URL=http://localhost:3031
     ```
   - **Backend personnel**
     ```bash
     # remplacez VITE_SOCIAL_API_URL par l'URL de votre backend dans .env.local
     # assurez-vous que le backend autorise http://localhost:5173 en CORS
     ```
4. **Lancer le frontend**
   ```bash
   npm run dev
   ```
5. **Ouvrir l'application**
   Visitez [http://localhost:5173](http://localhost:5173) dans votre navigateur.

> Relancez `npm run dev` à chaque fois que vous modifiez `.env.local` ou changez de source de données.
