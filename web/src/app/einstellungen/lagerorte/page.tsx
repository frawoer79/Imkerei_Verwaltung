import { redirect } from "next/navigation";

// Früher eigener Punkt, jetzt Teil von Einstellungen -> Lager.
export default function LagerortePage() {
  redirect("/einstellungen/lager#lagerorte");
}
