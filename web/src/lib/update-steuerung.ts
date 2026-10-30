import { constants } from "fs";
import { access, open, writeFile } from "fs/promises";
import path from "path";

// Update per Knopf in der App (Einstellungen -> System). Die App spielt das
// Update nicht selbst ein, sie läuft ja im Container, der dabei ersetzt wird.
// Sie legt nur die Datei "update-angefordert" in einen Ordner, den sie mit
// dem Server teilt (UPDATE_STEUERUNG, siehe installation/docker-compose.yml).
// Ein Dienst auf dem Server (installation/imkerei-update.path) bemerkt sie
// und startet imkerei-update. Das Skript schreibt seinen Stand nach
// "update-status.json", den die App anzeigt.
//
// Ohne diesen Ordner (Franks Coolify, eigene compose-Datei) gibt es keinen
// Knopf, dann nur den Befehl auf dem Server.

const SIGNAL = "update-angefordert";
const STATUS = "update-status.json";

export type UpdateZustand = "laeuft" | "fertig" | "aktuell" | "zurueck" | "zurueckgesetzt" | "fehler";

export type UpdateStatus = {
  zustand: UpdateZustand;
  schritt: string;
  meldung: string;
  von: string;
  nach: string;
  zeit: string;
};

function ordner(): string | null {
  const wert = process.env.UPDATE_STEUERUNG?.trim();
  return wert ? wert : null;
}

export async function knopfMoeglich(): Promise<boolean> {
  const dir = ordner();
  if (!dir) return false;
  try {
    await access(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function updateAnfordern(): Promise<void> {
  const dir = ordner();
  if (!dir) throw new Error("Kein Steuerungsordner eingerichtet.");
  await writeFile(path.join(dir, SIGNAL), `${new Date().toISOString()}\n`);
}

const ZUSTAENDE: UpdateZustand[] = ["laeuft", "fertig", "aktuell", "zurueck", "zurueckgesetzt", "fehler"];

// Liest den Stand des letzten Laufs. Höchstens 4 kB, alles Unerwartete zählt
// als "kein Stand".
export async function updateStatusLesen(): Promise<UpdateStatus | null> {
  const dir = ordner();
  if (!dir) return null;
  try {
    const datei = await open(path.join(dir, STATUS), "r");
    try {
      const puffer = Buffer.alloc(4096);
      const { bytesRead } = await datei.read(puffer, 0, puffer.length, 0);
      const daten = JSON.parse(puffer.subarray(0, bytesRead).toString("utf8")) as Record<string, unknown>;
      const text = (schluessel: string) => (typeof daten[schluessel] === "string" ? (daten[schluessel] as string) : "");
      const zustand = text("zustand") as UpdateZustand;
      if (!ZUSTAENDE.includes(zustand)) return null;
      return {
        zustand,
        schritt: text("schritt"),
        meldung: text("meldung"),
        von: text("von"),
        nach: text("nach"),
        zeit: text("zeit"),
      };
    } finally {
      await datei.close();
    }
  } catch {
    return null;
  }
}
