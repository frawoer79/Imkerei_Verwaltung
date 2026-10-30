"use client";

import { useState } from "react";
import { Switch } from "@/components/ui";

// Wrapper für den Bearbeiten-Dialog eines vorhandenen Stockkarten-Eintrags:
// startet gesperrt (nur lesen), ein Schalter oben schaltet auf bearbeitbar
// um. Nutzt <fieldset disabled> - das deaktiviert alle enthaltenen
// Formularfelder (inkl. Speichern-Button) auf einen Schlag, ganz ohne
// jedes Feld einzeln ansteuern zu müssen.
export function EntsperrbaresFormular({ children }: { children: React.ReactNode }) {
  const [entsperrt, setEntsperrt] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
        <span className="text-sm font-medium">{entsperrt ? "Bearbeiten" : "Nur lesen"}</span>
        <Switch
          checked={entsperrt}
          onChange={() => setEntsperrt((wert) => !wert)}
          label="Eintrag zum Bearbeiten entsperren"
        />
      </div>
      <fieldset disabled={!entsperrt} className="m-0 flex flex-col gap-4 border-0 p-0">
        {children}
      </fieldset>
    </>
  );
}
