-- Dokumente per E-Mail: zwei neue Tabellen (Zugangsdaten zum Mailserver und
-- zuletzt benutzte Empfänger), bestehende Daten bleiben unberührt.
CREATE TABLE "MailEinstellung" (
    "id" TEXT NOT NULL DEFAULT 'standard',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "benutzer" TEXT,
    "passwortVerschluesselt" TEXT,
    "absender" TEXT NOT NULL,
    "getestetAm" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailEinstellung_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailEmpfaenger" (
    "adresse" TEXT NOT NULL,
    "zuletztAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailEmpfaenger_pkey" PRIMARY KEY ("adresse")
);
