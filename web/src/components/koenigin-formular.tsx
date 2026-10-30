"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea, knopfKlassen } from "@/components/ui";
import { EinzelfotoAuswahl } from "@/components/einzelfoto-auswahl";
import { KoeniginSchnellangaben } from "@/components/koenigin-schnellangaben";
import {
  BEGATTUNGSARTEN,
  BEGATTUNGSART_LABEL,
  HERKUENFTE,
  HERKUNFT_LABEL,
  KOENIGIN_STATUS,
  STATUS_LABEL,
  type Begattungsart,
  type Herkunft,
  type KoeniginStatus,
} from "@/lib/koeniginnen";

export type KoeniginFormularWerte = {
  kennung: string;
  /// Beispiel für die automatische Vergabe - steht als Platzhalter im Feld,
  /// solange keine Kennung eingetragen ist. Die tatsächliche Nummer richtet
  /// sich beim Speichern nach dem eingetragenen Jahrgang.
  kennungVorschlag: string;
  zuchtbuchnummer: string;
  rasse: string;
  jahrgang: string;
  schlupfDatum: string;
  zeichenFarbe: string;
  zeichenNummer: string;
  herkunft: Herkunft;
  herkunftText: string;
  herkunftsVolkId: string;
  begattungsart: Begattungsart;
  belegstelleId: string;
  begattungsStandId: string;
  begattungVon: string;
  begattungBis: string;
  vaterlinie: string;
  mutterKoeniginId: string;
  notizen: string;
  status: KoeniginStatus;
};

export type Auswahlen = {
  belegstellen: { id: string; name: string }[];
  bienenstaende: { id: string; name: string }[];
  voelker: { id: string; name: string; standName: string }[];
  muetter: { id: string; kennung: string; beschreibung: string }[];
};

