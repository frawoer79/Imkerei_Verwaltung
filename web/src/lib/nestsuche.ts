// Berechnungen zur Velutina-Nestsuche (Locktopf, Abflugrichtung, Rundzeit),
// ohne Datenbankzugriff - läuft im Browser für die Karte. Grundlage und
// Quellen der Faustregeln: machbarkeit/velutina-nestsuche-triangulation.md
// im Projektordner.

export type NestsucheBeobachtung = {
  id: string;
  locktopfId: string;
  markierung: string;
  farbe: string;
  richtungGrad: number | null;
  richtungQuelle: string | null;
  toleranzGrad: number;
  rundzeitenSek: number[];
  abflugAmMs: number | null;
  notiz: string | null;
};

export type NestsucheLocktopf = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  beobachtungen: NestsucheBeobachtung[];
};

/// Nester liegen fast immer innerhalb von 2 km um die Futterstelle - so lang
/// wird der Korridor gezeichnet, wenn noch keine Zeit gestoppt ist.
export const KORRIDOR_LAENGE_M = 2000;

export const TOLERANZEN_GRAD = [5, 10, 15, 20] as const;
export const TOLERANZ_STANDARD_GRAD = 10;

/// Missweisung (Abweichung magnetisch Nord zu geografisch Nord) in
/// Baden-Württemberg 2026, rund +3,5° nach Osten. Das Handy liefert
/// magnetisch Nord, die Karte rechnet geografisch.
export const MISSWEISUNG_GRAD = 3.5;

export const MARKIERUNGSFARBEN: { name: string; farbe: string }[] = [
  { name: "Gelb", farbe: "#eab308" },
  { name: "Rot", farbe: "#dc2626" },
  { name: "Blau", farbe: "#2563eb" },
  { name: "Grün", farbe: "#16a34a" },
  { name: "Weiß", farbe: "#94a3b8" },
  { name: "Rosa", farbe: "#db2777" },
  { name: "Orange", farbe: "#ea580c" },
  { name: "Lila", farbe: "#7c3aed" },
];

// Entfernung Futterstelle -> Nest aus der kürzesten Rundzeit nach der
// Faustregel der LWG Bayern (Franks Wahl, 13.10.2026): 45 s Verweildauer im
// Nest abziehen, Rest halbieren (Hin- und Rückflug) und mit 5 bis 6,5 m/s
// Fluggeschwindigkeit rechnen, also (t - 45 s) x 2,5 bis 3,25 m.
// Zum Vergleich (nicht verwendet): Vespawatch 100 m je Minute,
// BienenSchweiz 120 m je Minute.
export function entfernungsBand(rundzeitSek: number): { minM: number; maxM: number } {
  const netto = Math.max(0, rundzeitSek - 45);
  const minM = netto * 2.5;
  // Mindestens 50 m Spielraum - bei ganz kurzen Zeiten ist das Nest "sehr nah".
  const maxM = Math.max(netto * 3.25, minM + 50);
  return { minM, maxM };
}

export function kuerzesteZeit(beobachtung: Pick<NestsucheBeobachtung, "rundzeitenSek">): number | null {
  return beobachtung.rundzeitenSek.length > 0 ? Math.min(...beobachtung.rundzeitenSek) : null;
}

