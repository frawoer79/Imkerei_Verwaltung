"use client";

import { useRef, useState } from "react";
import { Button, Label, Input } from "@/components/ui";
import {
  FormularFehler,
  SicheresFormular,
  SpeichernKnopf,
} from "@/components/sicheres-formular";
import { BrutraumAuswahl } from "@/components/brutraum-auswahl";
import { DeckelAuswahl } from "@/components/deckel-auswahl";
import { EinzelfotoAuswahl } from "@/components/einzelfoto-auswahl";
import {
  KoeniginWahlBeimAnlegen,
  type FreieKoenigin,
} from "@/components/koenigin-wahl-beim-anlegen";
import type { FormularErgebnis } from "@/lib/actions";
import type { ZargeAuswahl } from "@/lib/honig";
import type { KlimadeckelAuswahl } from "@/lib/lager";

// Natives <dialog> statt einer selbstgebauten Modal-Lösung - Fokusfalle,
// Escape-zum-Schließen und das abgedunkelte Backdrop kommen dabei kostenlos
// vom Browser mit.
export function VolkAnlegenDialog({
  action,
  brutraeume,
  klimadeckel,
  koeniginAn = true,
  freieKoeniginnen = [],
}: {
  action: (formData: FormData) => Promise<FormularErgebnis>;
  brutraeume: ZargeAuswahl[];
  klimadeckel: KlimadeckelAuswahl[];
  /// Bereich "Königinnen" eingeschaltet? Sonst entfallen die Königin-Angaben.
  koeniginAn?: boolean;
  /// Lebende Königinnen ohne Volk - zur Wahl statt einer neu erfassten.
  freieKoeniginnen?: FreieKoenigin[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rasse, setRasse] = useState("");
  // Rasse der gewählten Königin übernehmen, solange nichts anderes von Hand
  // eingetragen ist.
  const [uebernommeneRasse, setUebernommeneRasse] = useState("");
  // SicheresFormular sperrt den Anlegen-Knopf sofort beim ersten Antippen.
  // Vorher konnte man bei langsamer Verbindung mehrfach antippen, bevor die
  // erste Anfrage durchgelaufen war - jeder Tap hat dann ein eigenes Volk
  // samt eigener Königin angelegt. Eine Meldung (z.B. doppelter Name, keine
  // Verbindung) erscheint im offenen Dialog, die Eingaben bleiben stehen.

  return (
    <>
      <Button type="button" data-schreibt onClick={() => dialogRef.current?.showModal()}>
        + Neues Volk
      </Button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <SicheresFormular action={action} className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Neues Volk anlegen</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          <div>
            <Label htmlFor="name">Name / Stocknummer</Label>
            <Input id="name" name="name" required placeholder="z.B. Volk 3" />
          </div>
          <div>
            <Label htmlFor="rasse">Rasse</Label>
            <Input
              id="rasse"
              name="rasse"
              placeholder="z.B. Carnica"
              value={rasse}
              onChange={(event) => setRasse(event.target.value)}
            />
          </div>
          {koeniginAn && (
            <KoeniginWahlBeimAnlegen
              freie={freieKoeniginnen}
              beiWahl={(koenigin) => {
                const neu = koenigin?.rasse ?? "";
                if (rasse === "" || rasse === uebernommeneRasse) setRasse(neu);
                setUebernommeneRasse(neu);
              }}
            />
          )}

          <BrutraumAuswahl brutraeume={brutraeume} />
          <DeckelAuswahl klimadeckel={klimadeckel} />

          <EinzelfotoAuswahl
            name="beuteFoto"
            label="Foto der Beute (optional)"
          />

          <FormularFehler />
          <SpeichernKnopf sendetText="Wird angelegt …">Anlegen</SpeichernKnopf>
        </SicheresFormular>
      </dialog>
    </>
  );
}
