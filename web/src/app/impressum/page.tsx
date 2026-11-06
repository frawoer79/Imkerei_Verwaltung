import { notFound } from "next/navigation";
import { DemoTextSeite } from "@/components/demo-rahmen";
import { impressum, istDemo } from "@/lib/demo";
import { aktuellesKonto } from "@/lib/konto";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impressum · Imkereiverwaltung" };

// Impressum der öffentlichen Demo. Name und Anschrift kommen aus den
// Umgebungsvariablen IMPRESSUM_* (lib/demo.ts), nicht aus dem Code.
export default async function ImpressumPage() {
  if (!istDemo()) notFound();
  const angaben = impressum();
  const angemeldet = (await aktuellesKonto()) !== null;

  return (
    <DemoTextSeite angemeldet={angemeldet}>
      <h1 className="text-2xl font-semibold tracking-tight">Impressum</h1>
      {angaben ? (
        <>
          <p>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG):</p>
          <p>
            {angaben.name}
            {angaben.anschrift.map((zeile) => (
              <span key={zeile}>
                <br />
                {zeile}
              </span>
            ))}
          </p>
          <h2>Kontakt</h2>
          <p>
            E-Mail: <a href={`mailto:${angaben.email}`}>{angaben.email}</a>
            {angaben.telefon && (
              <>
                <br />
                Telefon: {angaben.telefon}
              </>
            )}
          </p>
          <h2>Verantwortlich für den Inhalt</h2>
          <p>{angaben.name}, Anschrift wie oben.</p>
        </>
      ) : (
        <p>Die Angaben zum Betreiber sind noch nicht eingetragen.</p>
      )}
      <h2>Hinweis</h2>
      <p>
        Diese Seite ist eine Demo der kostenlosen Software Imkereiverwaltung. Alle Stände, Völker, Personen und Zahlen
        darin sind erfunden. Sie dient nur zum Ausprobieren und ist kein Angebot für die Speicherung echter Daten.
      </p>
      <h2>Haftung für Links</h2>
      <p>
        Die Demo verlinkt auf fremde Seiten, etwa auf GitHub. Für deren Inhalt sind allein deren Betreiber
        verantwortlich. Werden mir Rechtsverstöße bekannt, entferne ich den Link.
      </p>
    </DemoTextSeite>
  );
}
