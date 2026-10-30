import type * as Leaflet from "leaflet";

// Farbe des eigenen Standorts: kräftiges Blau, hebt sich von den Stand-Pins
// (blau mit Spitze), den Flugradien und den Velutina-Farben ab.
export const MEIN_STANDORT_FARBE = "#1a73e8";

// Ab so vielen Pixeln Abstand zur Kartenmitte gilt die Karte als verschoben.
const MITTE_TOLERANZ_PX = 24;
const ZENTRIER_ZOOM = 16;

const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>' +
  '<path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>';

// Knopf "Mein Standort" bei den Zoom-Knöpfen. Erstes Tippen sucht den
// Standort des Geräts, zentriert die Karte darauf und zeigt ihn als blauen
// Punkt mit Genauigkeitskreis. Der Punkt wandert mit, solange er an ist.
// Wurde die Karte danach verschoben, holt das nächste Tippen sie zurück,
// sonst schaltet es den Standort wieder aus. Punkt und Kreis nehmen keine
// Klicks an, damit sich auf der Karte weiter alles antippen lässt.
// Aufräumen passiert von selbst, wenn die Karte entfernt wird.
export function meinStandortKnopf(
  L: typeof Leaflet,
  map: Leaflet.Map,
  position: Leaflet.ControlPosition = "bottomright",
) {
  let beobachtung: number | null = null;
  let letzte: Leaflet.LatLng | null = null;
  let zentrierenBeimNaechsten = false;
  let punkt: Leaflet.CircleMarker | null = null;
  let kreis: Leaflet.Circle | null = null;
  let knopf: HTMLAnchorElement | null = null;
  let meldung: HTMLSpanElement | null = null;

  function zustand(art: "aus" | "sucht" | "an") {
    if (!knopf) return;
    knopf.classList.toggle("mein-standort-sucht", art === "sucht");
    knopf.classList.toggle("mein-standort-an", art === "an");
  }

  function fehlerZeigen(text: string | null) {
    if (!meldung) return;
    meldung.textContent = text ?? "";
    meldung.hidden = !text;
  }

  function zentrieren() {
    if (!letzte) return;
    map.setView(letzte, Math.max(map.getZoom(), ZENTRIER_ZOOM));
  }

  function istZentriert(): boolean {
    if (!letzte) return false;
    const mitte = map.getSize().divideBy(2);
    return map.latLngToContainerPoint(letzte).distanceTo(mitte) < MITTE_TOLERANZ_PX;
  }

  function anzeigen(lage: GeolocationPosition) {
    letzte = L.latLng(lage.coords.latitude, lage.coords.longitude);
    const genauigkeit = lage.coords.accuracy;
    if (!kreis) {
      kreis = L.circle(letzte, {
        radius: genauigkeit,
        color: MEIN_STANDORT_FARBE,
        weight: 1,
        opacity: 0.5,
        fillColor: MEIN_STANDORT_FARBE,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
      punkt = L.circleMarker(letzte, {
        radius: 7,
        color: "#ffffff",
        weight: 2.5,
        fillColor: MEIN_STANDORT_FARBE,
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    } else {
      kreis.setLatLng(letzte).setRadius(genauigkeit);
      punkt?.setLatLng(letzte);
    }
    // Der Punkt soll über Kreisen und Flächen liegen.
    punkt?.bringToFront();
    zustand("an");
    fehlerZeigen(null);
    if (zentrierenBeimNaechsten) {
      zentrierenBeimNaechsten = false;
      zentrieren();
    }
  }

  function ausschalten() {
    if (beobachtung !== null) navigator.geolocation.clearWatch(beobachtung);
    beobachtung = null;
    letzte = null;
    zentrierenBeimNaechsten = false;
    kreis?.remove();
    punkt?.remove();
    kreis = null;
    punkt = null;
    zustand("aus");
  }

  function antippen() {
    if (beobachtung !== null) {
      if (letzte && !istZentriert()) zentrieren();
      else if (letzte) ausschalten();
      return;
    }
    if (!("geolocation" in navigator)) {
      fehlerZeigen("Dieses Gerät kennt seinen Standort nicht.");
      return;
    }
    fehlerZeigen(null);
    zentrierenBeimNaechsten = true;
    zustand("sucht");
    beobachtung = navigator.geolocation.watchPosition(
      anzeigen,
      (fehler) => {
        // Kurz kein Signal ist kein Grund, einen gefundenen Standort zu verwerfen.
        if (letzte && fehler.code !== fehler.PERMISSION_DENIED) return;
        ausschalten();
        fehlerZeigen(
          fehler.code === fehler.PERMISSION_DENIED
            ? "Standort nicht freigegeben. Bitte im Browser erlauben."
            : "Standort nicht gefunden.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
  }

  const Steuerung = L.Control.extend({
    onAdd() {
      const huelle = L.DomUtil.create("div", "leaflet-bar mein-standort");
      knopf = L.DomUtil.create("a", "", huelle) as HTMLAnchorElement;
      knopf.href = "#";
      knopf.role = "button";
      knopf.title = "Mein Standort";
      knopf.setAttribute("aria-label", "Mein Standort");
      knopf.innerHTML = ICON_SVG;
      meldung = L.DomUtil.create("span", "mein-standort-meldung", huelle) as HTMLSpanElement;
      meldung.hidden = true;
      L.DomEvent.disableClickPropagation(huelle);
      L.DomEvent.on(knopf, "click", (event) => {
        L.DomEvent.preventDefault(event);
        antippen();
      });
      return huelle;
    },
  });
  new Steuerung({ position }).addTo(map);
  map.on("unload", ausschalten);
}
