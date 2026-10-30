"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea, knopfKlassen } from "@/components/ui";
import { BEGATTUNGSARTEN, BEGATTUNGSART_LABEL, type Begattungsart } from "@/lib/koeniginnen";
import {
  PFLEGEARTEN,
  PFLEGEART_HINWEIS,
  PFLEGEART_LABEL,
  PFLEGEVOLK_LABEL,
  type Pflegeart,
} from "@/lib/zucht";
import { ZuchtmutterAuswahl } from "@/components/zuchtmutter-auswahl";
import type { Zuchtmutterkandidat } from "@/lib/zucht-daten";

export type ZuchtserieFormularWerte = {
  bezeichnung: string;
  mutterKoeniginId: string;
  pflegeart: Pflegeart;
  pflegeVolkId: string;
  brutschrank: boolean;
  umlarvDatum: string;
  begattungsart: Begattungsart;
  belegstelleId: string;
  begattungsStandId: string;
  notizen: string;
};

export type ZuchtserieAuswahlen = {
  /// Königinnen, von denen nachgezogen werden kann - samt Volk und Bewertung.
  kandidaten: Zuchtmutterkandidat[];
  /// Völker als Pflegevolk.
  voelker: { id: string; name: string; standName: string }[];
  belegstellen: { id: string; name: string }[];
  bienenstaende: { id: string; name: string }[];
};

export function ZuchtserieFormular({
  werte,
  auswahlen,
  action,
  abbrechenHref,
}: {
  werte: ZuchtserieFormularWerte;
  auswahlen: ZuchtserieAuswahlen;
  action: (formData: FormData) => void | Promise<void>;
  abbrechenHref: string;
}) {
  const [begattungsart, setBegattungsart] = useState<Begattungsart>(werte.begattungsart);
  const [mutterKoeniginId, setMutterKoeniginId] = useState(werte.mutterKoeniginId);
  const [pflegeart, setPflegeart] = useState<Pflegeart>(werte.pflegeart);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-muted">Zuchtmutter (von der nachgezogen wird)</p>
        <ZuchtmutterAuswahl
          kandidaten={auswahlen.kandidaten}
          anfangsWert={werte.mutterKoeniginId}
          onChange={setMutterKoeniginId}
        />
        <p className="text-xs text-muted">
          Wird als Mutter aller Königinnen dieser Serie eingetragen. Die Zuchtwabe kommt in das Volk,
          in dem sie sitzt.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="bezeichnung">Bezeichnung</Label>
          <Input id="bezeichnung" name="bezeichnung" defaultValue={werte.bezeichnung} required />
        </div>
        <div>
          <Label htmlFor="umlarvDatum">Umlarvtermin</Label>
          <Input id="umlarvDatum" name="umlarvDatum" type="date" defaultValue={werte.umlarvDatum} />
          <p className="mt-1 text-xs text-muted">
            Leer lassen, solange er noch nicht feststeht. Mit Termin entstehen alle Arbeitsschritte
            als Maßnahmen.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="pflegeart">Pflegeverfahren</Label>
          <Select
            id="pflegeart"
            name="pflegeart"
            value={pflegeart}
            onChange={(event) => setPflegeart(event.target.value as Pflegeart)}
          >
            {PFLEGEARTEN.map((wert) => (
              <option key={wert} value={wert}>
                {PFLEGEART_LABEL[wert]}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">{PFLEGEART_HINWEIS[pflegeart]}</p>
        </div>
        <div>
          <Label htmlFor="pflegeVolkId">{PFLEGEVOLK_LABEL[pflegeart]}</Label>
          <Select id="pflegeVolkId" name="pflegeVolkId" defaultValue={werte.pflegeVolkId}>
            <option value="">— wie Zuchtvolk —</option>
            {auswahlen.voelker.map((volk) => (
              <option key={volk.id} value={volk.id}>
                {volk.name} ({volk.standName})
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            Die Schritte ab dem Umlarven erscheinen bei diesem Volk als Maßnahmen.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="brutschrank"
            defaultChecked={werte.brutschrank}
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span>
            Zellen im Brutschrank ausbrüten
            <span className="block text-xs text-muted">
              Reife Zellen kommen ab Tag 10 gekäfigt in den Brutschrank, die Königinnen werden nach
              dem Schlupf zugesetzt.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="begattungsart">Geplante Begattung</Label>
          <Select
            id="begattungsart"
            name="begattungsart"
            value={begattungsart}
            onChange={(event) => setBegattungsart(event.target.value as Begattungsart)}
          >
            {BEGATTUNGSARTEN.map((wert) => (
              <option key={wert} value={wert}>
                {wert === "UNBEKANNT" ? "noch offen" : BEGATTUNGSART_LABEL[wert]}
              </option>
            ))}
          </Select>
        </div>
        {begattungsart === "BELEGSTELLE" && (
          <div>
            <Label htmlFor="belegstelleId">Belegstelle</Label>
            <Select id="belegstelleId" name="belegstelleId" defaultValue={werte.belegstelleId}>
              <option value="">— nicht angegeben —</option>
              {auswahlen.belegstellen.map((stelle) => (
                <option key={stelle.id} value={stelle.id}>
                  {stelle.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {begattungsart === "STANDBEGATTUNG" && (
          <div>
            <Label htmlFor="begattungsStandId">Begattungsstand</Label>
            <Select id="begattungsStandId" name="begattungsStandId" defaultValue={werte.begattungsStandId}>
              <option value="">— nicht angegeben —</option>
              {auswahlen.bienenstaende.map((stand) => (
                <option key={stand.id} value={stand.id}>
                  {stand.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <p className="text-xs text-muted">Wird für die nachgezogenen Königinnen übernommen.</p>
      </div>

      <div>
        <Label htmlFor="notizen">Notizen</Label>
        <Textarea id="notizen" name="notizen" rows={3} defaultValue={werte.notizen} />
      </div>

      <div className="flex gap-2">
        <Link
          href={abbrechenHref}
          className={`${knopfKlassen("secondary", "klein")} flex-1`}
        >
          Abbrechen
        </Link>
        <Button type="submit" className="flex-1" disabled={!mutterKoeniginId}>
          Speichern
        </Button>
      </div>
    </form>
  );
}
