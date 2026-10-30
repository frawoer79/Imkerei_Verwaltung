import { prisma } from "@/lib/prisma";
import { dateiVorhanden } from "@/lib/uploads";
import type { DokumentEintrag } from "@/lib/dokumente-typen";
import { LAGERLISTE_TITEL } from "@/lib/lagerliste";

// Vereint alle Arten von Dokumenten der App an einer Stelle: hochgeladene
// (Gesundheitszeugnisse, Medikamenten-Belege) und selbst erzeugte
// (Behandlungsnachweise, Zuchtkarten, Lagerlisten). Jede Art lebt weiterhin in ihrer
// eigenen Tabelle bzw. wird live aus den gespeicherten Daten erzeugt
// (Zuchtkarte) - hier entsteht nur die gemeinsame Ansicht dafür. Bei den
// Zuchtkarten stehen beide Arten drin: die selbst erstellte und die
// hochgeladene Karte des Züchters.
//
// Nur serverseitig verwendbar (Prisma-Import) - Typen und reine
// Hilfsfunktionen dafür stehen in lib/dokumente-typen.ts, damit
// client-seitige Komponenten sie ohne den Datenbanktreiber importieren
// können.

// Baut Titel/Kontext/Ziel-Link für ein hochgeladenes Dokument aus seinen
// (optionalen) Verknüpfungen - gemeinsam genutzt von der zentralen
// Dokumentenliste und überall dort, wo ein einzelnes Dokument angezeigt wird.
function dokumentEintrag(dokument: {
  id: string;
  kategorie: { name: string };
  titel: string | null;
  notizen: string | null;
  datum: Date;
  dateiname: string;
  mimeType: string;
  groesse: number;
  bienenstand: { id: string; name: string } | null;
  koenigin: { id: string; kennung: string } | null;
  voelker: { volk: { id: string; name: string } }[];
}): DokumentEintrag {
  const verknuepfungen = [
    dokument.bienenstand?.name,
    ...dokument.voelker.map((eintrag) => eintrag.volk.name),
    dokument.koenigin?.kennung,
  ].filter((wert): wert is string => Boolean(wert));

  const ortHref =
    dokument.bienenstand
      ? `/bienenstaende/${dokument.bienenstand.id}`
      : dokument.voelker[0]
        ? `/voelker/${dokument.voelker[0].volk.id}`
        : dokument.koenigin
          ? `/koeniginnen/${dokument.koenigin.id}`
          : `/dokument-dateien/${dokument.dateiname}`;

  return {
    id: dokument.id,
    typ: "DOKUMENT",
    kategorie: dokument.kategorie.name,
    titel: dokument.titel ? `${dokument.kategorie.name} · ${dokument.titel}` : dokument.kategorie.name,
    kontext: verknuepfungen.length > 0 ? verknuepfungen.join(" · ") : (dokument.notizen ?? "ohne Verknüpfung"),
    datum: dokument.datum,
    ortHref,
    dateiHref: `/dokument-dateien/${dokument.dateiname}`,
    mimeType: dokument.mimeType,
    groesse: dokument.groesse,
  };
}

