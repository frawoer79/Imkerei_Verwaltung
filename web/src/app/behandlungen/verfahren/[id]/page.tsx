import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { natuerlich } from "@/lib/sortierung";
import { bereichPflicht } from "@/lib/bereiche";
import { Card, LinkKnopf, knopfKlassen } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { IconHaken } from "@/components/icons";
import { bioSchrittSetzen, bioVerfahrenLoeschen } from "@/lib/bio-verfahren-actions";
import { datumAnzeige, mengeAnzeige } from "@/lib/behandlung";
import { FAELLIGKEIT_TEXT, faelligkeitBestimmen, faelligkeitText } from "@/lib/faelligkeit";
import {
  BANNWABE_VARIANTE_LABEL,
  VERBLEIB_LABEL,
  bannwabeVariante,
  behandlungLink,
  schrittDatum,
  verfahrenFortschritt,
  verfahrenSchritte,
  verfahrenTitel,
} from "@/lib/bio-verfahren";

// Ein biotechnisches Verfahren mit seinem Fahrplan. Jeder Schritt gilt für
// alle Völker des Verfahrens und lässt sich hier in einem Griff abhaken;
// einzeln geht es weiter über die Maßnahmen am Volk.
export default async function VerfahrenPage({ params }: { params: Promise<{ id: string }> }) {
  await bereichPflicht("behandlungen");
  const { id } = await params;
  const verfahren = await prisma.bioVerfahren.findUnique({
    where: { id },
    include: {
      voelker: { include: { volk: { select: { id: true, archiviert: true } } } },
      massnahmen: { select: { volkId: true, bioSchritt: true, erledigt: true } },
      behandlungen: {
        orderBy: { datum: "asc" },
        include: { medikament: { select: { name: true, einheit: true } }, voelker: { select: { volkId: true } } },
      },
    },
  });
  if (!verfahren) notFound();

  const schritte = verfahrenSchritte(verfahren.art, verfahren);
  const stand = schritte.map((schritt) => {
    const zugehoerig = verfahren.massnahmen.filter((massnahme) => massnahme.bioSchritt === schritt.schluessel);
    return { schritt, gesamt: zugehoerig.length, erledigt: zugehoerig.filter((massnahme) => massnahme.erledigt).length };
  });
  const fortschritt = verfahrenFortschritt(
    schritte,
    verfahren.massnahmen.map((massnahme) => ({ schluessel: massnahme.bioSchritt ?? "", erledigt: massnahme.erledigt }))
  );
  const heute = new Date();
  const voelker = [...verfahren.voelker].sort((a, b) =>
    natuerlich(`${a.standNameDamals}/${a.volkNameDamals}`, `${b.standNameDamals}/${b.volkNameDamals}`)
  );
  const angaben = [
    verfahren.brutwaben !== null && { name: "Brutwaben je Volk", wert: String(verfahren.brutwaben) },
    verfahren.verbleib && { name: "Verbleib", wert: VERBLEIB_LABEL[verfahren.verbleib] ?? verfahren.verbleib },
    verfahren.art === "TBE" && { name: "Fangwabe", wert: verfahren.fangwabe ? "ja" : "nein" },
    verfahren.art === "BANNWABE" && {
      name: "Ablauf",
      wert: BANNWABE_VARIANTE_LABEL[bannwabeVariante(verfahren.bannwabeVariante)],
    },
    verfahren.kaefig && { name: verfahren.art === "BANNWABE" ? "Wabentasche / Käfig" : "Käfig", wert: verfahren.kaefig },
    { name: "Anwender", wert: verfahren.anwender },
  ].filter((angabe) => !!angabe) as { name: string; wert: string }[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{verfahrenTitel(verfahren.art, verfahren.bezeichnung)}</h1>
            <p className="text-sm text-muted">
              Ohne Medikament · {fortschritt.gesamt > 1 ? "Beginn " : ""}
              {datumAnzeige(verfahren.beginn)}
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-sm ${
              fortschritt.abgeschlossen ? "border-border bg-background text-muted" : "border-ok-rand bg-ok-flaeche text-ok"
            }`}
          >
            {fortschritt.abgeschlossen
              ? "abgeschlossen"
              : `läuft · Schritt ${Math.min(fortschritt.erledigt + 1, fortschritt.gesamt)} von ${fortschritt.gesamt}`}
          </span>
        </div>
      </div>

      <Card>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {angaben.map((angabe) => (
            <div key={angabe.name} className="flex gap-2">
              <dt className="text-muted">{angabe.name}</dt>
              <dd>{angabe.wert}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-sm">
          {voelker.map((eintrag, index) => (
            <span key={eintrag.volkId}>
              {index > 0 && " · "}
              {eintrag.volk.archiviert ? (
                `${eintrag.standNameDamals}/${eintrag.volkNameDamals}`
              ) : (
                <Link href={`/voelker/${eintrag.volkId}`} className="text-accent hover:underline">
                  {eintrag.standNameDamals}/{eintrag.volkNameDamals}
                </Link>
              )}
            </span>
          ))}
        </p>
        {verfahren.bemerkung && <p className="mt-2 text-sm text-muted">{verfahren.bemerkung}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkKnopf href={`/behandlungen/verfahren/${verfahren.id}/bearbeiten`} variant="secondary" groesse="mittel">
            Bearbeiten
          </LinkKnopf>
          <LoeschenButton
            action={bioVerfahrenLoeschen.bind(null, verfahren.id)}
            bestaetigung="Verfahren löschen? Die Schritte verschwinden auch aus den Maßnahmen. Behandlungen mit Medikament bleiben im Bestandsbuch."
            groesse="mittel"
          />
        </div>
      </Card>

      {schritte.length > 1 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Fahrplan</h2>
          <ol className="flex flex-col">
            {stand.map(({ schritt, gesamt, erledigt }) => {
              const fertig = gesamt === 0 || erledigt === gesamt;
              const termin = schrittDatum(verfahren.beginn, schritt.tag);
              const faelligkeit = fertig ? "ohne" : faelligkeitBestimmen(termin, heute);
              return (
                <li
                  key={schritt.schluessel}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <span className="w-14 shrink-0 text-xs font-semibold uppercase text-muted">Tag {schritt.tag}</span>
                  <div className="min-w-48 flex-1">
                    <p className={`text-sm font-medium ${fertig ? "text-ok" : ""}`}>
                      {fertig && <IconHaken className="mr-1 inline-block h-[1em] w-[1em] align-[-0.125em]" />}
                      {schritt.titel}
                    </p>
                    <p className={`text-xs ${fertig ? "text-muted" : FAELLIGKEIT_TEXT[faelligkeit]}`}>
                      {fertig ? datumAnzeige(termin) : faelligkeitText(faelligkeit, datumAnzeige(termin))}
                      {gesamt > 1 && !fertig && erledigt > 0 && ` · ${erledigt} von ${gesamt} Völkern erledigt`}
                    </p>
                    {schritt.hinweis && !fertig && <p className="text-xs text-muted">{schritt.hinweis}</p>}
                  </div>
                  {schritt.medikament && !fertig ? (
                    <Link href={behandlungLink(verfahren.id, schritt.schluessel)} className={knopfKlassen("primary", "mittel")}>
                      Behandlung eintragen
                    </Link>
                  ) : (
                    gesamt > 0 &&
                    !schritt.medikament && (
                      <form action={bioSchrittSetzen.bind(null, verfahren.id, schritt.schluessel, !fertig)}>
                        <button type="submit" className={knopfKlassen(fertig ? "secondary" : "primary", "mittel")}>
                          {fertig ? "Wieder öffnen" : "Erledigt"}
                        </button>
                      </form>
                    )
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {verfahren.behandlungen.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Behandlungen mit Medikament</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {verfahren.behandlungen.map((behandlung) => (
              <li key={behandlung.id} className={behandlung.storniertAm ? "text-muted line-through" : ""}>
                {datumAnzeige(behandlung.datum)} · {behandlung.medikament.name} ·{" "}
                {mengeAnzeige(behandlung.mengeJeVolk, behandlung.medikament.einheit)} je Volk ·{" "}
                {behandlung.voelker.length} {behandlung.voelker.length === 1 ? "Volk" : "Völker"}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Der Nachweis dazu steht unter <Link href="/behandlungen" className="text-accent hover:underline">Behandlungen</Link>.
          </p>
        </Card>
      )}
    </div>
  );
}
