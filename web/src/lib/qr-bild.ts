import { randomUUID } from "crypto";
import QRCode from "qrcode";

/// Erzeugt eine neue, garantiert eindeutige Kennung für einen frischen
/// QR-Code (siehe /einstellungen/qr-codes) - Kollisionen mit UUIDs sind
/// praktisch ausgeschlossen, eine Prüfung gegen die Datenbank ist daher nicht
/// nötig.
export function neueQrKennung(): string {
  return randomUUID();
}

/// Rendert einen QR-Code als PNG-Rohdaten (für die Einbettung im PDF-Bogen).
/// Kodiert wird die volle Adresse, damit ein Scan auch mit der normalen
/// Kamera-App des Handys direkt zur richtigen Seite führt.
export async function qrCodePng(inhalt: string): Promise<Buffer> {
  return QRCode.toBuffer(inhalt, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300,
  });
}
