import { env } from './env.js';

/** Human-readable explanation of a PostgreSQL error (AggregateError has an empty message). */
export function describeDbError(error) {
  const target = env.db.connectionString ? 'DATABASE_URL' : `${env.db.host}:${env.db.port}`;
  const code = error.code ?? error.errors?.[0]?.code;
  const hints = {
    ECONNREFUSED: `Aucun serveur PostgreSQL n'écoute sur ${target}. Démarrez PostgreSQL ou corrigez DB_HOST/DB_PORT dans .env.`,
    ENOTFOUND: `Hôte introuvable : ${env.db.host}. Vérifiez DB_HOST dans .env.`,
    '28P01': `Mot de passe refusé pour l'utilisateur "${env.db.user}". Vérifiez DB_PASSWORD dans .env.`,
    '3D000': `La base "${env.db.database}" n'existe pas. Créez-la : createdb -U ${env.db.user} ${env.db.database}`,
    '0A000': 'Extension manquante (PostGIS ?). Installez PostGIS pour votre version de PostgreSQL.',
    '58P01': 'Extension manquante (PostGIS ?). Installez PostGIS pour votre version de PostgreSQL.',
  };
  const detail = error.message || error.errors?.map((e) => e.message).join(' ; ') || String(error);
  return `${hints[code] ?? detail}${hints[code] ? `\n   (${code}: ${detail})` : ''}`;
}
