"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { FormularFehler, SicheresFormular, type AktionsErgebnis } from "@/components/sicheres-formular";

export function EndgueltigLoeschenFormular({
  action,
  erwarteterText,
  hinweis,
}: {
  action: (formData: FormData) => Promise<AktionsErgebnis>;
  erwarteterText: string;
  hinweis: string;
}) {
  const [eingabe, setEingabe] = useState("");
  const stimmtUeberein = eingabe.trim() === erwarteterText;

  return (
    <SicheresFormular action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted">{hinweis}</p>
      <div>
        <Label htmlFor="bestaetigung">
          Gib zur Bestätigung genau <span className="font-semibold text-foreground">{erwarteterText}</span>{" "}
          ein
        </Label>
        <Input
          id="bestaetigung"
          name="bestaetigung"
          value={eingabe}
          onChange={(event) => setEingabe(event.target.value)}
          autoComplete="off"
        />
      </div>
      <FormularFehler />
      <div>
        <Button type="submit" variant="danger" disabled={!stimmtUeberein}>
          Endgültig und unwiderruflich löschen
        </Button>
      </div>
    </SicheresFormular>
  );
}