// Formular zum Anlegen und Bearbeiten einer Königin. Herkunft und Begattung
// sind zwei getrennte Angaben: eine nachgeschaffene Königin kann standbegattet
// sein, eine zugeflogene bleibt in der Begattung unbekannt. Je nach Auswahl
// werden nur die Felder gezeigt, die dann überhaupt Sinn ergeben.
export function KoeniginFormular({
  werte,
  auswahlen,
  action,
  zuchtkarteUrl = null,
  zuchtkarteMimeType = null,
  mitStatus = false,
  volkVorauswahl = null,
  abbrechenHref,
}: {
  werte: KoeniginFormularWerte;
  auswahlen: Auswahlen;
  action: (formData: FormData) => void | Promise<void>;
  zuchtkarteUrl?: string | null;
  /// Dateityp der gespeicherten Zuchtkarte (Foto oder PDF).
  zuchtkarteMimeType?: string | null;
  /// Nur beim Bearbeiten: Verbleib direkt setzen. Beim Anlegen ergibt er sich
  /// aus der Zuordnung zu einem Volk.
  mitStatus?: boolean;
  /// Nur beim Anlegen: Volk, dem die Königin gleich zugeordnet wird.
  volkVorauswahl?: string | null;
  abbrechenHref: string;
}) {
  const [herkunft, setHerkunft] = useState<Herkunft>(werte.herkunft);
  const [begattungsart, setBegattungsart] = useState<Begattungsart>(werte.begattungsart);

  const zeigtMutter = herkunft === "EIGENE_NACHZUCHT" || herkunft === "NACHSCHAFFUNG";

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="kennung">Kennung</Label>
          <Input id="kennung" name="kennung" defaultValue={werte.kennung} placeholder={werte.kennungVorschlag} />
          <p className="mt-1 text-xs text-muted">
            {werte.kennung === ""
              ? `Leer lassen, dann wird die nächste freie Nummer des Jahrgangs vergeben (z.B. ${werte.kennungVorschlag}).`
              : "Frei änderbar."}
          </p>
        </div>
        <div>
          <Label htmlFor="rasse">Rasse</Label>
          <Input id="rasse" name="rasse" defaultValue={werte.rasse} placeholder="z.B. Carnica" />
        </div>
      </div>

      <div>
        <Label htmlFor="schlupfDatum">Schlupf am</Label>
        <Input id="schlupfDatum" name="schlupfDatum" type="date" defaultValue={werte.schlupfDatum} />
      </div>

      <KoeniginSchnellangaben
        jahrFeld="jahrgang"
        farbeFeld="zeichenFarbe"
        nummerFeld="zeichenNummer"
        jahrgang={werte.jahrgang ? Number.parseInt(werte.jahrgang, 10) : null}
        zeichenFarbe={werte.zeichenFarbe || null}
        zeichenNummer={werte.zeichenNummer || null}
        mitVorschau
      />

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="herkunft">Herkunft</Label>
          <Select
            id="herkunft"
            name="herkunft"
            value={herkunft}
            onChange={(event) => setHerkunft(event.target.value as Herkunft)}
          >
            {HERKUENFTE.map((wert) => (
              <option key={wert} value={wert}>
                {HERKUNFT_LABEL[wert]}
              </option>
            ))}
          </Select>
        </div>

        {herkunft === "NACHSCHAFFUNG" && (
          <div>
            <Label htmlFor="herkunftsVolkId">Aus welchem Volk</Label>
            <Select id="herkunftsVolkId" name="herkunftsVolkId" defaultValue={werte.herkunftsVolkId}>
              <option value="">— nicht angegeben —</option>
              {auswahlen.voelker.map((volk) => (
                <option key={volk.id} value={volk.id}>
                  {volk.name} ({volk.standName})
                </option>
              ))}
            </Select>
          </div>
        )}

        {zeigtMutter && (
          <div>
            <Label htmlFor="mutterKoeniginId">Mutter (Abstammung)</Label>
            <Select id="mutterKoeniginId" name="mutterKoeniginId" defaultValue={werte.mutterKoeniginId}>
              <option value="">— nicht bekannt —</option>
              {auswahlen.muetter.map((mutter) => (
                <option key={mutter.id} value={mutter.id}>
                  {mutter.kennung} · {mutter.beschreibung}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">
              Zur Auswahl stehen alle erfassten Königinnen, auch abgegangene, damit die Abstammung
              erhalten bleibt.
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="herkunftText">
            {herkunft === "ZUKAUF" ? "Bezogen von" : "Bemerkung zur Herkunft"}
          </Label>
          <Input
            id="herkunftText"
            name="herkunftText"
            defaultValue={werte.herkunftText}
            placeholder={herkunft === "ZUKAUF" ? "Züchter / Imkerei" : ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="begattungsart">Begattungsart</Label>
          <Select
            id="begattungsart"
            name="begattungsart"
            value={begattungsart}
            onChange={(event) => setBegattungsart(event.target.value as Begattungsart)}
          >
            {BEGATTUNGSARTEN.map((wert) => (
              <option key={wert} value={wert}>
                {BEGATTUNGSART_LABEL[wert]}
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
            <p className="mt-1 text-xs text-muted">
              Fehlt eine?{" "}
              <Link href="/einstellungen/belegstellen" className="text-accent hover:underline">
                Belegstellen verwalten
              </Link>
            </p>
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

        {(begattungsart === "BELEGSTELLE" || begattungsart === "KUENSTLICHE_BESAMUNG") && (
          <div>
            <Label htmlFor="vaterlinie">
              {begattungsart === "BELEGSTELLE" ? "Drohnenvölker, eigene Angabe" : "Vaterlinie"}
            </Label>
            <Input id="vaterlinie" name="vaterlinie" defaultValue={werte.vaterlinie} />
            {begattungsart === "BELEGSTELLE" && (
              <p className="mt-1 text-xs text-muted">
                Meist leer lassen. Die Drohnenvölker kommen aus der Belegstelle, passend zum Belegjahr.
              </p>
            )}
          </div>
        )}

        {begattungsart !== "UNBEKANNT" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="begattungVon">Begattung von</Label>
              <Input id="begattungVon" name="begattungVon" type="date" defaultValue={werte.begattungVon} />
            </div>
            <div>
              <Label htmlFor="begattungBis">bis</Label>
              <Input id="begattungBis" name="begattungBis" type="date" defaultValue={werte.begattungBis} />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="zuchtbuchnummer">Zuchtbuchnummer</Label>
          <Input
            id="zuchtbuchnummer"
            name="zuchtbuchnummer"
            defaultValue={werte.zuchtbuchnummer}
            placeholder="falls im Zuchtbuch geführt"
          />
        </div>
        {mitStatus && (
          <div>
            <Label htmlFor="status">Verbleib</Label>
            <Select id="status" name="status" defaultValue={werte.status}>
              {KOENIGIN_STATUS.map((wert) => (
                <option key={wert} value={wert}>
                  {STATUS_LABEL[wert]}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">
              Wird sonst automatisch aus dem letzten Ereignis gesetzt.
            </p>
          </div>
        )}
      </div>

      <div>
        <EinzelfotoAuswahl
          name="zuchtkarteFoto"
          label="Zuchtkarte der zugekauften Königin (Foto, Scan oder PDF)"
          bestehendeUrl={zuchtkarteUrl}
          bestehendeMimeType={zuchtkarteMimeType}
          entfernenName="zuchtkarteFotoEntfernen"
          erlaubt="bilderUndPdf"
        />
        <p className="mt-1 text-xs text-muted">
          Bleibt in voller Auflösung gespeichert, bis du sie hier selbst entfernst. Für eigene
          Königinnen nicht nötig, deren Zuchtkarte erstellst du auf ihrer Seite.
        </p>
      </div>

      {volkVorauswahl !== null && (
        <div>
          <Label htmlFor="volkId">Gleich einem Volk zusetzen</Label>
          <Select id="volkId" name="volkId" defaultValue={volkVorauswahl}>
            <option value="">— noch keinem Volk —</option>
            {auswahlen.voelker.map((volk) => (
              <option key={volk.id} value={volk.id}>
                {volk.name} ({volk.standName})
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            Sitzt dort schon eine Königin, wird sie entnommen und landet in der Reserve.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="notizen">Notizen (nur intern)</Label>
        <Textarea id="notizen" name="notizen" rows={3} defaultValue={werte.notizen} />
      </div>

      <div className="flex gap-2">
        <Link
          href={abbrechenHref}
          className={`${knopfKlassen("secondary", "klein")} flex-1`}
        >
          Abbrechen
        </Link>
        <Button type="submit" className="flex-1">
          Speichern
        </Button>
      </div>
    </form>
  );
}
