-- Inhalt des QR-Codes, der auf der Beute klebt - einmalig in der Stockkarte
-- angelernt, öffnet er ab dann per Scan direkt dieses Volk.

ALTER TABLE "Volk" ADD COLUMN "qrCodeWert" TEXT;

CREATE UNIQUE INDEX "Volk_qrCodeWert_key" ON "Volk"("qrCodeWert");
