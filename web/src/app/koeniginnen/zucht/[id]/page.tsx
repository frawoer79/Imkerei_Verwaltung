import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button, Card, Input, Label } from "@/components/ui";
import {
  zuchtKoeniginnenAnlegen,
  massnahmeKalenderUmschalten,
  zuchtSchrittUmschalten,
  zuchtserieAbschliessenUmschalten,
  zuchtserieLoeschen,
  zuchtserieZahlenSpeichern,
} from "@/lib/actions";
import { LoeschenBestaetigen } from "@/components/loeschen-bestaetigen";
import { BEGATTUNGSART_LABEL, anzeigeFarbe, kurzesDatum, type Begattungsart } from "@/lib/koeniginnen";
import { PFLEGEART_LABEL, SCHLUPF_TAG, schrittDatum, tagText, zuchtSchritte } from "@/lib/zucht";
import {
  FAELLIGKEIT_RAHMEN,
  FAELLIGKEIT_TEXT,
  faelligkeitBestimmen,
} from "@/lib/faelligkeit";
import { alsDatumWert } from "@/lib/koeniginnen-daten";
import { KoeniginStern } from "@/components/koenigin-stern";
import { KalenderSchalter } from "@/components/kalender-schalter";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

function langesDatum(datum: Date): string {
  return datum.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Angabe({ bezeichnung, children }: { bezeichnung: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-36 shrink-0 text-sm text-muted">{bezeichnung}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export default async function ZuchtseriePage({ params }: { params: Promise<{ id: string }> }) {
  await bereichPflicht("koeniginnen");
  const { id } = await params;
  const serie = await prisma.zuchtserie.findUnique({
    where: { id },
    include: {
      zuchtVolk: { select: { id: true, name: true, bienenstand: { select: { name: true } } } },
      pflegeVolk: { select: { id: true, name: true, bienenstand: { select: { name: true } } } },
      mutterKoenigin: { select: { id: true, kennung: true, rasse: true, jahrgang: true, stern: true } },
      belegstelle: { select: { name: true } },
      begattungsStand: { select: { name: true } },
      massnahmen: { select: { id: true, zuchtSchritt: true, erledigt: true, faelligAm: true, imKalender: true } },
      koeniginnen: {
        orderBy: { kennung: "asc" },
        select: { id: true, kennung: true, jahrgang: true, zeichenFarbe: true, status: true, stern: true },
      },
    },
  });
  if (!serie) notFound();

  const heute = new Date();
  const pflegeVolk = serie.pflegeVolk ?? serie.zuchtVolk;
  const schritte = zuchtSchritte(serie.pflegeart, serie.brutschrank);
  const geplanterSchlupf = serie.umlarvDatum ? schrittDatum(serie.umlarvDatum, SCHLUPF_TAG) : null;
  const quote =
    serie.anzahlUmgelarvt && serie.anzahlAngenommen !== null
      ? Math.round((serie.anzahlAngenommen / serie.anzahlUmgelarvt) * 100)
      : null;
  const offeneKoeniginnen = Math.max(
    0,
    (serie.anzahlGeschluepft ?? 0) - serie.koeniginnen.length
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[{ href: "/koeniginnen/zucht", label: "Zuchtplanung" }]} className="mb-2" />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{serie.bezeichnung}</h1>
          {serie.abgeschlossen && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">abgeschlossen</span>
          )}
          <Link href={`/koeniginnen/zucht/${serie.id}/bearbeiten`} className="text-sm text-muted hover:text-accent">
            bearbeiten
          </Link>
        </div>
        <p className="text-sm text-muted">
          {serie.umlarvDatum ? `Umlarven am ${langesDatum(serie.umlarvDatum)}` : "Umlarvtermin steht noch nicht fest"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Überblick</h2>
          <div className="divide-y divide-border">
            <Angabe bezeichnung="Zuchtmutter">
              {serie.mutterKoenigin ? (
                <>
                  <Link
                    href={`/koeniginnen/${serie.mutterKoenigin.id}`}
                    className="text-accent hover:underline"
                  >
                    {serie.mutterKoenigin.kennung}
                  </Link>
                  {serie.mutterKoenigin.stern && <KoeniginStern className="ml-1 h-8 w-8" />}
                  <span className="ml-2 text-muted">
                    {[serie.mutterKoenigin.rasse, serie.mutterKoenigin.jahrgang].filter(Boolean).join(", ")}
                  </span>
                </>
              ) : (
                <span className="text-muted">keine Königin erfasst</span>
              )}
            </Angabe>
            <Angabe bezeichnung="Zuchtvolk">
              {serie.zuchtVolk ? (
                <Link href={`/voelker/${serie.zuchtVolk.id}`} className="text-accent hover:underline">
                  {serie.zuchtVolk.name} ({serie.zuchtVolk.bienenstand.name})
                </Link>
              ) : (
                <span className="text-muted">nicht mehr vorhanden</span>
              )}
            </Angabe>
            <Angabe bezeichnung="Pflegeverfahren">
              {[serie.pflegeart !== "UNBEKANNT" && PFLEGEART_LABEL[serie.pflegeart], serie.brutschrank && "Brutschrank"]
                .filter(Boolean)
                .join(" · ")}
            </Angabe>
            <Angabe bezeichnung="Pflegevolk">
              {pflegeVolk && (
                <Link href={`/voelker/${pflegeVolk.id}`} className="text-accent hover:underline">
                  {pflegeVolk.name} ({pflegeVolk.bienenstand.name})
                </Link>
              )}
            </Angabe>
            <Angabe bezeichnung="Begattung">
              {serie.begattungsart === "UNBEKANNT"
                ? "noch offen"
                : [
                    BEGATTUNGSART_LABEL[serie.begattungsart as Begattungsart],
                    serie.belegstelle?.name,
                    serie.begattungsStand?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </Angabe>
            <Angabe bezeichnung="Schlupf geplant">{geplanterSchlupf && langesDatum(geplanterSchlupf)}</Angabe>
            <Angabe bezeichnung="Notizen">
              {serie.notizen && <span className="whitespace-pre-wrap">{serie.notizen}</span>}
            </Angabe>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-semibold">Zahlen</h2>
          <p className="mb-3 text-sm text-muted">
            {quote !== null ? `Annahme ${quote} %` : "Nach jedem Schritt eintragen, was noch da ist."}
          </p>
          <form action={zuchtserieZahlenSpeichern.bind(null, serie.id)} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["anzahlUmgelarvt", "Umgelarvt", serie.anzahlUmgelarvt],
                  ["anzahlAngenommen", "Angenommen", serie.anzahlAngenommen],
                  ["anzahlVerdeckelt", "Verdeckelt", serie.anzahlVerdeckelt],
                  ["anzahlGeschluepft", "Geschlüpft", serie.anzahlGeschluepft],
                ] as const
              ).map(([feld, label, wert]) => (
                <div key={feld}>
                  <Label htmlFor={feld}>{label}</Label>
                  <Input id={feld} name={feld} type="number" min={0} inputMode="numeric" defaultValue={wert ?? ""} />
                </div>
              ))}
            </div>
            <Button type="submit" variant="secondary" className="self-start">
              Zahlen speichern
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Zeitplan</h2>
        <p className="mb-4 text-sm text-muted">
          {serie.umlarvDatum
            ? "Die Schritte stehen auch als Maßnahmen beim Zucht- bzw. Pflegevolk. Ins Kalender-Abo kommen nur die mit „Kalender“ markierten, Antippen schaltet um. Wetter und Volksstärke verschieben die Termine in der Praxis um ein, zwei Tage."
            : "Sobald der Umlarvtermin feststeht (bearbeiten), werden hier die Daten ausgerechnet und die Schritte als Maßnahmen angelegt."}
        </p>
        <ol className="flex flex-col gap-2">
          {schritte.map((schritt) => {
            const massnahme = serie.massnahmen.find((eintrag) => eintrag.zuchtSchritt === schritt.schluessel);
            const datum = serie.umlarvDatum ? schrittDatum(serie.umlarvDatum, schritt.tag) : null;
            const erledigt = massnahme?.erledigt ?? false;
            const faelligkeit = datum && !erledigt ? faelligkeitBestimmen(datum, heute) : "ohne";
            const volk = schritt.volk === "zucht" ? (serie.zuchtVolk ?? pflegeVolk) : pflegeVolk;
            return (
              <li
                key={schritt.schluessel}
                className={`flex gap-3 rounded-lg border p-3 ${erledigt ? "border-border opacity-60" : FAELLIGKEIT_RAHMEN[faelligkeit]}`}
              >
                {massnahme ? (
                  <form action={zuchtSchrittUmschalten.bind(null, serie.id, massnahme.id)}>
                    <button
                      type="submit"
                      aria-label={erledigt ? "Als offen markieren" : "Als erledigt markieren"}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border text-sm ${erledigt ? "border-accent bg-accent text-accent-foreground" : "border-rand-bedienung bg-card"}`}
                    >
                      {erledigt ? "✓" : ""}
                    </button>
                  </form>
                ) : (
                  <span className="mt-0.5 h-6 w-6 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className={`font-medium ${erledigt ? "line-through" : ""}`}>{schritt.titel}</span>
                    <span className="text-xs text-muted">
                      {tagText(schritt.tag)}
                      {volk ? ` · ${volk.name}` : ""}
                    </span>
                  </p>
                  {datum && (
                    <p className={`text-sm ${erledigt ? "text-muted" : FAELLIGKEIT_TEXT[faelligkeit]}`}>
                      {langesDatum(datum)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">{schritt.hinweis}</p>
                </div>
                {massnahme && !erledigt && (
                  <KalenderSchalter
                    aktiv={massnahme.imKalender}
                    action={massnahmeKalenderUmschalten.bind(null, massnahme.id)}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Nachgezogene Königinnen</h2>
        <p className="mb-3 text-sm text-muted">
          Werden mit Mutter, Rasse, Jahrgang, Schlupftag und geplanter Begattung aus dieser Serie
          angelegt. Was danach passiert (Belegstelle, Zusetzen, Ausmerzen), läuft über den Lebenslauf
          der einzelnen Königin.
        </p>
        {serie.koeniginnen.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {serie.koeniginnen.map((koenigin) => {
              const farbe = anzeigeFarbe(koenigin.jahrgang, koenigin.zeichenFarbe);
              return (
                <Link
                  key={koenigin.id}
                  href={`/koeniginnen/${koenigin.id}`}
                  className="flex items-center gap-2 rounded-full border border-border py-0.5 pl-1 pr-3 text-sm hover:border-accent hover:text-accent"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-rand-bedienung"
                    style={{ background: farbe?.hex ?? "transparent" }}
                  />
                  {koenigin.kennung}
                  {koenigin.stern && <KoeniginStern className="-ml-1 h-7 w-7" />}
                </Link>
              );
            })}
          </div>
        )}
        <form
          action={zuchtKoeniginnenAnlegen.bind(null, serie.id)}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3"
        >
          <div className="w-24">
            <Label htmlFor="anzahl">Anzahl</Label>
            <Input
              id="anzahl"
              name="anzahl"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              defaultValue={offeneKoeniginnen > 0 ? offeneKoeniginnen : 1}
            />
          </div>
          <div className="w-44">
            <Label htmlFor="schlupfDatum">Geschlüpft am</Label>
            <Input
              id="schlupfDatum"
              name="schlupfDatum"
              type="date"
              defaultValue={alsDatumWert(geplanterSchlupf)}
            />
          </div>
          <Button type="submit">Königinnen anlegen</Button>
        </form>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <form action={zuchtserieAbschliessenUmschalten.bind(null, serie.id)} className="sm:max-w-sm">
          <Button type="submit" variant="secondary">
            {serie.abgeschlossen ? "Serie wieder öffnen" : "Serie abschließen"}
          </Button>
          <p className="mt-1 text-xs text-muted">
            {serie.abgeschlossen
              ? "Offene Schritte werden dann wieder als Maßnahmen angelegt."
              : "Entfernt die noch offenen Schritte aus der Maßnahmenliste, z.B. wenn die Serie abgebrochen wurde."}
          </p>
        </form>
        {/* Vorher nur unter "bearbeiten" zu finden - dort hat Frank ihn
            nicht gesucht. */}
        <div className="sm:max-w-sm">
          <LoeschenBestaetigen
            action={zuchtserieLoeschen.bind(null, serie.id)}
            knopfText="Serie löschen"
            frage={`Zuchtserie „${serie.bezeichnung}“ löschen?`}
            hinweis="Die Serie und ihre Arbeitsschritte verschwinden, auch aus Maßnahmen und Kalender. Bereits angelegte Königinnen bleiben samt Mutter erhalten."
          />
          <p className="mt-1 text-xs text-muted">Für Probe- oder versehentlich angelegte Serien.</p>
        </div>
      </div>

      <p className="text-xs text-muted">Angelegt am {kurzesDatum(serie.createdAt)}</p>
    </div>
  );
}
