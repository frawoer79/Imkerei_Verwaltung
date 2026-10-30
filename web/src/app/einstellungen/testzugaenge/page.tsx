import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { entwicklerSeiten } from "@/lib/hauptzugang";
import { basisPrisma } from "@/lib/prisma";
import { istAdmin, testerSchema } from "@/lib/konto";
import { beispieldatenVorhanden } from "@/lib/beispieldaten";
import { MAX_TESTZUGAENGE } from "@/lib/testzugang";
import {
  beispieldatenNachreichen,
  passwortLinkErzeugen,
  testzugangEinladen,
  testzugangEntfernen,
} from "@/lib/testzugang-actions";
import { Button, Card, Input, Label } from "@/components/ui";
import { LinkKopieren } from "@/components/link-kopieren";
import { LoeschenButton } from "@/components/loeschen-button";
import { SeitenNavigation } from "@/components/seiten-navigation";

const datumZeit = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

// Verwaltung der Testzugänge - nur für Frank sichtbar. Tester sehen hier
// eine "nicht gefunden"-Seite.
export default async function TestzugaengePage() {
  if (!entwicklerSeiten() || !(await istAdmin())) notFound();

  const testzugaenge = await basisPrisma.testzugang.findMany({ orderBy: { erstelltAm: "asc" } });
  const frei = MAX_TESTZUGAENGE - testzugaenge.length;

  // Welche eingerichteten Tester haben den Beispielstand noch nicht (z.B.
  // weil es ihren Zugang schon vor den Beispieldaten gab)?
  const ohneBeispiel = new Set<string>();
  for (const testzugang of testzugaenge) {
    if (!testzugang.eingerichtetAm) continue;
    try {
      if (!(await beispieldatenVorhanden(testerSchema(testzugang.id)))) ohneBeispiel.add(testzugang.id);
    } catch {
      // Schema fehlt oder ist kaputt - dann gibt es auch keinen Knopf.
    }
  }

  const kopfzeilen = await headers();
  const gastgeber = kopfzeilen.get("host") ?? "";
  const protokoll = kopfzeilen.get("x-forwarded-proto") ?? "https";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Testzugänge</h1>
        <p className="text-sm text-muted">
          Bis zu {MAX_TESTZUGAENGE} Personen können die App mit eigenen Daten ausprobieren. Sie
          sehen deine Daten nicht und können sie nicht verändern.
        </p>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Tester einladen</h2>
        <p className="mb-4 text-sm text-muted">
          Erzeugt einen persönlichen Link. Wer ihn öffnet, vergibt beim ersten Besuch Name und
          Passwort und bestätigt den Hinweis, dass es eine Testversion ohne Garantie ist. Der
          Link funktioniert nur einmal. Jeder neue Zugang bekommt einen erfundenen Beispielstand
          mit drei Völkern und einer Saison Historie zum Ausprobieren.
        </p>
        {frei > 0 ? (
          <form action={testzugangEinladen} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="notiz">Für wen? (nur für dich, optional)</Label>
              <Input id="notiz" name="notiz" maxLength={100} placeholder="z.B. Imkerverein Max" />
            </div>
            <Button type="submit">Einladungslink erzeugen</Button>
          </form>
        ) : (
          <p className="text-sm">
            Alle {MAX_TESTZUGAENGE} Plätze sind belegt. Entferne einen Testzugang, um jemand
            Neues einzuladen.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">
          Testzugänge ({testzugaenge.length} von {MAX_TESTZUGAENGE})
        </h2>
        {testzugaenge.length === 0 ? (
          <p className="text-sm text-muted">Noch niemand eingeladen.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {testzugaenge.map((testzugang) => (
              <li key={testzugang.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {testzugang.name ?? "Einladung offen"}
                      {testzugang.notiz && (
                        <span className="font-normal text-muted"> · {testzugang.notiz}</span>
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {testzugang.eingerichtetAm && !testzugang.passwortHash
                        ? "Passwort zurückgesetzt, wartet auf neues Passwort des Testers. Schick ihm diesen Link:"
                        : testzugang.eingerichtetAm
                        ? `Eingerichtet am ${datumZeit.format(testzugang.eingerichtetAm)}${
                            testzugang.letzteAnmeldung
                              ? `, zuletzt angemeldet ${datumZeit.format(testzugang.letzteAnmeldung)}`
                              : ""
                          }`
                        : `Eingeladen am ${datumZeit.format(testzugang.erstelltAm)}, Link noch nicht benutzt`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {ohneBeispiel.has(testzugang.id) && (
                      <LoeschenButton
                        action={beispieldatenNachreichen.bind(null, testzugang.id)}
                        bestaetigung={`Beispielstand mit drei Völkern und Historie bei ${testzugang.name} anlegen? Seine eigenen Daten bleiben unverändert.`}
                        variant="secondary"
                      >
                        Beispieldaten anlegen
                      </LoeschenButton>
                    )}
                    {testzugang.eingerichtetAm && testzugang.passwortHash && (
                      <LoeschenButton
                        action={passwortLinkErzeugen.bind(null, testzugang.id)}
                        bestaetigung={`Passwort von ${testzugang.name} zurücksetzen? Er kann sich dann nicht mehr anmelden, bis er über den neuen Link ein Passwort vergeben hat. Seine Daten bleiben.`}
                        variant="secondary"
                      >
                        Passwort zurücksetzen
                      </LoeschenButton>
                    )}
                    <LoeschenButton
                      action={testzugangEntfernen.bind(null, testzugang.id)}
                      bestaetigung={
                        testzugang.eingerichtetAm
                          ? `Testzugang von ${testzugang.name} entfernen? Alle Daten dieses Testers werden endgültig gelöscht, er ist sofort abgemeldet.`
                          : "Einladung zurückziehen? Der Link funktioniert dann nicht mehr."
                      }
                    >
                      {testzugang.eingerichtetAm ? "Entfernen" : "Zurückziehen"}
                    </LoeschenButton>
                  </div>
                </div>
                {(!testzugang.eingerichtetAm || !testzugang.passwortHash) && (
                  <LinkKopieren
                    adresse={`${protokoll}://${gastgeber}/einladung/${testzugang.einladungToken}`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
