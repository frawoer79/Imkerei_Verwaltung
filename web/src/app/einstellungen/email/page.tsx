import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { MailEinstellungen } from "@/components/mail-einstellungen";
import { MailHilfe } from "@/components/mail-hilfe";
import { mailEinstellungenEntfernen, mailEinstellungenSpeichern } from "@/lib/mail-actions";
import { mailKonfigLaden } from "@/lib/mail";
import { abgeschalteteBereiche } from "@/lib/bereiche";
import { SeitenNavigation } from "@/components/seiten-navigation";

// Postausgangsserver für den Versand aus Dokumente und für die Velutina-Mails.
// Sind beide Bereiche ausgeblendet, gibt es die Seite nicht.
export default async function EmailPage() {
  const [mailKonfig, aus] = await Promise.all([mailKonfigLaden(), abgeschalteteBereiche()]);
  if (aus.includes("dokumente") && aus.includes("velutina")) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">E-Mail-Versand</h1>
          <MailHilfe />
        </div>
        <p className="text-sm text-muted">
          Für den Versand ausgewählter Dokumente per E-Mail (unter Dokumente). Die Angaben findest
          du bei deinem Mailanbieter unter „Postausgangsserver“ bzw. „SMTP“. Hilfe dazu über das i
          neben der Überschrift.
        </p>
      </div>

      <Card>
        <MailEinstellungen
          gespeichert={
            mailKonfig
              ? {
                  host: mailKonfig.host,
                  port: mailKonfig.port,
                  benutzer: mailKonfig.benutzer,
                  absender: mailKonfig.absender,
                  passwortGespeichert: mailKonfig.passwort !== null || !mailKonfig.passwortLesbar,
                  passwortLesbar: mailKonfig.passwortLesbar,
                  getestetAm: mailKonfig.getestetAm
                    ? mailKonfig.getestetAm.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" })
                    : null,
                }
              : null
          }
          speichern={mailEinstellungenSpeichern}
          entfernen={mailEinstellungenEntfernen}
        />
      </Card>
    </div>
  );
}
