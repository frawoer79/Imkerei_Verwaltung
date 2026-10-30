import { notFound } from "next/navigation";
import { basisPrisma } from "@/lib/prisma";
import { istAdmin } from "@/lib/konto";
import { startpasswortVorschlag } from "@/lib/nutzer";
import { helferAktivSetzen, helferEntfernen, helferStufeSetzen } from "@/lib/nutzer-actions";
import { Card } from "@/components/ui";
import { HelferAnlegenFormular, HelferEmail, HelferPasswortZuruecksetzen } from "@/components/helfer-formulare";
import { helferMailBereit } from "@/lib/helfer-mail";
import { LoeschenButton } from "@/components/loeschen-button";
import { SeitenNavigation } from "@/components/seiten-navigation";

const datumZeit = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

// Verwaltung der Helfer - nur für den Admin. Helfer arbeiten an denselben
// Daten wie der Admin mit (anders als Testzugänge, die eigene Daten haben).
export default async function HelferPage() {
  if (!(await istAdmin())) notFound();

  const [helfer, mailBereit] = await Promise.all([
    basisPrisma.nutzer.findMany({ orderBy: { erstelltAm: "asc" } }),
    helferMailBereit(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Helfer</h1>
        <p className="text-sm text-muted">
          Helfer arbeiten mit an deinen Ständen und Völkern. Sie sehen dieselben Daten wie du.
          Einstellungen und Zugänge bleiben bei dir.
        </p>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Helfer anlegen</h2>
        <p className="mb-4 text-sm text-muted">
          Du vergibst ein Startpasswort und gibst es selbst weiter. Beim ersten Anmelden muss der
          Helfer ein eigenes Passwort wählen. Mit E-Mail-Adresse bekommt er den Link zur App per
          Mail und kann ein vergessenes Passwort selbst neu setzen. <b>Lesen und schreiben</b> darf Durchsichten, Maßnahmen, Behandlungen und
          Buchungen eintragen, ändern und löschen. <b>Nur lesen</b> darf nur ansehen.
        </p>
        <HelferAnlegenFormular vorschlag={startpasswortVorschlag()} mailBereit={mailBereit} />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Helfer ({helfer.length})</h2>
        {helfer.length === 0 ? (
          <p className="text-sm text-muted">Noch niemand angelegt.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {helfer.map((nutzer) => (
              <li key={nutzer.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">
                    {nutzer.name}
                    <span className="font-normal text-muted">
                      {" · "}
                      {nutzer.stufe === "LESEN" ? "Nur lesen" : "Lesen und schreiben"}
                    </span>
                    {!nutzer.aktiv && <span className="font-normal text-gefahr"> · gesperrt</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {nutzer.passwortAendern
                      ? "Hat noch das Startpasswort, eigenes Passwort steht aus."
                      : nutzer.letzteAnmeldung
                        ? `Zuletzt angemeldet ${datumZeit.format(nutzer.letzteAnmeldung)}`
                        : "Noch nicht angemeldet"}
                  </p>
                </div>
                <HelferEmail nutzerId={nutzer.id} email={nutzer.email} mailBereit={mailBereit} />
                <div className="flex flex-wrap items-start gap-2">
                  <LoeschenButton
                    action={helferStufeSetzen.bind(null, nutzer.id, nutzer.stufe === "LESEN" ? "SCHREIBEN" : "LESEN")}
                    bestaetigung={
                      nutzer.stufe === "LESEN"
                        ? `${nutzer.name} darf dann Daten eintragen, ändern und löschen. Einverstanden?`
                        : `${nutzer.name} darf dann nur noch ansehen. Einverstanden?`
                    }
                    variant="secondary"
                    groesse="klein"
                  >
                    {nutzer.stufe === "LESEN" ? "Schreiben erlauben" : "Auf nur lesen setzen"}
                  </LoeschenButton>
                  <LoeschenButton
                    action={helferAktivSetzen.bind(null, nutzer.id, !nutzer.aktiv)}
                    bestaetigung={
                      nutzer.aktiv
                        ? `${nutzer.name} sperren? Der Zugang wird sofort abgemeldet und bleibt gesperrt, bis du ihn wieder freigibst.`
                        : `${nutzer.name} entsperren? Anmelden geht dann wieder mit dem bisherigen Passwort.`
                    }
                    variant="secondary"
                    groesse="klein"
                  >
                    {nutzer.aktiv ? "Sperren" : "Entsperren"}
                  </LoeschenButton>
                  <HelferPasswortZuruecksetzen
                    nutzerId={nutzer.id}
                    name={nutzer.name}
                    vorschlag={startpasswortVorschlag()}
                    email={mailBereit ? nutzer.email : null}
                  />
                  <LoeschenButton
                    action={helferEntfernen.bind(null, nutzer.id)}
                    bestaetigung={`Zugang von ${nutzer.name} entfernen? Anmelden geht dann nicht mehr. Alles Eingetragene bleibt erhalten.`}
                    groesse="klein"
                  >
                    Entfernen
                  </LoeschenButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
