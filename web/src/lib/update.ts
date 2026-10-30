import { basisPrisma } from "@/lib/datenbank";

// Update-Prüfung für selbst installierte Instanzen (Konzept: Claude Doc
// "Updates für selbst gehostete Instanzen"). Der Server fragt einmal am Tag
// bei GitHub nach, ob es eine neuere Version gibt. Dabei geht nur eine
// gewöhnliche Abfrage an api.github.com raus, keine Daten der Imkerei.
//
// Die eigene Versionsnummer steckt im Image: GitHub Actions baut es beim
// Freigeben einer Version und setzt IMKEREI_APP_VERSION (siehe
// .github/workflows/release.yml und web/Dockerfile). Wer selbst aus dem
// Quellcode baut (Franks Coolify), hat keine Nummer - dann gibt es keine
// Prüfung und kein Band, Updates kommen dort über den eigenen Hoster.

// Das öffentliche Repository (Schaufenster), nicht das private Arbeitsrepo.
export const REPOSITORY = "frawoer79/Imkerei_Verwaltung";
export const ALLE_VERSIONEN_ADRESSE = `https://github.com/${REPOSITORY}/releases`;
// Zum Testen auf eine eigene Adresse umstellbar.
const QUELLE = process.env.UPDATE_QUELLE || `https://api.github.com/repos/${REPOSITORY}/releases?per_page=30`;

export const PRUEF_ABSTAND_MS = 24 * 60 * 60 * 1000;
export const SPAETER_MS = 7 * 24 * 60 * 60 * 1000;
// Längere Änderungslisten werden gekürzt, die volle steht auf GitHub.
const TEXT_MAX = 20_000;

export type Version = { haupt: number; neben: number; korrektur: number };

export type NeueVersion = {
  version: string;
  titel: string;
  datum: string | null;
  text: string;
  adresse: string;
};

// "v1.4.0" oder "1.4.0"; alles andere (z.B. "1.4.0-rc1") zählt nicht.
export function versionLesen(text: string | null | undefined): Version | null {
  const treffer = /^v?(\d+)\.(\d+)\.(\d+)$/.exec((text ?? "").trim());
  if (!treffer) return null;
  return { haupt: Number(treffer[1]), neben: Number(treffer[2]), korrektur: Number(treffer[3]) };
}

export function versionVergleichen(a: Version, b: Version): number {
  return a.haupt - b.haupt || a.neben - b.neben || a.korrektur - b.korrektur;
}

function versionText(v: Version): string {
  return `${v.haupt}.${v.neben}.${v.korrektur}`;
}

// Version dieser Instanz, z.B. "1.4.0"; null beim Bau aus dem Quellcode.
export function eigeneVersion(): string | null {
  const v = versionLesen(process.env.IMKEREI_APP_VERSION);
  return v ? versionText(v) : null;
}

// Prüfen geht nur mit bekannter eigener Version. UPDATE_PRUEFUNG=aus schaltet
// es für den ganzen Server ab, auch ohne Schalter in der App.
export function pruefungMoeglich(): boolean {
  return eigeneVersion() !== null && process.env.UPDATE_PRUEFUNG !== "aus";
}

// Sicherheitsupdates stehen so im Titel des Release (siehe AENDERUNGEN.md).
export function istSicherheitsupdate(neu: NeueVersion): boolean {
  return /sicherheit/i.test(neu.titel);
}

export function istNeueHauptversion(neu: NeueVersion): boolean {
  const eigene = versionLesen(eigeneVersion());
  const andere = versionLesen(neu.version);
  return eigene !== null && andere !== null && andere.haupt > eigene.haupt;
}

export async function updateStandLaden() {
  return basisPrisma.updateStand.findUnique({ where: { id: "standard" } });
}

export async function pruefungAn(): Promise<boolean> {
  return (await updateStandLaden())?.pruefungAn ?? true;
}

// Gemerkte neuere Versionen. Nach einem Update ist ein Teil davon schon
// eingespielt, bevor die nächste Prüfung läuft, deshalb hier noch einmal
// gegen die laufende Version filtern.
export function neuereVersionen(stand: { neuere: unknown } | null): NeueVersion[] {
  const eigene = versionLesen(eigeneVersion());
  if (!eigene || !Array.isArray(stand?.neuere)) return [];
  return (stand.neuere as NeueVersion[]).filter((neu) => {
    const v = versionLesen(neu.version);
    return v !== null && versionVergleichen(v, eigene) > 0;
  });
}

