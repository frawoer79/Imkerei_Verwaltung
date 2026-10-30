// Passwort des Hauptzugangs vergessen? Löscht nur den Zugang, alle Daten
// bleiben. Danach den Container neu starten, dann führt die App wieder zum
// Einrichtungsassistenten (mit dem Einrichtungscode aus der .env).
// Aufruf auf dem Server im Installationsordner:
//   docker compose exec app node scripts/hauptzugang-zuruecksetzen.mjs
//   docker compose restart app
// Wirkt nicht, wenn die Zugangsdaten aus ANMELDUNG_BENUTZERNAME/
// ANMELDUNG_PASSWORT kommen - die gelten immer vorrangig.
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rowCount } = await client.query(`DELETE FROM "Hauptzugang"`);
  console.log(
    rowCount
      ? "Zugang gelöscht. Jetzt 'docker compose restart app' und die Seite neu öffnen."
      : "Es gab keinen Zugang zum Löschen.",
  );
} finally {
  await client.end();
}
