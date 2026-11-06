import type { MetadataRoute } from "next";
import { istDemo } from "@/lib/demo";

// Suchmaschinen: Eine eigene Installation ist privat und gehört in keinen
// Suchindex. In der öffentlichen Demo dürfen Startseite, Impressum und
// Datenschutz gefunden werden, die Spielwiesen dahinter nicht.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (!istDemo()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: ["/demo", "/impressum", "/datenschutz"], disallow: "/" } };
}