type GithubRelease = {
  tag_name?: string;
  name?: string | null;
  body?: string | null;
  html_url?: string;
  published_at?: string | null;
  draft?: boolean;
  prerelease?: boolean;
};

// Aus der Antwort von GitHub alle Versionen, die neuer sind als die eigene,
// neueste zuerst. Entwürfe und Vorabversionen zählen nicht.
export function neuereAusReleases(releases: GithubRelease[], eigene: string): NeueVersion[] {
  const basis = versionLesen(eigene);
  if (!basis) return [];
  return releases
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({ r, v: versionLesen(r.tag_name) }))
    .filter((x): x is { r: GithubRelease; v: Version } => x.v !== null && versionVergleichen(x.v, basis) > 0)
    .sort((a, b) => versionVergleichen(b.v, a.v))
    .map(({ r, v }) => ({
      version: versionText(v),
      titel: (r.name ?? "").trim() || versionText(v),
      datum: r.published_at ?? null,
      text: (r.body ?? "").slice(0, TEXT_MAX),
      adresse: r.html_url ?? ALLE_VERSIONEN_ADRESSE,
    }));
}

// Fragt GitHub. Kein Netz oder Fehler: nur merken, nie die App stören.
export async function updatePruefen(): Promise<void> {
  const eigene = eigeneVersion();
  if (!eigene) return;
  const jetzt = new Date();
  try {
    const antwort = await fetch(QUELLE, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `imkereiverwaltung/${eigene}`,
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!antwort.ok) throw new Error(`GitHub antwortet mit ${antwort.status}.`);
    const releases = (await antwort.json()) as GithubRelease[];
    if (!Array.isArray(releases)) throw new Error("Unerwartete Antwort von GitHub.");
    const neuere = neuereAusReleases(releases, eigene);
    await basisPrisma.updateStand.upsert({
      where: { id: "standard" },
      create: { id: "standard", letztePruefung: jetzt, fehler: null, neuere },
      update: { letztePruefung: jetzt, fehler: null, neuere },
    });
  } catch (fehler) {
    const meldung = fehler instanceof Error ? fehler.message : String(fehler);
    await basisPrisma.updateStand.upsert({
      where: { id: "standard" },
      create: { id: "standard", letztePruefung: jetzt, fehler: meldung },
      update: { letztePruefung: jetzt, fehler: meldung },
    });
  }
}

export async function pruefungFaellig(): Promise<boolean> {
  if (!pruefungMoeglich()) return false;
  const stand = await updateStandLaden();
  if (stand && !stand.pruefungAn) return false;
  return !stand?.letztePruefung || Date.now() - stand.letztePruefung.getTime() > PRUEF_ABSTAND_MS;
}

export type UpdateHinweis = {
  version: string;
  sicherheit: boolean;
  hauptversion: boolean;
};

// Für das Band oben (nur der Hauptzugang sieht es, siehe layout.tsx): gibt
// es eine neuere Version, die nicht auf "Später" oder "Überspringen" steht?
// Sicherheitsupdates lassen sich nicht überspringen, "Später" heißt bei
// ihnen nur bis morgen (siehe update-actions.ts).
export async function updateHinweis(): Promise<UpdateHinweis | null> {
  if (!pruefungMoeglich()) return null;
  try {
    const stand = await updateStandLaden();
    if (!stand?.pruefungAn) return null;
    const neuere = neuereVersionen(stand);
    if (neuere.length === 0) return null;
    const sicherheit = neuere.some(istSicherheitsupdate);
    const neueste = neuere[0];
    if (stand.spaeterBis && stand.spaeterBis.getTime() > Date.now()) return null;
    if (!sicherheit && stand.uebersprungen === neueste.version) return null;
    return { version: neueste.version, sicherheit, hauptversion: istNeueHauptversion(neueste) };
  } catch {
    // Das Band darf nie die Seite mitreißen.
    return null;
  }
}
