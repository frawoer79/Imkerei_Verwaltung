// Merkt sich, über welche Seiten man innerhalb der App gekommen ist - Grundlage
// für den Knopf "Zurück" (siehe components/seiten-navigation.tsx).
//
// Warum nicht einfach der Browser-Verlauf? Der kennt nur das, was der Browser
// gesehen hat: Nach "Speichern" in einem Formular landet man z. B. wieder auf
// dem Volk, und ein reines "Zurück" im Browser führte dann zurück ins schon
// abgeschickte Formular. Öffnet man eine Seite per QR-Code, Kalender-Link oder
// in einem neuen Tab, gibt es gar keine vorherige App-Seite, und "Zurück"
// würde die App verlassen. Deshalb führt die App eine eigene Liste:
//
// - Jede neue Seite kommt oben drauf.
// - Kommt man auf eine Seite, die schon weiter unten in der Liste steht
//   (etwa nach dem Speichern zurück aufs Volk oder über das Menü), wird alles
//   darüber gestrichen. So läuft "Zurück" nie im Kreis.
// - Formularseiten (…/neu, …/bearbeiten, …/loeschen), die abgeschickt wurden,
//   werden beim Verlassen gestrichen - dorthin will niemand zurück.
//
// Gespeichert im sessionStorage: gilt nur für diesen Tab, übersteht aber ein
// Neuladen der Seite.

const SCHLUESSEL = "seitenverlauf";
const EREIGNIS = "seitenverlauf-geaendert";
const HOECHSTENS = 50;

export type Verlauf = {
  // Adressen (Pfad + Suchparameter), älteste zuerst, aktuelle Seite zuletzt.
  seiten: string[];
  // Ob die letzte Seite per einfachem Weiterklicken von der vorletzten aus
  // erreicht wurde. Nur dann ist der vorherige Eintrag im Browser-Verlauf
  // genau die vorletzte Seite, und "Zurück" kann den Browser-Verlauf nutzen
  // (stellt die Scrollposition wieder her).
  browserGleich: boolean;
  // Aktuelle Formularseite wurde abgeschickt.
  abgeschickt: boolean;
};

const LEER: Verlauf = { seiten: [], browserGleich: false, abgeschickt: false };

export function pfadOhneSuche(adresse: string): string {
  const i = adresse.indexOf("?");
  return i === -1 ? adresse : adresse.slice(0, i);
}

function istFormularseite(adresse: string): boolean {
  return /\/(neu|bearbeiten|loeschen)$/.test(pfadOhneSuche(adresse));
}

export function verlaufRoh(): string | null {
  try {
    return sessionStorage.getItem(SCHLUESSEL);
  } catch {
    return null;
  }
}

export function verlaufLesen(roh: string | null = verlaufRoh()): Verlauf {
  if (!roh) return LEER;
  try {
    const wert = JSON.parse(roh) as Verlauf;
    return Array.isArray(wert.seiten) ? wert : LEER;
  } catch {
    return LEER;
  }
}

function verlaufSchreiben(verlauf: Verlauf) {
  try {
    sessionStorage.setItem(SCHLUESSEL, JSON.stringify({ ...verlauf, seiten: verlauf.seiten.slice(-HOECHSTENS) }));
  } catch {
    // Privater Modus o. ä.: dann gibt es eben nur den Sprung zur übergeordneten Seite.
  }
  window.dispatchEvent(new Event(EREIGNIS));
}

export function verlaufAbonnieren(rueckruf: () => void) {
  window.addEventListener(EREIGNIS, rueckruf);
  return () => window.removeEventListener(EREIGNIS, rueckruf);
}

// Wird bei jedem Seitenwechsel aufgerufen (SeitenverlaufErfassen im Layout).
export function seiteErfassen(adresse: string) {
  const alt = verlaufLesen();
  let seiten = [...alt.seiten];
  const oben = seiten[seiten.length - 1];

  if (oben === adresse) return;

  // Nur die Suchparameter haben sich geändert (Filter, Jahr, Reiter): gleiche
  // Seite, kein eigener Zurück-Schritt.
  if (oben !== undefined && pfadOhneSuche(oben) === pfadOhneSuche(adresse)) {
    seiten[seiten.length - 1] = adresse;
    verlaufSchreiben({ seiten, browserGleich: false, abgeschickt: alt.abgeschickt });
    return;
  }

  let browserGleich = true;
  if (alt.abgeschickt && oben !== undefined && istFormularseite(oben)) {
    seiten.pop();
    browserGleich = false;
  }

  let schonDa = -1;
  for (let i = seiten.length - 1; i >= 0 && schonDa === -1; i--) {
    if (pfadOhneSuche(seiten[i]) === pfadOhneSuche(adresse)) schonDa = i;
  }
  if (schonDa !== -1) {
    seiten = seiten.slice(0, schonDa);
    browserGleich = false;
  }

  seiten.push(adresse);
  verlaufSchreiben({ seiten, browserGleich, abgeschickt: false });
}

export function formularAbgeschickt() {
  const verlauf = verlaufLesen();
  if (verlauf.seiten.length > 0 && !verlauf.abgeschickt) verlaufSchreiben({ ...verlauf, abgeschickt: true });
}

// Die Seite, auf die "Zurück" führt: der letzte Eintrag, der nicht die
// aktuelle Seite ist (während eines Seitenwechsels ist die neue Seite evtl.
// noch nicht erfasst).
export function vorherigeSeite(verlauf: Verlauf, aktuellerPfad: string): string | null {
  for (let i = verlauf.seiten.length - 1; i >= 0; i--) {
    if (pfadOhneSuche(verlauf.seiten[i]) !== aktuellerPfad) return verlauf.seiten[i];
  }
  return null;
}

// Fängt an einer Seite ohne App-Vorgeschichte neu an (Sprung zur
// übergeordneten Seite): Die übergeordnete Seite wird dann zur ersten.
export function verlaufLeeren() {
  verlaufSchreiben(LEER);
}
