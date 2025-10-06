Offline build (single HTML)

1) Install deps:
   npm i

2) Build single-file HTML:
   npm run build:offline

3) Send to client:
   dist/index.html (open by double-click, works without Internet)

Notes:
- vite-plugin-singlefile@^2.3.0 is used.
- vite.config.ts has base: "./" and includes viteSingleFile() with large assetsInlineLimit.
- If TypeScript complains about Node types: npm i -D @types/node
