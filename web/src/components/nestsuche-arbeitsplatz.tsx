"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, useTransition, type RefObject } from "react";
import type * as Leaflet from "leaflet";
import { leafletIconsVonCdnLaden, standPinIcon, standPinSvg } from "@/lib/leaflet-icons";
import { KartenLegende } from "@/components/karten-legende";
import { kartenebeneSetzen, type Kartentyp, type KartenebenenRefs } from "@/lib/kartenebenen";
import { useVollbild } from "@/lib/use-vollbild";
import { meinStandortKnopf } from "@/lib/mein-standort";
import { KartentypUmschalter } from "@/components/kartentyp-umschalter";
import { VollbildButton } from "@/components/vollbild-button";
import { Button, Card } from "@/components/ui";
import { BeobachtungKarte } from "@/components/nestsuche-beobachtung";
import { useKompass } from "@/lib/use-kompass";
import { abstandMeter, type StandPunkt } from "@/lib/velutina-daten";
import {
  KORRIDOR_LAENGE_M,
  ausschnittUmriss,
  bereichVon,
  entfernungsBand,
  kuerzesteZeit,
  meterAnzeige,
  richtungZwischen,
  schnittBerechnen,
  zeitAnzeige,
  zielpunkt,
  type Bereich,
  type NestsucheLocktopf,
} from "@/lib/nestsuche";
import {
  beobachtungAendern,
  beobachtungAnlegen,
  locktopfAnlegen,
  locktopfLoeschen,
  locktopfUmbenennen,
  locktopfVerschieben,
  nestsucheAbschliessen,
  nestsucheLoeschen,
  nestsucheWiederAufnehmen,
  nestsucheArchivieren,
  nestsucheAusArchiv,
} from "@/lib/nestsuche-actions";
import { bestaetigen } from "@/lib/bestaetigen";
import { LAENGE } from "@/lib/eingabe-grenzen";

const BW_MITTE: [number, number] = [48.6, 9.0];
const SCHNITT_FARBE = "#dc2626";

type Modus =
  | { art: "keiner" }
  | { art: "locktopf" }
  | { art: "verschieben"; locktopfId: string }
  | { art: "richtung"; beobachtungId: string }
  | { art: "nest" };

export type Vorschau = { beobachtungId: string; grad: number } | null;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (zeichen) => `&#${zeichen.charCodeAt(0)};`);
}

// Tooltip-Text in einer Hülle, damit er sich bei gedrehter Karte zurückdrehen
// kann (siehe globals.css, "karte-gedreht"). Erwartet bereits sicheres HTML.
function tooltipHtml(html: string): string {
  return `<span class="karte-tooltip-text">${html}</span>`;
}

// Eine Strecke auf dem Bildschirm in die gedrehte Karte umrechnen. winkel ist
// die Drehung der Karte in Grad im Uhrzeigersinn (wie CSS rotate).
function bildschirmZuKarte(x: number, y: number, winkel: number): [number, number] {
  const rad = (winkel * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos * x + sin * y, -sin * x + cos * y];
}

// Leaflet so anpassen, dass Tippen, Ziehen und Zoomen auch auf der gedrehten
// Karte an der richtigen Stelle ankommen. Bedienelemente (Zoom, Quellenangabe)
// liegen außerhalb des drehenden Felds, damit sie fest in der Ecke bleiben.
function drehbarMachen(
  L: typeof Leaflet,
  map: Leaflet.Map,
  steuer: HTMLDivElement | null,
  aussenRef: RefObject<HTMLDivElement | null>,
  drehungRef: RefObject<number>,
) {
  const innen = map.getContainer();
  const bedienelemente = innen.querySelector(".leaflet-control-container");
  if (steuer && bedienelemente) {
    // Leaflets Klassen mitnehmen, die Bedienelemente sehen sonst anders aus.
    ["leaflet-container", "leaflet-touch", "leaflet-retina"].forEach((klasse) => {
      if (innen.classList.contains(klasse)) steuer.classList.add(klasse);
    });
    steuer.appendChild(bedienelemente);
  }

  // Bildschirmpunkt (Maus, Finger) -> Punkt in der Karte. Leaflet rechnet
  // damit Tippen, Mausrad- und Fingerzoom um. Gedreht wird um die Mitte.
  const original = map.mouseEventToContainerPoint.bind(map);
  map.mouseEventToContainerPoint = (event: MouseEvent) => {
    const winkel = drehungRef.current;
    const aussen = aussenRef.current;
    if (!winkel || !aussen) return original(event);
    const rahmen = aussen.getBoundingClientRect();
    const [x, y] = bildschirmZuKarte(
      event.clientX - (rahmen.left + rahmen.width / 2),
      event.clientY - (rahmen.top + rahmen.height / 2),
      winkel,
    );
    const groesse = map.getSize();
    return L.point(groesse.x / 2 + x, groesse.y / 2 + y);
  };

  // Ziehen: Leaflet verschiebt die Karte um die Fingerstrecke auf dem
  // Bildschirm. Bei gedrehter Karte muss diese Strecke mitgedreht werden,
  // sonst läuft die Karte schräg weg.
  const ziehen = (map.dragging as unknown as { _draggable?: Leaflet.Draggable })._draggable;
  ziehen?.on("predrag", () => {
    const winkel = drehungRef.current;
    if (!winkel) return;
    const intern = ziehen as unknown as {
      _newPos: Leaflet.Point;
      _startPos: Leaflet.Point;
      _parentScale: { x: number; y: number };
    };
    // Leaflet teilt durch die scheinbare Größe des gedrehten Felds, das
    // wieder herausrechnen.
    const [x, y] = bildschirmZuKarte(
      (intern._newPos.x - intern._startPos.x) * intern._parentScale.x,
      (intern._newPos.y - intern._startPos.y) * intern._parentScale.y,
      winkel,
    );
    intern._newPos = intern._startPos.add(L.point(x, y));
  });
}

