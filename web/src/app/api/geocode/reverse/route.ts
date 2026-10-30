// Wandelt Koordinaten in eine Adresse um ("Reverse Geocoding"), z.B. nachdem
// auf der Karte ein Punkt gesetzt wurde. Details siehe ../route.ts.
const NOMINATIM_USER_AGENT = "Imkereiverwaltung/1.0 (privates Einzelprojekt)";

type NominatimAdresse = {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  hamlet?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const breitengrad = searchParams.get("breitengrad");
  const laengengrad = searchParams.get("laengengrad");

  if (!breitengrad || !laengengrad) {
    return Response.json({ fehler: "Koordinaten fehlen." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", breitengrad);
  url.searchParams.set("lon", laengengrad);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const antwort = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  });

  if (!antwort.ok) {
    return Response.json({ fehler: "Adresssuche gerade nicht erreichbar. Bitte später noch einmal versuchen." }, { status: 502 });
  }

  const treffer = (await antwort.json()) as {
    display_name?: string;
    address?: NominatimAdresse;
  };

  if (!treffer.display_name) {
    return Response.json({ fehler: "Keine Adresse gefunden." }, { status: 404 });
  }

  const adresse = treffer.address ?? {};
  const strasse = [adresse.road, adresse.house_number].filter(Boolean).join(" ");
  const ortName = adresse.city ?? adresse.town ?? adresse.village ?? adresse.municipality ?? adresse.hamlet;
  const ort = [adresse.postcode, ortName].filter(Boolean).join(" ");

  return Response.json({ strasse, ort });
}
