# GreenMind — CLAC, économie circulaire en Tunisie

Plateforme qui relie **vendeurs**, **acheteurs** et **points de collecte** de matières valorisables
(grignons, huiles usagées, carton, plastiques, métaux…), avec Market social, demandes d’achat,
échanges (troc), carte interactive, messagerie et notifications en temps réel.

| Dossier | Stack |
|---|---|
| [`backend/`](backend/) | Node.js 20, Express 4, PostgreSQL 16 + PostGIS, Socket.IO |
| [`front/`](front/) | React 18, Vite, MUI (Minimal UI), Leaflet, Socket.IO client |

## Démarrage

```bash
# 1) Base de données : PostgreSQL 16 + PostGIS, base "tunisia_circular"
# 2) Backend
cd backend
cp .env.example .env      # renseigner DB_PASSWORD, JWT_SECRET…
npm install
npm run migrate
npm run seed              # données de démo (efface les données métier !)
npm run dev               # http://localhost:5001

# 3) Front
cd ../front
cp .env.example .env
npm install
npm run dev               # http://localhost:3031
```

Comptes de démo (après `npm run seed`) : `huilerie.zitouna@clac.tn`, `achats@biodiesel-sahel.tn`,
`collecte.sfax@clac.tn` — mot de passe `Clac2026!` ; admin `admin@clac.tn` / `Admin2026!`.

Documentation de l’API : [`backend/API_ROUTES.md`](backend/API_ROUTES.md).
