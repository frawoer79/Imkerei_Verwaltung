// Dateiname, unter dem ein Stockkarten-Foto heruntergeladen bzw. gesichert
// wird. Der hochgeladene Originalname taugt dafür nicht: vom iPhone heißen
// fast alle Fotos "image.jpg", im Download-Ordner am PC stünden dann lauter
// "image (3).jpg" nebeneinander.
export function stockkartenBildName(volkName: string, datum: Date, nummer: number, dateiname: string): string {
  const tag = datum.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); // JJJJ-MM-TT
  const endung = /\.[a-z0-9]{1,5}$/i.exec(dateiname)?.[0].toLowerCase() ?? ".jpg";
  // Zeichen, die Windows oder macOS in Dateinamen nicht mögen, ersetzen.
  const volk = volkName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "Volk";
  return `Stockkarte ${volk} ${tag} Bild ${nummer}${endung}`;
}
