// Warteschlange auf dem Gerät für Eingaben, die im Funkloch oder bei einem
// Serverfehler nicht ankommen: Durchsichten (samt Fotos), neue Maßnahmen und
// abgehakte Maßnahmen. Anders als der Entwurf (lib/entwurf.ts) liegt hier das
// fertig Abgeschickte. Die App sendet es selbst nach, sobald wieder Netz da
// ist, auch beim nächsten Öffnen.
//
// Gespeichert wird in IndexedDB (die Datenbank des Browsers): anders als
// localStorage nimmt sie auch Fotos auf. Jede Sendung trägt eine Kennung
// (sendungId), mit der der Server einen doppelt ankommenden Eintrag erkennt -
// etwa wenn er gespeichert hat, die Antwort aber im Funkloch verloren ging.
//
// Gesendet wird an /api/warteschlange statt an die Server-Aktion: deren
// Kennung ändert sich mit jedem Deploy (siehe app/api/warteschlange/route.ts).
//
// Jeder Zugriff fängt Fehler ab: Ohne IndexedDB (sehr alter Browser, voller
// Speicher) liefert einreihen() false, das Formular fällt dann auf das
// Senden von Hand zurück.

import { ENTWURF_ABGELEGT, entwurfSchreiben } from "@/lib/entwurf";

/// eintrag: Durchsicht eines Volks, sammel: Durchsicht für mehrere Völker
/// eines Stands, massnahme: neue Maßnahme für ein oder mehrere Völker,
/// erledigt: Maßnahmen abgehakt oder wieder geöffnet.
export type SendungArt = "eintrag" | "sammel" | "massnahme" | "erledigt";

export type Sendung = {
  /// Zugleich die sendungId im Formular.
  id: string;
  art: SendungArt;
  /// Volk (Eintrag) bzw. Stand (Sammel-Eintrag). Bei Maßnahmen und Haken
  /// die Seite, auf der sie entstanden sind.
  ziel: string;
  /// "Durchsicht Volk 3", "Maßnahme: Futter geben", "Erledigt: Windel ziehen".
  titel: string;
  /// Alle betroffenen Völker - für den Hinweis im Verlauf des Volks.
  volkIds: string[];
  /// Nur bei Haken: welche Maßnahmen, und erledigt oder wieder offen.
  massnahmeIds?: string[];
  erledigt?: boolean;
  /// Datum der Durchsicht, wie im Formular eingegeben (datetime-local);
  /// sonst der Zeitpunkt der Eingabe.
  datum: string;
  erstelltAm: string;
  /// Der ganze Formularinhalt, Fotos als Datei.
  felder: [string, string | Blob][];
  /// Wie oft der Server mit einem Fehler geantwortet hat (Funklöcher zählen nicht).
  fehlversuche: number;
  /// Abgelehnt: wird nicht mehr von selbst gesendet, bis du entscheidest.
  fehler: string | null;
};

/// Für die Anzeige - ohne den Formularinhalt.
export type SendungKurz = Omit<Sendung, "felder"> & { fotos: number };

export type SendeErgebnis =
  | { art: "ok"; ziel: string }
  | { art: "abgelehnt"; fehler: string }
  | { art: "serverfehler" }
  | { art: "keinNetz" }
  | { art: "abgemeldet" };

export type WarteschlangeZustand = {
  /// Erst nach dem ersten Lesen der Datenbank true.
  geladen: boolean;
  sendungen: SendungKurz[];
  sendetGerade: boolean;
  /// Letzter Versuch scheiterte an der Anmeldung (Sitzung abgelaufen).
  abgemeldet: boolean;
  /// Zeitpunkt, an dem zuletzt etwas angekommen ist - für "Alles gesendet".
  zuletztGesendet: number | null;
};

