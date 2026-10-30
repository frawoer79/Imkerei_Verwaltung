"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, Switch } from "@/components/ui";
import { velutinaAlleGesehen, velutinaJetztAbrufen, velutinaMailUmschalten } from "@/lib/velutina-actions";

export function JahrAuswahl({ jahr, jahre }: { jahr: string; jahre: number[] }) {
  const router = useRouter();
  return (
    <div className="w-52">
      <label htmlFor="jahr-auswahl" className="mb-1 block text-sm font-medium text-muted">
        Meldungen auf der Karte
      </label>
      <Select
        id="jahr-auswahl"
        value={jahr}
        onChange={(event) => router.push(`/velutina?jahr=${event.target.value}`, { scroll: false })}
      >
        {jahre.map((wert) => (
          <option key={wert} value={String(wert)}>
            {wert}
          </option>
        ))}
        <option value="alle">alle Jahre</option>
      </Select>
    </div>
  );
}

export function GesehenKnopf() {
  const [laeuft, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={laeuft}
      onClick={() => startTransition(() => velutinaAlleGesehen())}
    >
      {laeuft ? "Wird gespeichert …" : "Alle als gesehen markieren"}
    </Button>
  );
}

export function AbrufKnopf() {
  const [laeuft, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={laeuft}
      onClick={() => startTransition(() => velutinaJetztAbrufen())}
      className="text-xs text-accent hover:underline disabled:opacity-60"
    >
      {laeuft ? "Wird abgerufen …" : "Jetzt abrufen"}
    </button>
  );
}

export function MailSchalter({ an }: { an: boolean }) {
  const [laeuft, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={an}
        label="Neue Meldungen per E-Mail"
        onChange={() => {
          if (!laeuft) startTransition(() => velutinaMailUmschalten(!an));
        }}
      />
      <span className="text-sm">Neue Meldungen in meinen Bereichen per E-Mail</span>
    </div>
  );
}
