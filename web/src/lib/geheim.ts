import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

// Verschlüsselt kleine Geheimnisse (das Passwort zum Mailserver), bevor sie in
// die Datenbank kommen. Der Schlüssel wird aus ANMELDUNG_GEHEIMNIS abgeleitet,
// das ohnehin nur auf dem Server liegt - wer nur die Datenbank (z.B. eine
// Sicherung) in die Hände bekommt, kann das Passwort damit nicht lesen.
// Wird ANMELDUNG_GEHEIMNIS einmal geändert, lassen sich gespeicherte
// Passwörter nicht mehr entschlüsseln und müssen neu eingegeben werden.
//
// AES-256-GCM: verschlüsselt und erkennt zugleich, ob der gespeicherte Wert
// verändert wurde. Gespeichert wird "v1:<iv>:<tag>:<daten>" (Base64).

function schluessel(): Buffer {
  const geheimnis = process.env.ANMELDUNG_GEHEIMNIS;
  if (!geheimnis) throw new Error("Umgebungsvariable ANMELDUNG_GEHEIMNIS fehlt - siehe web/.env.example.");
  return Buffer.from(hkdfSync("sha256", geheimnis, "imkereiverwaltung", "mail-passwort", 32));
}

export function verschluesseln(klartext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", schluessel(), iv);
  const daten = Buffer.concat([cipher.update(klartext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), daten.toString("base64")].join(":");
}

// null, wenn sich der Wert nicht entschlüsseln lässt (anderes Geheimnis,
// beschädigter Wert).
export function entschluesseln(gespeichert: string): string | null {
  const [version, iv, tag, daten] = gespeichert.split(":");
  if (version !== "v1" || !iv || !tag || daten === undefined) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", schluessel(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(daten, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
