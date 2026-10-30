import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Card, knopfKlassen } from "@/components/ui";
import { KoeniginnenSuche } from "@/components/koeniginnen-suche";
import { KoeniginStern } from "@/components/koenigin-stern";
import { KoeniginnenReiter } from "@/components/koeniginnen-reiter";
import { IconKalender, IconStammbaum, IconStecknadel } from "@/components/icons";
import type { Ansicht } from "@/components/ansicht-umschalter";
import { leistungLaden, schulnotenFarbe } from "@/lib/koenigin-leistung";
import {
  ANSICHT_COOKIE,
  BEGATTUNGSARTEN,
  BEGATTUNGSART_KURZ,
  KOENIGIN_SORTIERUNGEN,
  HERKUNFT_LABEL,
  STATUS_LABEL,
  anzeigeFarbe,
  istVerfuegbar,
  koeniginZeile,
  type Begattungsart,
  type Herkunft,
  type KoeniginSortierung,
  type KoeniginStatus,
} from "@/lib/koeniginnen";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Farben der Begattungsart: bewusst andere Töne als die roten/gelben
// Warnhinweise der Stockkarte - hier ist nichts auffällig, es sind bloß
// Kategorien.
const BEGATTUNG_FARBE: Record<Begattungsart, string> = {
  BELEGSTELLE: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  STANDBEGATTUNG: "bg-warnung-flaeche text-warnung",
  KUENSTLICHE_BESAMUNG: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  UNBEKANNT: "bg-background text-muted",
};

type Suchparameter = { q?: string; sort?: string; jahrgang?: string; begattung?: string; ort?: string; stand?: string };