// Nach so vielen Serverfehlern hintereinander gilt eine Sendung als abgelehnt,
// damit ein dauerhaft scheiternder Eintrag nicht ewig im Kreis läuft.
const MAX_FEHLVERSUCHE = 3;
// Großzügig, weil Fotos im schwachen Netz lange brauchen.
const SENDE_ZEITLIMIT_MS = 3 * 60 * 1000;
const DB_NAME = "imkereiverwaltung";
const STORE = "warteschlange";
const INTERNE_FELDER = new Set(["_art", "_ziel", "sendungId"]);

/// Kennung für eine neue Sendung.
export function neueSendungId(): string {
  // randomUUID gibt es nur über https - zu Hause im Heimnetz evtl. nicht.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (wert) => wert.toString(16).padStart(2, "0")).join("");
}

// --- IndexedDB -------------------------------------------------------------

let dbVersprechen: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbVersprechen) {
    dbVersprechen = new Promise((aufloesen, ablehnen) => {
      const anfrage = indexedDB.open(DB_NAME, 1);
      anfrage.onupgradeneeded = () => anfrage.result.createObjectStore(STORE, { keyPath: "id" });
      anfrage.onsuccess = () => aufloesen(anfrage.result);
      anfrage.onerror = () => ablehnen(anfrage.error);
    });
    dbVersprechen.catch(() => {
      dbVersprechen = null;
    });
  }
  return dbVersprechen;
}

async function speicher<T>(modus: IDBTransactionMode, arbeit: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const datenbank = await db();
  return new Promise((aufloesen, ablehnen) => {
    const transaktion = datenbank.transaction(STORE, modus);
    const anfrage = arbeit(transaktion.objectStore(STORE));
    transaktion.oncomplete = () => aufloesen(anfrage.result);
    transaktion.onerror = () => ablehnen(transaktion.error);
    transaktion.onabort = () => ablehnen(transaktion.error);
  });
}

async function alleLesen(): Promise<Sendung[]> {
  try {
    const liste = await speicher("readonly", (store) => store.getAll() as IDBRequest<Sendung[]>);
    return liste.sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm));
  } catch {
    return [];
  }
}

async function schreiben(sendung: Sendung): Promise<boolean> {
  try {
    await speicher("readwrite", (store) => store.put(sendung));
    return true;
  } catch {
    return false;
  }
}

// --- Zustand für die Anzeige ----------------------------------------------

let zustand: WarteschlangeZustand = {
  geladen: false,
  sendungen: [],
  sendetGerade: false,
  abgemeldet: false,
  zuletztGesendet: null,
};
const zuhoerer = new Set<() => void>();
const gesendetZuhoerer = new Set<() => void>();
// Sendungen, die das Formular selbst gerade schickt - die lässt die
// Warteschlange in Ruhe, sonst käme derselbe Eintrag zweimal gleichzeitig.
const laufend = new Set<string>();
// Davon die, die (noch) nicht angezeigt werden: Klappt das Speichern gleich,
// soll die Leiste oben nicht kurz "1 Durchsicht wartet" aufblitzen.
const verborgen = new Set<string>();
let kanal: BroadcastChannel | null = null;

function setzen(teil: Partial<WarteschlangeZustand>) {
  zustand = { ...zustand, ...teil };
  for (const melden of zuhoerer) melden();
}

function kurz(sendung: Sendung): SendungKurz {
  const { felder, ...rest } = sendung;
  return { ...rest, fotos: felder.filter(([, wert]) => typeof wert !== "string" && wert.size > 0).length };
}

/// Datenbank neu einlesen - nach jeder Änderung, auch aus einem anderen Tab.
async function neuLesen() {
  const sendungen = await alleLesen();
  setzen({ geladen: true, sendungen: sendungen.filter((sendung) => !verborgen.has(sendung.id)).map(kurz) });
}

function geaendert() {
  void neuLesen();
  try {
    kanal?.postMessage("geaendert");
  } catch {
    // Ohne BroadcastChannel erfährt ein zweiter Tab es beim nächsten Neuladen.
  }
}

export function abonnieren(melden: () => void) {
  zuhoerer.add(melden);
  if (zuhoerer.size === 1) {
    if (!kanal && typeof BroadcastChannel !== "undefined") {
      kanal = new BroadcastChannel(STORE);
      kanal.onmessage = () => void neuLesen();
    }
    void neuLesen();
  }
  return () => {
    zuhoerer.delete(melden);
  };
}

