import { Document, Page, StyleSheet, Text, View, Image, renderToBuffer } from "@react-pdf/renderer";
import { qrCodePng } from "@/lib/qr-bild";

// Bogen mit frisch erzeugten QR-Codes zum Ausdrucken und Aufkleben - siehe
// /einstellungen/qr-codes. 4 x 6 Etiketten pro A4-Bogen (52,5 x 49,5 mm),
// genau ausgerichtet zum Schneiden.

const MM = 2.834645669; // 1 mm in PDF-Punkten
const A4 = { breite: 595.28, hoehe: 841.89 };
const SPALTEN = 4;
const ZEILEN = 6;
const PRO_SEITE = SPALTEN * ZEILEN;
const ETIKETT_BREITE = A4.breite / SPALTEN;
const ETIKETT_HOEHE = A4.hoehe / ZEILEN;

const TINTE = "#17191b";
const GRAU = "#6a706c";

const stil = StyleSheet.create({
  bogen: { flexDirection: "row", flexWrap: "wrap" },
  etikett: {
    width: ETIKETT_BREITE,
    height: ETIKETT_HOEHE,
    borderWidth: 0.25,
    borderColor: "#c9cdc6",
    alignItems: "center",
    justifyContent: "center",
    gap: 3 * MM,
  },
  qr: { width: 30 * MM, height: 30 * MM },
  kennung: { fontSize: 7, fontFamily: "Courier", color: TINTE, letterSpacing: 0.5 },
  fuss: { fontSize: 5, color: GRAU },
});

function Etikett({ png, kennung, betriebName }: { png: Buffer; kennung: string; betriebName: string | null }) {
  return (
    <View style={stil.etikett}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf-Image, kein HTML-<img> */}
      <Image src={png} style={stil.qr} />
      <Text style={stil.kennung}>{kennung.slice(0, 8).toUpperCase()}</Text>
      {betriebName && <Text style={stil.fuss}>{betriebName}</Text>}
    </View>
  );
}

/// Erzeugt einen oder mehrere A4-Bögen mit den übergebenen Codes - jeder Code
/// bekommt sein eigenes Etikett mit QR-Bild und den ersten Zeichen der
/// Kennung als Klartext-Rückfallebene. `basisAdresse` ist die öffentliche
/// Adresse der Anwendung (z.B. "https://imkerei.example.de") - kodiert wird
/// `basisAdresse + "/qr/" + kennung`, damit ein Scan auch mit der normalen
/// Kamera-App direkt zur richtigen Seite führt.
export async function qrEtikettenBogenErzeugen(
  kennungen: string[],
  basisAdresse: string,
  betriebName: string | null
): Promise<Buffer> {
  const etiketten = await Promise.all(
    kennungen.map(async (kennung) => ({
      kennung,
      png: await qrCodePng(`${basisAdresse}/qr/${kennung}`),
    }))
  );

  const seiten: (typeof etiketten)[] = [];
  for (let index = 0; index < etiketten.length; index += PRO_SEITE) {
    seiten.push(etiketten.slice(index, index + PRO_SEITE));
  }

  return renderToBuffer(
    <Document title="Neue QR-Codes">
      {seiten.map((seite, seitenIndex) => (
        <Page key={seitenIndex} size="A4" style={{ backgroundColor: "#ffffff" }}>
          <View style={stil.bogen}>
            {seite.map((etikett) => (
              <Etikett key={etikett.kennung} png={etikett.png} kennung={etikett.kennung} betriebName={betriebName} />
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
