import {
  massnahmenErledigtSetzen,
  massnahmenFuerVoelkerNeu,
  stockkartenEintraegeFuerStandNeu,
  stockkartenEintragNeu,
} from "@/lib/actions";
import { darfSchreiben } from "@/lib/konto";
import { alsNutzeraktion, NUR_LESEN_MELDUNG } from "@/lib/prisma";

// Annahmestelle für Durchsichten, Maßnahmen und Haken, die auf dem Handy in
// der Warteschlange liegen (lib/warteschlange.ts). Eine eigene Adresse statt der Server-Aktion,
// weil Server-Aktionen nach jedem Deploy eine neue Kennung bekommen: ein im
// Funkloch gesicherter Eintrag würde nach einem Update sonst nie mehr
// ankommen.
//
// Antworten (immer JSON):
//   200 { ziel }   gespeichert (oder schon früher angekommen)
//   422 { fehler } Prüffehler - nochmal senden hilft nicht
//   500            Server-Fehler - später erneut versuchen
// Ohne Anmeldung leitet proxy.ts auf /login um, das erkennt das Handy daran.

export async function POST(request: Request) {
  // Wer hier etwas nachsendet, soll in der Historie stehen (lib/historie.ts).
  return alsNutzeraktion(() => annehmen(request));
}

async function annehmen(request: Request) {
  // Helfer mit "Nur lesen": endgültig ablehnen, nochmal senden hilft nicht.
  if (!(await darfSchreiben())) return Response.json({ fehler: NUR_LESEN_MELDUNG }, { status: 422 });
  const formData = await request.formData();
  const art = formData.get("_art")?.toString();
  const ziel = formData.get("_ziel")?.toString() ?? "";

  if (art === "eintrag" || art === "sammel") {
    if (!ziel) return Response.json({ fehler: "Unbekannte Sendung." }, { status: 422 });
    const ergebnis =
      art === "eintrag"
        ? await stockkartenEintragNeu(ziel, formData)
        : await stockkartenEintraegeFuerStandNeu(ziel, formData);
    if ("fehler" in ergebnis) return Response.json({ fehler: ergebnis.fehler }, { status: 422 });
    return Response.json({ ziel: ergebnis.ziel });
  }

  if (art === "massnahme") {
    const ergebnis = await massnahmenFuerVoelkerNeu(formData);
    if (ergebnis.fehler) return Response.json({ fehler: ergebnis.fehler }, { status: 422 });
    return Response.json({ ziel });
  }

  // Abhaken: der Zielzustand wird gesetzt, nicht umgeschaltet - so ändert ein
  // doppelt ankommender Haken nichts. Zeitpunkt ist der Moment des Tippens.
  if (art === "erledigt") {
    const ids = formData.getAll("massnahmeIds").map(String);
    const zeitpunkt = new Date(formData.get("zeitpunkt")?.toString() ?? "");
    await massnahmenErledigtSetzen(
      ids,
      formData.get("erledigt") === "ja",
      Number.isNaN(zeitpunkt.getTime()) ? undefined : zeitpunkt
    );
    return Response.json({ ziel });
  }

  return Response.json({ fehler: "Unbekannte Sendung." }, { status: 422 });
}
