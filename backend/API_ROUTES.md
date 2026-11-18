# API Tunisia Circular — Guide d'intégration Front-end

> Version 2.0 · REST + Socket.IO (temps réel)
> Base URL (dev) : `http://localhost:5001` · Préfixe REST : `/api`

## Sommaire

1. [Conventions](#1-conventions)
2. [Authentification](#2-authentification)
3. [Temps réel — Socket.IO](#3-temps-réel--socketio)
4. [Routes REST par module](#4-routes-rest-par-module)
   - [Auth](#41-auth--apiauth) · [Utilisateurs](#42-utilisateurs--apiusers) · [Catégories & marchés](#43-catégories--marchés)
   - [Produits](#44-produits--apiproducts) · [Posts](#45-posts--apiposts) · [Remises](#46-remises--apidiscounts)
   - [Demandes d'achat](#47-demandes-dachat--apirequests) · [Offres](#48-offres--apioffers)
   - [Points de collecte](#49-points-de-collecte--apicollection-points) · [Stockage](#410-stockage--apicollection-pointspointidstorage)
   - [Opérations d'achat](#411-opérations-dachat--apipurchases) · [Messagerie](#412-messagerie--apiconversations)
   - [Notifications](#413-notifications--apinotifications) · [Rapports](#414-rapports--statistiques--apireports)
   - [Carte](#415-carte--apimap) · [Recherche & IA](#416-recherche--recherche-ia--apisearch) · [Impression](#417-impression--apiprint) · [Admin](#418-admin--apiadmin) · [Upload](#419-upload-dimages--apiuploads)
5. [Correspondance User Stories → Endpoints](#5-correspondance-user-stories--endpoints)
6. [Comptes de démo](#6-comptes-de-démo)

---

## 1. Conventions

### Rôles

| Rôle API | Acteur métier |
|---|---|
| `seller` | Vendeur |
| `buyer` | Acheteur |
| `collector` | Responsable d'un point de collecte |
| `admin` | Administrateur (accès à tout) |

Dans les tableaux ci-dessous, la colonne **Rôles** indique qui peut appeler la route. « Connecté » = n'importe quel utilisateur authentifié. `admin` passe toujours.

### Format des réponses

```jsonc
// Objet unique
{ "data": { ... } }

// Liste paginée
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 57, "total_pages": 3 }
}

// Erreur
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": [ { "field": "email", "message": "Email invalide" } ]
  }
}
```

### Codes HTTP

| Code | `error.code` | Quand |
|---|---|---|
| 200 / 201 | — | Succès / création |
| 204 | — | Succès sans contenu (suppression, logout…) |
| 400 | `BAD_REQUEST`, `BAD_JSON`, `INVALID_REFERENCE` | Requête incohérente, id référencé inexistant |
| 401 | `UNAUTHORIZED` | Token absent, invalide, expiré ou compte désactivé → rediriger vers login |
| 403 | `FORBIDDEN` | Rôle non autorisé / ressource d'un autre utilisateur |
| 404 | `NOT_FOUND` | Ressource ou route introuvable |
| 409 | `CONFLICT` | Doublon, transition de statut impossible, stock/capacité insuffisants |
| 422 | `VALIDATION_ERROR` | Body / query invalides (`details` liste les champs) |
| 429 | `TOO_MANY_REQUESTS` | Trop de tentatives login/register (20 / 15 min / IP) |

### Pagination & filtres

- Query `page` (défaut 1) et `limit` (défaut 20, max 100) sur toutes les listes paginées.
- **Filtre géographique** (partout où indiqué `geo`) : `lat`, `lng` (toujours ensemble) + `radius_km` optionnel. Quand `lat/lng` sont fournis, chaque élément contient `distance_km`.
- `gouvernorat` : une des 24 valeurs exactes : `Ariana, Beja, Ben Arous, Bizerte, Gabes, Gafsa, Jendouba, Kairouan, Kasserine, Kebili, Kef, Mahdia, Manouba, Medenine, Monastir, Nabeul, Sfax, Sidi Bouzid, Siliana, Sousse, Tataouine, Tozeur, Tunis, Zaghouan`.
- Coordonnées limitées à la Tunisie : `lat ∈ [30, 38.5]`, `lng ∈ [7, 12.5]`.
- Booléens en query : `true` / `false`.

### Types

- Identifiants : UUID, sauf `categories.id` et `markets.id` (entiers).
- Dates : ISO 8601 (`2026-11-18T09:30:00.000Z`). Champs « date seule » : `YYYY-MM-DD`.
- Montants en TND, quantités en nombres (pas de chaînes).
- `unit` ∈ `kg | t | l | unit`. Le stockage des points de collecte est toujours en **kg**.

---

## 2. Authentification

JWT valable 7 jours, renvoyé à la connexion / inscription.

Deux façons de l'envoyer (au choix) :

1. **Header** (recommandé SPA) : `Authorization: Bearer <token>`
2. **Cookie HttpOnly** `clac_session` posé automatiquement par `/login` et `/register` (penser à `credentials: 'include'` / `withCredentials: true`).

```js
// Exemple axios
const api = axios.create({ baseURL: 'http://localhost:5001/api' });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401) { /* logout + redirect /login */ }
  return Promise.reject(err);
});
```

---

## 3. Temps réel — Socket.IO

Le serveur Socket.IO tourne sur **la même URL que l'API** (pas de préfixe `/api`).

```bash
npm i socket.io-client
```

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001', {
  auth: { token },          // même JWT que l'API REST
  withCredentials: true,
});

socket.on('connect_error', (err) => console.warn('socket:', err.message)); // token invalide → re-login

// Badges
socket.on('notification:unread_count', ({ count }) => setNotifBadge(count));
socket.on('chat:unread_count', ({ count }) => setChatBadge(count));

// Nouvelle notification (toast + insertion en tête de liste)
socket.on('notification:new', (notification) => toast(notification.title));

// Chat
socket.on('message:new', (message) => appendMessage(message));
socket.emit('typing:start', { conversation_id }, (ack) => {});
socket.emit('conversation:read', { conversation_id });
```

À la connexion, le serveur envoie immédiatement `notification:unread_count` et `chat:unread_count`.

### Événements serveur → client

| Événement | Payload | Destinataires / déclencheur |
|---|---|---|
| `notification:new` | objet [Notification](#objet-notification) | L'utilisateur notifié (voir [types](#types-de-notification)) |
| `notification:unread_count` | `{ count }` | Après chaque nouvelle notification / lecture / suppression |
| `message:new` | objet Message + `sender_name` | Tous les participants de la conversation (y compris les autres onglets de l'expéditeur) |
| `chat:unread_count` | `{ count }` | Destinataire d'un message, ou après `conversation:read` |
| `conversation:read` | `{ conversation_id, user_id, read_at }` | L'autre participant (accusé de lecture « vu ») |
| `typing:start` / `typing:stop` | `{ conversation_id, user_id }` | L'autre participant |
| `presence:update` | `{ user_id, online, at }` | Les utilisateurs ayant une conversation avec lui |
| `request:new` | objet Demande | Vendeurs / points de collecte concernés par une nouvelle demande d'achat |
| `offer:published` | objet Offre | Tous les acheteurs connectés (rafraîchir le fil des offres) |
| `stock:updated` | `{ collection_point_id, stock_item_id, quantity_kg, used_kg }` | Responsable du point après chaque mouvement de stock |
| `purchase:updated` | objet Opération d'achat | Point de collecte + vendeur après un changement de statut |

### Événements client → serveur

| Événement | Payload | Ack (callback) |
|---|---|---|
| `typing:start` / `typing:stop` | `{ conversation_id }` | `{ ok: true }` ou `{ ok: false, error }` |
| `conversation:read` | `{ conversation_id }` | `{ ok: true }` — équivalent de `POST /api/conversations/:id/read` |
| `presence:get` | `{ user_ids: [uuid, ...] }` (max 200) | `{ "<uuid>": true/false, ... }` |

### Objet Notification

```json
{
  "id": "1d0c…",
  "user_id": "a3f2…",
  "type": "request.response",
  "title": "Nouvelle réponse à votre demande",
  "message": "Le Golfe SARL a répondu à « Recherche 500 L d'huile usagée »",
  "data": { "request_id": "…", "response_id": "…" },
  "link": "/requests/…",
  "is_read": false,
  "read_at": null,
  "created_at": "2026-11-18T09:30:00.000Z"
}
```

`link` est une route front suggérée ; `data` contient les ids utiles pour naviguer.

### Types de notification

| `type` | Destinataire | Déclencheur |
|---|---|---|
| `request.new` | Vendeurs / points de collecte de la catégorie (ou le destinataire ciblé) | Un acheteur crée une demande |
| `request.response` | Acheteur | Un vendeur / point de collecte répond à sa demande |
| `request.response_status` | Auteur de la réponse | L'acheteur accepte / refuse la proposition |
| `request.status` | Répondants actifs | La demande est clôturée / satisfaite / annulée / ré-ouverte |
| `message.new` | Destinataire **hors ligne** uniquement | Nouveau message (en ligne → seulement `message:new`) |
| `discount.new` | Acheteurs & points de collecte intéressés par la catégorie | Un vendeur crée une remise |
| `offer.published` | Acheteurs intéressés par la catégorie | Un point de collecte publie une offre |
| `purchase.new` | Vendeur | Un point de collecte crée une opération d'achat chez lui |
| `purchase.status` | L'autre partie | Opération confirmée / réceptionnée / annulée |
| `stock.alert` | Responsable du point | Stockage ≥ 90 % ou article sous son seuil |
| `account.verified` | Utilisateur | Un admin vérifie le compte |
| `collection_point.verified` | Responsable | Un admin valide le point de collecte |

> « Intéressé par la catégorie » = la catégorie figure dans `users.category_ids` (modifiable via `PATCH /api/users/me`). Pensez à proposer ce choix à l'inscription.

---

## 4. Routes REST par module

### 4.1 Auth — `/api/auth`

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| POST | `/register` | Public | Créer un compte vendeur / acheteur / point de collecte → `201 { data: { token, user } }` |
| POST | `/login` | Public | Connexion → `{ data: { token, user } }` |
| POST | `/logout` | Public | Supprime le cookie de session → `204` |
| GET | `/me` | Connecté | Profil privé de l'utilisateur courant |
| PATCH | `/password` | Connecté | `{ current_password, new_password }` → `204` |

**Body `/register`**

```json
{
  "email": "contact@huilerie.tn",
  "password": "min 8 caractères",
  "role": "seller",               // seller | buyer | collector
  "name": "Huilerie Sfax Nord",
  "company_name": "Sfax Olive Mills",   // optionnel
  "phone": "+216 97 000 000",           // optionnel
  "gouvernorat": "Sfax",
  "address": "Route de Tunis km 5",     // optionnel
  "lat": 34.76, "lng": 10.75,           // optionnel (sinon centre du gouvernorat)
  "category_ids": [1, 3]                // optionnel : catégories suivies
}
```

**Body `/login`** : `{ "email", "password" }`

**Objet User (privé)**

```json
{
  "id": "uuid", "role": "seller", "name": "…", "company_name": "…", "phone": "…", "bio": null,
  "avatar_url": null, "gouvernorat": "Sfax", "address": "…", "lat": 34.76, "lng": 10.75,
  "category_ids": [1], "is_verified": false, "created_at": "…",
  "email": "…", "is_active": true, "last_login_at": "…", "updated_at": "…"
}
```

### 4.2 Utilisateurs — `/api/users`

| Méthode | Route | Rôles | Description | US |
|---|---|---|---|---|
| GET | `/me` | Connecté | Mon profil complet | S12 |
| PATCH | `/me` | Connecté | Modifier : `name, company_name, phone, bio, avatar_url, gouvernorat, address, lat, lng, category_ids` | S12 |
| GET | `/sellers` | Connecté | Annuaire des vendeurs (+ `products_count`, `has_active_discount`) | B04 |
| GET | `/buyers` | seller, collector | Annuaire des acheteurs (+ `open_requests_count`) | S09 |
| GET | `/collectors` | Connecté | Annuaire des responsables de points de collecte | — |
| GET | `/:id` | Connecté | Profil public (+ `products_count`, `open_requests_count`, `collection_points_count`) | G07 |

Query des annuaires : `q`, `gouvernorat`, `category_id`, `verified`, `geo`, `sort` (`recent` · `name` · `distance`), `page`, `limit`.

### 4.3 Catégories & marchés

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| GET | `/api/categories` | **Public** | Liste (+ `products_count`) — alimente le filtre catégorie (G03) |
| GET | `/api/categories/:id` | Public | Détail |
| POST / PATCH / DELETE | `/api/categories[/:id]` | admin | `{ slug, name, description?, keywords? }` |
| GET | `/api/markets` | **Public** | Liste des marchés (+ `products_count`, `offers_count`) — filtre marché (G05) |
| GET | `/api/markets/:id` | Public | Détail |
| POST / PATCH / DELETE | `/api/markets[/:id]` | admin | `{ slug, name, description?, gouvernorat? }` |

### 4.4 Produits — `/api/products`

| Méthode | Route | Rôles | Description | US |
|---|---|---|---|---|
| GET | `/` | Connecté | Recherche + filtres (produits actifs et disponibles) | S05, B05, G02, G03, G05, G06 |
| GET | `/mine` | seller | Mes produits (actifs et inactifs ; filtre `is_active`) | — |
| GET | `/:id` | Connecté | Détail + `active_discounts[]` (incrémente `views_count`) | G07 |
| POST | `/` | seller | Créer un produit | S04 |
| PATCH | `/:id` | seller (propriétaire) | Modifier (champs partiels) | — |
| DELETE | `/:id` | seller (propriétaire) | Supprimer → `204` | — |

**Query `GET /`** : `q`, `category_id`, `market_id`, `seller_id`, `product_id`, `gouvernorat`, `min_price`, `max_price`, `min_quantity`, `has_discount`, `geo`, `sort` (`recent` · `price_asc` · `price_desc` · `quantity_desc` · `popular` · `distance`), `page`, `limit`.
`q` cherche dans titre / description / catégorie avec tolérance aux fautes (trigrammes).

**Body `POST /`**

```json
{
  "title": "Grignons d'olive frais",
  "description": "…",
  "category_id": 1,
  "market_id": 2,                 // optionnel
  "unit": "kg",                   // défaut kg
  "quantity_available": 25000,
  "price_per_unit": 0.12,         // optionnel
  "min_order_quantity": 1000,     // optionnel
  "images": ["https://…"],        // max 10 URLs
  "gouvernorat": "Sfax",
  "address": "…", "lat": 34.75, "lng": 10.75,   // optionnels
  "available_from": "2026-11-20", "available_until": "2027-02-01",
  "is_active": true
}
```

**Objet Produit**

```json
{
  "id": "uuid", "seller_id": "uuid", "category_id": 1, "market_id": 2,
  "title": "…", "description": "…", "unit": "kg", "quantity_available": 25000,
  "price_per_unit": 0.12, "min_order_quantity": 1000, "images": [],
  "gouvernorat": "Sfax", "address": null, "lat": 34.75, "lng": 10.75,
  "available_from": null, "available_until": "2027-02-01", "is_active": true, "views_count": 12,
  "created_at": "…", "updated_at": "…",
  "seller": { "id": "…", "name": "…", "company_name": "…", "gouvernorat": "…", "phone": "…", "avatar_url": null, "is_verified": true },
  "category_name": "Grignons d'olive", "category_slug": "olive-pomace", "market_name": "Marché national",
  "best_discount_percentage": 15,
  "final_price_per_unit": 0.102,
  "distance_km": null
}
```

### 4.5 Posts — `/api/posts`

| Méthode | Route | Rôles | Description | US |
|---|---|---|---|---|
| GET | `/` | Connecté | Fil d'actualité. Query : `author_id`, `product_id`, `category_id`, `gouvernorat`, `q`, `page`, `limit` | G07 |
| GET | `/mine` | Connecté | Mes posts | — |
| GET | `/:id` | Connecté | Détail | — |
| POST | `/` | seller, collector | `{ content, images?, product_id? }` (le produit doit m'appartenir) | S04 |
| PATCH | `/:id` | seller, collector (auteur) | Modifier | — |
| DELETE | `/:id` | Auteur ou admin | Supprimer | — |

Objet : `{ id, author_id, product_id, content, images, created_at, updated_at, author: {…}, product: { id, title, price_per_unit, unit, images } | null }`

### 4.6 Remises — `/api/discounts`

| Méthode | Route | Rôles | Description | US |
|---|---|---|---|---|
| GET | `/` | Connecté | Remises (par défaut **actives** uniquement) | B07 |
| GET | `/mine` | seller | Mes remises (tous états) | S10 |
| GET | `/:id` | Connecté | Détail | — |
| POST | `/` | seller | Créer une remise sur un de mes produits → notifie les acheteurs intéressés | S10 |
| PATCH | `/:id` | seller (propriétaire) | Modifier | S10 |
| DELETE | `/:id` | seller (propriétaire) | Supprimer | — |

Query : `state` (`active` défaut · `upcoming` · `expired` · `all`), `seller_id`, `product_id`, `category_id`, `market_id`, `gouvernorat`, `min_percentage`, `sort` (`recent` · `percentage` · `ending_soon`).

Body : `{ product_id, title, description?, percentage (0–100], min_quantity?, starts_at? (défaut maintenant), ends_at, is_active? }`

Objet : champs de la remise + `state` (`active|upcoming|expired|inactive`), `product {…}`, `discounted_price_per_unit`, `seller {…}`.

### 4.7 Demandes d'achat — `/api/requests`

| Méthode | Route | Rôles | Description | US |
|---|---|---|---|---|
| GET | `/` | Connecté | Demandes ouvertes (filtrables par **acheteur**) | G04 |
| GET | `/mine` | buyer | Mes demandes (tous statuts) | B03 |
| GET | `/received` | seller, collector | **Demandes reçues** : ciblées sur moi ou dans mes catégories (catégories suivies, de mes produits ou de mes points) | S07, PC04 |
| GET | `/:id` | Connecté | Détail + `responses[]` (toutes pour l'acheteur, seulement la mienne sinon) | G07 |
| POST | `/` | buyer | Envoyer une demande (besoins + quantité) → `request:new` + notification | B03 |
| PATCH | `/:id` | buyer (auteur) | Modifier (si `open` ou `in_progress`) | — |
| PATCH | `/:id/status` | buyer (auteur) | `{ status }` : `open · in_progress · fulfilled · closed · cancelled` | — |
| GET | `/:id/responses` | Connecté | Réponses visibles | — |
| POST | `/:id/responses` | seller, collector | Répondre (une seule réponse par acteur, sinon 409) | S07, PC04 |
| PATCH | `/:id/responses/:responseId` | buyer **ou** auteur de la réponse | Acheteur : `{ status: "accepted" \| "rejected" }`. Répondant : modifier ses champs ou `{ status: "withdrawn" }` | — |

**Query listes** : `q`, `status`, `category_id`, `market_id`, `buyer_id`, `product_id`, `gouvernorat`, `min_quantity`, `include_closed` (pour `/received`), `geo`, `sort` (`recent` · `needed_by` · `quantity_desc` · `distance`).

**Body `POST /`** — au moins un de `category_id`, `product_id`, `target_user_id` :

```json
{
  "title": "Recherche 500 L d'huile usagée / mois",
  "description": "Contrat annuel possible",
  "category_id": 2,
  "product_id": "uuid",            // optionnel : demande sur un produit précis (cible son vendeur)
  "target_user_id": "uuid",        // optionnel : demande adressée à un vendeur / point précis
  "market_id": 1,
  "quantity": 500, "unit": "l",
  "max_price_per_unit": 1.0,
  "gouvernorat": "Ariana", "lat": 36.86, "lng": 10.16,
  "needed_by": "2026-12-15"
}
```

**Body réponse** : `{ message?, product_id?, proposed_quantity?, proposed_price_per_unit? }`

Accepter une réponse passe la demande en `in_progress`. Objet Demande : champs + `buyer {…}`, `category_name`, `market_name`, `product_title`, `responses_count`, `my_response_status` (statut de ma réponse ou `null`), `distance_km`.

### 4.8 Offres — `/api/offers`

Offres préparées et publiées par les points de collecte.

| Méthode | Route | Rôles | Description | US |
|---|---|---|---|---|
| GET | `/` | Connecté | Offres publiées en cours **et** à venir | PC02, G05 |
| GET | `/upcoming` | Connecté | Offres **à venir** (`starts_at` futur), triées par date de début | S11 |
| GET | `/mine` | collector | Mes offres (brouillons inclus ; filtre `status`) | PC03 |
| GET | `/:id` | Connecté | Détail (brouillon visible seulement par son auteur) | G07 |
| POST | `/` | collector | Préparer une offre (brouillon). `"publish": true` pour publier directement | PC03 |
| PATCH | `/:id` | collector (auteur) | Modifier (sauf offre clôturée / annulée) | PC03 |
| POST | `/:id/publish` | collector (auteur) | Publier un brouillon → `offer:published` + notifications | PC03 |
| POST | `/:id/close` | collector (auteur) | Clôturer | — |
| POST | `/:id/cancel` | collector (auteur) | Annuler | — |
| DELETE | `/:id` | collector (auteur) | Supprimer | — |

Query : `q`, `timing` (`upcoming` · `ongoing` · `ended`), `status` (pour `/mine`), `category_id`, `market_id`, `gouvernorat`, `collection_point_id`, `publisher_id`, `min_quantity`, `max_price`, `geo`, `sort` (`recent` · `starts_at` · `price_asc` · `distance`).

**Body `POST /`**

```json
{
  "title": "Lot de grignons triés — 10 t",
  "description": "…",
  "collection_point_id": "uuid",    // position héritée du point si lat/lng absents
  "stock_item_id": "uuid",          // optionnel : contrôle que la quantité ≤ stock (kg)
  "category_id": 1, "market_id": 2,
  "quantity": 10000, "unit": "kg",
  "price_per_unit": 0.16,
  "starts_at": "2026-11-25T08:00:00Z",   // défaut maintenant
  "ends_at": "2026-12-25T18:00:00Z",     // optionnel
  "publish": false
}
```

Objet : champs + `timing` (`draft|closed|cancelled` ou `upcoming|ongoing|ended` si publiée), `publisher {…}`, `collection_point { id, name, address, gouvernorat }`, `category_name`, `market_name`, `distance_km`.

### 4.9 Points de collecte — `/api/collection-points`

| Méthode | Route | Rôles | Description | US |
|---|---|---|---|---|
| GET | `/` | Connecté | Points **vérifiés et actifs** | G01, G02 |
| GET | `/mine` | collector | Mes points (y compris non vérifiés) | PC06 |
| GET | `/:id` | Connecté | Détail + `schedule[]` + `is_open_now` + `storage_used_kg` | G07 |
| POST | `/` | collector | Créer un point (en attente de validation admin) | PC08 |
| PATCH | `/:id` | collector (responsable) | Modifier. ⚠️ Changer `lat/lng` remet le point en attente de validation | — |
| PATCH | `/:id/location` | collector (responsable) | **Géolocalisation GPS** : `{ lat, lng, address? }` (depuis `navigator.geolocation`) | PC08 |
| DELETE | `/:id` | collector (responsable) | Supprimer | — |
| GET | `/:id/schedule` | Connecté | Horaires | PC07 |
| PUT | `/:id/schedule` | collector (responsable) | Remplacer les horaires de la semaine | PC07 |

Query `GET /` : `q`, `gouvernorat`, `category_id`, `open_now`, `geo`, `page`, `limit`.

**Body `POST /`**

```json
{
  "name": "Point Vert Sousse",
  "description": "…", "address": "Zone industrielle",
  "gouvernorat": "Sousse", "lat": 35.81, "lng": 10.62,
  "phone": "+216 73 000 000", "email": "contact@pointvert.tn",
  "storage_capacity_kg": 50000,
  "category_ids": [1, 4],
  "schedule": [ { "day_of_week": 1, "opens_at": "08:00", "closes_at": "17:00" } ]
}
```

**Body `PUT /:id/schedule`** — `day_of_week` : 0 = dimanche … 6 = samedi ; les jours absents sont supprimés :

```json
{ "days": [
  { "day_of_week": 1, "opens_at": "08:00", "closes_at": "17:00" },
  { "day_of_week": 6, "opens_at": "08:00", "closes_at": "12:00" },
  { "day_of_week": 0, "is_closed": true }
] }
```

`is_open_now` est calculé à l'heure de Tunis.

### 4.10 Stockage — `/api/collection-points/:pointId/storage`

Réservé au **responsable du point** (ou admin). Unité : kg. (US-PC06)

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Vue d'ensemble : `storage_capacity_kg`, `used_kg`, `available_kg`, `usage_percent`, `items_count`, `low_stock_count`, `items[]` |
| PATCH | `/capacity` | `{ storage_capacity_kg }` (≥ stock actuel, sinon 409) |
| GET | `/items` | Articles en stock (+ `category_name`, `is_low_stock`) |
| POST | `/items` | `{ label, category_id?, min_threshold_kg?, initial_quantity_kg? }` |
| PATCH | `/items/:itemId` | `{ label?, category_id?, min_threshold_kg? }` |
| DELETE | `/items/:itemId` | Uniquement si quantité = 0 (sinon 409) |
| GET | `/movements` | Historique. Query : `stock_item_id`, `type`, `from`, `to`, `page`, `limit` |
| POST | `/movements` | `{ stock_item_id, type, quantity_kg, reason? }` |

Types de mouvement : `in` (entrée, contrôle de capacité), `out` (sortie, pas de stock négatif), `adjust` (inventaire : fixe la quantité à `quantity_kg`).
Chaque mouvement émet `stock:updated` ; au-delà de 90 % de capacité ou sous `min_threshold_kg`, une notification `stock.alert` est créée.

### 4.11 Opérations d'achat — `/api/purchases`

Achats réalisés par un point de collecte auprès d'un vendeur (US-PC01).

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| GET | `/` | collector, seller | collector : achats de ses points ; seller : achats effectués chez lui |
| GET | `/:id` | Parties prenantes | Détail |
| POST | `/` | collector | Créer (statut `pending`) → notifie le vendeur |
| PATCH | `/:id` | collector | Modifier (seulement si `pending`) : `label, quantity_kg, unit_price, scheduled_at, notes` |
| PATCH | `/:id/status` | collector / seller | `{ status, stock_item_id? }` |

Query : `status`, `collection_point_id`, `seller_id`, `category_id`, `from`, `to`, `page`, `limit`.

**Body `POST /`**

```json
{
  "collection_point_id": "uuid",
  "product_id": "uuid",        // déduit seller_id, category_id et label
  "seller_id": "uuid",         // si pas de product_id (optionnel : vendeur non inscrit possible)
  "label": "Grignons d'olive", // requis sans product_id
  "quantity_kg": 5000,
  "unit_price": 0.11,
  "scheduled_at": "2026-11-21T09:00:00Z",
  "notes": "Camion 10 t"
}
```

**Workflow des statuts**

| De → Vers | Qui |
|---|---|
| `pending` → `confirmed` | vendeur ou point de collecte |
| `pending` / `confirmed` → `cancelled` | vendeur ou point de collecte |
| `confirmed` → `received` | point de collecte → **entrée en stock automatique** (article choisi via `stock_item_id` ou créé/retrouvé par `label`) et décrément de `quantity_available` du produit (si kg) |

Objet : champs + `total_amount` (= quantité × prix), `collection_point {…}`, `seller {…} | null`, `product_title`, `category_name`.

### 4.12 Messagerie — `/api/conversations`

Conversations 1-à-1 (US-S03, B08, PC05). Autorisées entre rôles différents : vendeur ↔ acheteur, point de collecte ↔ vendeur / acheteur (admin ↔ tous).

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Mes conversations triées par activité. Query : `q` (nom), `unread_only`, `page`, `limit` |
| GET | `/unread-count` | `{ data: { count } }` messages non lus |
| POST | `/` | Ouvrir (ou retrouver) la conversation : `{ participant_id, message? }` → `201` si créée, `200` si existante |
| GET | `/:id` | Détail |
| GET | `/:id/messages` | Messages en ordre chronologique. Pagination arrière : `before=<created_at du plus ancien>`, `limit` (≤ 100, défaut 50) |
| POST | `/:id/messages` | Envoyer : `{ body, attachments?, context_type?, context_id? }` |
| POST | `/:id/read` | Marquer comme lue (émet `conversation:read` à l'autre participant) |

`context_type` ∈ `product · request · offer · purchase` (+ `context_id`) permet d'afficher « à propos de… » dans la bulle.

Objet conversation :

```json
{
  "id": "uuid", "created_at": "…", "last_message_at": "…", "last_read_at": "…",
  "participant": { "id": "…", "name": "…", "company_name": "…", "role": "buyer", "avatar_url": null, "is_verified": true, "online": true },
  "last_message": { "id": "…", "body": "…", "sender_id": "…", "created_at": "…" },
  "unread_count": 2
}
```

Objet message : `{ id, conversation_id, sender_id, sender_name, body, attachments, context_type, context_id, created_at }`.

> Flux recommandé : envoyer via REST (`POST /:id/messages`), afficher via l'événement `message:new` (y compris pour l'expéditeur → dédoublonner par `id`).

### 4.13 Notifications — `/api/notifications`

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Mes notifications (récentes d'abord). Query : `unread_only`, `type`, `page`, `limit` |
| GET | `/unread-count` | `{ data: { count } }` |
| PATCH | `/read-all` | Tout marquer comme lu → `{ data: { updated } }` |
| DELETE | `/read` | Supprimer toutes les notifications lues → `{ data: { deleted } }` |
| PATCH | `/:id/read` | Marquer une notification comme lue |
| DELETE | `/:id` | Supprimer |

Chaque action met à jour le badge via `notification:unread_count`.

### 4.14 Rapports & statistiques — `/api/reports`

Rôles : seller, collector, buyer. (US-S06)

| Méthode | Route | Description |
|---|---|---|
| GET | `/overview?from&to` | Indicateurs de l'utilisateur sur la période (défaut : 365 derniers jours) |
| GET | `/timeline?months=12` | Série mensuelle pour graphiques (1–36 mois) : `[{ month: "2026-11", count, quantity_kg, amount }]` |

Réponse `/overview` pour un **vendeur** :

```json
{ "data": {
  "role": "seller", "period": { "from": "…", "to": "…" },
  "products": { "total": 4, "active": 3, "total_views": 210, "stock_kg": 31000 },
  "requests": { "responses_sent": 9, "responses_accepted": 4, "responses_rejected": 2, "responses_pending": 3, "acceptance_rate_percent": 44.4 },
  "sales": { "purchases_total": 6, "purchases_received": 5, "sold_kg": 21000, "revenue": 2310 },
  "discounts": { "active": 1, "total": 3 },
  "top_products": [ { "id": "…", "title": "…", "views_count": 120, "quantity_available": 25000, "unit": "kg" } ],
  "sales_by_category": [ { "category_id": 1, "category_name": "…", "purchases": 5, "sold_kg": 21000, "revenue": 2310 } ]
} }
```

**Point de collecte** : `storage { points, capacity_kg, used_kg, usage_percent }`, `purchases { total, pending, confirmed, received, cancelled, received_kg, spent }`, `offers { total, published, drafts }`, `requests { responses_sent, responses_accepted }`.
**Acheteur** : `requests { total, open, in_progress, fulfilled, closed }`, `responses { received, accepted }`.
`timeline` : vendeur / point de collecte = achats réceptionnés ; acheteur = demandes créées (`amount` = 0).

### 4.15 Carte — `/api/map`

(US-G01, G02)

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Marqueurs pour la carte interactive |
| GET | `/nearby` | Acteurs autour d'une position (`lat`, `lng` **obligatoires**, `radius_km` défaut 25, `limit` défaut 50), triés par distance |

Query : `bounds=minLng,minLat,maxLng,maxLat` (zone visible de la carte), `types` (CSV parmi `seller`, `collection_point`, `buyer` — défaut `seller,collection_point` ; `buyer` interdit aux acheteurs), `category_id`, `gouvernorat`, `q`, `open_now` (points), `geo`, `limit` (≤ 1000, défaut 300).

```json
{
  "data": [
    { "type": "seller", "id": "…", "name": "Sfax Olive Mills", "lat": 34.75, "lng": 10.75, "gouvernorat": "Sfax",
      "address": "…", "avatar_url": null, "phone": "…", "is_verified": true, "category_ids": [1], "products_count": 2, "distance_km": null },
    { "type": "collection_point", "id": "…", "name": "Point Vert Sousse", "lat": 35.81, "lng": 10.62, "gouvernorat": "Sousse",
      "address": "…", "phone": "…", "is_verified": true, "category_ids": [1, 4], "manager_id": "…", "is_open_now": true, "distance_km": null }
  ],
  "meta": { "total": 2, "by_type": { "seller": 1, "collection_point": 1 } }
}
```

Astuce Leaflet : `map.getBounds().toBBoxString()` donne directement le format `bounds`.

### 4.16 Recherche & recherche IA — `/api/search`

| Méthode | Route | Description | US |
|---|---|---|---|
| GET | `/?q=…&types=…&limit=5` | Recherche globale (barre de recherche), résultats groupés par type | S05, B05 |
| GET | `/smart?q=…&limit=20` | **Recherche assistée par IA** en langage naturel | S08, B06 |

**Recherche globale** — `types` (CSV, défaut tous) : `products, sellers, buyers, offers, collection_points, requests` (`buyers` non disponible pour un acheteur). Tolère accents et fautes de frappe.

```json
{ "data": {
  "products": [ { "type": "product", "id": "…", "label": "Grignons d'olive frais", "subtitle": "Sfax Olive Mills", "gouvernorat": "Sfax", "score": 0.62 } ],
  "sellers": [ … ], "offers": [ … ], "collection_points": [ … ], "requests": [ … ]
} }
```

**Recherche IA** — exemple : `GET /api/search/smart?q=je cherche 2 tonnes de grignons à Sfax moins de 0,5 dt pas cher`

Le moteur extrait : quantité (+ conversion tonnes → kg), prix max, tri « pas cher », promo/remise, « près de moi » (utilise la position du profil), gouvernorat, catégorie (mots-clés), mots-clés restants. Si aucun résultat, il relâche progressivement les filtres (`relaxed_filters`).

```json
{ "data": {
  "interpretation": {
    "raw": "je cherche 2 tonnes de grignons à Sfax moins de 0,5 dt pas cher",
    "filters": { "min_quantity": 2000, "max_price": 0.5, "sort": "price_asc", "gouvernorat": "Sfax", "category_id": 1 },
    "detected": [
      { "kind": "quantity", "value": 2000, "unit": "kg" },
      { "kind": "max_price", "value": 0.5 },
      { "kind": "sort", "value": "price_asc" },
      { "kind": "gouvernorat", "value": "Sfax" },
      { "kind": "category", "value": 1, "label": "Grignons d'olive", "matched": ["grignons"] }
    ],
    "keywords": [],
    "applied_filters": { … },
    "relaxed_filters": []
  },
  "products": [ /* objets Produit */ ],
  "offers":   [ /* objets Offre (5 max) */ ]
} }
```

Affichez `detected` sous forme de « chips » pour que l'utilisateur voie comment sa phrase a été comprise.

### 4.17 Impression — `/api/print`

`GET /api/print/:resource/:id?autoprint=true` → **page HTML** prête à imprimer (US-G08). Les droits sont ceux de la ressource (« selon les droits »).

| `resource` | `id` | Qui peut imprimer |
|---|---|---|
| `products` | id produit | Connecté |
| `offers` | id offre | Connecté (brouillon : auteur) |
| `requests` | id demande | Connecté (réponses : acheteur ou la sienne) |
| `purchases` | id opération | Parties prenantes (bon d'achat avec zone de signature) |
| `storage` | id **point de collecte** | Responsable du point |
| `collection-points` | id point | Connecté (fiche + horaires) |

`autoprint=true` ouvre la boîte d'impression au chargement. Comme une nouvelle fenêtre n'envoie pas le header `Authorization`, deux options :

```js
// 1) avec le cookie de session (login fait avec credentials: 'include')
window.open(`${API}/api/print/purchases/${id}?autoprint=true`, '_blank');

// 2) avec le Bearer token
const res = await fetch(`${API}/api/print/purchases/${id}?autoprint=true`, { headers: { Authorization: `Bearer ${token}` } });
const url = URL.createObjectURL(await res.blob());
window.open(url, '_blank');
```

### 4.18 Admin — `/api/admin`

Rôle `admin` uniquement.

| Méthode | Route | Description |
|---|---|---|
| GET | `/stats` | Chiffres globaux de la plateforme |
| GET | `/users` | Utilisateurs. Query : `role`, `is_verified`, `is_active`, `q`, `page`, `limit` |
| PATCH | `/users/:id` | `{ is_verified?, is_active? }` (vérifier → notification `account.verified`) |
| GET | `/collection-points/pending` | Points en attente de validation |
| PATCH | `/collection-points/:id/verify` | `{ is_verified: true \| false }` |

### 4.19 Upload d’images — `/api/uploads`

Les fichiers sont enregistrés dans le dossier **`backend/upload/`** et servis publiquement sur **`/upload/<fichier>`** (sans `/api`, en-tête `Cross-Origin-Resource-Policy: cross-origin` pour l’affichage depuis le front).

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| POST | `/images` | Connecté | `multipart/form-data`, champ **`images`** (1 à **3** fichiers, **5 Mo** max chacun, JPG/PNG/WEBP/GIF) → `201 { data: [{ url, filename, size, mimetype }] }` |
| DELETE | `/:filename` | Propriétaire du fichier (ou admin) | Supprime le fichier → `204` |

```js
const form = new FormData();
files.forEach((f) => form.append('images', f));
const { data } = await axios.post('/api/uploads/images', form, { onUploadProgress });
// data.data[i].url → à mettre dans products.images (max 3)
```

Erreurs : `400 UPLOAD_ERROR` (« 3 images maximum », « Image trop lourde (5 Mo maximum) »), `400 BAD_REQUEST` (format non supporté).

### Santé

`GET /health` → `{ "status": "ok", … }` (sans `/api`).

---

## 5. Correspondance User Stories → Endpoints

### Vendeur (Seller)

| US | Besoin | Endpoints |
|---|---|---|
| S01 | Créer un compte | `POST /api/auth/register` (`role: "seller"`) |
| S02 | Se connecter | `POST /api/auth/login` |
| S03 | Discuter avec les acheteurs | `/api/conversations/*` + Socket `message:new`, `typing:*` |
| S04 | Publier des posts | `POST /api/posts` (+ `POST /api/products` pour les fiches produit) |
| S05 | Rechercher des produits | `GET /api/products`, `GET /api/search` |
| S06 | Rapports & statistiques | `GET /api/reports/overview`, `GET /api/reports/timeline` |
| S07 | Demandes reçues | `GET /api/requests/received`, `POST /api/requests/:id/responses` |
| S08 | Recherche IA (optionnelle) | `GET /api/search/smart` |
| S09 | Liste des acheteurs | `GET /api/users/buyers` |
| S10 | Proposer des remises | `POST/PATCH/DELETE /api/discounts`, `GET /api/discounts/mine` |
| S11 | Offres à venir | `GET /api/offers/upcoming` |
| S12 | Consulter son profil | `GET /api/users/me`, `PATCH /api/users/me` |

### Acheteur (Buyer)

| US | Besoin | Endpoints |
|---|---|---|
| B01 | Créer un compte | `POST /api/auth/register` (`role: "buyer"`) |
| B02 | Se connecter | `POST /api/auth/login` |
| B03 | Envoyer une demande (besoins + quantités) | `POST /api/requests`, `GET /api/requests/mine`, `PATCH /api/requests/:id/responses/:rid` |
| B04 | Liste des vendeurs | `GET /api/users/sellers` |
| B05 | Rechercher des produits | `GET /api/products`, `GET /api/search` |
| B06 | Recherche assistée par IA | `GET /api/search/smart` |
| B07 | Consulter les remises | `GET /api/discounts` (+ `has_discount=true` sur `/api/products`) |
| B08 | Communiquer avec les vendeurs | `/api/conversations/*` + Socket |

### Point de collecte

| US | Besoin | Endpoints |
|---|---|---|
| PC01 | Gérer les opérations d'achat | `/api/purchases/*` |
| PC02 | Consulter les offres disponibles | `GET /api/offers` |
| PC03 | Préparer et publier des offres | `POST /api/offers`, `POST /api/offers/:id/publish`, `GET /api/offers/mine` |
| PC04 | Recevoir et gérer les demandes | `GET /api/requests/received`, `POST /api/requests/:id/responses` + Socket `request:new` |
| PC05 | Communiquer avec vendeurs et acheteurs | `/api/conversations/*` |
| PC06 | Gérer l'espace de stockage | `/api/collection-points/:pointId/storage/*` |
| PC07 | Gérer les horaires | `GET/PUT /api/collection-points/:id/schedule` |
| PC08 | Géolocalisation GPS | `POST /api/collection-points`, `PATCH /api/collection-points/:id/location` |

### Fonctionnalités générales

| US | Besoin | Endpoints |
|---|---|---|
| G01 | Carte interactive (vendeurs + points de collecte) | `GET /api/map` |
| G02 | Filtrer par localisation | `geo` (`lat`, `lng`, `radius_km`) / `gouvernorat` sur les listes, `GET /api/map/nearby` |
| G03 | Filtrer par catégorie | `category_id` (+ `GET /api/categories`) |
| G04 | Filtrer par acheteur | `GET /api/requests?buyer_id=…` |
| G05 | Filtrer par marché | `market_id` sur produits / offres / demandes / remises (+ `GET /api/markets`) |
| G06 | Filtrer par produit | `GET /api/products?q=…` ou `product_id` sur produits / demandes / remises / posts |
| G07 | Consulter les informations | Routes `GET /:id` de chaque module |
| G08 | Imprimer | `GET /api/print/:resource/:id` |

---

## 6. Comptes de démo

Après `npm run migrate && npm run seed` (jeu de données réaliste : 28 comptes, 28 produits, 8 points de collecte, 66 achats sur 12 mois, 14 demandes) :

| Rôle | Email | Mot de passe |
|---|---|---|
| admin | `admin@clac.tn` | `Admin2026!` |
| seller | `huilerie.zitouna@clac.tn` (+ 12 autres vendeurs) | `Clac2026!` |
| buyer | `achats@biodiesel-sahel.tn` (+ 7 autres acheteurs) | `Clac2026!` |
| collector | `collecte.sfax@clac.tn` (+ 3 autres gérants) | `Clac2026!` |

Tous les comptes du seed utilisent `Clac2026!` (sauf l’admin). Exemples : `moulin.elamal@clac.tn`, `dar.jeld@clac.tn`, `appro@compost-nord.tn`, `grandtunis@eco-collecte.tn`, `contact@sahel-recyclage.tn`.
