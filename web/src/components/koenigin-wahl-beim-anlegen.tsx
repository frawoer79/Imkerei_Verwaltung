"use client";

import Link from "next/link";
import { useState } from "react";
import { Select } from "@/components/ui";
import { KoeniginSchnellangaben } from "@/components/koenigin-schnellangaben";

/// Eine Königin, die beim Anlegen eines Volks zur Wahl steht: lebt und sitzt
/// in keinem Volk (Reserve, Ableger, frisch von der Belegstelle).
export type FreieKoenigin = {
  id: string;
  kennung: string;
  jahrgang: number | null;
  farbeHex: string | null;
  farbeDunklerText: boolean;
  /// "blau 12", leer wenn nicht gezeichnet.
  zeichen: string;
  rasse: string | null;
  /// Woher sie kommt, z. B. "Eigene Nachzucht · Zuchtserie Mai".
  herkunft: string;
};

function beschreibung(koenigin: FreieKoenigin): string {
  return [
    koenigin.jahrgang && `Jg. ${koenigin.jahrgang}`,
    koenigin.zeichen,
    koenigin.rasse,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Jahrgangsfeld({ koenigin }: { koenigin: FreieKoenigin }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rand-bedienung text-xs font-semibold"
      style={{
        background: koenigin.farbeHex ?? "transparent",
        color: koenigin.farbeHex
          ? koenigin.farbeDunklerText
            ? "#17191b"
            : "#ffffff"
          : undefined,
      }}
    >
      {koenigin.jahrgang ? String(koenigin.jahrgang).slice(-2) : "–"}
    </span>
  );
}

function Steckbrief({ koenigin }: { koenigin: FreieKoenigin }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rand-ruhig bg-background px-3 py-2">
      <Jahrgangsfeld koenigin={koenigin} />
      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold">{koenigin.kennung}</p>
        <p className="truncate text-muted">
          {[beschreibung(koenigin), koenigin.herkunft]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

// Königin beim Anlegen eines Volks: neu erfassen (wie bisher Jahrgang und
// Kennzeichnung) oder eine vorhandene freie Königin übernehmen. Der
// Umschalter steht auch ohne freie Königin da (Rückmeldung Frank 2026-10-22:
// sonst sah der Dialog aus wie vorher und die Funktion wirkte nicht
// ausgeliefert) - dann mit einem Hinweis, wie eine Königin frei wird.
export function KoeniginWahlBeimAnlegen({
  freie,
  beiWahl,
}: {
  freie: FreieKoenigin[];
  /// Meldet die gewählte Königin, damit der Dialog die Rasse übernehmen kann.
  beiWahl: (koenigin: FreieKoenigin | null) => void;
}) {
  const [quelle, setQuelle] = useState<"neu" | "bestand">("neu");
  const [gewaehltId, setGewaehltId] = useState("");
  const gewaehlt = freie.find((koenigin) => koenigin.id === gewaehltId) ?? null;

  function waehlen(id: string) {
    setGewaehltId(id);
    beiWahl(freie.find((koenigin) => koenigin.id === id) ?? null);
  }

  function quelleSetzen(wert: "neu" | "bestand") {
    setQuelle(wert);
    beiWahl(wert === "bestand" ? gewaehlt : null);
  }

  const versteckt = (
    <>
      {/* Ohne freie Königin wird das Volk ohne Königin angelegt. */}
      <input
        type="hidden"
        name="koeniginQuelle"
        value={freie.length === 0 ? "neu" : quelle}
      />
      {quelle === "bestand" && (
        <input type="hidden" name="koeniginId" value={gewaehltId} />
      )}
    </>
  );

  const umschalter = (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-border p-1">
      {[
        { wert: "neu" as const, text: "Neu erfassen" },
        { wert: "bestand" as const, text: `Vorhandene (${freie.length})` },
      ].map((eintrag) => (
        <label key={eintrag.wert} className="cursor-pointer">
          <input
            type="radio"
            name="koenigin-quelle-wahl"
            checked={quelle === eintrag.wert}
            onChange={() => quelleSetzen(eintrag.wert)}
            className="peer sr-only"
          />
          <span className="flex min-h-11 items-center justify-center rounded-md px-2 text-center text-sm font-medium text-muted peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            {eintrag.text}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Königin</legend>
      {versteckt}
      {umschalter}
      {quelle === "neu" ? (
        <KoeniginSchnellangaben />
      ) : freie.length === 0 ? (
        <p className="rounded-lg border border-rand-ruhig bg-background px-3 py-2 text-sm text-muted">
          Gerade ist keine Königin frei. Zur Wahl stehen Königinnen in Reserve,
          die in keinem Volk sitzen. Eine neue legst du unter{" "}
          <Link href="/koeniginnen/neu" className="text-accent underline">
            Königinnen
          </Link>{" "}
          ohne Volk an, dann steht sie hier. Legst du jetzt an, bekommt das Volk
          keine Königin.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Select
            aria-label="Königin"
            value={gewaehltId}
            onChange={(event) => waehlen(event.target.value)}
          >
            <option value="" disabled>
              Bitte wählen …
            </option>
            {freie.map((koenigin) => (
              <option key={koenigin.id} value={koenigin.id}>
                {[koenigin.kennung, beschreibung(koenigin)]
                  .filter(Boolean)
                  .join(" · ")}
              </option>
            ))}
          </Select>
          {gewaehlt && <Steckbrief koenigin={gewaehlt} />}
        </div>
      )}
    </fieldset>
  );
}
