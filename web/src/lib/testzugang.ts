import { execFile } from "child_process";
import { rm } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { basisPrisma, clientVerwerfen } from "@/lib/datenbank";
import { testerSchema } from "@/lib/konto";
import { testerUploadVerzeichnis } from "@/lib/uploads";

// Testzugänge: Frank lädt per persönlichem Link bis zu fünf Tester ein. Jeder
// Tester bekommt in derselben Datenbank ein eigenes Schema "tester_<id>" mit
// allen Tabellen der App (leer, nur mit den Vorgaben, die auch Franks
// Datenbank beim Einrichten bekam) und einen eigenen Ordner für Fotos und
// Dokumente. So kann er alles ausprobieren, ohne Franks Daten je zu sehen.
// Entfernen löscht Schema und Ordner komplett.

export const MAX_TESTZUGAENGE = 5;
export const PASSWORT_MINDESTLAENGE = 8;

const execFileAsync = promisify(execFile);

// Legt das Schema an und bringt es mit denselben Migrationen wie Franks
// Schema auf den aktuellen Stand. Dauert ein paar Sekunden.
export async function testerDatenAnlegen(testzugangId: string): Promise<void> {
  const schema = testerSchema(testzugangId);
  await execFileAsync(
    process.execPath,
    [path.join(process.cwd(), "scripts", "tester-schemas-migrieren.mjs"), schema],
    { env: process.env, timeout: 120_000 },
  );
}

// Löscht alle Daten eines Testers: Datenbank-Schema samt Inhalt und seinen
// Upload-Ordner. Franks Schema "public" und sein Upload-Ordner werden dabei
// nicht berührt - der Schemaname ist fest "tester_<id>" (siehe testerSchema).
export async function testerDatenLoeschen(testzugangId: string): Promise<void> {
  const schema = testerSchema(testzugangId);
  await clientVerwerfen(schema);
  await basisPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await rm(testerUploadVerzeichnis(testzugangId), { recursive: true, force: true });
}
