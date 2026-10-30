"use client";

import { useEffect, useState } from "react";
import { EntfernChip, PlusChip, SortierWahl, Switch, WahlChip, Zwischenkopf } from "@/components/ui";

// Farbfeld mit dem gerade gültigen Wert der Variable. Der Wert wird im
// Browser ausgelesen und beim Umschalten hell/dunkel neu gelesen, damit die
// Seite immer zeigt, was wirklich auf dem Bildschirm steht.
export function FarbFeld({ name, zweck }: { name: string; zweck: string }) {
  const wert = useVariablenWert(name);
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-10 w-10 shrink-0 rounded-md border border-rand-ruhig"
        style={{ background: `var(${name})` }}
        aria-hidden="true"
      />
      <div className="min-w-0 text-sm">
        <div className="font-mono text-xs">{name}</div>
        <div className="text-muted">{zweck}</div>
        <div className="font-mono text-xs text-muted">{wert}</div>
      </div>
    </div>
  );
}

function useVariablenWert(name: string): string {
  const [wert, setWert] = useState("");
  useEffect(() => {
    const lesen = () => setWert(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    lesen();
    const beobachter = new MutationObserver(lesen);
    beobachter.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const medien = window.matchMedia("(prefers-color-scheme: dark)");
    medien.addEventListener("change", lesen);
    return () => {
      beobachter.disconnect();
      medien.removeEventListener("change", lesen);
    };
  }, [name]);
  return wert;
}

export function SchalterBeispiel() {
  const [an, setAn] = useState(true);
  return (
    <div className="flex items-center gap-3">
      <Switch checked={an} onChange={() => setAn(!an)} label="Beispielschalter" />
      <span className="text-sm">{an ? "An" : "Aus"}</span>
    </div>
  );
}

export function ChipBeispiel() {
  const [wahl, setWahl] = useState("Frühtracht");
  const [sorten, setSorten] = useState(["Waldhonig", "Rapshonig"]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {["Keine", "Frühtracht", "Sommertracht"].map((name) => (
          <WahlChip key={name} gruppe="sg-sorte" aktiv={wahl === name} onWahl={() => setWahl(name)}>
            {name}
          </WahlChip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {sorten.map((name) => (
          <EntfernChip key={name} beschriftung={`${name} entfernen`} onEntfernen={() => setSorten(sorten.filter((s) => s !== name))}>
            {name}
          </EntfernChip>
        ))}
        <PlusChip onClick={() => setSorten([...sorten, `Sorte ${sorten.length + 1}`])}>+ Sorte</PlusChip>
      </div>
    </div>
  );
}

export function SortierBeispiel() {
  const [wert, setWert] = useState<"sorte" | "gebinde">("sorte");
  const zeilen =
    wert === "sorte"
      ? [["Frühtracht", "37,5 kg", ["Eimer 25 kg", "Glas 500 g"]], ["Waldhonig", "40,0 kg", ["Hobbock 40 kg"]]]
      : [["Eimer", "2 Stück · 65,0 kg", ["Hobbock 40 kg", "Eimer 25 kg"]], ["Gläser", "25 Stück · 12,5 kg", ["Glas 500 g"]]];
  return (
    <div className="flex flex-col gap-3">
      <SortierWahl
        gruppe="sg-sortieren"
        wert={wert}
        optionen={[
          { wert: "sorte", name: "Sorte" },
          { wert: "gebinde", name: "Gebinde" },
        ]}
        onWahl={setWert}
      />
      <ul className="rounded-xl border border-border bg-card">
        {zeilen.map(([titel, summe, posten], index) => (
          <li key={titel as string} className={index > 0 ? "border-t border-border" : ""}>
            <Zwischenkopf titel={titel} zusatz={summe} erste={index === 0} />
            <ul className="divide-y divide-border">
              {(posten as string[]).map((name) => (
                <li key={name} className="px-3 py-2.5 text-sm">
                  {name}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
