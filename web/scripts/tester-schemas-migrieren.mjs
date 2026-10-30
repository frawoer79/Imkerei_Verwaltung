// Bringt die Datenbank-Schemas der Testzugänge ("tester_<id>") auf denselben
// Stand wie Franks Schema "public": wendet dort dieselben Prisma-Migrationen
// an. Aufruf:
//   node scripts/tester-schemas-migrieren.mjs            alle Tester-Schemas
//   node scripts/tester-schemas-migrieren.mjs tester_x   nur dieses (neu anlegen)
//
// Läuft beim Containerstart nach der Migration von "public" (siehe
// docker-entrypoint.sh) und beim Einlösen eines Einladungslinks (siehe
// web/src/lib/testzugang.ts). Ein Fehler bei einem Tester-Schema bricht den
// Start bewusst NICHT ab - Franks eigene App soll trotzdem hochfahren.
import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";

const basisUrl = process.env.DATABASE_URL;
if (!basisUrl) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

const SCHEMA_MUSTER = /^tester_[a-z0-9]+$/;

async function testerSchemas() {
  const client = new pg.Client({ connectionString: basisUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tester\\_%' ORDER BY schema_name",
    );
    return rows.map((zeile) => zeile.schema_name).filter((name) => SCHEMA_MUSTER.test(name));
  } finally {
    await client.end();
  }
}

function migrieren(schema) {
  const url = new URL(basisUrl);
  url.searchParams.set("schema", schema);
  execFileSync(path.join(process.cwd(), "node_modules", ".bin", "prisma"), ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "inherit",
  });
}

const einzeln = process.argv[2];
if (einzeln) {
  if (!SCHEMA_MUSTER.test(einzeln)) {
    console.error(`Ungültiger Schemaname: ${einzeln}`);
    process.exit(1);
  }
  migrieren(einzeln);
} else {
  const schemas = await testerSchemas();
  for (const schema of schemas) {
    console.log(`Tester-Schema ${schema} ...`);
    try {
      migrieren(schema);
    } catch {
      console.error(`Migration von ${schema} fehlgeschlagen - Franks Daten sind davon nicht betroffen.`);
    }
  }
}
