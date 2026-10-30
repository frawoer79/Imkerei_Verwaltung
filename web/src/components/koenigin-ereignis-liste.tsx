"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import { KoeniginEreignisBearbeitenFormular } from "@/components/koenigin-ereignis-bearbeiten-formular";
import { EREIGNIS_LABEL, kurzesDatum, type EreignisArt } from "@/lib/koeniginnen";

function alsDatumWert(datum: Date): string {
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
}

export type EreignisWert = {
  id: string;
  datum: Date;
  art: EreignisArt;
  volk: { id: string; name: string; standName: string } | null;
  volkId: string | null;
  notiz: string | null;
  fotoDateiname: string | null;
  // Nur bei art === "BEWERTUNG" gesetzt - die einzelnen Kriterien dieser
  // Durchsicht, jedes einzeln aus der Königin-Bewertung ausschließbar.
  bewertung: {
    stockkartenEintragId: string;
    kriterien: { feld: string; label: string; stufenText: string; ausgeschlossen: boolean }[];
  } | null;
};

// Die Lebenslauf-Liste: standardmäßig nur lesbar, ein Antippen von
// "Bearbeiten" blendet für genau diesen Eintrag das Bearbeiten-Formular ein -
// das ist die geforderte ausdrückliche Freigabe zum Ändern, nicht ein
// dauerhaft offener Bearbeitungsmodus für die ganze Liste.
export function KoeniginEreignisListe({
  ereignisse,
  voelker,
  aktualisierenAction,
  loeschenAction,
  kriteriumAusschlussAction,
}: {
  ereignisse: EreignisWert[];
  voelker: { id: string; name: string; standName: string }[];
  aktualisierenAction: (ereignisId: string, formData: FormData) => Promise<void>;
  loeschenAction: (ereignisId: string, formData: FormData) => void;
  kriteriumAusschlussAction: (stockkartenEintragId: string, feld: string) => Promise<void>;
}) {
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);

  if (ereignisse.length === 0) {
    return <p className="text-sm text-muted">Noch nichts eingetragen.</p>;
  }

  return (
    <ul className="flex flex-col">
      {ereignisse.map((ereignis, index) => (
        <li key={ereignis.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
            {index < ereignisse.length - 1 && <span className="w-0.5 flex-1 bg-border" />}
          </div>
          <div className="flex flex-1 items-start justify-between gap-3 pb-4">
            {bearbeiteId === ereignis.id ? (
              <KoeniginEreignisBearbeitenFormular
                ereignis={{
                  id: ereignis.id,
                  art: ereignis.art,
                  datum: alsDatumWert(ereignis.datum),
                  volkId: ereignis.volkId,
                  notiz: ereignis.notiz ?? "",
                  fotoUrl: ereignis.fotoDateiname ? `/bilder/${ereignis.fotoDateiname}` : null,
                }}
                voelker={voelker}
                action={aktualisierenAction}
                fertig={() => setBearbeiteId(null)}
              />
            ) : (
              <>
                <div>
                  <p className="font-mono text-xs text-muted">{kurzesDatum(ereignis.datum)}</p>
                  <p className="text-sm">
                    {EREIGNIS_LABEL[ereignis.art]}
                    {ereignis.volk && (
                      <>
                        {" – Volk "}
                        <Link href={`/voelker/${ereignis.volk.id}`} className="text-accent hover:underline">
                          {ereignis.volk.name}
                        </Link>
                        {` (${ereignis.volk.standName})`}
                      </>
                    )}
                  </p>
                  {ereignis.notiz && <p className="text-xs text-muted">{ereignis.notiz}</p>}
                  {ereignis.bewertung && ereignis.bewertung.kriterien.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1 rounded-md border border-border bg-background p-2">
                      <p className="text-xs text-muted">
                        Diese Kriterien zählen zur Bewertung der Königin. Haken entfernen nimmt
                        eines heraus, z.B. wenn ein unvorhergesehenes Ereignis die Durchsicht
                        verfälscht hat.
                      </p>
                      {ereignis.bewertung.kriterien.map((kriterium) => (
                        <div key={kriterium.feld} className="flex items-center gap-2">
                          <form
                            action={kriteriumAusschlussAction.bind(
                              null,
                              ereignis.bewertung!.stockkartenEintragId,
                              kriterium.feld
                            )}
                          >
                            <input
                              type="checkbox"
                              defaultChecked={!kriterium.ausgeschlossen}
                              onChange={(event) => event.currentTarget.form?.requestSubmit()}
                              aria-label={`${kriterium.label} in der Bewertung berücksichtigen`}
                              className="h-3.5 w-3.5 accent-accent"
                            />
                          </form>
                          <span className={`text-xs ${kriterium.ausgeschlossen ? "text-muted line-through" : ""}`}>
                            {kriterium.label}: {kriterium.stufenText}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ereignis.fotoDateiname && (
                    <a
                      href={`/bilder/${ereignis.fotoDateiname}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/bilder/${ereignis.fotoDateiname}`}
                        alt=""
                        className="h-20 w-20 rounded-md border border-border object-cover"
                      />
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button data-schreibt
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => setBearbeiteId(ereignis.id)}
                  >
                    Bearbeiten
                  </Button>
                  <LoeschenButton
                    action={loeschenAction.bind(null, ereignis.id)}
                    bestaetigung="Diesen Lebenslauf-Eintrag wirklich löschen?"
                    className="px-2 py-1 text-xs"
                  >
                    Löschen
                  </LoeschenButton>
                </div>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
