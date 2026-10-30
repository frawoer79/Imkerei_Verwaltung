import { LoginFormular } from "@/components/login-formular";
import { helferMailBereit } from "@/lib/helfer-mail";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ weiter?: string }>;
}) {
  const { weiter } = await searchParams;
  // Den Link gibt es nur, wenn Mails überhaupt rausgehen können.
  const passwortVergessen = await helferMailBereit().catch(() => false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <LoginFormular weiter={weiter && weiter.startsWith("/") ? weiter : "/"} passwortVergessen={passwortVergessen} />
    </div>
  );
}
