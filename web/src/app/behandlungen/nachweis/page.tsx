import { natuerlich } from "@/lib/sortierung";
import Link from "next/link";
import { datumAnzeige, dauerAnzeige, mengeAnzeige } from "@/lib/behandlung";
import { nachweisDatenLaden } from "@/lib/nachweis";
import { bereichPflicht } from "@/lib/bereiche";

// Behandlungsnachweis am Bildschirm - die schnelle Sicht auf die Daten, ohne
// eine Datei zu erzeugen. Der eigentliche Export ist die PDF-Datei unter
// /behandlungen; beide holen ihre Daten aus lib/nachweis.ts und zeigen
// deshalb garantiert dasselbe.

type Suchparameter = { jahr?: string; stand?: string; volk?: string };

export default async function NachweisPage({
  searchParams,
}: {
  searchParams: Promise<Suchparameter>;
}) {
  await bereichPflicht("behandlungen");
  const { jahr: jahrRoh, stand: standId, volk: volkId } = await searchParams;
  const jahr = Number.parseInt(jahrRoh ?? "", 10) || new Date().getFullYear();

  const daten = await nachweisDatenLaden({ jahr, standId, volkId });
  const {
    betrieb,
    voelker,
    volkIds,
    behandlungen,
    bezeichnung: umfangText,
    staende: staendeImNachweis,
    verbrauch,
    mehrereStaende,
  } = daten;

  return (
    <div className="flex flex-col gap-6 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
        <p className="text-sm text-muted">
          Vorschau am Bildschirm. Die Datei zum Verschicken oder Ablegen erzeugst du unter
          Behandlungen mit „PDF erstellen“.
        </p>
        <Link
          href="/behandlungen"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
        >
          Zurück
        </Link>
      </div>

      {/* ---------------- Kopf ---------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-2">
        <div>
          <h1 className="text-xl font-semibold">
            Nachweis über die Anwendung von Tierarzneimitteln bei Bienen
          </h1>
          <p className="text-xs text-muted">
            gemäß Art. 108 VO (EU) 2019/6 in Verbindung mit § 2 THAMNV
          </p>
        </div>
        <div className="text-right text-xs">
          <p>Jahr {jahr}</p>
          <p>{umfangText}</p>
          <p className="text-muted">erstellt {datumAnzeige(new Date())}</p>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
        <div>
          <span className="text-muted">Bienenhalter: </span>
          <span className="font-medium">
            {betrieb
              ? [betrieb.halterName, betrieb.strasse, betrieb.plzOrt].filter(Boolean).join(", ")
              : "— noch nicht hinterlegt (Einstellungen → Bienenhalter) —"}
          </span>
          {betrieb?.registriernummer && (
            <span className="text-muted"> · Reg.-Nr. {betrieb.registriernummer}</span>
          )}
        </div>
        <div>
          <span className="text-muted">Standorte: </span>
          <span className="font-medium">
            {staendeImNachweis
              .map((stand) =>
                [stand.name, stand.strasse, stand.ort].filter(Boolean).join(", ")
              )
              .join(" | ") || "—"}
          </span>
        </div>
      </div>

      {behandlungen.length === 0 ? (
        <p className="py-8 text-center text-muted">
          Für {jahr} sind in diesem Umfang keine Behandlungen dokumentiert.
        </p>
      ) : (
        <>
          {/* ---------------- Seite 1: Jahresmatrix ---------------- */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Übersicht {jahr}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b-2 border-foreground p-1 text-left align-bottom">
                      Volk
                    </th>
                    {behandlungen.map((behandlung, index) => (
                      <th
                        key={behandlung.id}
                        className="border-b-2 border-foreground p-1 text-center align-bottom font-mono text-[0.65rem] font-semibold"
                      >
                        {index + 1}
                        <br />
                        {datumAnzeige(behandlung.datum).slice(0, 6)}
                      </th>
                    ))}
                    <th className="border-b-2 border-foreground p-1 text-right align-bottom">
                      Behandlungen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {voelker.map((volk) => {
                    const treffer = behandlungen.map(
                      (behandlung) =>
                        !behandlung.storniertAm &&
                        behandlung.voelker.some((eintrag) => eintrag.volkId === volk.id)
                    );
                    const anzahl = treffer.filter(Boolean).length;
                    return (
                      <tr key={volk.id}>
                        <td className="border-b border-border p-1 font-medium">
                          {volk.name}
                          {volk.rasse && (
                            <span className="text-muted"> · {volk.rasse}</span>
                          )}
                          {mehrereStaende && (
                            <span className="text-muted"> ({volk.bienenstand.name})</span>
                          )}
                        </td>
                        {treffer.map((behandelt, index) => (
                          <td
                            key={index}
                            className={`border-b border-border p-1 text-center ${
                              behandelt ? "" : "text-muted"
                            }`}
                          >
                            {behandelt ? "✓" : "–"}
                          </td>
                        ))}
                        <td
                          className={`border-b border-border p-1 text-right tabular-nums ${
                            anzahl === 0 ? "font-semibold text-gefahr" : ""
                          }`}
                        >
                          {anzahl}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-0.5 text-xs text-muted">
              {behandlungen.map((behandlung, index) => (
                <p key={behandlung.id}>
                  <span className="font-mono">{index + 1}</span> ={" "}
                  {datumAnzeige(behandlung.datum)} · {behandlung.medikament.name}
                  {behandlung.medikament.chargennummer &&
                    ` (Ch. ${behandlung.medikament.chargennummer})`}{" "}
                  · gegen {behandlung.indikation}
                  {behandlung.storniertAm && " · STORNIERT"}
                </p>
              ))}
            </div>

            {verbrauch.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-muted">Verbrauch gesamt: </span>
                {verbrauch
                  .map((eintrag) => `${eintrag.name} ${mengeAnzeige(eintrag.menge, eintrag.einheit)}`)
                  .join(" · ")}
              </div>
            )}
          </section>

          {/* ---------------- Seite 2: Einzelnachweise ---------------- */}
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Einzelnachweise {jahr}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="align-bottom">
                    <th className="border-b-2 border-foreground p-1 text-left">Datum</th>
                    <th className="border-b-2 border-foreground p-1 text-left">Dauer</th>
                    <th className="border-b-2 border-foreground p-1 text-left">
                      Anzahl, Art und Identität der behandelten Völker
                    </th>
                    <th className="border-b-2 border-foreground p-1 text-left">
                      Arzneimittel / Indikation
                    </th>
                    <th className="border-b-2 border-foreground p-1 text-left">Menge je Volk</th>
                    <th className="border-b-2 border-foreground p-1 text-left">
                      Lieferant und Beleg
                    </th>
                    <th className="border-b-2 border-foreground p-1 text-left">Wartezeit</th>
                    <th className="border-b-2 border-foreground p-1 text-left">Anwender</th>
                  </tr>
                </thead>
                <tbody>
                  {behandlungen.map((behandlung) => {
                    const betroffene = behandlung.voelker.filter((eintrag) =>
                      volkIds.includes(eintrag.volkId)
                    );
                    const storniert = behandlung.storniertAm !== null;
                    return (
                      <tr key={behandlung.id} className={storniert ? "line-through" : ""}>
                        <td className="border-b border-border p-1 align-top tabular-nums">
                          {datumAnzeige(behandlung.datum)}
                        </td>
                        <td className="border-b border-border p-1 align-top tabular-nums">
                          {dauerAnzeige(behandlung.datum, behandlung.endeDatum)}
                        </td>
                        <td className="border-b border-border p-1 align-top">
                          {betroffene.length}{" "}
                          {betroffene.length === 1 ? "Bienenvolk" : "Bienenvölker"} (Apis
                          mellifera):{" "}
                          {betroffene.map((eintrag) => eintrag.volkNameDamals).sort(natuerlich).join(", ")}
                          <br />
                          <span className="text-muted">
                            Standort:{" "}
                            {Array.from(
                              new Set(betroffene.map((eintrag) => eintrag.standNameDamals))
                            ).join(", ")}
                          </span>
                        </td>
                        <td className="border-b border-border p-1 align-top">
                          {behandlung.medikament.name}
                          <br />
                          <span className="text-muted">
                            {[
                              behandlung.medikament.zulassungsnummer &&
                                `Zul.-Nr. ${behandlung.medikament.zulassungsnummer}`,
                              behandlung.medikament.chargennummer &&
                                `Ch. ${behandlung.medikament.chargennummer}`,
                              `gegen ${behandlung.indikation}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </td>
                        <td className="border-b border-border p-1 align-top tabular-nums">
                          {mengeAnzeige(behandlung.mengeJeVolk, behandlung.medikament.einheit)}
                        </td>
                        <td className="border-b border-border p-1 align-top">
                          {behandlung.medikament.lieferant ?? "—"}
                          {(behandlung.medikament.belegnummer ||
                            behandlung.medikament.kaufdatum) && (
                            <>
                              <br />
                              <span className="text-muted">
                                {[
                                  behandlung.medikament.belegnummer &&
                                    `Beleg ${behandlung.medikament.belegnummer}`,
                                  behandlung.medikament.kaufdatum &&
                                    `v. ${datumAnzeige(behandlung.medikament.kaufdatum)}`,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="border-b border-border p-1 align-top tabular-nums">
                          {behandlung.wartezeitTage} Tage
                        </td>
                        <td className="border-b border-border p-1 align-top">
                          {behandlung.anwender}
                          {behandlung.bemerkung && (
                            <>
                              <br />
                              <span className="text-muted">{behandlung.bemerkung}</span>
                            </>
                          )}
                          {storniert && (
                            <>
                              <br />
                              <span className="text-muted">
                                storniert {datumAnzeige(behandlung.storniertAm!)}:{" "}
                                {behandlung.storniertGrund}
                              </span>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="border-t border-border pt-2 text-xs text-muted">
        Aufzubewahren fünf Jahre (Art. 108 Abs. 5 VO (EU) 2019/6, § 1 Abs. 1 THAMNV). Die
        Erwerbsbelege der eingesetzten Arzneimittel liegen gesondert vor und sind in der
        Imkereiverwaltung beim jeweiligen Medikament hinterlegt.
      </p>
    </div>
  );
}