export function zustandLesen(): WarteschlangeZustand {
  return zustand;
}

const SERVER_ZUSTAND: WarteschlangeZustand = { ...zustand };
export function serverZustand(): WarteschlangeZustand {
  return SERVER_ZUSTAND;
}

/// Wird aufgerufen, wenn mindestens eine Sendung angekommen ist (zum
/// Neuladen der Seite, damit der Eintrag im Verlauf erscheint).
export function beiGesendet(melden: () => void) {
  gesendetZuhoerer.add(melden);
  return () => {
    gesendetZuhoerer.delete(melden);
  };
}

// --- Einreihen, Senden, Entfernen -----------------------------------------

/// Sendung aus dem abgeschickten Formular bauen.
export function sendungAusFormular(
  formData: FormData,
  angaben: { art: SendungArt; ziel: string; titel: string }
): Sendung {
  let id = formData.get("sendungId")?.toString();
  if (!id) {
    id = neueSendungId();
    formData.set("sendungId", id);
  }
  const volkIds =
    angaben.art === "eintrag" ? [angaben.ziel] : [...new Set(formData.getAll("volkIds").map(String))];
  return {
    id,
    ...angaben,
    volkIds,
    datum: formData.get("datum")?.toString() || new Date().toISOString(),
    erstelltAm: new Date().toISOString(),
    felder: [...formData.entries()].filter(([name]) => !INTERNE_FELDER.has(name)),
    fehlversuche: 0,
    fehler: null,
  };
}

export async function einreihen(sendung: Sendung): Promise<boolean> {
  const ok = await schreiben(sendung);
  if (ok) geaendert();
  return ok;
}

export async function entfernen(id: string) {
  try {
    await speicher("readwrite", (store) => store.delete(id));
  } catch {
    // Nichts zu tun.
  }
  geaendert();
}

/// Das Formular schickt die Sendung gerade selbst. Solange sie auch
/// verborgen ist, taucht sie nicht in der Anzeige auf.
export function laufendSetzen(id: string, an: boolean) {
  if (an) {
    laufend.add(id);
    verborgen.add(id);
  } else {
    laufend.delete(id);
    verborgen.delete(id);
  }
  void neuLesen();
}

/// Weiter im Hintergrund: ab jetzt in der Anzeige zeigen.
export function anzeigen(id: string) {
  verborgen.delete(id);
  void neuLesen();
}

/// Eine Sendung zum Server schicken - ohne die Warteschlange anzufassen.
export async function senden(sendung: Sendung): Promise<SendeErgebnis> {
  const formData = new FormData();
  formData.set("_art", sendung.art);
  formData.set("_ziel", sendung.ziel);
  formData.set("sendungId", sendung.id);
  for (const [name, wert] of sendung.felder) formData.append(name, wert);

  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), SENDE_ZEITLIMIT_MS);
  let antwort: Response;
  try {
    // "manual": Ist die Anmeldung abgelaufen, leitet der Server auf /login
    // um. Das soll nicht als Erfolg durchgehen.
    antwort = await fetch("/api/warteschlange", {
      method: "POST",
      body: formData,
      redirect: "manual",
      credentials: "same-origin",
      signal: abbruch.signal,
    });
  } catch {
    return { art: "keinNetz" };
  } finally {
    clearTimeout(uhr);
  }

  if (antwort.type === "opaqueredirect" || (antwort.status >= 300 && antwort.status < 400)) {
    return { art: "abgemeldet" };
  }
  try {
    const inhalt = (await antwort.json()) as { ziel?: string; fehler?: string };
    if (antwort.ok) return { art: "ok", ziel: inhalt.ziel ?? "" };
    if (antwort.status === 422 && inhalt.fehler) return { art: "abgelehnt", fehler: inhalt.fehler };
  } catch {
    // Keine JSON-Antwort: Server-Fehlerseite oder abgebrochene Verbindung.
  }
  return { art: "serverfehler" };
}

