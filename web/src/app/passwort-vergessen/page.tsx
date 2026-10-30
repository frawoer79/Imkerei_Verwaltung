import { PasswortVergessenFormular } from "@/components/passwort-vergessen-formular";
import { RESET_GUELTIG_MINUTEN } from "@/lib/helfer-mail";

// Ohne Anmeldung erreichbar (siehe proxy.ts). Nur für Helfer mit
// hinterlegter E-Mail-Adresse, alle anderen bekommen keine Mail.
export default function PasswortVergessenPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <PasswortVergessenFormular gueltigMinuten={RESET_GUELTIG_MINUTEN} />
    </div>
  );
}
