import { prisma } from "@/lib/prisma";
import { datumAlsInputWert } from "@/lib/datum";
import { zustandText } from "@/lib/honig-zustand";
import { buchungErloes, istVerkaufBuchung, VERKAUF_ART_NAME, type VerkaufArt } from "@/lib/verkauf";

// Alle Verkäufe für Lager -> Verkäufe: Abgänge aus dem Erzeugnis-Lager mit
// Grund "Verkauf" und die Tabelle Verkauf (Völker, Ableger, Königinnen,
// Sonstiges), in eine gemeinsame Form gebracht.

export type VerkaufZeile = {
  /// "b:<id>" für Lagerbuchungen, "v:<id>" für Verkauf.
  schluessel: string;
  id: string;
  quelle: "lager" | "verkauf";
  datum: string;
  /// Oberbegriff für Sortierung und Gruppen: Erzeugnis (Honig, Wachs ...)
  /// oder Volk, Ableger, Königin, Sonstiges.
  art: string;
  /// Was genau: Sorte und Gebinde, Volksname, Kennung.
  titel: string;
  /// Zusatz: Zustand, Lagerort, Grund.
  zusatz: string | null;
  menge: string;
  erloes: number | null;
  geschaetzt: boolean;
  kaeufer: string | null;
  notiz: string | null;
  link: string | null;
  /// Nur bei frei erfassten Verkäufen: Art wählbar, Bezeichnung und Anzahl
  /// änderbar, löschbar. Volk/Ableger nur zwischen beiden tauschbar.
  verkaufArt: VerkaufArt | null;
  frei: boolean;
  anzahl: number;
};

function mengeText(menge: number, einheit: string): string {
  const stellen = einheit.toLowerCase() === "stück" ? 0 : 1;
  return `${menge.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: 3 })}\u00a0${einheit}`;
}

function stueckText(anzahl: number, gebinde: string | null): string {
  if (gebinde && /glas/i.test(gebinde)) return `${anzahl}\u00a0${anzahl === 1 ? "Glas" : "Gläser"}`;
  return `${anzahl}\u00a0Stück`;
}

export async function verkaeufeLaden(): Promise<VerkaufZeile[]> {
  const [typen, verkaeufe] = await Promise.all([
    prisma.erzeugnistyp.findMany({
      select: {
        id: true,
        name: true,
        einheit: true,
        preis: true,
        gebinde: { select: { id: true, name: true, preis: true } },
        sorten: { select: { id: true, preis: true, gebindePreise: { select: { gebindeId: true, preis: true } } } },
        buchungen: {
          where: { menge: { lt: 0 }, grund: { startsWith: "Verkauf", mode: "insensitive" } },
          select: {
            id: true,
            menge: true,
            datum: true,
            grund: true,
            notizen: true,
            anzahl: true,
            erloes: true,
            kaeufer: true,
            sorteId: true,
            sorte: { select: { name: true } },
            gebindeId: true,
            gebinde: { select: { name: true } },
            zustand: true,
            eimer: { select: { nummer: true } },
            lagerort: { select: { name: true } },
          },
        },
      },
    }),
    prisma.verkauf.findMany({
      select: {
        id: true,
        art: true,
        datum: true,
        bezeichnung: true,
        anzahl: true,
        preis: true,
        kaeufer: true,
        notiz: true,
        volk: { select: { id: true, name: true } },
        koenigin: { select: { id: true, kennung: true } },
        volkId: true,
        koeniginEreignisId: true,
      },
    }),
  ]);

  const zeilen: VerkaufZeile[] = [];
  for (const typ of typen) {
    for (const buchung of typ.buchungen) {
      if (!istVerkaufBuchung(buchung)) continue;
      const erloes = buchungErloes(buchung, typ);
      const menge = mengeText(Math.abs(buchung.menge), typ.einheit);
      // Gebinde wie "Glas 500 g" nicht mitten im Namen umbrechen (Handy).
      const titelTeile = [buchung.sorte?.name, buchung.gebinde?.name.replace(/ /g, "\u00a0")].filter(Boolean);
      // Ältere Verkäufe stehen oft als "Verkauf an Familie Maier" im Grund:
      // dann gilt das als Käufer, solange keiner eigens eingetragen ist.
      const ausGrund = buchung.grund?.trim().match(/^verkauf an (.+)$/i)?.[1] ?? null;
      const kaeufer = buchung.kaeufer ?? ausGrund;
      const grundZusatz =
        buchung.grund && buchung.grund.trim().toLowerCase() !== "verkauf" && !(ausGrund && !buchung.kaeufer)
          ? buchung.grund
          : null;
      zeilen.push({
        schluessel: `b:${buchung.id}`,
        id: buchung.id,
        quelle: "lager",
        datum: datumAlsInputWert(buchung.datum),
        art: typ.name,
        titel: titelTeile.length > 0 ? titelTeile.join(" · ") : typ.name,
        zusatz:
          [
            zustandText(buchung.zustand),
            buchung.eimer ? `Eimer Nr. ${buchung.eimer.nummer}` : null,
            buchung.lagerort?.name,
            grundZusatz,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        menge:
          buchung.gebindeId && buchung.anzahl !== null && buchung.anzahl !== 0
            ? `${stueckText(Math.abs(buchung.anzahl), buchung.gebinde?.name ?? null)} · ${menge}`
            : menge,
        erloes: erloes.wert,
        geschaetzt: erloes.geschaetzt,
        kaeufer,
        notiz: buchung.notizen,
        link: null,
        verkaufArt: null,
        frei: false,
        anzahl: 1,
      });
    }
  }

  for (const verkauf of verkaeufe) {
    const art = verkauf.art as VerkaufArt;
    const link = verkauf.volk
      ? `/voelker/${verkauf.volk.id}`
      : verkauf.koenigin
        ? `/koeniginnen/${verkauf.koenigin.id}`
        : null;
    zeilen.push({
      schluessel: `v:${verkauf.id}`,
      id: verkauf.id,
      quelle: "verkauf",
      datum: datumAlsInputWert(verkauf.datum),
      art: VERKAUF_ART_NAME[art],
      titel: verkauf.volk?.name ?? verkauf.koenigin?.kennung ?? verkauf.bezeichnung,
      zusatz: null,
      menge: verkauf.anzahl > 1 ? `${verkauf.anzahl} Stück` : "",
      erloes: verkauf.preis,
      geschaetzt: false,
      kaeufer: verkauf.kaeufer,
      notiz: verkauf.notiz,
      link,
      verkaufArt: art,
      frei: verkauf.volkId === null && verkauf.koeniginEreignisId === null,
      anzahl: verkauf.anzahl,
    });
  }

  return zeilen.sort((a, b) => b.datum.localeCompare(a.datum));
}
