// Wandelt eine Adresse in Koordinaten um ("Geocoding"), über den kostenlosen
// Nominatim-Dienst von OpenStreetMap. Läuft serverseitig, weil Nominatims
// Nutzungsbedingungen einen aussagekräftigen User-Agent verlangen - den kann
// ein Browser nicht selbst setzen.
const NOMINATIM_USER_AGENT = "Imkereiverwaltung/1.0 (privates Einzelprojekt)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return Response.json({ fehler: "Adresse fehlt." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const antwort = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  });

  if (!antwort.ok) {
    return Response.json({ fehler: "Adresssuche gerade nicht erreichbar. Bitte später noch einmal versuchen." }, { status: 502 });
  }

  const treffer = (await antwort.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (treffer.length === 0) {
    return Response.json({ fehler: "Keine Adresse gefunden." }, { status: 404 });
  }

  return Response.json({
    breitengrad: Number(treffer[0].lat),
    laengengrad: Number(treffer[0].lon),
    adresse: treffer[0].display_name,
  });
}
