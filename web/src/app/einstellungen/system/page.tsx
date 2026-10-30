import { notFound } from "next/navigation";
import { istAdmin } from "@/lib/konto";
import {
  ALLE_VERSIONEN_ADRESSE,
  eigeneVersion,
  istNeueHauptversion,
  istSicherheitsupdate,
  neuereVersionen,
  pruefungMoeglich,
  updateStandLaden,
} from "@/lib/update";
import { Card } from "@/components/ui";
import { AenderungsText } from "@/components/aenderungs-text";
import { UpdatePruefenKnopf, UpdatePruefungSchalter } from "@/components/update-steuerung";
import { UpdateKnopf } from "@/components/update-knopf";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { knopfMoeglich, updateStatusLesen } from "@/lib/update-steuerung";

const datumZeit = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});
const datum = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });

// Version, Update-Prüfung und Änderungslisten (siehe lib/update.ts). Nur für
// den Hauptzugang.
export default async function SystemPage() {
  if (!(await istAdmin())) notFound();

  const version = eigeneVersion();
  const moeglich = pruefungMoeglich();
  const stand = await updateStandLaden();
  const an = stand?.pruefungAn ?? true;
  const neuere = neuereVersionen(stand);
  const knopf = moeglich && (await knopfMoeglich());
  const letzterLauf = knopf ? await updateStatusLesen() : null;
  // Der Knopf holt nur Versionen derselben Hauptversion (Etikett "1"), eine
  // neue Hauptversion braucht die Schritte aus ihrer Änderungsliste.
  const ziel = neuere.find((neu) => !istNeueHauptversion(neu))?.version ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">System</h1>
        <p className="text-sm text-muted">Version der App und Updates.</p>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Version</h2>
        {version ? (
          <p className="text-sm">
            Diese App läuft mit Version <b>{version}</b>.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Diese App ist direkt aus dem Quellcode gebaut (zum Beispiel über Coolify) und hat keine
            Versionsnummer. Updates kommen dort über deinen Hoster, die Update-Prüfung ist aus.
          </p>
        )}
        <p className="mt-2 text-sm">
          <a href={ALLE_VERSIONEN_ADRESSE} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
            Alle Versionen und Änderungen auf GitHub
          </a>
        </p>
      </Card>

      {moeglich && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Nach Updates suchen</h2>
          <p className="mb-4 text-sm text-muted">
            Einmal am Tag fragt der Server bei GitHub nach, ob es eine neue Version gibt. Gibt es eine,
            erscheint oben ein Hinweis. Dabei geht nur eine gewöhnliche Abfrage an GitHub (gehört zu
            Microsoft, USA). GitHub sieht die IP-Adresse des Servers und die Uhrzeit. Daten deiner
            Imkerei, Namen oder eine Kennung der App gehen nicht raus.
          </p>
          <UpdatePruefungSchalter an={an} />
          {an && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-sm text-muted">
                {stand?.letztePruefung
                  ? `Zuletzt geprüft: ${datumZeit.format(stand.letztePruefung)}`
                  : "Noch nicht geprüft."}
                {stand?.fehler && (
                  <span className="block text-gefahr">Hat nicht geklappt: {stand.fehler}</span>
                )}
              </p>
              <UpdatePruefenKnopf />
            </div>
          )}
        </Card>
      )}

      {moeglich && (
        <Card id="neu">
          <h2 className="mb-1 text-lg font-semibold">Was ist neu?</h2>
          {neuere.length === 0 ? (
            <p className="text-sm text-muted">
              {an ? "Du hast die neueste Version." : "Die Update-Prüfung ist aus."}
            </p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {neuere.map((neu) => (
                <section key={neu.version} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <h3 className="font-semibold">
                    {neu.titel}
                    {neu.datum && (
                      <span className="font-normal text-muted"> · {datum.format(new Date(neu.datum))}</span>
                    )}
                  </h3>
                  {istSicherheitsupdate(neu) && (
                    <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
                      Sicherheitsupdate. Bitte bald einspielen.
                    </p>
                  )}
                  {istNeueHauptversion(neu) && (
                    <p className="rounded-md border border-warnung-rand bg-warnung-flaeche px-3 py-2 text-sm">
                      Neue Hauptversion. Sie kommt nicht von selbst, lies vorher die Hinweise unten.
                    </p>
                  )}
                  {neu.text.trim() ? (
                    <AenderungsText text={neu.text} />
                  ) : (
                    <p className="text-sm text-muted">Keine Beschreibung.</p>
                  )}
                  <a href={neu.adresse} target="_blank" rel="noreferrer" className="text-sm text-accent underline-offset-2 hover:underline">
                    Auf GitHub ansehen
                  </a>
                </section>
              ))}
            </div>
          )}
        </Card>
      )}

      {moeglich && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Update einspielen</h2>
          <p className="mb-4 text-sm text-muted">
            Zuerst wird die Datenbank gesichert, dann die neue Version geladen und geprüft, ob sie
            startet. Klappt das nicht, geht es von selbst zurück auf die alte Version mit der
            Sicherung.
          </p>
          {knopf && (
            <div className="mb-4">
              <UpdateKnopf version={ziel} letzterStatus={letzterLauf} />
              {!ziel && !letzterLauf && <p className="text-sm text-muted">Gerade gibt es nichts einzuspielen.</p>}
            </div>
          )}
          <p className="text-sm">
            {knopf ? "Oder am Server" : "Am Server"} anmelden (z.B.{" "}
            <code className="rounded bg-flaeche px-1 font-mono">ssh root@…</code>) und eingeben:
          </p>
          <pre className="my-2 overflow-x-auto rounded-md bg-flaeche px-3 py-2 font-mono text-sm">sudo imkerei-update</pre>
          <p className="text-sm text-muted">
            Zurück auf die Version vor dem letzten Update:{" "}
            <code className="rounded bg-flaeche px-1 font-mono">sudo imkerei-update --zurueck</code>. Was
            seit dem Update eingetragen wurde, geht dabei verloren.
          </p>
        </Card>
      )}
    </div>
  );
}
