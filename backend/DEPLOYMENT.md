# CLAC deployment checklist

The repository is currently configured for local development. A public release needs a hosting provider, domain, and production secrets; this checklist prepares the service without tying it to a specific vendor.

## Production prerequisites

- A managed PostgreSQL service with PostGIS enabled, private networking, automated backups, and point-in-time recovery.
- A persistent Node.js host for the API and a static host or CDN for the Flutter Web build.
- HTTPS for both the API and web app. For the browser client, serve the API under the same origin (or configure credentialed CORS and secure cookies).
- A unique `JWT_SECRET` with at least 32 random characters, a unique database password, and production `CORS_ORIGINS` containing only the deployed web origin(s).

## Release sequence

1. Copy `.env.example` into the deployment secret manager. Set `NODE_ENV=production`, the managed database connection values, `PORT`, `JWT_SECRET`, `DB_PASSWORD`, and `CORS_ORIGINS`. Never ship the development defaults from Compose.
2. Run `npm ci` and `npm run migrate` once as a release step against the production database. Do not run development seed data in production.
3. Start the API with `npm start`. Confirm `/health` reports healthy and check the platform logs for database connection or migration errors.
4. Build the web client with `flutter build web --release --dart-define=API_BASE_URL=https://your-api-host`. If web and API share an origin, omit `API_BASE_URL` and route `/api` to the API at the edge proxy.
5. Deploy the static files from `mobile/build/web`. Configure SPA fallback to `index.html`, cache versioned assets, and keep `index.html` revalidated.
6. Configure alerts for API health, error rate, database storage, and backup failures. Test restoring a backup before onboarding real organizations.

## Before onboarding real users

- Replace the in-memory login/register throttle with a shared rate-limit store when running more than one API instance. Configure trusted proxy handling only for the known ingress proxy.
- Review data retention, privacy notice, contact consent, and deletion/export workflows for profile and location data.
- Configure a supported push-notification provider before promising background alerts; current notifications are stored in the database and shown in-app.
- Select a tile provider whose usage terms fit the expected traffic and production use. Keep attribution visible and do not bundle private tile credentials in Flutter builds.
- Run the mobile integration journey against a staging deployment with dedicated test accounts, then verify the signed Android/iOS release builds.