async function lesen(id: string): Promise<Sendung | null> {
  try {
    return ((await speicher("readonly", (store) => store.get(id))) as Sendung | undefined) ?? null;
  } catch {
    return null;
  }
}

/// Ergebnis eines Versuchs in der Warteschlange festhalten.
export async function ergebnisVermerken(sendung: Sendung, ergebnis: SendeErgebnis) {
  if (ergebnis.art === "ok") {
    await entfernen(sendung.id);
    setzen({ abgemeldet: false, zuletztGesendet: Date.now() });
    for (const melden of gesendetZuhoerer) melden();
    return;
  }
  if (ergebnis.art === "abgemeldet") {
    setzen({ abgemeldet: true });
    return;
  }
  if (ergebnis.art === "keinNetz") return;
  const aktuell = (await lesen(sendung.id)) ?? sendung;
  if (ergebnis.art === "abgelehnt") {
    aktuell.fehler = ergebnis.fehler;
  } else {
    aktuell.fehlversuche += 1;
    if (aktuell.fehlversuche >= MAX_FEHLVERSUCHE) {
      aktuell.fehler = "Der Server hat mehrmals einen Fehler gemeldet.";
    }
  }
  await schreiben(aktuell);
  geaendert();
}

let sendetGerade = false;

/// Alles Wartende der Reihe nach senden. Bricht beim ersten Funkloch ab.
export async function allesSenden() {
  if (sendetGerade) return;
  sendetGerade = true;
  try {
    const arbeit = async () => {
      const offen = (await alleLesen()).filter((sendung) => !sendung.fehler && !laufend.has(sendung.id));
      if (offen.length === 0) return;
      setzen({ sendetGerade: true });
      for (const sendung of offen) {
        const ergebnis = await senden(sendung);
        await ergebnisVermerken(sendung, ergebnis);
        if (ergebnis.art === "keinNetz" || ergebnis.art === "abgemeldet") break;
      }
    };
    // Zwei offene Tabs sollen nicht dieselbe Sendung gleichzeitig schicken.
    if (typeof navigator !== "undefined" && navigator.locks) {
      await navigator.locks.request(STORE, { ifAvailable: true }, async (sperre) => {
        if (sperre) await arbeit();
      });
    } else {
      await arbeit();
    }
  } finally {
    sendetGerade = false;
    setzen({ sendetGerade: false });
  }
}

/// Abgelehnte Sendung noch einmal versuchen.
export async function erneutVersuchen(id: string) {
  const sendung = await lesen(id);
  if (!sendung) return;
  sendung.fehler = null;
  sendung.fehlversuche = 0;
  await schreiben(sendung);
  geaendert();
  await allesSenden();
}

/// Sendung zurück ins Formular holen: Sie wird als Entwurf abgelegt (ohne
/// Fotos, die passen nicht in den Entwurf) und aus der Warteschlange
/// genommen. Liefert die Seite, auf der das Formular steht.
export async function alsEntwurfOeffnen(id: string): Promise<string | null> {
  const sendung = await lesen(id);
  if (!sendung || (sendung.art !== "eintrag" && sendung.art !== "sammel")) return null;
  const schluessel = sendung.art === "eintrag" ? `entwurf:eintrag:${sendung.ziel}` : `entwurf:sammel:${sendung.ziel}`;
  const texte = sendung.felder.filter((feld): feld is [string, string] => typeof feld[1] === "string");
  if (!entwurfSchreiben(schluessel, texte)) return null;
  await entfernen(id);
  // Steht das Formular schon auf der Seite, zeigt es den Entwurf gleich an.
  window.dispatchEvent(new CustomEvent(ENTWURF_ABGELEGT, { detail: schluessel }));
  return sendung.art === "eintrag" ? `/voelker/${sendung.ziel}` : `/bienenstaende/${sendung.ziel}`;
}

