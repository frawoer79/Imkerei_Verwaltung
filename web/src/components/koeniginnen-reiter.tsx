"use client";

import Link from "next/link";
import { useState } from "react";

type Reiter = "bestand" | "zucht";

// Die Königinnen-Seite teilt sich in zwei Reiter: "Bestand" (Suche und
// Liste) und "Zucht" (Zuchtplanung, Stammbaum, ...). Vorher standen fünf
// Knöpfe und sechs Filterfelder vor der ersten Königin. Der Umschalter
// steht auf allen Geräten unter der Überschrift (Frank wollte ihn auch am
// iPad und Desktop). "Neue Königin" ist nur auf dem Handy ein schwebender
// Knopf, breiter steht er neben der Überschrift.
export function KoeniginnenReiter({
  anzahl,
  zucht,
  children,
}: {
  /// Königinnen im Bestand, ungefiltert - steht neben "Bestand".
  anzahl: number;
  /// Inhalt des Reiters "Zucht".
  zucht: React.ReactNode;
  /// Suche und Liste.
  children: React.ReactNode;
}) {
  const [reiter, setReiter] = useState<Reiter>("bestand");

  const knopf = (wert: Reiter, label: React.ReactNode) => (
    <button
      type="button"
      role="tab"
      aria-selected={reiter === wert}
      onClick={() => setReiter(wert)}
      className={`flex cursor-pointer items-baseline justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
        reiter === wert ? "bg-card text-foreground shadow-sm" : "text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div role="tablist" className="-mt-2 grid grid-cols-2 gap-1 rounded-lg bg-border p-1 sm:max-w-sm">
        {knopf(
          "bestand",
          <>
            Bestand <span className="text-xs font-normal text-muted">{anzahl}</span>
          </>
        )}
        {knopf("zucht", "Zucht")}
      </div>

      {/* Nur ausgeblendet statt entfernt, damit ein angefangener Suchtext
          das Umschalten übersteht. Unten Platz lassen, damit der schwebende
          Knopf nicht die letzte Königin verdeckt. */}
      <div className={`${reiter === "bestand" ? "flex" : "hidden"} flex-col gap-6 pb-20 sm:pb-0`}>{children}</div>

      {reiter === "zucht" && <div>{zucht}</div>}

      {reiter === "bestand" && (
        <Link
          href="/koeniginnen/neu"
          className="fixed right-4 z-40 inline-flex h-13 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-accent-foreground shadow-lg sm:hidden"
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
          aria-label="Neue Königin"
        >
          <span className="text-xl leading-none">+</span> Königin
        </Link>
      )}
    </>
  );
}
