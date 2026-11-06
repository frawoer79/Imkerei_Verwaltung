import { notFound } from "next/navigation";
import { DemoTextSeite } from "@/components/demo-rahmen";
import { impressum, istDemo, RUHE_MINUTEN } from "@/lib/demo";
import { aktuellesKonto } from "@/lib/konto";

export const dynamic = "force-dynamic";
export const metadata = { title: "Datenschutz · Imkereiverwaltung" };

// Datenschutzerklärung der öffentlichen Demo. Beschreibt, was die Demo
// tatsächlich tut (lib/demo.ts, proxy.ts, Karten in lib/kartenebenen.ts).
// Bei Änderungen an der Demo mitpflegen.
export default async function DatenschutzPage() {
  if (!istDemo()) notFound();
  const angaben = impressum();
  const angemeldet = (await aktuellesKonto()) !== null;

  return (
    <DemoTextSeite angemeldet={angemeldet}>
      <h1 className="text-2xl font-semibold tracking-tight">Datenschutz</h1>
      <p>
        Kurz gesagt: Die Demo braucht keine Anmeldung und keine persönlichen Angaben. Was du eingibst, wird nach kurzer
        Zeit gelöscht. Es gibt keine Werbung, keine Statistik und kein Tracking.
      </p>

      <h2>Verantwortlich</h2>
      {angaben ? (
        <p>
          {angaben.name}
          {angaben.anschrift.map((zeile) => (
            <span key={zeile}>
              <br />
              {zeile}
            </span>
          ))}
          <br />
          E-Mail: <a href={`mailto:${angaben.email}`}>{angaben.email}</a>
        </p>
      ) : (
        <p>Siehe Impressum.</p>
      )}

      <h2>Server und Protokolle</h2>
      <p>
        Die Demo läuft auf einem gemieteten Server der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, im
        Rechenzentrum Helsinki (Finnland, EU). Mit Hetzner besteht ein Vertrag zur Auftragsverarbeitung.
      </p>
      <p>
        Bei jedem Aufruf verarbeitet der Server technisch nötige Daten: deine IP-Adresse, Datum und Uhrzeit, die
        aufgerufene Adresse und die Kennung deines Browsers. Das ist nötig, um die Seite auszuliefern und den Server vor
        Missbrauch zu schützen (Art. 6 Abs. 1 lit. f DSGVO). Protokolle des Servers werden nach spätestens 14 Tagen
        gelöscht.
      </p>
      <p>
        Gegen Missbrauch merkt sich die Demo außerdem im Arbeitsspeicher, wie oft von einer IP-Adresse eine Demo gestartet
        oder eine Adresse gesucht wurde. Diese Angabe wird nach einer Stunde verworfen und nirgends gespeichert.
      </p>

      <h2>Cookie</h2>
      <p>
        Die Demo setzt genau ein Cookie. Es merkt sich, welcher Demoplatz dir gehört, damit du deine Änderungen beim
        Weiterklicken siehst. Es enthält keine persönlichen Angaben und wird beim Schließen des Browsers gelöscht. Ohne
        dieses Cookie funktioniert die Demo nicht, deshalb braucht es keine Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG).
      </p>

      <h2>Was du eingibst</h2>
      <p>
        Alles, was du in der Demo einträgst, liegt in einem eigenen Bereich der Datenbank, den nur du siehst. Nach{" "}
        {RUHE_MINUTEN} Minuten ohne Klick, spätestens beim Datumswechsel, wird dieser Bereich vollständig gelöscht. Bitte
        trage keine echten persönlichen Daten ein. Fotos hochladen und E-Mails verschicken sind in der Demo ausgeschaltet.
      </p>

      <h2>Karten und Adresssuche</h2>
      <p>
        Auf Kartenseiten lädt dein Browser die Kartenbilder direkt von fremden Servern. Dabei erfahren diese deine
        IP-Adresse: die OpenStreetMap Foundation (Vereinigtes Königreich) für die Straßenkarte, Esri (USA) für das
        Luftbild und unpkg (USA) für die Kartensymbole. Für das Vereinigte Königreich gilt ein Angemessenheitsbeschluss
        der EU. Für die USA kann ein gleichwertiger Schutz nicht immer garantiert werden. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. f DSGVO, die Karten sind ein Kernstück der Software.
      </p>
      <p>
        Suchst du in der Demo eine Adresse, fragt der Server bei Nominatim (OpenStreetMap Foundation) an. Dabei wird nur
        der Suchtext übermittelt, nicht deine IP-Adresse.
      </p>

      <h2>Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung sowie auf Widerspruch
        (Art. 15 bis 21 DSGVO). Da die Demo dich nicht kennt, kann ich deine Daten meist nicht zuordnen; sie sind ohnehin
        nach kurzer Zeit gelöscht. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel
        bei der deines Bundeslands.
      </p>
    </DemoTextSeite>
  );
}