/// Für Maßnahmen und Haken: ablegen und gleich senden. Klappt es nicht,
/// bleibt die Sendung in der Warteschlange und die Leiste oben zeigt sie.
/// null: Das Gerät kann keine Warteschlange (dann bleibt nur, direkt zu
/// senden).
export async function einreihenUndSenden(sendung: Sendung): Promise<SendeErgebnis | null> {
  laufendSetzen(sendung.id, true);
  if (!(await einreihen(sendung))) {
    laufendSetzen(sendung.id, false);
    return null;
  }
  const ergebnis = await senden(sendung);
  if (ergebnis.art === "ok") await entfernen(sendung.id);
  laufendSetzen(sendung.id, false);
  if (ergebnis.art !== "ok") await ergebnisVermerken(sendung, ergebnis);
  return ergebnis;
}

/// Maßnahmen abhaken oder wieder öffnen. Gesendet wird der Zielzustand (nicht
/// "umschalten"), damit ein doppelt ankommender Haken nichts verdreht, und
/// der Zeitpunkt des Tippens als "erledigt am".
export function erledigtSendung(
  massnahmen: { id: string; text: string; volkId: string }[],
  erledigt: boolean,
  ziel: string
): Sendung {
  const zeitpunkt = new Date().toISOString();
  const anzahl = new Set(massnahmen.map((massnahme) => massnahme.volkId)).size;
  const felder: [string, string][] = [
    ...massnahmen.map((massnahme): [string, string] => ["massnahmeIds", massnahme.id]),
    ["erledigt", erledigt ? "ja" : "nein"],
    ["zeitpunkt", zeitpunkt],
  ];
  return {
    id: neueSendungId(),
    art: "erledigt",
    ziel,
    titel: `${erledigt ? "Erledigt" : "Wieder offen"}: ${massnahmen[0]?.text ?? ""}${anzahl > 1 ? ` (${anzahl} Völker)` : ""}`,
    volkIds: [...new Set(massnahmen.map((massnahme) => massnahme.volkId))],
    massnahmeIds: massnahmen.map((massnahme) => massnahme.id),
    erledigt,
    datum: zeitpunkt,
    erstelltAm: zeitpunkt,
    felder,
    fehlversuche: 0,
    fehler: null,
  };
}

/// Haken, die noch nicht angekommen sind: Maßnahme -> erledigt ja/nein (der
/// letzte gewinnt). Damit zeigen die Listen schon den neuen Stand.
export function wartendeHaken(sendungen: SendungKurz[]): Map<string, boolean> {
  const haken = new Map<string, boolean>();
  for (const sendung of sendungen) {
    if (sendung.art !== "erledigt" || sendung.fehler) continue;
    for (const id of sendung.massnahmeIds ?? []) haken.set(id, sendung.erledigt === true);
  }
  return haken;
}

/// "2 Durchsichten, 1 Maßnahme" - für die Leiste oben. Gezählt wird je Volk:
/// ein Sammel-Eintrag für 4 Völker sind 4 Durchsichten.
export function sendungenZaehlen(sendungen: SendungKurz[]): { text: string; anzahl: number } {
  let durchsichten = 0;
  let massnahmen = 0;
  // Haken je Maßnahme: abgehakt und wieder geöffnet zählt einmal.
  const hakenIds = new Set<string>();
  for (const sendung of sendungen) {
    const voelker = Math.max(1, sendung.volkIds.length);
    if (sendung.art === "massnahme") massnahmen += voelker;
    else if (sendung.art === "erledigt") for (const id of sendung.massnahmeIds ?? [sendung.id]) hakenIds.add(id);
    else durchsichten += voelker;
  }
  const haken = hakenIds.size;
  const teile = [
    durchsichten > 0 && (durchsichten === 1 ? "1 Durchsicht" : `${durchsichten} Durchsichten`),
    massnahmen > 0 && (massnahmen === 1 ? "1 Maßnahme" : `${massnahmen} Maßnahmen`),
    haken > 0 && `${haken} Haken`,
  ].filter((teil): teil is string => Boolean(teil));
  return { text: teile.join(", "), anzahl: durchsichten + massnahmen + haken };
}
