import { LinkUngueltig, PasswortPerLinkFormular } from "@/components/passwort-vergessen-formular";
import { helferZuResetToken } from "@/lib/helfer-mail";
import { NUTZER_PASSWORT_MINDESTLAENGE } from "@/lib/nutzer";

// Link aus der "Passwort vergessen"-Mail. Ohne Anmeldung erreichbar (siehe
// proxy.ts), gilt eine Stunde und nur einmal.
export default async function PasswortPerLinkPage({ params }: PageProps<"/passwort-vergessen/[token]">) {
  const { token } = await params;
  const helfer = await helferZuResetToken(token);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      {helfer ? (
        <PasswortPerLinkFormular token={token} name={helfer.name} mindestlaenge={NUTZER_PASSWORT_MINDESTLAENGE} />
      ) : (
        <LinkUngueltig />
      )}
    </div>
  );
}