export function NestsucheArbeitsplatz({
  suche,
  locktoepfe,
  staende,
  lubwNester,
}: {
  suche: {
    id: string;
    name: string;
    abgeschlossen: boolean;
    archiviert: boolean;
    nest: { lat: number; lng: number } | null;
  };
  locktoepfe: NestsucheLocktopf[];
  staende: StandPunkt[];
  lubwNester: { id: string; lat: number; lng: number }[];
}) {
  const [, startTransition] = useTransition();
  const [modus, setModus] = useState<Modus>({ art: "keiner" });
  const [vorschau, setVorschau] = useState<Vorschau>(null);
  const [kartentyp, setKartentyp] = useState<Kartentyp>("hybrid");
  const [standortFehler, setStandortFehler] = useState<string | null>(null);
  const [standortHinweis, setStandortHinweis] = useState<string | null>(null);
  const [gpsLaeuft, setGpsLaeuft] = useState(false);
  const kompass = useKompass();
  // Ziehharmonika: nur ein Locktopf ist aufgeklappt. undefined = der neueste,
  // null = alle zugeklappt, sonst die gewählte Nummer. Ein neu angelegter
  // Locktopf klappt von selbst auf.
  const [offenGewaehlt, setOffenGewaehlt] = useState<string | null | undefined>(undefined);
  const [anzahlBekannt, setAnzahlBekannt] = useState(locktoepfe.length);
  if (locktoepfe.length !== anzahlBekannt) {
    setAnzahlBekannt(locktoepfe.length);
    if (locktoepfe.length > anzahlBekannt) setOffenGewaehlt(locktoepfe[locktoepfe.length - 1]?.id);
  }
  const offenId =
    offenGewaehlt === null
      ? null
      : locktoepfe.some((topf) => topf.id === offenGewaehlt)
        ? offenGewaehlt
        : (locktoepfe[locktoepfe.length - 1]?.id ?? null);
  const oeffneLocktopfRef = useRef<(id: string) => void>(() => {});

  const leafletRef = useRef<typeof Leaflet | null>(null);
  const aussenRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const steuerRef = useRef<HTMLDivElement | null>(null);
  // Aktuelle Drehung der Karte in Grad (im Uhrzeigersinn), 0 = Norden oben.
  const drehungRef = useRef(0);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const ebenenRef = useRef<KartenebenenRefs>({ basis: null, beschriftung: null });
  const inhaltRef = useRef<Leaflet.LayerGroup | null>(null);
  const modusRef = useRef<Modus>(modus);
  const datenRef = useRef(locktoepfe);
  const [karteBereit, setKarteBereit] = useState(false);
  const { istVollbild, vollbildUmschalten } = useVollbild(mapRef);

  useEffect(() => {
    modusRef.current = modus;
    datenRef.current = locktoepfe;
  }, [modus, locktoepfe]);

  // Der Kompass dient zwei Dingen: die Karte nach dem Handy zu drehen ("karte")
  // und die Richtung einer Hornisse zu peilen ("peil:<id>", immer nur eine).
  const karteDreht = kompass.hat("karte");
  const peilId = kompass.nutzer.find((name) => name.startsWith("peil:"))?.slice(5) ?? null;
  const aktiveVorschau: Vorschau =
    peilId !== null && kompass.grad !== null ? { beobachtungId: peilId, grad: kompass.grad } : vorschau;
  const vorschauId = aktiveVorschau?.beobachtungId ?? null;
  const vorschauGrad = aktiveVorschau?.grad ?? null;

  // Bereiche (Kreisausschnitte) aller Beobachtungen - mit der Vorschau, wenn
  // gerade eine Richtung per Kompass oder Schieber eingestellt wird.
  const bereiche = useMemo(() => {
    const liste: (Bereich & { farbe: string; markierung: string; locktopfName: string })[] = [];
    for (const topf of locktoepfe) {
      for (const beobachtung of topf.beobachtungen) {
        const mitVorschau =
          vorschauId === beobachtung.id && vorschauGrad !== null
            ? { ...beobachtung, richtungGrad: vorschauGrad }
            : beobachtung;
        const bereich = bereichVon(topf, mitVorschau);
        if (bereich) liste.push({ ...bereich, farbe: beobachtung.farbe, markierung: beobachtung.markierung, locktopfName: topf.name });
      }
    }
    return liste;
  }, [locktoepfe, vorschauId, vorschauGrad]);

  const schnitt = useMemo(() => schnittBerechnen(bereiche), [bereiche]);

  function kartenKlick(lat: number, lng: number) {
    const aktuell = modusRef.current;
    if (aktuell.art === "locktopf") {
      setModus({ art: "keiner" });
      startTransition(() => locktopfAnlegen(suche.id, lat, lng));
    } else if (aktuell.art === "verschieben") {
      setModus({ art: "keiner" });
      startTransition(() => locktopfVerschieben(aktuell.locktopfId, lat, lng));
    } else if (aktuell.art === "richtung") {
      const topf = datenRef.current.find((t) => t.beobachtungen.some((b) => b.id === aktuell.beobachtungId));
      if (!topf) return;
      const grad = richtungZwischen(topf.lat, topf.lng, lat, lng);
      setModus({ art: "keiner" });
      setVorschau({ beobachtungId: aktuell.beobachtungId, grad });
      startTransition(async () => {
        await beobachtungAendern(aktuell.beobachtungId, { richtungGrad: grad, richtungQuelle: "KARTE" });
        setVorschau(null);
      });
    } else if (aktuell.art === "nest") {
      setModus({ art: "keiner" });
      startTransition(() => nestsucheAbschliessen(suche.id, { lat, lng }));
    }
  }

  // Karte einmalig aufbauen.
  useEffect(() => {
    let abgebrochen = false;
    import("leaflet").then((L) => {
      if (abgebrochen || !mapContainerRef.current || mapRef.current) return;
      leafletIconsVonCdnLaden(L);
      leafletRef.current = L;
      // Mausrad: feine Zoomschritte (Viertelstufen, sonst springt ein Klick eine ganze Stufe)
      const map = L.map(mapContainerRef.current, { zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 240, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      meinStandortKnopf(L, map);
      drehbarMachen(L, map, steuerRef.current, aussenRef, drehungRef);
      ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, "hybrid");

      // Ausschnitt: Locktöpfe, sonst Stände, sonst Mitte BW.
      const punkte = datenRef.current.map((topf) => L.latLng(topf.lat, topf.lng));
      if (punkte.length > 0) {
        const grenzen = L.latLngBounds([]);
        punkte.forEach((punkt) => grenzen.extend(punkt.toBounds(900)));
        map.fitBounds(grenzen);
      } else if (staende.length > 0) {
        const grenzen = L.latLngBounds([]);
        staende.forEach((stand) => grenzen.extend(L.latLng(stand.lat, stand.lng).toBounds(2000)));
        map.fitBounds(grenzen);
      } else {
        map.setView(BW_MITTE, 8);
      }

      // Stände und LUBW-Nester fest, der Rest wird bei jeder Änderung neu gezeichnet.
      // Marker reichen Klicks an die Karte weiter (bubblingMouseEvents), sonst
      // ließe sich direkt auf einem Stand kein Locktopf oder keine Richtung setzen.
      // Der Pin steckt in einer Hülle, die sich bei gedrehter Karte um seine
      // Spitze zurückdreht und so aufrecht bleibt.
      staende.forEach((stand) => {
        const pin = standPinIcon(L, stand.wanderstand ?? false);
        const icon = L.divIcon({
          ...pin.options,
          html: `<div class="karte-aufrecht" style="width:25px;height:41px;transform-origin:12.5px 41px">${standPinSvg(stand.wanderstand ?? false)}</div>`,
        });
        L.marker([stand.lat, stand.lng], { icon, bubblingMouseEvents: true })
          .addTo(map)
          .bindTooltip(tooltipHtml(escapeHtml(stand.wanderstand ? `${stand.name} (Wanderstand)` : stand.name)));
      });
      const leinwand = L.canvas({ padding: 0.5 });
      lubwNester.forEach((nest) =>
        L.circleMarker([nest.lat, nest.lng], {
          renderer: leinwand,
          radius: 5,
          color: "#ffffff",
          weight: 1.5,
          fillColor: "#7f1d1d",
          fillOpacity: 0.9,
        })
          .bindTooltip(tooltipHtml("Nest laut LUBW"))
          .addTo(map),
      );

      map.on("click", (event: Leaflet.LeafletMouseEvent) => kartenKlick(event.latlng.lat, event.latlng.lng));
      inhaltRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setKarteBereit(true);
    });
    return () => {
      abgebrochen = true;
      mapRef.current?.remove();
      mapRef.current = null;
      inhaltRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inhalt zeichnen: Korridore, Vermutungsbereiche, Schnitt, Locktöpfe, Nest.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const gruppe = inhaltRef.current;
    if (!L || !map || !gruppe) return;
    gruppe.clearLayers();

    for (const bereich of bereiche) {
      if (bereich.richtungGrad !== null) {
        // Flugkorridor: blasser Keil bis 2 km (oder weiter, falls die Zeit mehr ergibt).
        const laenge = Math.max(KORRIDOR_LAENGE_M, bereich.maxM * 1.15);
        L.polygon(ausschnittUmriss(bereich.lat, bereich.lng, bereich.richtungGrad, bereich.toleranzGrad, 0, laenge), {
          color: bereich.farbe,
          weight: 1,
          dashArray: "4 4",
          opacity: 0.8,
          fillColor: bereich.farbe,
          fillOpacity: 0.07,
          interactive: false,
        }).addTo(gruppe);
        L.polyline([[bereich.lat, bereich.lng], zielpunkt(bereich.lat, bereich.lng, bereich.richtungGrad, laenge)], {
          color: bereich.farbe,
          weight: 2,
          opacity: 0.9,
          interactive: false,
        }).addTo(gruppe);
      }
      if (bereich.mitZeit) {
        L.polygon(
          ausschnittUmriss(bereich.lat, bereich.lng, bereich.richtungGrad, bereich.toleranzGrad, bereich.minM, bereich.maxM),
          {
            color: bereich.farbe,
            weight: 2,
            fillColor: bereich.farbe,
            fillOpacity: 0.22,
          },
        )
          .bindTooltip(
            tooltipHtml(
              `${escapeHtml(bereich.markierung)} (${escapeHtml(bereich.locktopfName)}): ${meterAnzeige(bereich.minM)}–${meterAnzeige(bereich.maxM)}`,
            ),
          )
          .addTo(gruppe);
      }
    }

    // Schnittbereich als Bild aus dem Rechenraster.
    if (schnitt && schnitt.stufe) {
      const leinwand = document.createElement("canvas");
      leinwand.width = schnitt.spalten;
      leinwand.height = schnitt.zeilen;
      const kontext = leinwand.getContext("2d");
      if (kontext) {
        const bild = kontext.createImageData(schnitt.spalten, schnitt.zeilen);
        for (let i = 0; i < schnitt.raster.length; i++) {
          const stufe = schnitt.raster[i];
          if (stufe === 0) continue;
          bild.data[i * 4] = stufe === 2 ? 220 : 249;
          bild.data[i * 4 + 1] = stufe === 2 ? 38 : 115;
          bild.data[i * 4 + 2] = stufe === 2 ? 38 : 22;
          bild.data[i * 4 + 3] = stufe === 2 ? 170 : 90;
        }
        kontext.putImageData(bild, 0, 0);
        L.imageOverlay(
          leinwand.toDataURL(),
          [
            [schnitt.sued, schnitt.west],
            [schnitt.nord, schnitt.ost],
          ],
          { interactive: false },
        ).addTo(gruppe);
      }
      if (schnitt.mitte) {
        L.marker(schnitt.mitte, {
          // Nicht anklickbar, damit ein Tippen genau auf die Mitte (Richtung
          // einzeichnen, Nest setzen) bei der Karte ankommt.
          interactive: false,
          icon: L.divIcon({
            className: "",
            html: `<div class="karte-aufrecht" style="width:26px;height:26px;margin:-13px 0 0 -13px;color:${SCHNITT_FARBE};font:700 26px/26px system-ui;text-align:center;text-shadow:0 0 3px #fff,0 0 3px #fff">✕</div>`,
            iconSize: [0, 0],
          }),
        })
          .addTo(gruppe);
      }
    }

    // Locktöpfe obenauf, nummeriert.
    locktoepfe.forEach((topf, index) => {
      L.marker([topf.lat, topf.lng], {
        bubblingMouseEvents: true,
        icon: L.divIcon({
          className: "",
          html: `<div class="karte-aufrecht" style="width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:7px;background:#78350f;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5);color:#fff;font:700 13px/22px system-ui;text-align:center">${index + 1}</div>`,
          iconSize: [0, 0],
        }),
      })
        .bindTooltip(tooltipHtml(escapeHtml(topf.name)))
        .on("click", () => oeffneLocktopfRef.current(topf.id))
        .addTo(gruppe);
    });

    if (suche.nest) {
      L.marker([suche.nest.lat, suche.nest.lng], {
        bubblingMouseEvents: true,
        icon: L.divIcon({
          className: "",
          html: `<div class="karte-aufrecht" style="width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:#111827;border:3px solid #facc15;color:#facc15;font:700 15px/24px system-ui;text-align:center">N</div>`,
          iconSize: [0, 0],
        }),
      })
        .bindTooltip(tooltipHtml("Gefundenes Nest"))
        .addTo(gruppe);
    }
  }, [bereiche, schnitt, locktoepfe, suche.nest, karteBereit]);

  // Fadenkreuz-Mauszeiger, solange ein Punkt gesetzt werden soll.
  useEffect(() => {
    const container = mapContainerRef.current;
    if (container) container.style.cursor = modus.art === "keiner" ? "" : "crosshair";
  }, [modus]);

  // Karte nach dem Handy drehen (selbst gebaut, ohne Zusatzpaket): Leaflet
  // kann von sich aus nicht drehen. Deshalb dreht sich das ganze Kartenfeld
  // per CSS. Damit beim Drehen keine leeren Ecken entstehen, wird es dafür zum
  // Quadrat so groß wie die Diagonale des sichtbaren Rahmens, mittig darunter.
  // Ohne Drehen füllt es einfach den Rahmen.
  useEffect(() => {
    const aussen = aussenRef.current;
    const innen = mapContainerRef.current;
    const map = mapRef.current;
    if (!aussen || !innen || !map) return;
    function anpassen() {
      if (!aussen || !innen || !map) return;
      if (karteDreht) {
        const breite = aussen.clientWidth;
        const hoehe = aussen.clientHeight;
        const seite = Math.ceil(Math.hypot(breite, hoehe));
        innen.style.width = `${seite}px`;
        innen.style.height = `${seite}px`;
        innen.style.left = `${(breite - seite) / 2}px`;
        innen.style.top = `${(hoehe - seite) / 2}px`;
      } else {
        innen.style.width = "100%";
        innen.style.height = "100%";
        innen.style.left = "0";
        innen.style.top = "0";
      }
      // Mitte der Karte bleibt dabei stehen.
      map.invalidateSize({ animate: false });
    }
    anpassen();
    innen.classList.toggle("karte-gedreht", karteDreht);
    const beobachter = new ResizeObserver(anpassen);
    beobachter.observe(aussen);
    return () => beobachter.disconnect();
  }, [karteDreht, karteBereit]);

  // Die Richtung, in die das Handy zeigt, steht senkrecht nach oben: Die Karte
  // dreht sich dafür gegen den Uhrzeigersinn um die Blickrichtung. Zeichen
  // und Beschriftungen drehen sich zurück (--gegendrehung, siehe globals.css).
  useEffect(() => {
    const innen = mapContainerRef.current;
    if (!innen) return;
    const winkel = karteDreht && kompass.grad !== null ? -kompass.grad : 0;
    drehungRef.current = winkel;
    innen.style.transform = winkel ? `rotate(${winkel}deg)` : "";
    innen.style.setProperty("--gegendrehung", `${-winkel}deg`);
  }, [karteDreht, kompass.grad, karteBereit]);

  function kartentypSetzen(typ: Kartentyp) {
    setKartentyp(typ);
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    ebenenRef.current = kartenebeneSetzen(L, map, ebenenRef.current, typ);
  }

  // GPS des Geräts einmal lesen. Gibt null zurück (und zeigt den Grund), wenn
  // es keinen Standort gibt oder er nicht freigegeben ist.
  function gpsLesen(): Promise<{ lat: number; lng: number; genauigkeitM: number } | null> {
    setStandortFehler(null);
    setStandortHinweis(null);
    if (!("geolocation" in navigator)) {
      setStandortFehler("Dieses Gerät kennt seinen Standort nicht. Bitte auf der Karte antippen.");
      return Promise.resolve(null);
    }
    setGpsLaeuft(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLaeuft(false);
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude, genauigkeitM: position.coords.accuracy });
        },
        () => {
          setGpsLaeuft(false);
          setStandortFehler("Standort nicht verfügbar (Freigabe im Browser prüfen). Bitte auf der Karte antippen.");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  function genauigkeitMerken(genauigkeitM: number) {
    if (genauigkeitM > 30) {
      setStandortHinweis(
        `GPS nur auf ca. ${Math.round(genauigkeitM)} m genau. Mit „Verschieben“ lässt sich der Locktopf nachbessern.`,
      );
    }
  }

  async function locktopfPerGps() {
    const position = await gpsLesen();
    if (!position) return;
    setModus({ art: "keiner" });
    genauigkeitMerken(position.genauigkeitM);
    mapRef.current?.setView([position.lat, position.lng], Math.max(mapRef.current.getZoom(), 17));
    startTransition(() => locktopfAnlegen(suche.id, position.lat, position.lng));
  }

  async function locktopfPerGpsVerschieben(locktopfId: string) {
    const position = await gpsLesen();
    if (!position) return;
    setModus({ art: "keiner" });
    genauigkeitMerken(position.genauigkeitM);
    mapRef.current?.setView([position.lat, position.lng], Math.max(mapRef.current.getZoom(), 17));
    startTransition(() => locktopfVerschieben(locktopfId, position.lat, position.lng));
  }

  function zuLocktopf(topf: NestsucheLocktopf) {
    mapRef.current?.setView([topf.lat, topf.lng], Math.max(mapRef.current.getZoom(), 16));
  }

  function drehenUmschalten() {
    if (karteDreht) {
      kompass.freigeben("karte");
    } else {
      void kompass.anfordern("karte");
    }
  }

  function peilStart(beobachtungId: string) {
    kompass.freigebenMitAnfang("peil:");
    void kompass.anfordern(`peil:${beobachtungId}`);
  }

  function peilAbbrechen() {
    kompass.freigebenMitAnfang("peil:");
    setVorschau(null);
  }

  function peilUebernehmen(beobachtungId: string) {
    const grad = kompass.grad;
    if (grad === null) return;
    kompass.freigebenMitAnfang("peil:");
    // Bis der Server geantwortet hat, bleibt der Korridor in der gepeilten Richtung.
    setVorschau({ beobachtungId, grad });
    startTransition(async () => {
      await beobachtungAendern(beobachtungId, { richtungGrad: grad, richtungQuelle: "KOMPASS" });
      setVorschau(null);
    });
  }

  // Locktopf auf- oder zuklappen. Beim Wechsel endet eine laufende Peilung,
  // denn ihre Bedienung steckt in der Kachel, die gerade zugeht.
  function locktopfOeffnen(id: string | null) {
    if (id !== offenId) peilAbbrechen();
    setOffenGewaehlt(id);
  }

  useEffect(() => {
    // Antippen eines Locktopf-Zeichens auf der Karte klappt dessen Kachel auf,
    // aber nur, solange gerade nichts anderes auf der Karte gesetzt wird.
    oeffneLocktopfRef.current = (id) => {
      if (modusRef.current.art === "keiner") locktopfOeffnen(id);
    };
  });

  const hinweis =
    modus.art === "locktopf"
      ? "Tippe auf die Karte, wo der Locktopf steht."
      : modus.art === "verschieben"
        ? "Tippe auf die neue Stelle des Locktopfs."
        : modus.art === "richtung"
          ? "Tippe auf einen Punkt in Flugrichtung, möglichst weit weg vom Locktopf."
          : modus.art === "nest"
            ? "Tippe auf die Stelle, an der das Nest gefunden wurde."
            : null;

  const anzahlHornissen = locktoepfe.reduce((summe, topf) => summe + topf.beobachtungen.length, 0);
  const bearing = karteDreht ? (kompass.grad ?? 0) : 0;

  return (
    // Am PC stehen Karte (links, bleibt beim Scrollen stehen) und Locktöpfe
    // (rechts) nebeneinander. Am Handy bleibt die Karte oben stehen, die
    // Locktöpfe laufen darunter vorbei - so sieht man beim Peilen und Stoppen
    // immer die Karte.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div
        className={
          istVollbild
            ? "fixed inset-0 z-50 flex flex-col gap-2 bg-background p-3"
            : "sticky top-0 z-20 -mx-4 flex flex-col gap-2 bg-background px-4 pb-2 pt-2 sm:-mx-6 sm:px-6 lg:top-4 lg:mx-0 lg:p-0"
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {!suche.abgeschlossen && (
            <>
              <KnopfKlein
                aktiv={modus.art === "locktopf"}
                onClick={() => setModus(modus.art === "locktopf" ? { art: "keiner" } : { art: "locktopf" })}
              >
                + Locktopf
              </KnopfKlein>
              <KnopfKlein onClick={locktopfPerGps} disabled={gpsLaeuft}>
                {gpsLaeuft ? "Suche Standort …" : "◎ Locktopf per GPS"}
              </KnopfKlein>
            </>
          )}
          <KnopfKlein aktiv={karteDreht} onClick={drehenUmschalten} titel="Karte nach der Richtung des Handys drehen">
            ⟳ Karte drehen
          </KnopfKlein>
        </div>

        {hinweis && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-accent bg-card px-3 py-1.5 text-sm">
            <span className="font-medium">{hinweis}</span>
            <span className="flex items-center gap-3">
              {(modus.art === "verschieben" || modus.art === "locktopf") && (
                <button
                  type="button"
                  className="text-accent underline disabled:opacity-50"
                  disabled={gpsLaeuft}
                  onClick={() => (modus.art === "verschieben" ? locktopfPerGpsVerschieben(modus.locktopfId) : locktopfPerGps())}
                >
                  {gpsLaeuft ? "Suche …" : "Per GPS"}
                </button>
              )}
              <button type="button" className="text-muted underline" onClick={() => setModus({ art: "keiner" })}>
                Abbrechen
              </button>
            </span>
          </div>
        )}
        {(standortFehler || kompass.fehler) && (
          <p className="text-xs text-gefahr">{standortFehler ?? kompass.fehler}</p>
        )}
        {standortHinweis && !standortFehler && <p className="text-xs text-warnung">{standortHinweis}</p>}

        <div
          ref={aussenRef}
          className={
            istVollbild
              ? "relative w-full flex-1 overflow-hidden rounded-md border border-border"
              : "relative h-[36dvh] min-h-48 w-full overflow-hidden rounded-md border border-border sm:h-[40dvh] lg:h-[calc(100dvh-12.5rem)]"
          }
        >
          <div ref={mapContainerRef} className="absolute left-0 top-0 h-full w-full" />
          {/* Zoom und Quellenangabe der Karte, bleiben beim Drehen fest stehen. */}
          <div ref={steuerRef} className="pointer-events-none absolute inset-0" style={{ background: "transparent" }} />
          {/* Unten links; beim Drehen rückt sie neben die Nordnadel. */}
          <KartenLegende
            className={karteDreht ? "bottom-2 left-14" : "bottom-2 left-2"}
            zusatz={lubwNester.length > 0 ? [{ label: "Nest laut LUBW", farbe: "#7f1d1d" }] : []}
          />
          {/* Kartenart und Vollbild liegen auf der Karte, das spart am Handy eine Zeile. */}
          <div className="absolute right-2 top-2 z-[500] flex flex-wrap justify-end gap-1.5">
            <KartentypUmschalter kartentyp={kartentyp} onChange={kartentypSetzen} />
            <VollbildButton istVollbild={istVollbild} onToggle={vollbildUmschalten} />
          </div>
          {karteDreht && (
            <div
              className="pointer-events-none absolute bottom-7 left-2 z-[500] flex flex-col items-center rounded-full bg-card/90 p-1 shadow"
              title="Norden"
            >
              <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden>
                <g transform={`rotate(${-bearing})`}>
                  <path d="M0 -14 L5 3 L0 0 L-5 3 Z" fill="#dc2626" />
                  <path d="M0 14 L5 -3 L0 0 L-5 -3 Z" fill="currentColor" fillOpacity="0.35" />
                </g>
              </svg>
              <span className="-mt-1 text-[10px] font-bold leading-none">N</span>
            </div>
          )}
        </div>

        <Ergebnis schnitt={schnitt} anzahlBereiche={bereiche.length} anzahlHornissen={anzahlHornissen} />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {locktoepfe.length === 0 && !suche.abgeschlossen && (
          <Card className="text-sm text-muted">
            Noch kein Locktopf. Tippe oben auf „+ Locktopf“ und dann auf die Karte, oder nimm „Locktopf per GPS“, wenn
            du am Locktopf stehst.
          </Card>
        )}

        {locktoepfe.map((topf, index) => {
          const offen = topf.id === offenId;
          if (!offen) {
            const info = locktopfKurzinfo(topf);
            return (
              <button
                key={topf.id}
                type="button"
                aria-expanded={false}
                onClick={() => {
                  locktopfOeffnen(topf.id);
                  zuLocktopf(topf);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-sm hover:bg-background"
              >
                <LocktopfNummer nummer={index + 1} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-semibold">{topf.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {info.farben.map((farbe, i) => (
                      <span key={i} aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: farbe }} />
                    ))}
                    <span className="truncate">{info.text}</span>
                  </span>
                </span>
                <span className="flex-1" />
                <Pfeil richtung="unten" />
              </button>
            );
          }
          return (
            <div key={topf.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-md">
              <div className="flex items-center gap-2">
                <LocktopfNummer nummer={index + 1} />
                <input
                  defaultValue={topf.name}
                  maxLength={LAENGE.name}
                  aria-label="Name des Locktopfs"
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold hover:border-border focus:border-accent focus:outline-none"
                  onBlur={(event) => {
                    if (event.target.value.trim() && event.target.value !== topf.name) {
                      const name = event.target.value;
                      startTransition(() => locktopfUmbenennen(topf.id, name));
                    }
                  }}
                />
                <button type="button" className="text-sm text-accent hover:underline" onClick={() => zuLocktopf(topf)}>
                  Zeigen
                </button>
                {!suche.abgeschlossen && (
                  <MenueKnopf>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-background"
                      onClick={() => {
                        setModus({ art: "verschieben", locktopfId: topf.id });
                        zuLocktopf(topf);
                      }}
                    >
                      Verschieben
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-gefahr hover:bg-background"
                      onClick={async () => {
                        if (await bestaetigen(`${topf.name} mit allen Beobachtungen löschen?`, { gefahr: true })) {
                          startTransition(() => locktopfLoeschen(topf.id));
                        }
                      }}
                    >
                      Löschen
                    </button>
                  </MenueKnopf>
                )}
                <button
                  type="button"
                  aria-label={`${topf.name} zuklappen`}
                  aria-expanded
                  className="rounded-md p-1 text-muted hover:bg-background"
                  onClick={() => locktopfOeffnen(null)}
                >
                  <Pfeil richtung="oben" />
                </button>
              </div>

              {topf.beobachtungen.length === 0 && <p className="text-sm text-muted">Noch keine Hornisse markiert.</p>}

              <div className="grid gap-2">
                {topf.beobachtungen.map((beobachtung) => (
                  <BeobachtungKarte
                    key={beobachtung.id}
                    beobachtung={beobachtung}
                    gesperrt={suche.abgeschlossen}
                    richtungZeichnenAktiv={modus.art === "richtung" && modus.beobachtungId === beobachtung.id}
                    onRichtungZeichnen={() => {
                      setModus({ art: "richtung", beobachtungId: beobachtung.id });
                      zuLocktopf(topf);
                    }}
                    onVorschau={(grad) => setVorschau(grad === null ? null : { beobachtungId: beobachtung.id, grad })}
                    nestAbstandM={suche.nest ? abstandMeter(topf.lat, topf.lng, suche.nest.lat, suche.nest.lng) : null}
                    peilt={peilId === beobachtung.id}
                    kompassGrad={kompass.grad}
                    karteDreht={karteDreht}
                    onPeilStart={() => peilStart(beobachtung.id)}
                    onPeilUebernehmen={() => peilUebernehmen(beobachtung.id)}
                    onPeilAbbrechen={peilAbbrechen}
                  />
                ))}
              </div>

              {!suche.abgeschlossen && (
                <div>
                  <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => startTransition(() => beobachtungAnlegen(topf.id))}>
                    + Markierte Hornisse
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">{suche.archiviert ? "Archiv" : "Suche abschließen"}</h2>
          {suche.abgeschlossen ? (
            <>
              <p className="text-sm text-muted">
                {suche.nest
                  ? "Nest gefunden und auf der Karte eingetragen (gelb umrandetes N)."
                  : "Die Suche wurde ohne Fund beendet."}
                {suche.archiviert
                  ? " Sie liegt im Archiv und bleibt dort zum Nachlesen erhalten."
                  : " Archivieren nimmt sie aus der Liste, alle Daten bleiben zum späteren Nachlesen erhalten."}
              </p>
              <div className="flex flex-wrap gap-2">
                {suche.archiviert ? (
                  <Button type="button" variant="secondary" onClick={() => startTransition(() => nestsucheAusArchiv(suche.id))}>
                    Aus dem Archiv holen
                  </Button>
                ) : (
                  <>
                    <Button type="button" onClick={() => startTransition(() => nestsucheArchivieren(suche.id))}>
                      Archivieren
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => startTransition(() => nestsucheWiederAufnehmen(suche.id))}>
                      Wieder aufnehmen
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setModus({ art: "nest" })}>
                Nest gefunden: auf Karte setzen
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (await bestaetigen("Suche ohne Fund beenden?")) startTransition(() => nestsucheAbschliessen(suche.id, null));
                }}
              >
                Ohne Fund beenden
              </Button>
            </div>
          )}
          <p className="text-xs text-muted">
            Gefundenes Nest nicht selbst entfernen, sondern melden (in Baden-Württemberg über die LUBW-Meldeplattform).
          </p>
          <div className="border-t border-border pt-3">
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                if (await bestaetigen(`Nestsuche „${suche.name}“ mit allen Locktöpfen und Beobachtungen löschen?`, { gefahr: true })) {
                  startTransition(() => nestsucheLoeschen(suche.id));
                }
              }}
            >
              Nestsuche löschen
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KnopfKlein({
  children,
  onClick,
  aktiv = false,
  disabled = false,
  titel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  aktiv?: boolean;
  disabled?: boolean;
  titel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titel}
      aria-pressed={aktiv}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
        aktiv ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card hover:bg-background"
      }`}
    >
      {children}
    </button>
  );
}

// Schmale Zeile unter der Karte: wie groß der Bereich ist, in dem das Nest
// liegen muss. Rot auf der Karte = Bereich aller Peilungen, orange = alle bis
// auf eine (erst ab drei Peilungen).
function Ergebnis({
  schnitt,
  anzahlBereiche,
  anzahlHornissen,
}: {
  schnitt: ReturnType<typeof schnittBerechnen>;
  anzahlBereiche: number;
  anzahlHornissen: number;
}) {
  if (anzahlHornissen === 0) return null;

  const punkt = <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-baseline" style={{ background: SCHNITT_FARBE }} />;
  const rahmen = "rounded-md border border-border bg-card px-2.5 py-1 text-xs leading-snug";

  if (anzahlBereiche < 2) {
    return (
      <p className={`${rahmen} text-muted`}>
        {punkt}Vermutungsbereich: mind. 2 Peilungen nötig (zweiter Locktopf ca. 200 m seitlich).
      </p>
    );
  }
  if (!schnitt || !schnitt.stufe || !schnitt.mitte) {
    return (
      <p className={`${rahmen} text-gefahr`}>
        {punkt}Kein gemeinsamer Bereich: Richtung oder Zeit prüfen.
      </p>
    );
  }
  const link = `https://www.google.com/maps/search/?api=1&query=${schnitt.mitte[0].toFixed(6)},${schnitt.mitte[1].toFixed(6)}`;
  const groesse = `${meterAnzeige(schnitt.breiteM)} × ${meterAnzeige(schnitt.hoeheM)}`;
  return (
    <p
      className={rahmen}
      title={`Rot: liegt in allen Bereichen${schnitt.anzahlBereiche >= 3 ? ", orange: in allen bis auf einen" : ""}. Das ✕ markiert die Mitte.`}
    >
      {punkt}
      <span className="font-semibold">
        {schnitt.stufe === "alle" ? `Vermutungsbereich ca. ${groesse}` : `Alle bis auf eine Peilung treffen sich in ca. ${groesse}`}
      </span>
      <span className="text-muted"> · {anzahlBereiche} Peilungen · </span>
      <a href={link} target="_blank" rel="noreferrer" className="text-accent hover:underline">
        Google Maps
      </a>
      {schnitt.fastParallel && (
        <span
          className="text-warnung"
          title="Die Peilungen laufen fast parallel, der Bereich ist dadurch lang gezogen. Ein Locktopf seitlich versetzt (Winkel über 30°) grenzt besser ein."
        >
          {" "}
          · ⚠ fast parallel
        </span>
      )}
    </p>
  );
}

function LocktopfNummer({ nummer }: { nummer: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md bg-amber-900 text-xs font-bold text-white"
    >
      {nummer}
    </span>
  );
}

function Pfeil({ richtung }: { richtung: "oben" | "unten" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="flex-none text-muted">
      <path d={richtung === "unten" ? "M6 9l6 6 6-6" : "M6 15l6-6 6 6"} />
    </svg>
  );
}

// Kurzinfo für einen zugeklappten Locktopf: Farbpunkte der markierten Hornissen
// und die Entfernung der Hornisse mit der kürzesten Rundzeit.
function locktopfKurzinfo(topf: NestsucheLocktopf): { farben: string[]; text: string } {
  const anzahl = topf.beobachtungen.length;
  if (anzahl === 0) return { farben: [], text: "noch keine Hornisse" };
  let kuerzeste: number | null = null;
  for (const beobachtung of topf.beobachtungen) {
    const zeit = kuerzesteZeit(beobachtung);
    if (zeit !== null && (kuerzeste === null || zeit < kuerzeste)) kuerzeste = zeit;
  }
  const farben = topf.beobachtungen.map((beobachtung) => beobachtung.farbe);
  const name = anzahl === 1 ? "1 Hornisse" : `${anzahl} Hornissen`;
  if (kuerzeste === null) return { farben, text: `${name} · noch keine Zeit` };
  const band = entfernungsBand(kuerzeste);
  return { farben, text: `${name} · ${zeitAnzeige(kuerzeste)} → ${meterAnzeige(band.minM)}–${meterAnzeige(band.maxM)}` };
}

// Kleines Menü „⋯“ für seltene Aktionen. Schließt beim Antippen außerhalb und
// nach jeder Auswahl.
function MenueKnopf({ children }: { children: React.ReactNode }) {
  const [offen, setOffen] = useState(false);
  const rahmenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!offen) return;
    function aussen(event: Event) {
      if (rahmenRef.current && !rahmenRef.current.contains(event.target as Node)) setOffen(false);
    }
    document.addEventListener("pointerdown", aussen);
    return () => document.removeEventListener("pointerdown", aussen);
  }, [offen]);

  return (
    <div ref={rahmenRef} className="relative">
      <button
        type="button"
        aria-label="Mehr"
        aria-haspopup="menu"
        aria-expanded={offen}
        onClick={() => setOffen((alt) => !alt)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-background"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {offen && (
        <div
          role="menu"
          onClick={() => setOffen(false)}
          className="absolute right-0 top-9 z-30 min-w-40 overflow-hidden rounded-lg border border-border bg-card text-sm shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}
