"use client";

import { useSyncExternalStore } from "react";
import { Card } from "@/components/ui";
import { sendungDatum, warteschlangeZeigen } from "@/components/offline-leiste";
import { abonnieren, serverZustand, zustandLesen } from "@/lib/warteschlange";

// Oben im Verlauf eines Volks: Durchsichten und neue Maßnahmen, die noch auf
// diesem Gerät in der Warteschlange liegen (lib/warteschlange.ts). So sieht
// man am Volk, dass die eben erfasste Eingabe nicht fehlt, sondern noch
// unterwegs ist. Wartende Haken zeigen die Maßnahmen-Listen selbst.

export function WartendeEingaben({ volkId }: { volkId: string }) {
  const { sendungen } = useSyncExternalStore(abonnieren, zustandLesen, serverZustand);
  const hier = sendungen.filter((sendung) => sendung.art !== "erledigt" && sendung.volkIds.includes(volkId));
  if (hier.length === 0) return null;

  return (
    <>
      {hier.map((sendung) => (
        <Card
          key={sendung.id}
          className={`!shadow-none border-dashed !border-l-[6px] ${sendung.fehler ? "!border-l-gefahr" : "!border-l-warnung"}`}
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <p className="font-semibold">{sendung.art === "massnahme" ? sendung.titel : sendungDatum(sendung)}</p>
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${sendung.fehler ? "bg-gefahr-flaeche text-gefahr" : "bg-warnung-flaeche text-warnung"}`}
            >
              {sendung.fehler ? "Nicht angenommen" : "Wartet auf Senden"}
            </span>
          </div>
          <p className="text-sm text-muted">
            {sendung.fehler
              ? sendung.fehler
              : `${sendung.art === "massnahme" ? "Maßnahme" : "Durchsicht"} liegt auf diesem Gerät und wird von selbst gesendet, sobald Netz da ist.`}
          </p>
          <button
            type="button"
            onClick={warteschlangeZeigen}
            className="mt-1 min-h-11 cursor-pointer text-sm font-medium text-accent hover:underline"
          >
            Ansehen
          </button>
        </Card>
      ))}
    </>
  );
}