export default async function KoeniginnenPage({ searchParams }: { searchParams: Promise<Suchparameter> }) {
  await bereichPflicht("koeniginnen");
  const parameter = await searchParams;
  const suche = {
    q: parameter.q ?? "",
    sort: (KOENIGIN_SORTIERUNGEN.some((eintrag) => eintrag.wert === parameter.sort)
      ? parameter.sort
      : "jahrgang") as KoeniginSortierung,
    jahrgang: parameter.jahrgang ?? "",
    begattung: (BEGATTUNGSARTEN as readonly string[]).includes(parameter.begattung ?? "")
      ? parameter.begattung!
      : "",
    ort: "",
    stand: parameter.stand ?? "",
  };
  if (suche.begattung === "BELEGSTELLE" || suche.begattung === "STANDBEGATTUNG") suche.ort = parameter.ort ?? "";

  const ansicht: Ansicht = (await cookies()).get(ANSICHT_COOKIE)?.value === "kacheln" ? "kacheln" : "liste";

  const staende = await prisma.bienenstand.findMany({
    where: { archiviert: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const alle = await prisma.koenigin.findMany({
    orderBy: [{ status: "asc" }, { jahrgang: "desc" }, { kennung: "asc" }],
    include: {
      belegstelle: { select: { id: true, name: true } },
      begattungsStand: { select: { id: true, name: true } },
      volk: { select: { id: true, name: true, bienenstand: { select: { id: true, name: true } } } },
      mutterKoenigin: { select: { kennung: true } },
      _count: { select: { toechter: true } },
      // Nur für die Sortierung nach Bewertung gebraucht, aber klein.
      ereignisse: { select: { art: true, datum: true, volkId: true } },
    },
  });

  const jahrgaenge = [...new Set(alle.map((koenigin) => koenigin.jahrgang).filter((jahr) => jahr !== null))].sort(
    (a, b) => b - a
  );

  // Zweite Auswahl neben der Begattungsart: nur die Belegstellen bzw. Stände,
  // an denen tatsächlich Königinnen begattet wurden.
  const orteNachId = new Map<string, string>();
  for (const koenigin of alle) {
    if (koenigin.begattungsart !== suche.begattung) continue;
    const ort = suche.begattung === "BELEGSTELLE" ? koenigin.belegstelle : koenigin.begattungsStand;
    if (ort) orteNachId.set(ort.id, ort.name);
  }
  const orte = [...orteNachId]
    .map(([id, name]) => ({ id, name }))
    .sort((x, y) => x.name.localeCompare(y.name, "de"));

  // Jedes Suchwort muss irgendwo vorkommen ("dachtel 2026" findet die
  // 2026er vom Stand Dachtel).
  const woerter = suche.q.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
  const gefiltert = alle.filter((koenigin) => {
    if (suche.jahrgang && String(koenigin.jahrgang) !== suche.jahrgang) return false;
    if (suche.begattung && koenigin.begattungsart !== suche.begattung) return false;
    if (suche.stand === "ohne" ? koenigin.volk : suche.stand && koenigin.volk?.bienenstand.id !== suche.stand) {
      return false;
    }
    if (suche.ort && koenigin.belegstelle?.id !== suche.ort && koenigin.begattungsStand?.id !== suche.ort) {
      return false;
    }
    if (woerter.length === 0) return true;
    const text = [
      koenigin.kennung,
      koenigin.zuchtbuchnummer,
      koenigin.rasse,
      koenigin.jahrgang,
      koenigin.volk?.name,
      koenigin.volk?.bienenstand.name,
      koenigin.belegstelle?.name,
      koenigin.begattungsStand?.name,
      koenigin.mutterKoenigin?.kennung,
      koenigin.vaterlinie,
      koenigin.herkunftText,
      HERKUNFT_LABEL[koenigin.herkunft as Herkunft],
      BEGATTUNGSART_KURZ[koenigin.begattungsart as Begattungsart],
      koenigin.zeichenFarbe,
      koenigin.notizen,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("de");
    return woerter.every((wort) => text.includes(wort));
  });

  const noten = new Map<string, number | null>();
  if (suche.sort === "note") {
    await Promise.all(
      gefiltert.map(async (koenigin) =>
        noten.set(koenigin.id, (await leistungLaden(koenigin))?.gesamtnote ?? null)
      )
    );
  }

  const vergleich = (a: (typeof alle)[number], b: (typeof alle)[number]): number => {
    const nachKennung = a.kennung.localeCompare(b.kennung, "de", { numeric: true });
    const ohneWertHinten = (x: number | null | undefined, y: number | null | undefined) =>
      x == null ? (y == null ? 0 : 1) : y == null ? -1 : 0;
    switch (suche.sort) {
      case "jahrgang-alt":
        return ohneWertHinten(a.jahrgang, b.jahrgang) || (a.jahrgang ?? 0) - (b.jahrgang ?? 0) || nachKennung;
      case "kennung":
        return nachKennung;
      case "stand":
        return (
          ohneWertHinten(a.volk ? 1 : null, b.volk ? 1 : null) ||
          (a.volk?.bienenstand.name ?? "").localeCompare(b.volk?.bienenstand.name ?? "", "de") ||
          (a.volk?.name ?? "").localeCompare(b.volk?.name ?? "", "de", { numeric: true }) ||
          nachKennung
        );
      case "note": {
        const x = noten.get(a.id);
        const y = noten.get(b.id);
        return ohneWertHinten(x, y) || (x ?? 0) - (y ?? 0) || nachKennung;
      }
      case "toechter":
        return b._count.toechter - a._count.toechter || nachKennung;
      default:
        return ohneWertHinten(a.jahrgang, b.jahrgang) || (b.jahrgang ?? 0) - (a.jahrgang ?? 0) || nachKennung;
    }
  };
  const koeniginnen = [...gefiltert].sort(vergleich);

  const lebende = koeniginnen.filter((koenigin) => istVerfuegbar(koenigin.status as KoeniginStatus));
  const abgegangene = koeniginnen.filter((koenigin) => !istVerfuegbar(koenigin.status as KoeniginStatus));

  // Ohne gewählten Stand werden die lebenden Königinnen nach dem Stand ihres
  // Volkes gruppiert (alphabetisch, "Ohne Volk" am Ende). Innerhalb einer
  // Gruppe gilt die gewählte Sortierung.
  const gruppen: { titel: string | null; koeniginnen: typeof lebende }[] = [];
  if (suche.stand) {
    gruppen.push({ titel: null, koeniginnen: lebende });
  } else {
    const nachStand = new Map<string, typeof lebende>();
    for (const koenigin of lebende) {
      const name = koenigin.volk?.bienenstand.name ?? "";
      nachStand.set(name, [...(nachStand.get(name) ?? []), koenigin]);
    }
    for (const name of [...nachStand.keys()].sort((a, b) =>
      a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "de")
    )) {
      gruppen.push({ titel: name || "Ohne Volk", koeniginnen: nachStand.get(name)! });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SeitenNavigation className="-mb-3" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Königinnen</h1>
          <p className="hidden text-sm text-muted sm:block">
            Abstammung, Begattung und Verbleib, dazu eine eigene Zuchtkarte zum Ausdrucken.
          </p>
        </div>
        {/* Auf dem Handy ist das der schwebende Knopf unten rechts. */}
        <Link
          href="/koeniginnen/neu"
          className={`${knopfKlassen("primary", "klein")} max-sm:hidden`}
        >
          + Neue Königin
        </Link>
      </div>

      <KoeniginnenReiter
        anzahl={alle.filter((koenigin) => istVerfuegbar(koenigin.status as KoeniginStatus)).length}
        zucht={<ZuchtWerkzeuge />}
      >
        {alle.length > 0 && (
          <KoeniginnenSuche werte={suche} jahrgaenge={jahrgaenge} orte={orte} staende={staende} ansicht={ansicht} />
        )}

        {alle.length === 0 ? (
          <Card className="text-center text-muted">
            Noch keine Königin erfasst. Leg mit &bdquo;Neue Königin&ldquo; die erste an oder trag beim
            Volk Jahrgang und Zeichen ein, dann entsteht sie automatisch.
          </Card>
        ) : koeniginnen.length === 0 ? (
          <Card className="text-center text-muted">Keine Königin passt zur Suche.</Card>
        ) : (
          gruppen.map((gruppe) => (
            <div key={gruppe.titel ?? ""} className="flex flex-col gap-3">
              {gruppe.titel && (
                <h2 className="flex items-baseline gap-2 text-base font-semibold">
                  {gruppe.titel}
                  <span className="text-sm font-normal text-muted">{gruppe.koeniginnen.length}</span>
                </h2>
              )}
              <KoeniginnenAuflistung
                koeniginnen={gruppe.koeniginnen}
                ansicht={ansicht}
                noten={noten}
                mitStand={false}
              />
            </div>
          ))
        )}

        {abgegangene.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted">Nicht mehr im Bestand</h2>
            <KoeniginnenAuflistung koeniginnen={abgegangene} ansicht={ansicht} noten={noten} mitStand gedaempft />
          </div>
        )}
      </KoeniginnenReiter>
    </div>
  );
}

const ZUCHT_WERKZEUGE = [
  {
    href: "/koeniginnen/zucht",
    titel: "Zuchtplanung",
    text: "Zuchtserien, Umlarven und was danach ansteht",
    Icon: IconKalender,
  },
  { href: "/koeniginnen/stammbaum", titel: "Stammbaum", text: "Zuchtlinien über die Generationen", Icon: IconStammbaum },
  {
    href: "/einstellungen/belegstellen",
    titel: "Belegstellen",
    text: "Orte und Drohnenvölker für die Anpaarung",
    Icon: IconStecknadel,
  },
];

// Inhalt des Reiters "Zucht".
function ZuchtWerkzeuge() {
  return (
    <Card className="flex flex-col !p-0">
      {ZUCHT_WERKZEUGE.map(({ href, titel, text, Icon }, index) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 px-4 py-3.5 hover:bg-background ${index > 0 ? "border-t border-border" : ""}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-5 w-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">{titel}</span>
            <span className="text-xs text-muted">{text}</span>
          </span>
          <span className="text-muted" aria-hidden="true">
            ›
          </span>
        </Link>
      ))}
    </Card>
  );
}

type KoeniginMitBezug = {
  id: string;
  kennung: string;
  rasse: string | null;
  jahrgang: number | null;
  zeichenFarbe: string | null;
  herkunft: string;
  begattungsart: string;
  status: string;
  stern: boolean;
  belegstelle: { name: string } | null;
  begattungsStand: { name: string } | null;
  volk: { id: string; name: string; bienenstand: { name: string } } | null;
  mutterKoenigin: { kennung: string } | null;
  _count: { toechter: number };
};

function KoeniginnenAuflistung({
  koeniginnen,
  ansicht,
  noten,
  mitStand,
  gedaempft = false,
}: {
  koeniginnen: KoeniginMitBezug[];
  ansicht: Ansicht;
  noten: Map<string, number | null>;
  /// Stand vor dem Volk nennen - überflüssig, wenn er schon in der Überschrift steht.
  mitStand: boolean;
  gedaempft?: boolean;
}) {
  if (ansicht === "kacheln") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
        {koeniginnen.map((koenigin) => (
          <KoeniginKachel
            key={koenigin.id}
            koenigin={koenigin}
            note={noten.get(koenigin.id)}
            mitStand={mitStand}
            gedaempft={gedaempft}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {koeniginnen.map((koenigin) => (
        <KoeniginZeile
          key={koenigin.id}
          koenigin={koenigin}
          note={noten.get(koenigin.id)}
          mitStand={mitStand}
          gedaempft={gedaempft}
        />
      ))}
    </div>
  );
}

function ortText(koenigin: KoeniginMitBezug, mitStand: boolean): string {
  if (!koenigin.volk) return "ohne Volk";
  return mitStand ? `${koenigin.volk.bienenstand.name} · ${koenigin.volk.name}` : koenigin.volk.name;
}

function nebenText(koenigin: KoeniginMitBezug): string {
  return [
    koeniginZeile(koenigin),
    koenigin.mutterKoenigin && `Mutter ${koenigin.mutterKoenigin.kennung}`,
    koenigin._count.toechter > 0 &&
      `${koenigin._count.toechter} ${koenigin._count.toechter === 1 ? "Tochter" : "Töchter"}`,
    koenigin.herkunft !== "UNBEKANNT" && HERKUNFT_LABEL[koenigin.herkunft as Herkunft],
  ]
    .filter(Boolean)
    .join(" · ");
}

function Plaketten({ koenigin, note }: { koenigin: KoeniginMitBezug; note?: number | null }) {
  return (
    <>
      {note != null && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${schulnotenFarbe(note)}`}
          title="Gesamtnote aus der Bewertung"
        >
          {note.toFixed(1).replace(".", ",")}
        </span>
      )}
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${BEGATTUNG_FARBE[koenigin.begattungsart as Begattungsart]}`}
      >
        {BEGATTUNGSART_KURZ[koenigin.begattungsart as Begattungsart]}
      </span>
      <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
        {STATUS_LABEL[koenigin.status as KoeniginStatus]}
      </span>
    </>
  );
}

function Jahrgangsfeld({ koenigin, gross = false }: { koenigin: KoeniginMitBezug; gross?: boolean }) {
  const farbe = anzeigeFarbe(koenigin.jahrgang, koenigin.zeichenFarbe);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold border border-rand-bedienung ${
        gross ? "h-14 w-14 text-base" : "h-11 w-11 text-xs"
      }`}
      style={{
        background: farbe?.hex ?? "transparent",
        color: farbe?.dunklerText ? "#17191b" : "#ffffff",
      }}
      title={farbe ? `gezeichnet ${farbe.name}` : "keine Zeichenfarbe"}
    >
      {koenigin.jahrgang ? String(koenigin.jahrgang).slice(-2) : "–"}
    </span>
  );
}

function KoeniginKachel({
  koenigin,
  gedaempft,
  note,
  mitStand,
}: {
  koenigin: KoeniginMitBezug;
  gedaempft: boolean;
  note?: number | null;
  mitStand: boolean;
}) {
  return (
    <Link href={`/koeniginnen/${koenigin.id}`} className="block h-full">
      <Card
        className={`flex h-full flex-col gap-2 !p-4 transition-shadow hover:shadow-lg ${gedaempft ? "opacity-70 hover:opacity-100" : ""}`}
      >
        {/* Untereinander statt nebeneinander: auf dem Handy stehen zwei
            Kacheln in einer Reihe, da wäre neben dem Farbfeld kaum Platz. */}
        <Jahrgangsfeld koenigin={koenigin} gross />
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-semibold sm:text-lg">
            <span className="truncate">{koenigin.kennung}</span>
            {koenigin.stern && <KoeniginStern />}
          </p>
          <p className="truncate text-sm text-muted">{ortText(koenigin, mitStand)}</p>
        </div>
        <p className="text-xs text-muted">{nebenText(koenigin)}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          <Plaketten koenigin={koenigin} note={note} />
        </div>
      </Card>
    </Link>
  );
}

function KoeniginZeile({
  koenigin,
  gedaempft,
  note,
  mitStand,
}: {
  koenigin: KoeniginMitBezug;
  gedaempft: boolean;
  /// Gesamtnote - nur gesetzt, wenn danach sortiert wird.
  note?: number | null;
  mitStand: boolean;
}) {
  // Auf dem Handy rücken die Plaketten unter den Text, sonst bleibt für
  // Kennung, Stand und Volk nur ein schmaler Streifen.
  return (
    <Link href={`/koeniginnen/${koenigin.id}`} className="block">
      <Card
        className={`flex items-center gap-4 transition-shadow hover:shadow-md ${gedaempft ? "opacity-70 hover:opacity-100" : ""}`}
      >
        <Jahrgangsfeld koenigin={koenigin} />

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="inline-flex items-center gap-1 font-semibold">
              {koenigin.kennung}
              {koenigin.stern && <KoeniginStern />}
            </span>
            <span className="text-sm text-muted">{ortText(koenigin, mitStand)}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">{nebenText(koenigin)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
            <Plaketten koenigin={koenigin} note={note} />
          </div>
        </div>

        <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
          <Plaketten koenigin={koenigin} note={note} />
        </div>
      </Card>
    </Link>
  );
}
