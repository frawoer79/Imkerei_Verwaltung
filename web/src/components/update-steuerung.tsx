"use client";

import { useTransition } from "react";
import { Button, Switch } from "@/components/ui";
import { updateJetztPruefen, updatePruefungSchalten } from "@/lib/update-actions";

// Bedienelemente unter Einstellungen -> System (siehe lib/update.ts).

export function UpdatePruefungSchalter({ an }: { an: boolean }) {
  const [laeuft, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={an}
        label="Täglich nach Updates suchen"
        onChange={() => {
          if (!laeuft) startTransition(() => updatePruefungSchalten(!an));
        }}
      />
      <span className="text-sm">Täglich nach Updates suchen</span>
    </div>
  );
}

export function UpdatePruefenKnopf() {
  const [laeuft, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      groesse="mittel"
      disabled={laeuft}
      onClick={() => startTransition(() => updateJetztPruefen())}
    >
      {laeuft ? "Wird geprüft …" : "Jetzt prüfen"}
    </Button>
  );
}