export function zeitAnzeige(sekunden: number): string {
  const s = Math.round(sekunden);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/// "2:05", "125", "2.05" oder "2'05" -> Sekunden. Eine Zahl ohne Trenner gilt
/// als Sekunden.
export function zeitLesen(text: string): number | null {
  const sauber = text.trim().replace(",", ".");
  if (!sauber) return null;
  const teile = sauber.split(/[:.'\s]+/).filter(Boolean);
  if (teile.length === 1) {
    const wert = Number(teile[0]);
    return Number.isFinite(wert) && wert > 0 ? Math.round(wert) : null;
  }
  if (teile.length === 2) {
    const minuten = Number(teile[0]);
    const sekunden = Number(teile[1]);
    if (!Number.isFinite(minuten) || !Number.isFinite(sekunden) || sekunden >= 60) return null;
    const summe = Math.round(minuten * 60 + sekunden);
    return summe > 0 ? summe : null;
  }
  return null;
}

export function meterAnzeige(meter: number): string {
  if (meter >= 1000) return `${(meter / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
  return `${Math.round(meter / 10) * 10} m`;
}

export function richtungAnzeige(grad: number): string {
  const namen = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const normal = ((grad % 360) + 360) % 360;
  return `${Math.round(normal)}° ${namen[Math.round(normal / 22.5) % 16]}`;
}

const ERDRADIUS_M = 6371000;
const RAD = Math.PI / 180;

/// Zielpunkt von (lat, lng) aus in Richtung `grad` nach `meter`.
export function zielpunkt(lat: number, lng: number, grad: number, meter: number): [number, number] {
  const winkel = meter / ERDRADIUS_M;
  const richtung = grad * RAD;
  const phi1 = lat * RAD;
  const lambda1 = lng * RAD;
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(winkel) + Math.cos(phi1) * Math.sin(winkel) * Math.cos(richtung));
  const lambda2 =
    lambda1 +
    Math.atan2(Math.sin(richtung) * Math.sin(winkel) * Math.cos(phi1), Math.cos(winkel) - Math.sin(phi1) * Math.sin(phi2));
  return [phi2 / RAD, lambda2 / RAD];
}

/// Richtung von Punkt 1 nach Punkt 2 in Grad (0 = Nord, im Uhrzeigersinn).
export function richtungZwischen(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = lat1 * RAD;
  const phi2 = lat2 * RAD;
  const dLambda = (lng2 - lng1) * RAD;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) / RAD) % 360 + 360) % 360;
}

/// Bereich einer Beobachtung: Kreisausschnitt in Flugrichtung (± Toleranz)
/// zwischen minM und maxM. Ohne Richtung, aber mit Zeit: ein Ring.
export type Bereich = {
  beobachtungId: string;
  lat: number;
  lng: number;
  richtungGrad: number | null;
  toleranzGrad: number;
  minM: number;
  maxM: number;
  /// true, wenn eine Rundzeit vorliegt (sonst nur Korridor bis 2 km).
  mitZeit: boolean;
};

export function bereichVon(locktopf: NestsucheLocktopf, beobachtung: NestsucheBeobachtung): Bereich | null {
  const zeit = kuerzesteZeit(beobachtung);
  if (beobachtung.richtungGrad === null && zeit === null) return null;
  const band = zeit !== null ? entfernungsBand(zeit) : { minM: 0, maxM: KORRIDOR_LAENGE_M };
  return {
    beobachtungId: beobachtung.id,
    lat: locktopf.lat,
    lng: locktopf.lng,
    richtungGrad: beobachtung.richtungGrad,
    toleranzGrad: beobachtung.toleranzGrad,
    minM: band.minM,
    maxM: band.maxM,
    mitZeit: zeit !== null,
  };
}

/// Umriss eines Kreisausschnitts (bzw. Rings) als Punktliste für die Karte.
export function ausschnittUmriss(
  lat: number,
  lng: number,
  richtungGrad: number | null,
  toleranzGrad: number,
  minM: number,
  maxM: number,
): [number, number][] | [number, number][][] {
  if (richtungGrad === null) {
    // Ring: äußerer Kreis und innerer Kreis als Loch.
    const aussen: [number, number][] = [];
    const innen: [number, number][] = [];
    for (let grad = 0; grad < 360; grad += 5) {
      aussen.push(zielpunkt(lat, lng, grad, maxM));
      if (minM > 0) innen.push(zielpunkt(lat, lng, grad, minM));
    }
    return minM > 0 ? [aussen, innen] : aussen;
  }
  const punkte: [number, number][] = [];
  const schritte = Math.max(4, Math.ceil(toleranzGrad));
  for (let i = 0; i <= schritte; i++) {
    punkte.push(zielpunkt(lat, lng, richtungGrad - toleranzGrad + (2 * toleranzGrad * i) / schritte, maxM));
  }
  if (minM <= 0) {
    punkte.push([lat, lng]);
  } else {
    for (let i = schritte; i >= 0; i--) {
      punkte.push(zielpunkt(lat, lng, richtungGrad - toleranzGrad + (2 * toleranzGrad * i) / schritte, minM));
    }
  }
  return punkte;
}

function winkelAbstand(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

export type Schnitt = {
  /// Raster für die Karte: je Zelle 2 = in allen Bereichen, 1 = in allen
  /// bis auf einen (erst ab drei Bereichen), 0 = sonst.
  raster: Uint8Array;
  spalten: number;
  zeilen: number;
  sued: number;
  west: number;
  nord: number;
  ost: number;
  /// Mitte des roten Bereichs (bzw. orange, wenn es kein Rot gibt).
  mitte: [number, number] | null;
  /// Ausdehnung des roten bzw. orangen Bereichs in Metern (Ost-West, Nord-Süd).
  breiteM: number;
  hoeheM: number;
  /// Fläche in m².
  flaecheM2: number;
  /// Welche Stufe die Mitte beschreibt.
  stufe: "alle" | "alleBisAufEinen" | null;
  anzahlBereiche: number;
  /// true, wenn alle Peilungen fast parallel verlaufen (unter 30°).
  fastParallel: boolean;
};

// Schnittfläche aller Bereiche: Die Umgebung wird in ein Raster von etwa
// 300 x 300 Zellen geteilt, für jede Zelle wird gezählt, in wie vielen
// Bereichen sie liegt. Rechnet in einer ebenen Näherung um die Mitte - auf
// wenige Kilometer genau genug.
export function schnittBerechnen(bereiche: Bereich[]): Schnitt | null {
  if (bereiche.length < 2) return null;
  const lat0 = bereiche.reduce((s, b) => s + b.lat, 0) / bereiche.length;
  const lng0 = bereiche.reduce((s, b) => s + b.lng, 0) / bereiche.length;
  const mProGradLat = 111320;
  const mProGradLng = 111320 * Math.cos(lat0 * RAD);
  const nachX = (lng: number) => (lng - lng0) * mProGradLng;
  const nachY = (lat: number) => (lat - lat0) * mProGradLat;

  const lokal = bereiche.map((b) => ({ ...b, x: nachX(b.lng), y: nachY(b.lat) }));

  // Ausdehnung: alle Bereiche umschließen.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const b of lokal) {
    minX = Math.min(minX, b.x - b.maxM);
    maxX = Math.max(maxX, b.x + b.maxM);
    minY = Math.min(minY, b.y - b.maxM);
    maxY = Math.max(maxY, b.y + b.maxM);
  }
  const groesse = Math.max(maxX - minX, maxY - minY);
  const zelle = Math.max(2, groesse / 300);
  const spalten = Math.ceil((maxX - minX) / zelle);
  const zeilen = Math.ceil((maxY - minY) / zelle);
  const n = lokal.length;
  const raster = new Uint8Array(spalten * zeilen);

  const zaehler = { alle: { sx: 0, sy: 0, n: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity } };
  const zweit = { sx: 0, sy: 0, n: 0, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };

  for (let zeile = 0; zeile < zeilen; zeile++) {
    // Zeile 0 = Norden (Bild läuft von oben nach unten).
    const y = maxY - (zeile + 0.5) * zelle;
    for (let spalte = 0; spalte < spalten; spalte++) {
      const x = minX + (spalte + 0.5) * zelle;
      let treffer = 0;
      for (const b of lokal) {
        const dx = x - b.x;
        const dy = y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < b.minM || d > b.maxM) continue;
        if (b.richtungGrad !== null) {
          const grad = ((Math.atan2(dx, dy) / RAD) + 360) % 360;
          if (winkelAbstand(grad, b.richtungGrad) > b.toleranzGrad) continue;
        }
        treffer++;
      }
      const stufe = treffer === n ? 2 : n >= 3 && treffer === n - 1 ? 1 : 0;
      raster[zeile * spalten + spalte] = stufe;
      const ziel = stufe === 2 ? zaehler.alle : stufe === 1 ? zweit : null;
      if (ziel) {
        ziel.sx += x;
        ziel.sy += y;
        ziel.n++;
        ziel.x0 = Math.min(ziel.x0, x);
        ziel.x1 = Math.max(ziel.x1, x);
        ziel.y0 = Math.min(ziel.y0, y);
        ziel.y1 = Math.max(ziel.y1, y);
      }
    }
  }

  const basis = zaehler.alle.n > 0 ? zaehler.alle : zweit.n > 0 ? zweit : null;
  const mitte: [number, number] | null = basis
    ? [lat0 + basis.sy / basis.n / mProGradLat, lng0 + basis.sx / basis.n / mProGradLng]
    : null;

  // Fast parallel: größter Winkel zwischen zwei Peilungen (Richtung egal,
  // also auf 0-90° gefaltet) unter 30°.
  const richtungen = lokal.filter((b) => b.richtungGrad !== null).map((b) => b.richtungGrad!);
  let groessterWinkel = 0;
  for (let i = 0; i < richtungen.length; i++) {
    for (let j = i + 1; j < richtungen.length; j++) {
      const d = winkelAbstand(richtungen[i], richtungen[j]);
      groessterWinkel = Math.max(groessterWinkel, Math.min(d, 180 - d));
    }
  }

  return {
    raster,
    spalten,
    zeilen,
    sued: lat0 + (maxY - zeilen * zelle) / mProGradLat,
    nord: lat0 + maxY / mProGradLat,
    west: lng0 + minX / mProGradLng,
    ost: lng0 + (minX + spalten * zelle) / mProGradLng,
    mitte,
    breiteM: basis ? basis.x1 - basis.x0 + zelle : 0,
    hoeheM: basis ? basis.y1 - basis.y0 + zelle : 0,
    flaecheM2: basis ? basis.n * zelle * zelle : 0,
    stufe: zaehler.alle.n > 0 ? "alle" : zweit.n > 0 ? "alleBisAufEinen" : null,
    anzahlBereiche: n,
    fastParallel: richtungen.length >= 2 && groessterWinkel < 30,
  };
}