export async function dokumenteListeLaden(): Promise<DokumentEintrag[]> {
  const [dokumente, nachweise, belege, koeniginnen, lagerlisten] = await Promise.all([
    prisma.dokument.findMany({
      orderBy: { datum: "desc" },
      include: {
        kategorie: true,
        bienenstand: { select: { id: true, name: true } },
        koenigin: { select: { id: true, kennung: true } },
        voelker: { select: { volk: { select: { id: true, name: true } } } },
      },
    }),
    prisma.nachweisDatei.findMany({ orderBy: { erstelltAm: "desc" } }),
    prisma.medikamentBeleg.findMany({
      orderBy: { erstelltAm: "desc" },
      include: { medikament: { select: { name: true } } },
    }),
    // Nur Königinnen, zu denen es tatsächlich eine Karte gibt: die selbst
    // erstellte und/oder die hochgeladene des Züchters.
    prisma.koenigin.findMany({
      where: { OR: [{ zuchtkarte: { isNot: null } }, { zuchtkarteFotoDateiname: { not: null } }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kennung: true,
        jahrgang: true,
        createdAt: true,
        zuchtkarteFotoDateiname: true,
        zuchtkarteFotoMimeType: true,
        zuchtkarte: { select: { updatedAt: true } },
      },
    }),
    prisma.lagerlisteDatei.findMany({ orderBy: { erstelltAm: "desc" } }),
  ]);

  // Hochgeladene Zuchtkarten, deren Datei im Upload-Verzeichnis fehlt: die
  // Liste soll das ehrlich anzeigen, statt auf einen Link zu verweisen, der ins
  // Leere läuft.
  const fehlendeKartendateien = new Set(
    (
      await Promise.all(
        koeniginnen.flatMap((koenigin) =>
          koenigin.zuchtkarteFotoDateiname ? [koenigin.zuchtkarteFotoDateiname] : [],
        ).map(async (dateiname) => ((await dateiVorhanden(dateiname)) ? null : dateiname)),
      )
    ).filter((dateiname): dateiname is string => dateiname !== null),
  );

  const eintraege: DokumentEintrag[] = [
    ...dokumente.map(dokumentEintrag),
    ...nachweise.map((nachweis) => ({
      id: nachweis.id,
      typ: "BEHANDLUNGSNACHWEIS" as const,
      titel: `Nachweis ${nachweis.jahr} · ${nachweis.bezeichnung}`,
      kontext: `${nachweis.anzahlBehandlungen} ${nachweis.anzahlBehandlungen === 1 ? "Behandlung" : "Behandlungen"}`,
      datum: nachweis.erstelltAm,
      ortHref: "/behandlungen",
      dateiHref: `/nachweise/${nachweis.dateiname}`,
      mimeType: "application/pdf",
      groesse: nachweis.groesse,
    })),
    ...lagerlisten.map((lagerliste) => ({
      id: lagerliste.id,
      typ: "LAGERLISTE" as const,
      titel: LAGERLISTE_TITEL[lagerliste.art],
      kontext:
        lagerliste.art === "BUCHUNGEN"
          ? `${lagerliste.zeitraum ?? ""} · ${lagerliste.anzahlPositionen} ${lagerliste.anzahlPositionen === 1 ? "Buchung" : "Buchungen"}`
          : `${lagerliste.anzahlPositionen} ${lagerliste.anzahlPositionen === 1 ? "Position" : "Positionen"}`,
      datum: lagerliste.erstelltAm,
      ortHref: `/lager/${lagerliste.art === "MATERIAL" ? "material" : "erzeugnisse"}#lagerlisten`,
      dateiHref: `/lagerlisten/${lagerliste.dateiname}`,
      mimeType: "application/pdf",
      groesse: lagerliste.groesse,
    })),
    ...belege.map((beleg) => ({
      id: beleg.id,
      typ: "MEDIKAMENTENBELEG" as const,
      titel: `Beleg · ${beleg.medikament.name}`,
      kontext: beleg.originalDateiname,
      datum: beleg.erstelltAm,
      ortHref: `/medikamente/${beleg.medikamentId}/bearbeiten`,
      dateiHref: `/belege/${beleg.dateiname}`,
      mimeType: beleg.mimeType,
      groesse: beleg.groesse,
    })),
    ...koeniginnen.flatMap((koenigin): DokumentEintrag[] => {
      const jahrgang = koenigin.jahrgang ? ` · Jahrgang ${koenigin.jahrgang}` : "";
      return [
        // Die selbst erstellte Karte - live als PDF erzeugt, so wie sie
        // gespeichert ist.
        ...(koenigin.zuchtkarte
          ? [
              {
                id: koenigin.id,
                typ: "ZUCHTKARTE" as const,
                titel: `Zuchtkarte · ${koenigin.kennung}`,
                kontext: `Eigene Zuchtkarte${jahrgang}`,
                datum: koenigin.zuchtkarte.updatedAt,
                ortHref: `/koeniginnen/${koenigin.id}`,
                dateiHref: `/koeniginnen/${koenigin.id}/zuchtkarte`,
                mimeType: "application/pdf",
              },
            ]
          : []),
        // Das Foto/der Scan der Karte, die eine zugekaufte Königin mitbringt.
        ...(koenigin.zuchtkarteFotoDateiname
          ? [
              {
                id: `${koenigin.id}-zuechterkarte`,
                typ: "ZUCHTKARTE" as const,
                titel: `Zuchtkarte des Züchters · ${koenigin.kennung}`,
                kontext: `Hochgeladene Karte${jahrgang}${
                  fehlendeKartendateien.has(koenigin.zuchtkarteFotoDateiname) ? " · Datei fehlt auf dem Server" : ""
                }`,
                datum: koenigin.createdAt,
                ortHref: `/koeniginnen/${koenigin.id}`,
                dateiHref: `/bilder/${koenigin.zuchtkarteFotoDateiname}`,
                mimeType: koenigin.zuchtkarteFotoMimeType ?? undefined,
              },
            ]
          : []),
      ];
    }),
  ];

  return eintraege.sort((a, b) => b.datum.getTime() - a.datum.getTime());
}
