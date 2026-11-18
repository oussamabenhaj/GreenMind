# Tunisia Circular — Backend v2

API REST + Socket.IO (Node.js 20+, Express 4, PostgreSQL 15 + PostGIS).
Documentation des routes pour le front : **[API_ROUTES.md](API_ROUTES.md)**.

## Démarrage

```bash
cp .env.example .env          # ajuster DB_* / JWT_SECRET / CORS_ORIGINS
npm install
npm run migrate               # crée le schéma (migrations/init.sql)
npm run seed                  # données de démo (efface les tables métier !)
npm run dev                   # http://localhost:5001  (REST /api + Socket.IO)
npm test
```

Avec Docker : `docker compose up --build` à la racine du dépôt.

> ⚠️ Le schéma v2 n'est pas compatible avec la v1 (rôles `generator/processor`, tables `waste_generators`, `processors`, `transactions`…).
> Repartir d'une base vide : `docker compose down -v` puis `docker compose up --build`.

## Structure

```
backend/
├── server.js                  # HTTP + Socket.IO
├── migrations/init.sql        # schéma complet (idempotent)
├── seeds/seed.js
└── src/
    ├── app.js                 # middlewares Express + /api
    ├── routes.js              # montage de tous les modules
    ├── config/                # env.js, db.js (pool pg + transaction())
    ├── middlewares/           # auth (JWT), validate (zod), errorHandler, rateLimit
    ├── socket/                # index.js (serveur, rooms, emit*), events.js (noms d'événements)
    ├── utils/                 # ApiError, QueryBuilder, pagination, schémas zod, géo, jwt
    └── modules/
        └── <service>/
            ├── <service>.routes.js      # routes + validation + rôles
            ├── <service>.controller.js  # HTTP in/out uniquement
            ├── <service>.service.js     # règles métier, droits, notifications
            └── <service>.model.js       # requêtes SQL
```

Modules : `auth`, `users`, `categories`, `markets`, `products`, `posts`, `discounts`, `requests`, `offers`,
`collection-points`, `storage`, `purchases`, `chat`, `notifications`, `reports`, `map`, `search`, `print`, `admin`.

## Notifications temps réel

`notifications.service.notify(userIds, { type, title, message, data, link })` enregistre la notification
en base puis l'envoie en direct (`notification:new` + `notification:unread_count`) dans la room `user:<id>`.
Les services métier l'appellent après chaque action (nouvelle demande, réponse, remise, offre publiée,
opération d'achat, alerte de stock, message à un utilisateur hors ligne…).

Pour plusieurs instances de l'API, ajouter l'adaptateur Redis de Socket.IO et remplacer le rate limiter mémoire.
