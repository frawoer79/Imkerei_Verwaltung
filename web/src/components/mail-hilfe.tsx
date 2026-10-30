"use client";

import { useRef } from "react";

// Info-Knopf neben der Überschrift "E-Mail" in den Einstellungen: erklärt in
// einem Popup, wie der Versand funktioniert, wie man bei Gmail ein
// App-Passwort anlegt und was bei anderen Anbietern einzutragen ist.
// Die Anbieterangaben sind Stand Oktober 2026 - ändert ein Anbieter etwas,
// hilft dessen Hilfeseite zu "SMTP" bzw. "Postausgangsserver".

const ANBIETER: { name: string; server: string; hinweis: string }[] = [
  {
    name: "Gmail",
    server: "smtp.gmail.com · Port 587",
    hinweis: "Nur mit App-Passwort, siehe oben.",
  },
  {
    name: "GMX",
    server: "mail.gmx.net · Port 587",
    hinweis:
      "Im GMX-Postfach unter Einstellungen → POP3 & IMAP den Zugriff per POP3/IMAP erlauben. Danach geht das normale Passwort, mit Zwei-Faktor-Schutz ein dort angelegtes App-Passwort.",
  },
  {
    name: "WEB.DE",
    server: "smtp.web.de · Port 587",
    hinweis: "Wie bei GMX: zuerst unter Einstellungen → POP3 & IMAP den Zugriff erlauben.",
  },
  {
    name: "T-Online",
    server: "securesmtp.t-online.de · Port 587",
    hinweis: "Braucht ein eigenes E-Mail-Passwort, das im Telekom-Kundencenter festgelegt wird (nicht das Login-Passwort).",
  },
  {
    name: "iCloud",
    server: "smtp.mail.me.com · Port 587",
    hinweis: "Benutzername ist die volle iCloud-Adresse, Passwort ein app-spezifisches Passwort von account.apple.com.",
  },
  {
    name: "Outlook / Hotmail",
    server: "smtp-mail.outlook.com · Port 587",
    hinweis:
      "Microsoft lässt bei privaten Konten kaum noch Anmeldungen mit Passwort zu. Klappt die Testmail nicht, besser einen anderen Anbieter nehmen.",
  },
];

export function MailHilfe() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Hilfe zum E-Mail-Versand"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted hover:border-accent hover:text-accent"
      >
        i
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">E-Mail-Versand einrichten</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">So funktioniert es</h3>
            <p>
              Die App verschickt Mails über dein eigenes Postfach, genauso wie ein Mailprogramm. Dafür
              braucht sie den Postausgangsserver (SMTP) deines Anbieters und deine Zugangsdaten.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                „Speichern und Testmail senden“ schickt eine Testmail an deine Adresse beim
                Bienenhalter. Erst wenn die durchgeht, erscheinen unter Dokumente die Kästchen und
                der Knopf „Per E-Mail senden“.
              </li>
              <li>Änderst du später etwas an den Angaben, ist der Versand bis zur nächsten erfolgreichen Testmail aus.</li>
              <li>
                Das Passwort wird verschlüsselt gespeichert und nie wieder angezeigt. Ein leeres
                Passwortfeld behält das gespeicherte.
              </li>
              <li>
                Absender ist die Adresse des Postfachs. Antworten der Empfänger gehen an deine
                Adresse beim Bienenhalter.
              </li>
              <li>Pro Mail höchstens 15 MB Anhänge, sonst auf mehrere Mails aufteilen.</li>
              <li>„Versand abschalten“ löscht alle Angaben samt Passwort.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">Gmail: App-Passwort anlegen</h3>
            <p>
              Gmail nimmt hier nicht dein normales Google-Passwort, sondern nur ein App-Passwort:
              ein eigenes Passwort nur für diesen Zugang, das du jederzeit löschen kannst.
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Unter myaccount.google.com → Sicherheit die <strong>Bestätigung in zwei Schritten</strong>{" "}
                einschalten. Ohne sie gibt es keine App-Passwörter.
              </li>
              <li>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  myaccount.google.com/apppasswords
                </a>{" "}
                öffnen, einen Namen eingeben (z.&nbsp;B. „Imkereiverwaltung“) und erstellen.
              </li>
              <li>Die angezeigten 16 Buchstaben ohne Leerzeichen hier als Passwort eintragen.</li>
              <li>Server smtp.gmail.com, Port 587, Benutzername und Absender = deine Gmail-Adresse.</li>
            </ol>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">Andere Anbieter</h3>
            <p>
              Benutzername ist meist die volle Mailadresse, Port 587. Ist Zwei-Faktor-Schutz an,
              brauchst du fast immer ein App-Passwort wie bei Gmail.
            </p>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {ANBIETER.map((anbieter) => (
                <li key={anbieter.name} className="px-3 py-2">
                  <p className="font-medium">
                    {anbieter.name} <span className="font-normal text-muted">· {anbieter.server}</span>
                  </p>
                  <p className="text-muted">{anbieter.hinweis}</p>
                </li>
              ))}
            </ul>
            <p className="text-muted">
              Eigene Domain (Strato, IONOS, all-inkl …): die Angaben stehen in der Hilfe des
              Anbieters unter „SMTP“ oder „Postausgangsserver“. Port 465 geht auch, wenn der Anbieter
              ihn statt 587 nennt.
            </p>
          </section>
        </div>
      </dialog>
    </>
  );
}
