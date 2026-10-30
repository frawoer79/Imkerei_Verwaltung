// Gemeinsame Hilfsfunktion für Client und Server: was ein QR-Scan liefert, ist
// entweder eine nackte Kennung (fertige Karte) oder die Adresse, die ein
// selbst erzeugter Code trägt (https://.../qr/<kennung>) - siehe
// /einstellungen/qr-codes. Egal welcher Fall, gespeichert und verglichen wird
// immer nur die reine Kennung.
export function codeAusQrInhalt(inhalt: string): string {
  const bereinigt = inhalt.trim();
  const marke = "/qr/";
  const index = bereinigt.lastIndexOf(marke);
  if (index === -1) return bereinigt;
  return decodeURIComponent(bereinigt.slice(index + marke.length)).trim();
}
